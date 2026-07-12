import { redirect } from "next/navigation";

// Folded into Home (next visit) + Records (timeline) in the mobile-first
// patient app (2026-07-12) — the approved mockup has no separate Care screen.
export default function CareRedirect() {
  redirect("/patient");
}
