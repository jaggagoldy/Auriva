import { Stethoscope } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/shared/queue";

export interface DoctorLoad {
  id: string;
  full_name: string;
  specialty: string | null;
  waiting: number;
  in_consultation: number;
  total_today: number;
}

// Derived from today's appointments, not a true schedule/availability model
// — that's a later roadmap item (doctor scheduling). This shows who has a
// caseload today and how backed up their queue currently is.
export default function DoctorAvailabilityPanel({ doctors }: { doctors: DoctorLoad[] }) {
  if (doctors.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No doctors on the roster for this clinic yet.
      </p>
    );
  }

  return (
    <div className="divide-y">
      {doctors.map((doctor) => (
        <div key={doctor.id} className="flex items-center gap-3 py-3">
          <Avatar className="size-9">
            <AvatarFallback className="text-xs font-semibold">
              {getInitials(doctor.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{doctor.full_name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {doctor.specialty ?? "General"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {doctor.in_consultation > 0 && (
              <Badge className="gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                <Stethoscope className="size-3" />
                In consult
              </Badge>
            )}
            <Badge variant="outline" className="tabular-nums">
              {doctor.waiting} waiting
            </Badge>
            <span className="w-14 text-right text-xs text-muted-foreground tabular-nums">
              {doctor.total_today} today
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
