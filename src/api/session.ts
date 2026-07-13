// Minimal server-side session for the new /staff surface (Sprint 1).
//
// Scope: this proves *who is calling* and *which clinic they belong to* for
// the new reception endpoints and /staff/* pages. Staff login (/api/auth/login)
// now verifies a real scrypt-hashed password and an is_active gate (APS-040);
// patient login is OTP-based (/api/auth/otp/*). This module governs the session
// that both establish, not the credential check itself.

import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { forbidden, unauthorized } from "@/api/http";
import {
  isSuperAdmin,
  isPatient,
  isDoctor,
  canAccessReception,
  effectiveCapabilities,
  type Capability,
} from "@/domain/authorization";

export const SESSION_COOKIE_NAME = "auriva_staff_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours — a work shift

export type StaffRole = "receptionist" | "super_admin";

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Creates a Session row and returns the raw token to be set as a cookie.
 * `activeHealthcareProfileId` is patient-only (APS-029/010 Part I A1): which
 * Healthcare Profile this session is currently "acting as" — an Account can
 * be linked to more than one profile (family sharing a phone).
 */
export async function createSession(
  userId: string,
  role: string,
  activeHealthcareProfileId?: string | null
) {
  const rawToken = randomBytes(32).toString("hex");
  const expires_at = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: {
      user_id: userId,
      role,
      token_hash: hashToken(rawToken),
      expires_at,
      active_healthcare_profile_id: activeHealthcareProfileId ?? null,
    },
  });

  return { rawToken, expires_at };
}

export async function setSessionCookie(rawToken: string, expiresAt: Date) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Every active (non-expired) Session row for an account — backs Patient
 * Settings' "Sign-in & security" list, folding in what the mockup calls
 * "Linked devices" as the same real list rather than a second, thinner
 * screen with no data of its own.
 */
export async function listSessionsForUser(userId: string) {
  return prisma.session.findMany({
    where: { user_id: userId, expires_at: { gt: new Date() } },
    orderBy: { created_at: "desc" },
  });
}

/** Revokes one session — scoped to `ownerUserId` so a caller can only ever sign out their own sessions, never anyone else's. */
export async function revokeSession(sessionId: string, ownerUserId: string) {
  await prisma.session.deleteMany({ where: { id: sessionId, user_id: ownerUserId } });
}

/** Deletes the Session row backing the current cookie, then clears it. */
export async function destroyCurrentSession() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (rawToken) {
    await prisma.session.deleteMany({ where: { token_hash: hashToken(rawToken) } });
  }
  cookieStore.delete(SESSION_COOKIE_NAME);
}

interface ActiveSession {
  sessionId: string;
  userId: string;
  role: string;
  activeHealthcareProfileId: string | null;
}

/** For Server Components (layouts/pages) guarding a route — no Request object available there. */
export async function getCurrentSession(): Promise<ActiveSession | null> {
  return readSession();
}

async function readSession(): Promise<ActiveSession | null> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!rawToken) return null;

  const session = await prisma.session.findUnique({
    where: { token_hash: hashToken(rawToken) },
  });
  if (!session || session.expires_at < new Date()) return null;

  return {
    sessionId: session.id,
    userId: session.user_id,
    role: session.role,
    activeHealthcareProfileId: session.active_healthcare_profile_id,
  };
}

type PatientAuthResult =
  | { ok: true; session: ActiveSession; healthcareProfileId: string }
  | { ok: false; response: NextResponse };

/**
 * Verifies the caller has an active patient session with a resolved active
 * Healthcare Profile. Mirrors requireStaffContext's shape for the patient
 * side (APS-029/010 Part I A1/A9) — never trusts a client-supplied profile
 * id, always resolves it from the session itself.
 */
export async function requirePatientContext(): Promise<PatientAuthResult> {
  const session = await readSession();
  if (!session) {
    return { ok: false, response: unauthorized("Sign in to continue.") };
  }
  if (!isPatient(session.role)) {
    return { ok: false, response: forbidden("Your role cannot access this resource.") };
  }
  if (!session.activeHealthcareProfileId) {
    return { ok: false, response: forbidden("No active Healthcare Profile on this session.") };
  }
  return { ok: true, session, healthcareProfileId: session.activeHealthcareProfileId };
}

/**
 * Changes which Healthcare Profile a patient session is "acting as" — the
 * server-side half of the Family Profile Selector / Profile Switcher.
 * Callers must have already verified the account is actually linked to
 * `profileId` (via Account_Profile_Links) before calling this.
 */
export async function setActiveHealthcareProfile(sessionId: string, profileId: string) {
  await prisma.session.update({
    where: { id: sessionId },
    data: { active_healthcare_profile_id: profileId },
  });
}

type StaffAuthResult =
  | { ok: true; session: ActiveSession; clinicId: string; capabilities: Capability[] }
  | { ok: false; response: NextResponse };

/**
 * Batch 2 (Adaptive Workspace): a route authorizes EITHER with a legacy role
 * predicate `(role) => boolean` (all pre-Sprint-2 call sites — unchanged
 * behavior) OR with a `Capability` string, which is checked against the
 * caller's EFFECTIVE capabilities (role defaults ∪ their StaffProfile grants).
 * The capability form is what lets a solo practitioner — a doctor granted
 * `reception` — pass the front-desk guards a plain doctor role would fail.
 */
export type StaffAuthorize = Capability | ((role: string) => boolean);

function isStaffAuthorized(
  authorize: StaffAuthorize,
  role: string,
  capabilities: Capability[]
): boolean {
  return typeof authorize === "function" ? authorize(role) : capabilities.includes(authorize);
}

/**
 * Verifies the caller has an active session authorized for the given
 * predicate/capability, and resolves the clinic they're scoped to. Profile-
 * holding staff (receptionists, doctors) are always scoped to their own
 * StaffProfile's clinic (client-supplied clinic_id is ignored, to prevent
 * cross-clinic access) and their grants are read from that profile;
 * super_admins hold every default capability and may operate on any clinic
 * they own, validated against `Clinic.super_admin_id`.
 */
export async function requireStaffContext(
  authorize: StaffAuthorize,
  requestedClinicId?: string | null
): Promise<StaffAuthResult> {
  const session = await readSession();
  if (!session) {
    return { ok: false, response: unauthorized("Sign in to continue.") };
  }

  // Staff with a profile (receptionists AND doctors, APS-040) are always
  // scoped to their own clinic — a client-supplied clinic_id is ignored. The
  // profile also carries their capability grants (Batch 2), so it is loaded
  // before the authorization decision.
  if (!isSuperAdmin(session.role)) {
    const staffProfile = await prisma.staffProfile.findUnique({
      where: { user_id: session.userId },
    });
    if (!staffProfile) {
      return { ok: false, response: forbidden("No staff profile is linked to this account.") };
    }
    // BRD-043 Sprint 4: a suspended or archived member is denied at the
    // request boundary regardless of a still-live session — defense-in-depth
    // alongside session revocation + the is_active login gate. The Owner
    // (super_admin) never reaches this branch and can't be suspended.
    if (staffProfile.membership_status !== "active") {
      return { ok: false, response: forbidden("This account is not active. Contact your practice owner.") };
    }
    const capabilities = effectiveCapabilities(session.role, staffProfile.capabilities);
    if (!isStaffAuthorized(authorize, session.role, capabilities)) {
      return { ok: false, response: forbidden("Your role cannot access this resource.") };
    }
    return { ok: true, session, clinicId: staffProfile.clinic_id, capabilities };
  }

  // super_admin: holds every default capability; must operate within a clinic
  // they own.
  const capabilities = effectiveCapabilities(session.role, null);
  if (!isStaffAuthorized(authorize, session.role, capabilities)) {
    return { ok: false, response: forbidden("Your role cannot access this resource.") };
  }

  if (requestedClinicId) {
    const clinic = await prisma.clinic.findFirst({
      where: { id: requestedClinicId, super_admin_id: session.userId },
    });
    if (!clinic) {
      return { ok: false, response: forbidden("You do not have access to this clinic.") };
    }
    return { ok: true, session, clinicId: clinic.id, capabilities };
  }

  const firstClinic = await prisma.clinic.findFirst({
    where: { super_admin_id: session.userId },
    orderBy: { name: "asc" },
  });
  if (!firstClinic) {
    return { ok: false, response: forbidden("No clinic is associated with this account.") };
  }
  return { ok: true, session, clinicId: firstClinic.id, capabilities };
}

/**
 * Resolves the caller's effective capabilities for the adaptive workspace UI
 * (server components / layouts) — the same set requireStaffContext computes,
 * but without a clinic scope decision. Returns an empty list for an
 * unauthenticated or profile-less non-owner account.
 */
export async function getEffectiveCapabilitiesForSession(
  session: Pick<ActiveSession, "userId" | "role">
): Promise<Capability[]> {
  if (isSuperAdmin(session.role)) {
    return effectiveCapabilities(session.role, null);
  }
  const staffProfile = await prisma.staffProfile.findUnique({
    where: { user_id: session.userId },
    select: { capabilities: true },
  });
  return effectiveCapabilities(session.role, staffProfile?.capabilities ?? null);
}

type AppointmentScope =
  | { kind: "patient"; patientId: string }
  | { kind: "doctor"; doctorId: string }
  | { kind: "clinic"; clinicId: string };

type AppointmentAccessResult =
  | { ok: true; session: ActiveSession; scope: AppointmentScope }
  | { ok: false; response: NextResponse };

/**
 * SEC-1: GET /api/appointments is the one endpoint three different actor
 * types legitimately call, each with a different scoping rule — a patient
 * may only see their own appointments, a doctor only their own, reception/
 * super_admin only their clinic's. For the patient/doctor branches, a
 * client-supplied filter that doesn't match the caller's own scope is
 * rejected (403) rather than silently narrowed. The clinic/reception branch
 * delegates to requireStaffContext, which follows its own established
 * convention instead: a clinic-bound staff member's supplied clinic_id is
 * ignored (they're always scoped to their own clinic, never rejected for
 * asking about a different one); only a super_admin's requested clinic_id
 * is checked, against clinics they actually own.
 */
export async function requireAppointmentAccess(requested: {
  patientId?: string | null;
  doctorId?: string | null;
  clinicId?: string | null;
}): Promise<AppointmentAccessResult> {
  const session = await readSession();
  if (!session) {
    return { ok: false, response: unauthorized("Sign in to continue.") };
  }

  if (isPatient(session.role)) {
    if (!session.activeHealthcareProfileId) {
      return { ok: false, response: forbidden("No active Healthcare Profile on this session.") };
    }
    if (requested.patientId && requested.patientId !== session.activeHealthcareProfileId) {
      return { ok: false, response: forbidden("You may only access your own appointments.") };
    }
    return {
      ok: true,
      session,
      scope: { kind: "patient", patientId: session.activeHealthcareProfileId },
    };
  }

  if (isDoctor(session.role)) {
    const staffProfile = await prisma.staffProfile.findUnique({
      where: { user_id: session.userId },
    });
    if (!staffProfile) {
      return { ok: false, response: forbidden("No staff profile is linked to this account.") };
    }
    if (requested.doctorId && requested.doctorId !== staffProfile.id) {
      return { ok: false, response: forbidden("You may only access your own appointments.") };
    }
    return { ok: true, session, scope: { kind: "doctor", doctorId: staffProfile.id } };
  }

  if (canAccessReception(session.role)) {
    const staffAuth = await requireStaffContext(canAccessReception, requested.clinicId);
    if (!staffAuth.ok) {
      return { ok: false, response: staffAuth.response };
    }
    return { ok: true, session: staffAuth.session, scope: { kind: "clinic", clinicId: staffAuth.clinicId } };
  }

  return { ok: false, response: forbidden("Your role cannot access this resource.") };
}

type OrganizationAuthResult =
  | { ok: true; session: ActiveSession; organizationId: string }
  | { ok: false; response: NextResponse };

/**
 * Sprint 3 (OPS-001): the organization-level counterpart to
 * requireStaffContext — resolves which Organization the caller may operate
 * on (owner-only today, mirroring canAccessAdminPortal), instead of which
 * Clinic. Use this for org-wide operations (invitations, org settings,
 * departments, org-wide command center); keep using requireStaffContext,
 * unchanged, for anything clinic-scoped (reception, billing, queue).
 */
export async function requireOrganizationContext(
  authorize: (role: string) => boolean,
  requestedOrganizationId?: string | null
): Promise<OrganizationAuthResult> {
  const session = await readSession();
  if (!session) {
    return { ok: false, response: unauthorized("Sign in to continue.") };
  }
  if (!authorize(session.role)) {
    return { ok: false, response: forbidden("Your role cannot access this resource.") };
  }

  if (requestedOrganizationId) {
    const organization = await prisma.organization.findFirst({
      where: { id: requestedOrganizationId, owner_user_id: session.userId },
    });
    if (!organization) {
      return { ok: false, response: forbidden("You do not have access to this organization.") };
    }
    return { ok: true, session, organizationId: organization.id };
  }

  const firstOrganization = await prisma.organization.findFirst({
    where: { owner_user_id: session.userId },
    orderBy: { name: "asc" },
  });
  if (!firstOrganization) {
    return { ok: false, response: forbidden("No organization is associated with this account.") };
  }
  return { ok: true, session, organizationId: firstOrganization.id };
}

type PlatformAdminAuthResult =
  | { ok: true; session: ActiveSession }
  | { ok: false; response: NextResponse };

/**
 * APS-036: gates Release/Sprint authoring. Deliberately NOT
 * requireOrganizationContext/requireStaffContext — those resolve a
 * clinic/organization the caller owns, which has no meaning here (a
 * Release describes the Auriva platform itself, not any one customer's
 * clinic). Checks `User.is_platform_admin`, a flag never set by any
 * customer-facing signup/invite flow — separate from the `super_admin`
 * role, which means "owns a customer Organization" in this codebase.
 */
export async function requirePlatformAdminContext(): Promise<PlatformAdminAuthResult> {
  const session = await readSession();
  if (!session) {
    return { ok: false, response: unauthorized("Sign in to continue.") };
  }
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user?.is_platform_admin) {
    return { ok: false, response: forbidden("Your account cannot manage platform releases.") };
  }
  return { ok: true, session };
}
