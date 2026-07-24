"use client";

import * as React from "react";
import { CheckCircle2, UserCheck, ArrowRight, ListFilter } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Appointment, STATUS_META, getInitials } from "@/shared/queue";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface ConsultationCompleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  completedPatientName: string;
  nextPatient: Appointment | null;
  onCallNext: (nextPatient: Appointment) => void;
  onViewQueue: () => void;
}

export function ConsultationCompleteModal({
  open,
  onOpenChange,
  completedPatientName,
  nextPatient,
  onCallNext,
  onViewQueue,
}: ConsultationCompleteModalProps) {
  const nextMeta = nextPatient ? STATUS_META[nextPatient.status] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="flex flex-col items-center text-center">
          <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-8" />
          </div>
          <DialogTitle className="text-xl font-bold">
            Consultation Completed!
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{completedPatientName}</span>&apos;s visit notes and e-prescription have been signed &amp; saved to record.
          </DialogDescription>
        </DialogHeader>

        {nextPatient ? (
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border bg-muted/40 p-4">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
                <span>Next Patient in Queue</span>
                <span className="font-mono text-foreground font-bold">Token #{nextPatient.queue_number ?? "—"}</span>
              </div>
              <div className="flex items-center gap-3">
                <Avatar className="size-10 rounded-lg">
                  <AvatarFallback className="rounded-lg text-xs font-semibold bg-primary/10 text-primary">
                    {getInitials(nextPatient.patient.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm truncate">
                      {nextPatient.patient.full_name}
                    </h4>
                    {nextMeta && (
                      <Badge className={`text-[10px] px-1.5 py-0 ${nextMeta.badge}`}>
                        {nextMeta.label}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {nextPatient.chief_complaint ? `"${nextPatient.chief_complaint}"` : "Scheduled Consultation"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button
                size="lg"
                className="w-full gap-2 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => {
                  onOpenChange(false);
                  onCallNext(nextPatient);
                }}
              >
                <UserCheck className="size-4" />
                Call In {nextPatient.patient.full_name.split(" ")[0]}
                <ArrowRight className="size-4 ml-auto" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 text-xs"
                onClick={() => {
                  onOpenChange(false);
                  onViewQueue();
                }}
              >
                <ListFilter className="size-3.5" />
                View Patient Queue
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4 text-center">
            <div className="rounded-xl border bg-emerald-50 dark:bg-emerald-950/20 p-4 border-emerald-200 dark:border-emerald-900/40">
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                🎉 All consultations for today are finished! Great work.
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                onOpenChange(false);
                onViewQueue();
              }}
            >
              Back to Patient Queue
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
