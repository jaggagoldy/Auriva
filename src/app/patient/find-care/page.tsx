import { redirect } from "next/navigation";

// Superseded by the Book tab in the mobile-first patient app (2026-07-12).
export default function FindCareRedirect() {
  redirect("/patient/book");
}
