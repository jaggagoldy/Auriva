import type { Metadata } from "next";

import LiveQueue from "@/components/doctor/live-queue";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Live Queue · Aegis Clinic OS",
  description: "Real-time patient queue and consultation workspace.",
};

export default function DoctorQueuePage() {
  return (
    <>
      <Toaster position="bottom-right" />
      <LiveQueue />
    </>
  );
}
