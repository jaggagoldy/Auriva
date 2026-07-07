"use client";

// Shared Organization Workspace sidebar (Sprint 3, regrouped for APS-031 #6).
// Extracted so every admin surface shares one canonical navigation instead of
// each re-declaring their own. Grouped Operate/Manage/Understand/Configure per
// the APS-031 org-workspace mockup's IA — but only routes that are real today
// get a link; everything else keeps the existing `soon` disabled pattern
// rather than pointing at a page that doesn't exist yet.

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  BarChart3,
  Building2,
  CalendarDays,
  FlaskConical,
  LayoutDashboard,
  Network,
  ReceiptText,
  Rocket,
  Settings,
  ShieldCheck,
  Stethoscope,
  Users,
  Webhook,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type AdminNavKey =
  | "command-center"
  | "workspace"
  | "departments"
  | "settings"
  | "events"
  | "setup";

interface NavEntry {
  key?: AdminNavKey;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href?: string;
  soon?: boolean;
}

const GROUPS: { title: string; items: NavEntry[] }[] = [
  {
    title: "Operate",
    items: [
      { icon: Stethoscope, label: "Live Queue", href: "/doctor" },
      { icon: Users, label: "Walk-in Registration", href: "/staff/walkin" },
      { icon: CalendarDays, label: "Appointments", soon: true },
      { icon: FlaskConical, label: "Diagnostics", href: "/staff/lab" },
    ],
  },
  {
    title: "Manage",
    items: [
      { key: "workspace", icon: Building2, label: "People", href: "/admin" },
      { key: "departments", icon: Network, label: "Departments", href: "/admin/departments" },
      { icon: ReceiptText, label: "Billing", href: "/staff/billing" },
      { icon: BarChart3, label: "Services & Pricing", soon: true },
    ],
  },
  {
    title: "Understand",
    items: [
      { key: "command-center", icon: LayoutDashboard, label: "Insights · Overview", href: "/admin/command-center" },
      { icon: BarChart3, label: "Reports", soon: true },
    ],
  },
  {
    title: "Configure",
    items: [
      { key: "settings", icon: Settings, label: "Organization", href: "/admin/settings" },
      { key: "events", icon: Webhook, label: "Event Platform", href: "/admin/events" },
      { icon: ShieldCheck, label: "Access & Roles", soon: true },
      { icon: Settings, label: "Communications", soon: true },
    ],
  },
];

export function AdminSidebar({
  active,
  subtitle = "Organization Workspace",
}: {
  active: AdminNavKey;
  subtitle?: string;
}) {
  return (
    <aside className="flex w-[248px] shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b px-4">
        <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Activity className="size-4" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">Auriva</div>
          <div className="text-[11px] text-muted-foreground">{subtitle}</div>
        </div>
      </div>

      <nav className="flex-1 space-y-3 overflow-y-auto p-3">
        <AdminNavItem icon={Rocket} label="Setup" href="/admin/setup" active={active === "setup"} />

        {GROUPS.map((group) => (
          <div key={group.title}>
            <div className="px-2.5 pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
              {group.title}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <AdminNavItem
                  key={item.label}
                  icon={item.icon}
                  label={item.label}
                  href={item.href}
                  soon={item.soon}
                  active={item.key !== undefined && item.key === active}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="flex items-center gap-2.5 border-t p-3">
        <Avatar className="size-8">
          <AvatarFallback className="bg-accent text-xs font-semibold text-accent-foreground">
            SA
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 leading-tight">
          <div className="truncate text-sm font-medium">Super Admin</div>
          <div className="truncate text-[11px] text-muted-foreground">
            Organization owner
          </div>
        </div>
      </div>
    </aside>
  );
}

function AdminNavItem({
  icon: Icon,
  label,
  href,
  active,
  soon,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href?: string;
  active?: boolean;
  soon?: boolean;
}) {
  const className = cn(
    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors",
    active
      ? "bg-accent font-semibold text-accent-foreground"
      : soon
        ? "cursor-default text-muted-foreground/50"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
  );
  const content = (
    <>
      <Icon className="size-4 shrink-0" />
      <span className="flex-1 text-left">{label}</span>
      {soon && (
        <span className="rounded-full border px-1.5 text-[10px] text-muted-foreground/70">
          Soon
        </span>
      )}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }
  return <div className={className}>{content}</div>;
}
