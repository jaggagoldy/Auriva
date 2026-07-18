import { redirect } from "next/navigation";
import { getCurrentSession } from "@/api/session";
import { isPatient } from "@/domain/authorization";
import { resolveLanding, switchWorkspace } from "@/services/workspace-service";
import { requirePasswordChanged } from "@/lib/require-password-changed";
import { WorkspaceSelector } from "@/components/workspace/workspace-selector";

// APS-045 §7 — the post-login landing hub. Resolves WHICH workspace (the
// decision tree in resolveLanding) and opens the resolved surface directly, or
// shows the Workspace Selector when there is a real choice to make. The Selector
// only chooses which workspace; the screen always comes from resolveSurface.
export default async function WorkspaceHubPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  // Patients never route through here — they live in the patient world.
  if (isPatient(session.role)) redirect("/patient");
  // A provisioned account must set its own password before any workspace opens.
  await requirePasswordChanged(session.userId);

  const landing = await resolveLanding(session);

  if (landing.mode === "direct") {
    // Scope the session to the chosen membership (single / remembered) before
    // landing — session-preserving, no re-auth. switchWorkspace is caller-scoped
    // so this can only ever set a membership the caller actually holds.
    if (landing.activeMembershipId && landing.activeMembershipId !== session.activeMembershipId) {
      await switchWorkspace({
        sessionId: session.sessionId,
        userId: session.userId,
        membershipId: landing.activeMembershipId,
      });
    }
    redirect(landing.surfacePath ?? "/login");
  }

  return <WorkspaceSelector workspaces={landing.workspaces} />;
}
