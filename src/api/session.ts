// Minimal server-side session for the new /staff surface (Sprint 1).
//
// Scope: this proves *who is calling* and *which clinic they belong to* for
// the new reception endpoints and /staff/* pages. It deliberately does not
// harden the underlying login check in /api/auth/login (still email+role,
// no password verification) — that remains the deferred "real identity"
// item from the architecture review. Patient OTP login is untouched.

import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isReceptionist } from "@/domain/authorization";

export const SESSION_COOKIE_NAME = "auriva_staff_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours — a work shift

export type StaffRole = "receptionist" | "super_admin";

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/** Creates a Session row and returns the raw token to be set as a cookie. */
export async function createSession(userId: string, role: string) {
  const rawToken = randomBytes(32).toString("hex");
  const expires_at = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: {
      user_id: userId,
      role,
      token_hash: hashToken(rawToken),
      expires_at,
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

  return { sessionId: session.id, userId: session.user_id, role: session.role };
}

type StaffAuthResult =
  | { ok: true; session: ActiveSession; clinicId: string }
  | { ok: false; response: NextResponse };

function unauthorized(message: string) {
  return NextResponse.json({ error: "Unauthorized", message }, { status: 401 });
}

function forbidden(message: string) {
  return NextResponse.json({ error: "Forbidden", message }, { status: 403 });
}

/**
 * Verifies the caller has an active session authorized by the given
 * capability predicate (see src/domain/authorization.ts), and resolves the
 * clinic they're scoped to. Receptionists are always scoped to their own
 * StaffProfile's clinic (client-supplied clinic_id is ignored, to prevent
 * cross-clinic access); super_admins may operate on any clinic they own,
 * validated against `Clinic.super_admin_id`.
 */
export async function requireStaffContext(
  authorize: (role: string) => boolean,
  requestedClinicId?: string | null
): Promise<StaffAuthResult> {
  const session = await readSession();
  if (!session) {
    return { ok: false, response: unauthorized("Sign in to continue.") };
  }
  if (!authorize(session.role)) {
    return { ok: false, response: forbidden("Your role cannot access this resource.") };
  }

  if (isReceptionist(session.role)) {
    const staffProfile = await prisma.staffProfile.findUnique({
      where: { user_id: session.userId },
    });
    if (!staffProfile) {
      return { ok: false, response: forbidden("No staff profile is linked to this account.") };
    }
    return { ok: true, session, clinicId: staffProfile.clinic_id };
  }

  // super_admin: must operate within a clinic they own.
  if (requestedClinicId) {
    const clinic = await prisma.clinic.findFirst({
      where: { id: requestedClinicId, super_admin_id: session.userId },
    });
    if (!clinic) {
      return { ok: false, response: forbidden("You do not have access to this clinic.") };
    }
    return { ok: true, session, clinicId: clinic.id };
  }

  const firstClinic = await prisma.clinic.findFirst({
    where: { super_admin_id: session.userId },
    orderBy: { name: "asc" },
  });
  if (!firstClinic) {
    return { ok: false, response: forbidden("No clinic is associated with this account.") };
  }
  return { ok: true, session, clinicId: firstClinic.id };
}
