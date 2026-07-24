import { redirect } from "next/navigation";

// The /staff surface's entry point. `resolveSurfacePath` returns "/staff" as the
// canonical surface path (Reception + Technician). PKG-4 makes the front-desk
// board the surface's home ("keep the room moving"); every other segment
// (calendar, billing/Desk, lab, patients) is a sub-page. The old dashboard
// remains reachable at /staff/dashboard but is no longer the landing.
export default function StaffIndexPage() {
  redirect("/staff/queue");
}
