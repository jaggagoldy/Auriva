"use client";

// PAT-1 (Release 1.2 Sprint 1) — in-app patient notification center.
// Mirrors src/components/shared/whats-new.tsx's bell + sheet pattern (same
// polling-badge, open-to-mark-read interaction shape) rather than inventing
// a new UI pattern for this sprint.

import * as React from "react";
import { Bell, CalendarCheck, CalendarClock, CalendarX, FlaskConical, ReceiptText, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { usePatientSession } from "@/components/patient/patient-session";

type NotificationType =
  | "appointment_booked"
  | "appointment_rescheduled"
  | "appointment_cancelled"
  | "invoice_issued"
  | "lab_result_ready"
  | "review_prompt";

interface PatientNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  created_at: string;
  read_at: string | null;
}

const TYPE_META: Record<NotificationType, { icon: React.ComponentType<{ className?: string }> }> = {
  appointment_booked: { icon: CalendarCheck },
  appointment_rescheduled: { icon: CalendarClock },
  appointment_cancelled: { icon: CalendarX },
  invoice_issued: { icon: ReceiptText },
  lab_result_ready: { icon: FlaskConical },
  review_prompt: { icon: Star },
};

export default function NotificationCenter() {
  const { patientProfile } = usePatientSession();
  const [open, setOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<PatientNotification[] | null>(null);
  const [unreadCount, setUnreadCount] = React.useState(0);

  const load = React.useCallback(() => {
    fetch(`/api/patients/${patientProfile.id}/notifications`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { notifications: [], unreadCount: 0 }))
      .then((data) => setUnreadCount(data.unreadCount ?? 0))
      .catch(() => {});
  }, [patientProfile.id]);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) return;

    fetch(`/api/patients/${patientProfile.id}/notifications`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { notifications: [], unreadCount: 0 }))
      .then((data: { notifications: PatientNotification[]; unreadCount: number }) => {
        setNotifications(data.notifications);
        // Mark every currently-unread notification read — best-effort,
        // mirrors What's New's "mark viewed on open" behavior.
        data.notifications
          .filter((n) => !n.read_at)
          .forEach((n) => {
            fetch(`/api/patients/${patientProfile.id}/notifications/${n.id}`, {
              method: "PATCH",
            }).catch(() => {});
          });
        setUnreadCount(0);
      })
      .catch(() => setNotifications([]));
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Notifications"
        className="relative"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          handleOpenChange(true);
        }}
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 flex size-2.5 items-center justify-center rounded-full bg-primary" />
        )}
      </Button>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
          <SheetDescription>Updates about your appointments, bills, and lab results.</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-4">
          {notifications === null && (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
          {notifications?.length === 0 && (
            <p className="text-sm text-muted-foreground">No notifications yet.</p>
          )}
          {notifications?.map((n, i) => {
            const meta = TYPE_META[n.type];
            const Icon = meta.icon;
            return (
              <div key={n.id}>
                {i > 0 && <Separator className="mb-4" />}
                <div className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
                      !n.read_at ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <div className="flex-1">
                    <p className="text-[13px] font-medium">{n.title}</p>
                    <p className="text-[12.5px] text-muted-foreground">{n.message}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {new Date(n.created_at).toLocaleString("en-US", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
