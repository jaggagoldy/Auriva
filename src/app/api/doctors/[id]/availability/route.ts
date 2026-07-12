import { NextRequest } from 'next/server';
import { mapDomainError, notFound, ok, serverError } from '@/api/http';
import { getAvailability, setAvailability } from '@/services/availability-service';
import { requireStaffContext } from '@/api/session';
import { canAccessDoctorWorkspace, isDoctor } from '@/domain/authorization';
import prisma from '@/lib/prisma';

// SEC-1/SEC-2: same self-or-owning-super_admin rule as GET/PATCH
// /api/doctors/[id] — a doctor's own working-hours grid, editable only by
// that doctor (or a super_admin who owns their clinic).
async function authorizeAvailabilityAccess(doctorId: string) {
  const staffProfile = await prisma.staffProfile.findUnique({
    where: { id: doctorId },
    select: { user_id: true, clinic_id: true },
  });
  if (!staffProfile) {
    return { ok: false as const, response: notFound(`Doctor profile ${doctorId} not found.`) };
  }
  const auth = await requireStaffContext(canAccessDoctorWorkspace, staffProfile.clinic_id);
  if (!auth.ok) return auth;
  if (isDoctor(auth.session.role) && auth.session.userId !== staffProfile.user_id) {
    return { ok: false as const, response: notFound(`Doctor profile ${doctorId} not found.`) };
  }
  return auth;
}

// GET/PUT a doctor's weekly working-hours grid (Sprint 3 — replaces the
// "Availability... coming soon" placeholder with real, persisted data).
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authorizeAvailabilityAccess(id);
    if (!auth.ok) return auth.response;
    return ok(await getAvailability(id));
  } catch (error) {
    return serverError('Error fetching availability', error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authorizeAvailabilityAccess(id);
    if (!auth.ok) return auth.response;
    const body = await request.json();
    const entries = Array.isArray(body.entries) ? body.entries : [];
    return ok(await setAvailability(id, entries));
  } catch (error) {
    return mapDomainError(error) ?? serverError('Error saving availability', error);
  }
}
