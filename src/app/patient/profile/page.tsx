import { redirect } from "next/navigation";

// Superseded by the You tab in the mobile-first patient app (2026-07-12).
export default function ProfileRedirect() {
  redirect("/patient/you");
}
