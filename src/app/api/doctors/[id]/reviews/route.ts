import { NextRequest } from 'next/server';
import { ok, serverError, unauthorized } from '@/api/http';
import { listDoctorReviews } from '@/services/review-service';
import { getCurrentSession } from '@/api/session';

function firstNameLastInitial(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

// Real patient reviews for Doctor Details — gated the same way GET
// /api/doctors is (any signed-in session, cross-clinic browsing data).
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return unauthorized('Sign in to continue.');
    }

    const { id } = await params;
    const reviews = await listDoctorReviews(id);
    return ok(
      reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        // First name + last-initial only — a reviewer's full name isn't
        // this endpoint's business to expose to every signed-in caller.
        patientName: firstNameLastInitial(r.patient.full_name),
      }))
    );
  } catch (error) {
    return serverError('Error fetching doctor reviews', error);
  }
}
