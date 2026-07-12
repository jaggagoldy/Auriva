"use client";

import * as React from "react";
import { Loader2, Plus, Trash2, CalendarOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// P2 (Doctor Calendar & Availability) — Holidays & time off. A "holiday" is a
// full-day DoctorTimeBlock; getBookableSlots already removes every slot a block
// covers, so patients can't book on a day off. Wired to the existing
// GET/POST/DELETE /api/doctors/[id]/time-blocks. (Partial blocks created by the
// calendar's quick slot-blocking show here too, with their time range.)

interface Block {
  id: string;
  start_at: string;
  end_at: string;
  reason: string | null;
}

function localDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatBlock(b: Block): string {
  const s = new Date(b.start_at);
  const e = new Date(b.end_at);
  const dateLabel = s.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  const hours = (e.getTime() - s.getTime()) / 3_600_000;
  if (hours >= 23 && s.getHours() === 0) return `${dateLabel} · all day`;
  const t = (d: Date) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${dateLabel} · ${t(s)}–${t(e)}`;
}

export function TimeOffSettings({ doctorId }: { doctorId: string | null }) {
  const [blocks, setBlocks] = React.useState<Block[] | null>(() => (doctorId ? null : []));
  const [date, setDate] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const reload = React.useCallback(async () => {
    if (!doctorId) return;
    const res = await fetch(`/api/doctors/${doctorId}/time-blocks`, { cache: "no-store" });
    setBlocks(res.ok ? await res.json() : []);
  }, [doctorId]);

  React.useEffect(() => {
    if (!doctorId) return;
    let cancelled = false;
    fetch(`/api/doctors/${doctorId}/time-blocks`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: Block[]) => { if (!cancelled) setBlocks(rows); });
    return () => { cancelled = true; };
  }, [doctorId]);

  async function addHoliday() {
    if (!doctorId) return toast.error("No doctor profile to update.");
    if (!date) return toast.error("Pick a date for the day off.");
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1); // full day → [00:00, next 00:00)
    setBusy(true);
    try {
      const res = await fetch(`/api/doctors/${doctorId}/time-blocks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start_at: start.toISOString(), end_at: end.toISOString(), reason: reason.trim() || "Holiday" }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(d.message ?? "Couldn't add the holiday."); return; }
      setDate("");
      setReason("");
      toast.success("Day off added");
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!doctorId) return;
    const res = await fetch(`/api/doctors/${doctorId}/time-blocks/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Removed"); await reload(); } else { toast.error("Couldn't remove that."); }
  }

  return (
    <Card className="space-y-4 p-5">
      <div>
        <h2 className="text-base font-semibold">Holidays &amp; time off</h2>
        <p className="text-xs text-muted-foreground">Block a day (or window) so patients can&apos;t book it. Great for holidays and leave.</p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Date</label>
          <Input type="date" min={localDateStr(new Date())} value={date} onChange={(e) => setDate(e.target.value)} className="h-9 w-44" />
        </div>
        <div className="min-w-[10rem] flex-1 space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Reason (optional)</label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Holiday, leave, conference…" className="h-9" />
        </div>
        <Button disabled={busy} onClick={addHoliday}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Add day off
        </Button>
      </div>

      {blocks === null ? (
        <div className="flex justify-center py-4 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
      ) : blocks.length === 0 ? (
        <p className="flex items-center gap-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          <CalendarOff className="size-4" /> No upcoming time off. You&apos;re bookable on every working day.
        </p>
      ) : (
        <div className="divide-y">
          {blocks.map((b) => (
            <div key={b.id} className="flex items-center gap-3 py-2.5">
              <div className="flex-1">
                <div className="text-sm font-medium">{formatBlock(b)}</div>
                {b.reason && <div className="text-xs text-muted-foreground">{b.reason}</div>}
              </div>
              <button
                onClick={() => remove(b.id)}
                className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label="Remove time off"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
