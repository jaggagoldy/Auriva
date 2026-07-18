import { redirect } from "next/navigation";

// The /staff surface's entry point. `resolveSurfacePath` returns "/staff" as the
// canonical surface path (Reception + Technician), but the surface's real home
// is the dashboard — every other segment (queue, billing, lab, patients) is a
// sub-page. Without this, landing on "/staff" 404s (the segment has a layout but
// no page). Redirect keeps "/staff" as the stable surface identifier while
// rendering the dashboard.
export default function StaffIndexPage() {
  redirect("/staff/dashboard");
}
