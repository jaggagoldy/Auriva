import type { Metadata } from "next";

import Departments from "@/components/admin/departments";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Departments",
  description: "Organize staff into departments with heads and default pricing.",
};

export default function DepartmentsPage() {
  return (
    <>
      <Toaster position="bottom-right" />
      <Departments />
    </>
  );
}
