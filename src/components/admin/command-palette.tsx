"use client";

// Global ⌘K / Ctrl+K command palette for the Organization Workspace
// (APS-031 #6). Two kinds of results, both real: static "jump to" entries
// for the admin nav destinations, and a live patient search against the
// existing Identity Resolution endpoint (GET /api/patients?name=) — no
// invented data (e.g. invoice-number search isn't included: the billing API
// has no free-text lookup yet).

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CalendarDays,
  FlaskConical,
  LayoutDashboard,
  Network,
  ReceiptText,
  Rocket,
  Settings,
  Stethoscope,
  User,
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

const DESTINATIONS = [
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
];

export default function CommandPalette() {
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
        const res = await fetch(`/api/patients?name=${encodeURIComponent(query)}`, {
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
        placeholder="Search or jump to..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>
          {loading ? "Searching…" : "No results found."}
        </CommandEmpty>

        {patients.length > 0 && (
          <>
            <CommandGroup heading="Patients">
              {patients.map((patient) => (
                <CommandItem
                  key={patient.id}
                  value={`patient-${patient.id}-${patient.full_name}`}
                  onSelect={() => go(`/staff/patients/${patient.id}`)}
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
          {DESTINATIONS.map((dest) => (
            <CommandItem
              key={dest.href}
              value={dest.label}
              onSelect={() => go(dest.href)}
            >
              <dest.icon />
              {dest.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
