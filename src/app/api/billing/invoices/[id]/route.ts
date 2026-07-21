import { NextRequest } from 'next/server';
import { badRequest, mapDomainError, notFound, ok, serverError } from '@/api/http';
import { requireStaffContext } from '@/api/session';
import { getInvoice, transitionInvoice } from '@/services/billing-service';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaffContext('reception');
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const invoice = await getInvoice(id);
    if (!invoice || invoice.clinic_id !== auth.clinicId) {
      return notFound(`Invoice ${id} not found.`);
    }
    return ok(invoice);
  } catch (error) {
    return serverError('Error fetching invoice', error);
  }
}

// PATCH { action: "issue" | "void" } — invoice status moves outside of payment
// recording (see billing-service / invoice-status). S1 Batch B: the legacy
// "add_item" charge/discount write was retired — charges are ServiceEvents and
// discounts are Concessions, both via the Checkout Workspace.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaffContext('reception');
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (action !== 'issue' && action !== 'void') {
      return badRequest('action must be "issue" or "void".');
    }

    const invoice = await transitionInvoice(
      id,
      auth.clinicId,
      action === 'issue' ? 'issued' : 'void'
    );
    return ok(invoice);
  } catch (error) {
    return mapDomainError(error) ?? serverError('Error updating invoice', error);
  }
}
