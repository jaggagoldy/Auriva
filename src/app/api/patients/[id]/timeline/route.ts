import { NextRequest } from 'next/server';
import { notFound, ok, serverError } from '@/api/http';
import { requireStaffContext } from '@/api/session';
import {
  canAccessAdminPortal,
  canAccessDoctorWorkspace,
  canAccessReception,
} from '@/domain/authorization';
import { getPatientTimeline } from '@/services/timeline-service';

// Patient timeline (APS-046) — the aggregated history for one patient within
// the caller's clinic. Any staff of the clinic (reception, doctor, owner)
// may read it; timeline events are scoped to that clinic.
const canViewTimeline = (role: string) =>
  canAccessReception(role) || canAccessDoctorWorkspace(role) || canAccessAdminPortal(role);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaffContext(canViewTimeline);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const timeline = await getPatientTimeline(id, auth.clinicId);
    if (!timeline) return notFound(`Patient ${id} not found.`);
    return ok(timeline);
  } catch (error) {
    return serverError('Error building patient timeline', error);
  }
}
