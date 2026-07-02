import { STATUS_META, AppointmentStatus } from "@/shared/queue";
import { cn } from "@/lib/utils";

interface SummaryCardsProps {
  totalToday: number;
  counts: Record<string, number>;
}

const HIGHLIGHTED: AppointmentStatus[] = ["waiting", "doctor_ready", "in_consultation", "completed"];

export default function SummaryCards({ totalToday, counts }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-5 gap-3">
      <StatTile label="Today's Appointments" value={totalToday} dot={null} />
      {HIGHLIGHTED.map((status) => (
        <StatTile
          key={status}
          label={STATUS_META[status].label}
          value={counts[status] ?? 0}
          dot={STATUS_META[status].dot}
        />
      ))}
    </div>
  );
}

function StatTile({ label, value, dot }: { label: string; value: number; dot: string | null }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <dt className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {dot && <span className={cn("size-1.5 rounded-full", dot)} />}
        {label}
      </dt>
      <dd className="mt-1.5 text-2xl leading-none font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
