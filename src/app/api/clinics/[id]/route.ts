import { NextRequest } from 'next/server';
import { mapDomainError, notFound, ok, serverError } from '@/api/http';
import { requireStaffContext } from '@/api/session';
import { canAccessAdminPortal } from '@/domain/authorization';
import { updateClinicSettings } from '@/services/clinic-service';
import prisma from '@/lib/prisma';

// GET/PATCH a single clinic's own profile + operational policy settings
// (Sprint 3 — working hours, slot duration, buffer, double-booking/walk-in
// policy, cancellation window, default fee). Clinic-scoped, so reuses the
// existing requireStaffContext unchanged (an owner is already
// Clinic.super_admin_id on every branch they create).
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireStaffContext(canAccessAdminPortal, id);
    if (!auth.ok) return auth.response;

    const clinic = await prisma.clinic.findUnique({ where: { id: auth.clinicId } });
    if (!clinic) return notFound(`Clinic ${id} not found.`);
    return ok(clinic);
  } catch (error) {
    return serverError('Error fetching clinic', error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireStaffContext(canAccessAdminPortal, id);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const updated = await updateClinicSettings(auth.clinicId, body);
    return ok(updated);
  } catch (error) {
    return mapDomainError(error) ?? serverError('Error updating clinic', error);
  }
}
