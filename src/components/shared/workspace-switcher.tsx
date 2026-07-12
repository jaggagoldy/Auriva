"use client";

import Link from "next/link";
import { Building2, ClipboardList, Stethoscope } from "lucide-react";

import { cn } from "@/lib/utils";
import { hasCapability, type Capability } from "@/domain/authorization";

// Batch 2 (Adaptive Workspace): the cross-workspace navigation that makes a
// solo practitioner's three surfaces feel like one. It renders ONLY when the
// signed-in account holds more than one workspace capability (i.e. a solo
// practitioner or an owner) — a plain receptionist or a plain doctor holds
// exactly one and sees nothing, so their workspace is unchanged. Each entry
// links to a real, capability-gated workspace; the switcher never grants
// access, it only surfaces what the caller's effective capabilities already
// permit.

type WorkspaceKey = Extract<Capability, "reception" | "doctor_workspace" | "admin_portal">;

const WORKSPACES: { key: WorkspaceKey; label: string; href: string; icon: typeof Building2 }[] = [
  { key: "doctor_workspace", label: "Clinical", href: "/doctor", icon: Stethoscope },
  { key: "reception", label: "Front Desk", href: "/staff/dashboard", icon: ClipboardList },
  { key: "admin_portal", label: "Organization", href: "/admin/command-center", icon: Building2 },
];

export default function WorkspaceSwitcher({
  capabilities,
  current,
}: {
  capabilities: Capability[];
  current: WorkspaceKey;
}) {
  const available = WORKSPACES.filter((w) => hasCapability(w.key, capabilities));
  if (available.length < 2) return null; // single-workspace accounts see no switcher

  return (
    <div className="border-b px-3 py-2.5">
      <div className="mb-1.5 px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Workspace
      </div>
      <div className="grid grid-cols-1 gap-0.5">
        {available.map(({ key, label, href, icon: Icon }) => {
          const isCurrent = key === current;
          return (
            <Link
              key={key}
              href={href}
              aria-current={isCurrent ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
                isCurrent
                  ? "bg-primary/10 font-semibold text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-3.5 shrink-0" />
              <span className="flex-1">{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
