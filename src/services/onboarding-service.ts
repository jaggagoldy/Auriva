// Organization onboarding (APS-044): self-serve org creation and the staff
// invite → accept flow (WF-25 / WF-23/24-lite). Replaces the localStorage
// invite mock in the admin workspace with real, persisted rows.
//
// Role model (unchanged, per src/domain/organization.ts): the org owner is a
// User with platform role "super_admin" who owns the Clinic; membership rows
// carry the org-level role ("owner" | "doctor" | "receptionist").

import { randomBytes } from "crypto";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { isOrgArchetype, memberRoleFromSpecialty, ORG_ARCHETYPES, type OrgArchetype } from "@/domain/organization";
import { type Capability } from "@/domain/authorization";
import { publishEvent } from "@/lib/events";

// Batch 2 (Adaptive Workspace): the capabilities an owner may GRANT to a staff
// member through staff management. Deliberately excludes `admin_portal` (that
// is organization ownership, not an operational grant) and `patient_workspace`
// (never a staff surface). Granting `reception` to a doctor is exactly the
// solo-practitioner preset.
export const GRANTABLE_CAPABILITIES: Capability[] = ["reception", "doctor_workspace"];

export class EmailInUseError extends Error {}
export class InvitationNotFoundError extends Error {}
export class InvitationNotPendingError extends Error {}
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

/** Owner invites a staff member (WF-23/24). Returns the pending invitation. */
export async function createInvitation(input: {
  organizationId: string;
  clinicId: string;
  email: string;
  fullName: string;
  role: string;
  specialty?: string | null;
  actorUserId?: string | null;
}) {
  const email = input.email?.trim().toLowerCase();
  const fullName = input.fullName?.trim();

  if (!fullName || fullName.length < 2) {
    throw new OnboardingInputError("A full name is required.");
  }
  if (!email || !EMAIL_PATTERN.test(email)) {
    throw new OnboardingInputError("A valid email is required.");
  }
  if (!isInviteRole(input.role)) {
    throw new OnboardingInputError("Role must be doctor or receptionist.");
  }

  const clinic = await prisma.clinic.findFirst({
    where: { id: input.clinicId, organization_id: input.organizationId },
  });
  if (!clinic) {
    throw new OnboardingInputError("That clinic does not belong to this organization.");
  }

  // Already a member of this org?
  const existingUser = await prisma.user.findFirst({
    where: { email },
    include: { memberships: { where: { organization_id: input.organizationId } } },
  });
  if (existingUser && existingUser.memberships.length > 0) {
    throw new EmailInUseError("This person is already a member of the organization.");
  }

  // Supersede any prior pending invite for the same email + org.
  await prisma.invitation.updateMany({
    where: { organization_id: input.organizationId, email, status: "pending" },
    data: { status: "revoked" },
  });

  const invitation = await prisma.invitation.create({
    data: {
      organization_id: input.organizationId,
      clinic_id: input.clinicId,
      email,
      full_name: fullName,
      role: input.role,
      specialty: input.role === "doctor" ? (input.specialty?.trim() || null) : null,
      token: randomBytes(24).toString("hex"),
    },
  });

  await publishEvent({
    eventType: "staff.invited",
    organizationId: input.organizationId,
    entityId: invitation.id,
    correlationId: invitation.id,
    actorId: input.actorUserId,
    payload: { invitationId: invitation.id, email: invitation.email, role: invitation.role },
  });

  return invitation;
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
  if (invitation.status !== "pending") {
    throw new InvitationNotPendingError("This invitation has already been used or revoked.");
  }
  if (await prisma.user.findFirst({ where: { email: invitation.email } })) {
    throw new EmailInUseError("An account with this email already exists — please sign in.");
  }

  const password_hash = await hashPassword(input.password);
  const role = invitation.role as InviteRole;

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        role,
        email: invitation.email,
        password_hash,
        phone_number: `staff:${randomBytes(8).toString("hex")}`,
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
