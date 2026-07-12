import { NextRequest } from 'next/server';
import { badRequest, mapDomainError, ok, serverError } from '@/api/http';
import { requireStaffContext } from '@/api/session';
import { createInvoice, listInvoices } from '@/services/billing-service';

// Billing module (APS-041). Reception + super_admin, always scoped to the
// caller's clinic — a client-supplied clinic_id is only meaningful for
// super_admins (validated inside requireStaffContext).

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const auth = await requireStaffContext('reception', searchParams.get('clinic_id'));
    if (!auth.ok) return auth.response;

    const invoices = await listInvoices({
      clinicId: auth.clinicId,
      status: searchParams.get('status'),
      patientId: searchParams.get('patient_id'),
      today: searchParams.get('today') === 'true',
    });
    return ok(invoices);
  } catch (error) {
    return serverError('Error fetching invoices', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const auth = await requireStaffContext('reception', body.clinic_id);
    if (!auth.ok) return auth.response;

    if (!body.patient_id || !Array.isArray(body.items)) {
      return badRequest('patient_id and items are required.');
    }

    const invoice = await createInvoice({
      clinicId: auth.clinicId,
      patientId: body.patient_id,
      items: body.items,
    });
    return ok(invoice, 201);
  } catch (error) {
    return mapDomainError(error) ?? serverError('Error creating invoice', error);
  }
}
