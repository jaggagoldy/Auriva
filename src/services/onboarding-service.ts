// Organization onboarding (APS-044): self-serve org creation and the staff
// invite → accept flow (WF-25 / WF-23/24-lite). Replaces the localStorage
// invite mock in the admin workspace with real, persisted rows.
//
// Role model (unchanged, per src/domain/organization.ts): the org owner is a
// User with platform role "super_admin" who owns the Clinic; membership rows
// carry the org-level role ("owner" | "doctor" | "receptionist").

import { randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { isOrgArchetype, memberRoleFromSpecialty, ORG_ARCHETYPES, type OrgArchetype } from "@/domain/organization";
import { type Capability } from "@/domain/authorization";
import { checkSeatAvailability, type SeatUsage } from "@/domain/subscription";
import { publishEvent } from "@/lib/events";
import { logger } from "@/api/logger";

// BRD-043 US-102 (Sprint 1): the invitation acceptance window. See
// docs/brd-043-governance-addendum.md §2 for the migration/backfill this
// pairs with.
const INVITATION_EXPIRY_MS = 72 * 60 * 60 * 1000;

// Batch 2 (Adaptive Workspace): the capabilities an owner may GRANT to a staff
// member through staff management. Deliberately excludes `admin_portal` (that
// is organization ownership, not an operational grant) and `patient_workspace`
// (never a staff surface). Granting `reception` to a doctor is exactly the
// solo-practitioner preset.
export const GRANTABLE_CAPABILITIES: Capability[] = ["reception", "doctor_workspace"];

export class EmailInUseError extends Error {}
export class InvitationNotFoundError extends Error {}
export class InvitationNotPendingError extends Error {}
// BRD-043 US-102 (Sprint 1): distinct from InvitationNotPendingError (that
// one covers already-accepted/revoked) — this is specifically the 72h
// window lapsing on an otherwise-still-pending row.
export class InvitationExpiredError extends Error {}
// BRD-043 US-205 (Sprint 2): server-side belt-and-suspenders for the inline
// duplicate-phone UI check — an active member cannot be invited again even
// via a direct API call that bypasses the form.
export class DuplicateActiveMemberError extends Error {}
// BRD-043 US-503 (Sprint 2): the plan's seat ceiling is reached — enforced
// server-side, computed live, never bypassable from the client.
export class SeatLimitReachedError extends Error {}
export class OnboardingInputError extends Error {}
// DATA-2/3: distinct from OnboardingInputError's 400-shaped cases — a
// duplicate clinic name within the same organization is a 409-shaped
// conflict, mirroring department-service.ts's DepartmentNameConflictError.
export class ClinicNameConflictError extends Error {}

export type InviteRole = "doctor" | "receptionist";

function isInviteRole(value: unknown): value is InviteRole {
  return value === "doctor" || value === "receptionist";
}

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

/**
 * Creates a brand-new organization, its first clinic, and the owner account
 * (WF-25 / Sprint 3). The owner is a super_admin User who owns the
 * Organization and holds an "owner" membership. Returns the owner user +
 * organization + clinic so the caller can open a session.
 */
export async function createOrganization(input: {
  orgName: string;
  address: string;
  ownerName: string;
  ownerEmail: string;
  password: string;
  archetype?: string | null;
}) {
  const orgName = input.orgName?.trim();
  const address = input.address?.trim();
  const ownerName = input.ownerName?.trim();
  const email = input.ownerEmail?.trim().toLowerCase();

  if (!orgName || !address || !ownerName) {
    throw new OnboardingInputError("Organization name, address and your name are required.");
  }
  if (!email || !EMAIL_PATTERN.test(email)) {
    throw new OnboardingInputError("A valid email is required.");
  }
  if (!input.password || input.password.length < 8) {
    throw new OnboardingInputError("Password must be at least 8 characters.");
  }
  if (input.archetype !== undefined && input.archetype !== null && !isOrgArchetype(input.archetype)) {
    throw new OnboardingInputError("Choose one of the six organization types.");
  }

  const existing = await prisma.user.findFirst({ where: { email } });
  if (existing) {
    throw new EmailInUseError("An account with this email already exists.");
  }

  const password_hash = await hashPassword(input.password);
  const archetype = (input.archetype as OrgArchetype | undefined) ?? null;
  // The archetype only ever seeds sensible starting defaults for the first
  // clinic — it's a config-path selector, never a fork. An org can change
  // every one of these settings freely afterward (Clinic Settings).
  const preset = archetype ? ORG_ARCHETYPES.find((a) => a.id === archetype) : undefined;

  return prisma.$transaction(async (tx) => {
    // A synthetic unique phone until real phone capture — the column is
    // unique and non-null. Owners sign in by email + password.
    const owner = await tx.user.create({
      data: {
        role: "super_admin",
        email,
        password_hash,
        phone_number: `owner:${randomBytes(8).toString("hex")}`,
      },
    });

    const organization = await tx.organization.create({
      data: { name: orgName, address, owner_user_id: owner.id, archetype },
    });

    const clinic = await tx.clinic.create({
      data: {
        name: orgName,
        address,
        super_admin_id: owner.id,
        organization_id: organization.id,
        ...(preset
          ? {
              opens_at: preset.defaults.opens_at,
              closes_at: preset.defaults.closes_at,
              default_slot_duration_minutes: preset.defaults.default_slot_duration_minutes,
              buffer_minutes: preset.defaults.buffer_minutes,
              allow_walk_ins: preset.defaults.allow_walk_ins,
              working_days: preset.defaults.working_days,
            }
          : {}),
      },
    });

    await tx.organizationMember.create({
      data: { organization_id: organization.id, user_id: owner.id, role: "owner" },
    });

    await tx.auditLog.create({
      data: {
        organization_id: organization.id,
        actor_user_id: owner.id,
        action: "organization_created",
        detail: archetype ? `${organization.name} (${archetype})` : organization.name,
      },
    });

    return { owner, organization, clinic };
  });
}

/**
 * Adds a second (or third...) clinic/branch to an existing organization
 * (Sprint 3's "Multi-Clinic Support" — the actual new capability the
 * Organization/Clinic split exists for). The requesting owner's own User
 * row stays the clinic's `super_admin_id` (unchanged ownership shortcut);
 * the clinic is grouped under the organization via `organization_id`.
 */
export async function createClinic(input: {
  organizationId: string;
  ownerUserId: string;
  name: string;
  address: string;
}) {
  const name = input.name?.trim();
  const address = input.address?.trim();
  if (!name || !address) {
    throw new OnboardingInputError("Clinic name and address are required.");
  }

  // DATA-2: no DB constraint backs this (no schema change this sprint) — an
  // application-level duplicate-creation guard, same org, same name.
  const duplicate = await prisma.clinic.findFirst({
    where: { organization_id: input.organizationId, name },
  });
  if (duplicate) {
    throw new ClinicNameConflictError(`A clinic named "${name}" already exists in this organization.`);
  }

  return prisma.$transaction(async (tx) => {
    const clinic = await tx.clinic.create({
      data: {
        name,
        address,
        super_admin_id: input.ownerUserId,
        organization_id: input.organizationId,
      },
    });
    await tx.auditLog.create({
      data: {
        organization_id: input.organizationId,
        actor_user_id: input.ownerUserId,
        action: "clinic_created",
        detail: clinic.name,
      },
    });
    return clinic;
  });
}

/** Digits-only form of a phone number, for tolerant comparison in the UI's
 * inline check. Storage/matching against User.phone_number stays exact
 * (consistent with login/quick-setup), so this is used only where the
 * prototype itself compares on digits. */
function phoneDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

/**
 * BRD-043 US-503 (Sprint 2): live seat usage for a clinic — computed, never
 * cached. The OWNER never consumes a seat (excluded by user_id), so a solo
 * clinic whose owner is also the practising doctor still reads 0 doctor
 * seats used until a *second*, invited doctor joins — matching the frozen
 * "Solo = owner + 1 doctor + 1 receptionist" edition and the prototype's
 * "2/2" indicator. Non-owner members are classified doctor-vs-receptionist
 * by `specialty` (reliable here precisely because the owner — the one
 * profile that can lack a specialty — is excluded). Pending, unexpired
 * invitations count toward their role so the cap can't be out-invited.
 * Suspended/archived members (membership_status != 'active') are excluded.
 */
async function seatUsage(
  db: Prisma.TransactionClient | typeof prisma,
  clinicId: string,
  ownerUserId: string
): Promise<SeatUsage> {
  const [doctorMembers, receptionistMembers, pending] = await Promise.all([
    db.staffProfile.count({
      where: { clinic_id: clinicId, membership_status: "active", user_id: { not: ownerUserId }, specialty: { not: null } },
    }),
    db.staffProfile.count({
      where: { clinic_id: clinicId, membership_status: "active", user_id: { not: ownerUserId }, specialty: null },
    }),
    db.invitation.findMany({
      where: { clinic_id: clinicId, status: "pending" },
      select: { role: true, expires_at: true },
    }),
  ]);
  const now = Date.now();
  const live = pending.filter((i) => !i.expires_at || i.expires_at.getTime() > now);
  return {
    doctors: doctorMembers + live.filter((i) => i.role === "doctor").length,
    receptionists: receptionistMembers + live.filter((i) => i.role === "receptionist").length,
  };
}

/**
 * BRD-043 US-202 (Sprint 2): the inline duplicate-phone check behind the
 * invite form's live validation. Read-only, cheap. Returns which of the
 * prototype's three states applies to a phone number for this org.
 */
export async function checkInvitePhone(
  organizationId: string,
  phone: string
): Promise<{ status: "available" | "invited" | "active" }> {
  const trimmed = phone?.trim();
  if (!trimmed || phoneDigits(trimmed).length < 7) return { status: "available" };

  const existingUser = await prisma.user.findFirst({
    where: { phone_number: trimmed },
    include: {
      memberships: { where: { organization_id: organizationId } },
      staffProfile: { select: { membership_status: true } },
    },
  });
  if (existingUser && existingUser.memberships.length > 0) {
    const sp = existingUser.staffProfile;
    if (!sp || sp.membership_status === "active") return { status: "active" };
  }

  const pending = await prisma.invitation.findFirst({
    where: { organization_id: organizationId, phone: trimmed, status: "pending" },
    select: { expires_at: true },
  });
  if (pending && (!pending.expires_at || pending.expires_at.getTime() > Date.now())) {
    return { status: "invited" };
  }
  return { status: "available" };
}

/**
 * Owner invites a staff member (WF-23/24). Phone-first (BRD-043 / ADR-003:
 * WhatsApp/copy-link delivery), with the legacy email path kept for the
 * pre-existing /admin multi-clinic flow. The seat count (US-503) and the
 * invitation insert run in ONE transaction so two concurrent invites can't
 * both slip past the cap; the event is published only after commit.
 */
export async function createInvitation(input: {
  organizationId: string;
  clinicId: string;
  email?: string | null;
  phone?: string | null;
  fullName: string;
  role: string;
  specialty?: string | null;
  actorUserId?: string | null;
}) {
  const fullName = input.fullName?.trim();
  const email = input.email?.trim().toLowerCase() || null;
  const phone = input.phone?.trim() || null;

  if (!fullName || fullName.length < 2) {
    throw new OnboardingInputError("A full name is required.");
  }
  if (!isInviteRole(input.role)) {
    throw new OnboardingInputError("Role must be doctor or receptionist.");
  }
  // Captured after the guard so the narrowed role survives into the
  // transaction closure below (property narrowing on input.role doesn't).
  const role: InviteRole = input.role;
  if (!phone && !email) {
    throw new OnboardingInputError("A mobile number is required.");
  }
  if (email && !EMAIL_PATTERN.test(email)) {
    throw new OnboardingInputError("A valid email is required.");
  }
  if (phone && phoneDigits(phone).length < 7) {
    throw new OnboardingInputError("A valid mobile number is required.");
  }

  const organization = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: { owner_user_id: true, plan: true },
  });
  if (!organization) {
    throw new OnboardingInputError("Organization not found.");
  }

  const clinic = await prisma.clinic.findFirst({
    where: { id: input.clinicId, organization_id: input.organizationId },
  });
  if (!clinic) {
    throw new OnboardingInputError("That clinic does not belong to this organization.");
  }

  // US-205: reject re-inviting someone who is already an ACTIVE member of the
  // org (server-side, independent of the inline UI check). Matches identity
  // exactly, the same convention login/quick-setup use.
  const existingUser = await prisma.user.findFirst({
    where: phone ? { phone_number: phone } : { email: email! },
    include: {
      memberships: { where: { organization_id: input.organizationId } },
      staffProfile: { select: { membership_status: true } },
    },
  });
  if (existingUser && existingUser.memberships.length > 0) {
    const sp = existingUser.staffProfile;
    if (!sp || sp.membership_status === "active") {
      throw new DuplicateActiveMemberError("This person is already an active member of your team.");
    }
    // A suspended/archived former member CAN be re-invited (re-onboarding) —
    // fall through.
  }

  const invitation = await prisma.$transaction(async (tx) => {
    // Supersede any prior pending invite for the same identity + org, so
    // resending doesn't double-count that person against the seat cap below.
    await tx.invitation.updateMany({
      where: {
        organization_id: input.organizationId,
        status: "pending",
        ...(phone ? { phone } : { email: email! }),
      },
      data: { status: "revoked" },
    });

    // US-503: computed inside the transaction, after the supersede, so the
    // count reflects exactly what will exist post-commit.
    const usage = await seatUsage(tx, input.clinicId, organization.owner_user_id);
    const decision = checkSeatAvailability(organization.plan, role, usage);
    if (!decision.allowed) {
      logger.warn("seat.limit_exceeded", {
        organizationId: input.organizationId,
        currentPlan: organization.plan,
        seatCount: usage.doctors + usage.receptionists,
      });
      throw new SeatLimitReachedError(decision.reason ?? "Your plan's team limit has been reached.");
    }

    return tx.invitation.create({
      data: {
        organization_id: input.organizationId,
        clinic_id: input.clinicId,
        email,
        phone,
        full_name: fullName,
        role,
        specialty: role === "doctor" ? (input.specialty?.trim() || null) : null,
        token: randomBytes(24).toString("hex"),
        // US-102: resending always starts a fresh 72h window.
        expires_at: new Date(Date.now() + INVITATION_EXPIRY_MS),
      },
    });
  });

  await publishEvent({
    eventType: "staff.invited",
    organizationId: input.organizationId,
    entityId: invitation.id,
    correlationId: invitation.id,
    actorId: input.actorUserId,
    payload: { invitationId: invitation.id, role: invitation.role },
  });
  logger.info("invite.created", { organizationId: input.organizationId, invitationId: invitation.id, role: invitation.role });

  return invitation;
}

/**
 * Lazy expiry check (US-102) — no scheduled job; a stale pending invitation
 * is only ever discovered the next time it's read or an accept is attempted.
 * Marks the row 'expired' the first time this is detected (idempotent —
 * status is 'pending' at most once) so listPendingInvitations stops showing
 * it without needing its own filter, and throws so the caller can't proceed.
 * A null `expires_at` (rows that predate this field with no backfilled
 * value) is treated as "no expiry enforced," never as expired.
 */
async function assertInvitationLive(invitation: { id: string; status: string; expires_at: Date | null }) {
  if (invitation.status !== "pending") return;
  if (!invitation.expires_at || invitation.expires_at.getTime() > Date.now()) return;
  await prisma.invitation.update({ where: { id: invitation.id }, data: { status: "expired" } });
  logger.warn("invite.expired", { invitationId: invitation.id });
  throw new InvitationExpiredError("This invitation has expired.");
}

export function listPendingInvitations(organizationId: string) {
  return prisma.invitation.findMany({
    where: { organization_id: organizationId, status: "pending" },
    orderBy: { created_at: "desc" },
  });
}

export async function revokeInvitation(invitationId: string, organizationId: string) {
  const invitation = await prisma.invitation.findFirst({
    where: { id: invitationId, organization_id: organizationId },
  });
  if (!invitation) throw new InvitationNotFoundError("Invitation not found.");
  return prisma.invitation.update({
    where: { id: invitation.id },
    data: { status: "revoked" },
  });
}

/** Invitation lookup for the public accept page (by token). */
export async function getInvitationByToken(token: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { organization: { select: { id: true, name: true, address: true } } },
  });
  if (!invitation) throw new InvitationNotFoundError("This invitation link is invalid.");
  await assertInvitationLive(invitation);
  return invitation;
}

/**
 * Accepts an invitation: creates the staff User + StaffProfile +
 * OrganizationMember and marks the invitation accepted — all in one
 * transaction. Returns the new user so the caller can open a session.
 */
export async function acceptInvitation(input: { token: string; password: string }) {
  if (!input.password || input.password.length < 8) {
    throw new OnboardingInputError("Password must be at least 8 characters.");
  }

  const invitation = await prisma.invitation.findUnique({ where: { token: input.token } });
  if (!invitation) throw new InvitationNotFoundError("This invitation link is invalid.");
  // US-102: server-checked regardless of what the acceptance page showed
  // when it was first opened — throws InvitationExpiredError if lapsed.
  await assertInvitationLive(invitation);
  if (invitation.status !== "pending") {
    throw new InvitationNotPendingError("This invitation has already been used or revoked.");
  }
  // Identity uniqueness: a phone-based invite must not collide with an
  // existing account's phone (the login identity); an email-based (legacy
  // /admin) invite checks email as before.
  if (invitation.phone) {
    if (await prisma.user.findFirst({ where: { phone_number: invitation.phone } })) {
      throw new EmailInUseError("An account with this mobile number already exists — please sign in.");
    }
  } else if (invitation.email) {
    if (await prisma.user.findFirst({ where: { email: invitation.email } })) {
      throw new EmailInUseError("An account with this email already exists — please sign in.");
    }
  }

  const password_hash = await hashPassword(input.password);
  const role = invitation.role as InviteRole;

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        role,
        email: invitation.email,
        password_hash,
        // Phone-based invite → the invited mobile IS the login identity.
        // Legacy email invite → a synthetic phone (they sign in by email).
        phone_number: invitation.phone ?? `staff:${randomBytes(8).toString("hex")}`,
      },
    });

    await tx.staffProfile.create({
      data: {
        user_id: user.id,
        clinic_id: invitation.clinic_id,
        full_name: invitation.full_name,
        specialty: invitation.specialty,
      },
    });

    await tx.organizationMember.create({
      data: {
        organization_id: invitation.organization_id,
        user_id: user.id,
        // Trust the invite's role; keep it consistent with the heuristic for
        // doctors (specialty ⇒ doctor) as a defensive default.
        role: role === "doctor" ? "doctor" : memberRoleFromSpecialty(invitation.specialty),
      },
    });

    const accepted = await tx.invitation.update({
      where: { id: invitation.id },
      data: { status: "accepted", accepted_at: new Date() },
    });

    await tx.auditLog.create({
      data: {
        organization_id: invitation.organization_id,
        actor_user_id: user.id,
        action: "staff_invitation_accepted",
        detail: `${invitation.full_name} (${invitation.role}) joined`,
      },
    });

    return { user, invitation: accepted };
  }).then((result) => {
    logger.info("invite.accepted", { organizationId: invitation.organization_id, invitationId: invitation.id, role: invitation.role });
    return result;
  });
}

/**
 * Activates/deactivates a staff member (Sprint 3 — was a literal
 * non-functional placeholder toast before this). Sets both the User-level
 * login gate and the StaffProfile-level roster flag together; an owner can
 * never deactivate themselves.
 */
export async function setStaffActive(input: {
  organizationId: string;
  staffProfileId: string;
  actorUserId: string;
  isActive: boolean;
}) {
  const profile = await prisma.staffProfile.findUnique({
    where: { id: input.staffProfileId },
    include: { clinic: true },
  });
  if (!profile || profile.clinic.organization_id !== input.organizationId) {
    throw new InvitationNotFoundError("Staff member not found in this organization.");
  }
  if (profile.user_id === input.actorUserId) {
    throw new OnboardingInputError("You cannot deactivate your own account.");
  }

  await prisma.$transaction([
    prisma.staffProfile.update({ where: { id: profile.id }, data: { is_active: input.isActive } }),
    prisma.user.update({ where: { id: profile.user_id }, data: { is_active: input.isActive } }),
    // Batch 1: revoke live sessions on deactivation so access ends immediately,
    // not just at the next login attempt (the login gate alone would leave a
    // deactivated member working until their 12h session expired). No-op on
    // reactivation (a deactivated user has no sessions to begin with).
    ...(input.isActive
      ? []
      : [prisma.session.deleteMany({ where: { user_id: profile.user_id } })]),
    prisma.auditLog.create({
      data: {
        organization_id: input.organizationId,
        actor_user_id: input.actorUserId,
        action: input.isActive ? "staff_activated" : "staff_deactivated",
        detail: profile.full_name,
      },
    }),
  ]);

  return prisma.staffProfile.findUniqueOrThrow({ where: { id: profile.id } });
}

/**
 * Batch 2 (Adaptive Workspace): grants a staff member the capabilities beyond
 * their base role — the mechanism behind the solo-practitioner preset (grant a
 * doctor `reception`, and their one account runs the whole practice). Stores
 * only the GRANTS as a JSON array on the profile; the effective set (role
 * defaults ∪ grants) is always recomputed server-side, never persisted, so a
 * later role change can't leave a stale union behind. Passing an empty list
 * clears grants back to role defaults.
 */
export async function setStaffCapabilities(input: {
  organizationId: string;
  staffProfileId: string;
  actorUserId: string;
  capabilities: Capability[];
}) {
  const profile = await prisma.staffProfile.findUnique({
    where: { id: input.staffProfileId },
    include: { clinic: true },
  });
  if (!profile || profile.clinic.organization_id !== input.organizationId) {
    throw new InvitationNotFoundError("Staff member not found in this organization.");
  }

  const invalid = input.capabilities.filter((c) => !GRANTABLE_CAPABILITIES.includes(c));
  if (invalid.length > 0) {
    throw new OnboardingInputError(
      `Cannot grant: ${invalid.join(", ")}. Grantable capabilities are ${GRANTABLE_CAPABILITIES.join(", ")}.`
    );
  }

  // De-duplicate and store in a stable order; null when empty so the column
  // reads as "role defaults only".
  const unique = [...new Set(input.capabilities)];
  const stored = unique.length > 0 ? JSON.stringify(unique) : null;

  await prisma.$transaction([
    prisma.staffProfile.update({ where: { id: profile.id }, data: { capabilities: stored } }),
    prisma.auditLog.create({
      data: {
        organization_id: input.organizationId,
        actor_user_id: input.actorUserId,
        action: "staff_capabilities_updated",
        detail: `${profile.full_name}: [${unique.join(", ")}]`,
      },
    }),
  ]);

  return prisma.staffProfile.findUniqueOrThrow({ where: { id: profile.id } });
}

export interface ActivationStep {
  key: string;
  label: string;
  done: boolean;
}

/**
 * Organization Activated checklist (APS-030 Step 8 / WF-25's own KPIs —
 * "time-to-first-operational-event", not invented metrics). Every item is a
 * real, live query — no seeded or placeholder counts. "Sustained weekly
 * usage" from the original 8-item list is deliberately omitted: it needs a
 * time-windowed analytics job this platform doesn't have yet, and a fake
 * number here would be worse than a shorter, honest checklist.
 */
export async function getActivationStatus(organizationId: string) {
  const clinics = await prisma.clinic.findMany({
    where: { organization_id: organizationId },
    select: { id: true },
  });
  const clinicIds = clinics.map((c) => c.id);

  const [doctorInvites, acceptedInvites, appointmentCount, completedCount, invoiceCount, paymentCount] =
    await Promise.all([
      prisma.invitation.count({ where: { organization_id: organizationId, role: "doctor" } }),
      prisma.invitation.count({ where: { organization_id: organizationId, status: "accepted" } }),
      prisma.appointment.count({ where: { clinic_id: { in: clinicIds } } }),
      prisma.appointment.count({ where: { clinic_id: { in: clinicIds }, status: "completed" } }),
      prisma.invoice.count({ where: { clinic_id: { in: clinicIds } } }),
      prisma.payment.count({ where: { invoice: { clinic_id: { in: clinicIds } } } }),
    ]);

  const steps: ActivationStep[] = [
    { key: "branch_created", label: "Branch created", done: clinicIds.length > 0 },
    { key: "doctor_invited", label: "Doctor invited", done: doctorInvites > 0 },
    { key: "invite_accepted", label: "Invite accepted", done: acceptedInvites > 0 },
    { key: "appointment_booked", label: "Appointment booked", done: appointmentCount > 0 },
    { key: "consultation_completed", label: "Consultation completed", done: completedCount > 0 },
    { key: "invoice_generated", label: "Invoice generated", done: invoiceCount > 0 },
    { key: "payment_received", label: "Payment received", done: paymentCount > 0 },
  ];

  const completed = steps.filter((s) => s.done).length;
  const nextStep = steps.find((s) => !s.done) ?? null;

  return { steps, completed, total: steps.length, nextStep };
}
