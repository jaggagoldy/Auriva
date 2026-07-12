import { redirect } from "next/navigation";

import { getCurrentSession } from "@/api/session";
import {
  canAccessAdminPortal,
  canAccessDoctorWorkspace,
  canAccessReception,
} from "@/domain/authorization";

// Clinical Printing (Sprint 2) — deliberately its own route tree, outside
// /staff and /doctor: a printable document should be a bare page (no
// sidebar/shell chrome to accidentally print), reachable by anyone who could
// already see the underlying record (reception, doctor, admin).
export default async function PrintLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  const allowed =
    session &&
    (canAccessReception(session.role) ||
      canAccessDoctorWorkspace(session.role) ||
      canAccessAdminPortal(session.role));
  if (!allowed) {
    redirect("/login");
  }

  return (
    <div className="mx-auto min-h-dvh max-w-[720px] bg-white px-10 py-10 text-[13px] leading-relaxed text-black print:px-0 print:py-0">
      {children}
    </div>
  );
}
