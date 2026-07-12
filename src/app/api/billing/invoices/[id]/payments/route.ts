import { NextRequest } from 'next/server';
import { badRequest, mapDomainError, ok, serverError } from '@/api/http';
import { requireStaffContext } from '@/api/session';
import { isPaymentMethod } from '@/domain/invoice-status';
import { recordPayment } from '@/services/billing-service';

// POST { amount, method, reference? } — records a payment; the invoice
// becomes `paid` when covered (WF-18).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireStaffContext('reception');
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const body = await request.json();

    if (typeof body.amount !== 'number') {
      return badRequest('amount (integer INR) is required.');
    }
    if (typeof body.method !== 'string' || !isPaymentMethod(body.method)) {
      return badRequest('method must be one of: cash, upi, card.');
    }

    const invoice = await recordPayment({
      invoiceId: id,
      clinicId: auth.clinicId,
      amount: body.amount,
      method: body.method,
      reference: body.reference ?? null,
      receivedByUserId: auth.session.userId,
    });
    return ok(invoice, 201);
  } catch (error) {
    return mapDomainError(error) ?? serverError('Error recording payment', error);
  }
}
