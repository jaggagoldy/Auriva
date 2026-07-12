import { NextRequest } from 'next/server';
import { notFound, ok, serverError } from '@/api/http';
import { requirePatientContext, requireStaffContext } from '@/api/session';
import {
  canAccessAdminPortal,
  canAccessDoctorWorkspace,
  canAccessReception,
} from '@/domain/authorization';
import { listLabOrdersForPatient } from '@/services/lab-service';

const canViewLabs = (role: string) =>
  canAccessReception(role) || canAccessDoctorWorkspace(role) || canAccessAdminPortal(role);

// GET a patient's own lab orders — same "see your own record" principle as
// the invoices route (APS-029 Part I A4/A8).
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const patientAuth = await requirePatientContext();
    if (patientAuth.ok) {
      // DATA-3: standardized to 404 (not 403) — see the invoices route's
      // identical comment; matches the codebase-wide cross-identity
      // convention (hide existence rather than confirm-with-403).
      if (patientAuth.healthcareProfileId !== id) {
        return notFound(`Patient profile ${id} not found.`);
      }
      return ok(await listLabOrdersForPatient(id));
    }

    const staffAuth = await requireStaffContext(canViewLabs);
    if (!staffAuth.ok) return staffAuth.response;

    const all = await listLabOrdersForPatient(id);
    return ok(all.filter((order) => order.clinic_id === staffAuth.clinicId));
  } catch (error) {
    return serverError('Error fetching lab orders', error);
  }
}
