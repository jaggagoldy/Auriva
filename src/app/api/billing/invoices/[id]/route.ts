import { NextRequest } from 'next/server';
import { badRequest, mapDomainError, notFound, ok, serverError } from '@/api/http';
import { requireStaffContext } from '@/api/session';
import { addInvoiceItem, getInvoice, transitionInvoice } from '@/services/billing-service';

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

// PATCH { action: "issue" | "void" } or { action: "add_item", description,
// qty, unit_price } — the only legal invoice moves outside of payment
// recording (see billing-service / invoice-status). A discount is just a
// line item with a negative unit_price.
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

    if (action === 'add_item') {
      const { description, qty, unit_price } = body;
      if (!description || qty === undefined || unit_price === undefined) {
        return badRequest('description, qty, and unit_price are required.');
      }
      const invoice = await addInvoiceItem(id, auth.clinicId, { description, qty, unit_price });
      return ok(invoice);
    }

    if (action !== 'issue' && action !== 'void') {
      return badRequest('action must be "issue", "void", or "add_item".');
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
