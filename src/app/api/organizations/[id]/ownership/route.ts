import { NextRequest } from "next/server";
import { badRequest, forbidden, ok, serverError } from "@/api/http";
import { requireLegalOwnerContext } from "@/api/session";
import {
  promoteToOwner,
  transferOwnership,
  listOwners,
  NotLegalOwnerError,
  InvalidOwnershipTargetError,
} from "@/services/ownership-service";

// Batch D · D3 — Ownership & Operational Authority. Every action here is
// LEGAL-owner-only: requireLegalOwnerContext refuses operational owners and
// Practice Managers even though they administer everything else.
//   GET  → the org's owners (the legal owner + any operational owners)
//   POST { action: "promote" | "transfer", userId }
//        promote  → grant a member shared operational ownership
//        transfer → hand over legal ownership (the A-promotes-B-then-leaves flow)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await requireLegalOwnerContext(id);
    if (!auth.ok) return auth.response;
    return ok({ owners: await listOwners(auth.organizationId) });
  } catch (error) {
    return serverError("Error loading owners", error);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await requireLegalOwnerContext(id);
    if (!auth.ok) return auth.response;

    const body = await request.json().catch(() => ({}));
    const userId = typeof body.userId === "string" ? body.userId : null;
    if (!userId) return badRequest("userId is required.");

    if (body.action === "transfer") {
      await transferOwnership({
        organizationId: auth.organizationId,
        actorUserId: auth.session.userId,
        newOwnerUserId: userId,
      });
      return ok({ transferred: true });
    }
    if (body.action === "promote") {
      const member = await promoteToOwner({
        organizationId: auth.organizationId,
        actorUserId: auth.session.userId,
        targetUserId: userId,
      });
      return ok({ promoted: true, memberId: member.id });
    }
    return badRequest('action must be "promote" or "transfer".');
  } catch (error) {
    if (error instanceof NotLegalOwnerError) return forbidden(error.message);
    if (error instanceof InvalidOwnershipTargetError) return badRequest(error.message);
    return serverError("Error updating ownership", error);
  }
}
