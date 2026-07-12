import type { Metadata } from "next";

import ReleasesConsole from "@/components/admin/releases-console";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Releases",
  description: "Draft, review, and publish Auriva platform release notes.",
};

export default function ReleasesPage() {
  return (
    <>
      <Toaster position="bottom-right" />
      <ReleasesConsole />
    </>
  );
}
