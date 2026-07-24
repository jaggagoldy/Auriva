import { redirect } from "next/navigation";

// The standalone doctor-detail page is superseded by the Book tab, which opens
// the booking flow inline (2026-07-12). Deep links land on Book.
export default function DoctorDetailRedirect() {
  redirect("/patient/book");
}
