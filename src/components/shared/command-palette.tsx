"use client";

// Milestone 1 (2.1/2.2) — the shared global ⌘K / Ctrl+K command palette, reused
// across Admin, Reception, and Doctor. Two kinds of results, both real:
//   • static "jump to" nav destinations (per surface), and
//   • a live, TENANT-SCOPED patient search against the EXISTING identity-
//     resolution endpoint (GET /api/patients?scope=org&…). No new/duplicate API.
// Input-pattern detection routes the query: "AUR-…" → health_id, all-digits →
// phone, else → name. Keyboard nav (⌘K, arrows, Enter, Esc) comes from cmdk.

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CalendarDays,
  ClipboardList,
  FlaskConical,
  LayoutDashboard,
  Network,
  ReceiptText,
  Rocket,
  Settings,
  Stethoscope,
  User,
  Users,
  Webhook,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

interface PatientResult {
  id: string;
  full_name: string;
  health_id: string | null;
}

interface Destination {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
}

export type CommandSurface = "admin" | "staff" | "doctor";

const DESTINATIONS: Record<CommandSurface, Destination[]> = {
  admin: [
    { icon: Rocket, label: "Setup", href: "/admin/setup" },
    { icon: LayoutDashboard, label: "Insights · Overview", href: "/admin/command-center" },
    { icon: Building2, label: "People", href: "/admin" },
    { icon: Network, label: "Departments", href: "/admin/departments" },
    { icon: Stethoscope, label: "Live Queue", href: "/doctor" },
    { icon: ReceiptText, label: "Billing", href: "/staff/billing" },
    { icon: FlaskConical, label: "Diagnostics", href: "/staff/lab" },
    { icon: CalendarDays, label: "Walk-in Registration", href: "/staff/walkin" },
    { icon: Webhook, label: "Event Platform", href: "/admin/events" },
    { icon: Settings, label: "Organization Settings", href: "/admin/settings" },
  ],
  staff: [
    { icon: LayoutDashboard, label: "Front desk", href: "/staff/queue" },
    { icon: CalendarDays, label: "Calendar", href: "/staff/calendar" },
    { icon: ReceiptText, label: "Desk", href: "/staff/billing" },
    { icon: FlaskConical, label: "Lab Orders", href: "/staff/lab" },
  ],
  doctor: [
    { icon: Stethoscope, label: "Today", href: "/doctor" },
    { icon: ClipboardList, label: "Workbench", href: "/doctor/workbench" },
    { icon: CalendarDays, label: "Schedule", href: "/doctor/schedule" },
    { icon: Users, label: "Patients", href: "/doctor/patients" },
    { icon: Building2, label: "Practice", href: "/doctor/practice" },
    { icon: User, label: "Profile", href: "/doctor/profile" },
  ],
};

// Where a patient result opens, per surface (Doctor has its own record route).
const PATIENT_HREF: Record<CommandSurface, (id: string) => string> = {
  admin: (id) => `/staff/patients/${id}`,
  staff: (id) => `/staff/patients/${id}`,
  doctor: (id) => `/doctor/patients/${id}`,
};

/** Route the query to the right identity-resolution param. */
function buildSearchParam(raw: string): string {
  const q = raw.trim();
  if (/^aur-?[a-z0-9]/i.test(q)) return `health_id=${encodeURIComponent(q.toUpperCase())}`;
  const digits = q.replace(/[\s-]/g, "");
  if (/^\+?\d{6,}$/.test(digits)) return `phone=${encodeURIComponent(digits)}`;
  return `name=${encodeURIComponent(q)}`;
}

export default function CommandPalette({ surface }: { surface: CommandSurface }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [patients, setPatients] = React.useState<PatientResult[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  React.useEffect(() => {
    if (!open) {
      setSearch("");
      setPatients([]);
    }
  }, [open]);

  React.useEffect(() => {
    const query = search.trim();
    if (query.length < 2) {
      setPatients([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        // scope=org enforces tenant isolation on the shared identity endpoint.
        const res = await fetch(`/api/patients?scope=org&${buildSearchParam(query)}`, {
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setPatients(data.profiles ?? []);
      } catch {
        if (!cancelled) setPatients([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Search patients (name · phone · AUR-ID) or jump to…"
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>{loading ? "Searching…" : "No results found."}</CommandEmpty>

        {patients.length > 0 && (
          <>
            <CommandGroup heading="Patients">
              {patients.map((patient) => (
                <CommandItem
                  key={patient.id}
                  value={`patient-${patient.id}-${patient.full_name}-${patient.health_id ?? ""}`}
                  onSelect={() => go(PATIENT_HREF[surface](patient.id))}
                >
                  <User />
                  <span className="flex-1 truncate">{patient.full_name}</span>
                  {patient.health_id && (
                    <span className="text-xs text-muted-foreground">{patient.health_id}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Jump to">
          {DESTINATIONS[surface].map((dest) => (
            <CommandItem key={dest.href} value={dest.label} onSelect={() => go(dest.href)}>
              <dest.icon />
              {dest.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
