import { NextRequest } from 'next/server';
import { badRequest, mapDomainError, notFound, ok, serverError } from '@/api/http';
import { createTimeBlock, listTimeBlocks } from '@/services/availability-service';
import { requireStaffContext } from '@/api/session';
import { canAccessDoctorWorkspace, isDoctor } from '@/domain/authorization';
import prisma from '@/lib/prisma';

// Batch 4 (Personal Time Blocking): a doctor's own date-specific time off.
// Same self-or-owning-super_admin rule as the availability grid — a doctor
// manages only their own blocks; a super_admin who owns the clinic may too.
async function authorizeTimeBlockAccess(doctorId: string) {
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authorizeTimeBlockAccess(id);
    if (!auth.ok) return auth.response;
    return ok(await listTimeBlocks(id));
  } catch (error) {
    return serverError('Error fetching time blocks', error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await authorizeTimeBlockAccess(id);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    if (typeof body.start_at !== 'string' || typeof body.end_at !== 'string') {
      return badRequest('start_at and end_at (ISO date-times) are required.');
    }

    const block = await createTimeBlock(id, {
      startAt: body.start_at,
      endAt: body.end_at,
      reason: typeof body.reason === 'string' ? body.reason : null,
    });
    return ok(block, 201);
  } catch (error) {
    return mapDomainError(error) ?? serverError('Error creating time block', error);
  }
}
