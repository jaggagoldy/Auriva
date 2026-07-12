import { NextRequest } from 'next/server';
import { notFound, ok, serverError } from '@/api/http';
import { requirePatientContext, requireStaffContext } from '@/api/session';
import {
  canAccessAdminPortal,
  canAccessDoctorWorkspace,
  canAccessReception,
} from '@/domain/authorization';
import { listInvoicesForPatient } from '@/services/billing-service';

const canViewBilling = (role: string) =>
  canAccessReception(role) || canAccessDoctorWorkspace(role) || canAccessAdminPortal(role);

// GET a patient's own invoices — "see your own bill" is a right, not a
// sharing question (APS-029 Part I A4/A8), so a patient session viewing
// their OWN active profile never needs a clinic grant. Staff may also read
// it (scoped to their own clinic) for the reception/admin billing views.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const patientAuth = await requirePatientContext();
    if (patientAuth.ok) {
      // DATA-3: standardized to 404 (not 403) — matches every other
      // cross-identity check in the codebase (appointments, doctor/patient
      // profiles): hide that another patient's resource exists at all,
      // rather than confirming it with a 403.
      if (patientAuth.healthcareProfileId !== id) {
        return notFound(`Patient profile ${id} not found.`);
      }
      return ok(await listInvoicesForPatient(id));
    }

    const staffAuth = await requireStaffContext(canViewBilling);
    if (!staffAuth.ok) return staffAuth.response;

    const all = await listInvoicesForPatient(id);
    return ok(all.filter((inv) => inv.clinic_id === staffAuth.clinicId));
  } catch (error) {
    return serverError('Error fetching invoices', error);
  }
}
