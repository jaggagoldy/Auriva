import { NextRequest } from 'next/server';
import { notFound, ok, serverError } from '@/api/http';
import { deleteTimeBlock } from '@/services/availability-service';
import { requireStaffContext } from '@/api/session';
import { canAccessDoctorWorkspace, isDoctor } from '@/domain/authorization';
import prisma from '@/lib/prisma';

// Batch 4 (Personal Time Blocking): remove one of a doctor's own blocks. Same
// self-or-owning-super_admin guard as the collection route; deleteTimeBlock is
// additionally scoped to the doctor, so a wrong owner can never remove it.
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; blockId: string }> }
) {
  try {
    const { id, blockId } = await params;
    const auth = await authorizeTimeBlockAccess(id);
    if (!auth.ok) return auth.response;

    const removed = await deleteTimeBlock(id, blockId);
    if (!removed) {
      return notFound(`Time block ${blockId} not found.`);
    }
    return ok({ success: true });
  } catch (error) {
    return serverError('Error deleting time block', error);
  }
}
