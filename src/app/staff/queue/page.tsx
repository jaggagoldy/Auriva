import type { Metadata } from "next";
import { Suspense } from "react";

import QueueBoard from "@/components/staff/queue-board";

export const metadata: Metadata = {
  title: "Queue Board · Aegis Clinic OS",
  description: "Live patient queue for today's appointments.",
};

export default function StaffQueuePage() {
  return (
    <Suspense fallback={null}>
      <QueueBoard />
    </Suspense>
  );
}
