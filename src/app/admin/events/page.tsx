import type { Metadata } from "next";

import EventHub from "@/components/admin/event-hub";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Event Platform",
  description: "Live event log, handler status, retries and replays.",
};

export default function EventHubPage() {
  return (
    <>
      <Toaster position="bottom-right" />
      <EventHub />
    </>
  );
}
