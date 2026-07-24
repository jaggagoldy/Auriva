"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  Building2,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Settings,
  Tag,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

export type AdminNavKey =
  | "command-center"
  | "workspace"
  | "services"
  | "departments"
  | "settings"
  | "events"
  | "setup";

interface NavEntry {
  key: AdminNavKey;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href?: string;
  soon?: boolean;
}

const PRIMARY: NavEntry[] = [
  { key: "command-center", icon: LayoutDashboard, label: "Command", href: "/admin/command-center" },
  { key: "workspace", icon: Users, label: "Team", href: "/admin" },
  { key: "services", icon: Tag, label: "Services & Pricing", href: "/admin/services" },
  { key: "settings", icon: CreditCard, label: "Plan & Settings", href: "/admin/settings" },
];

export function AdminSidebar({
  active,
  subtitle = "Organization",
}: {
  active: AdminNavKey;
  subtitle?: string;
}) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      localStorage.removeItem("aura_b2b_session");
      toast.success("Signed out successfully");
      router.replace("/login");
    } catch {
      toast.error("Could not sign out");
    }
  };

  return (
    <aside className="flex w-[212px] shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b px-4">
        <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Activity className="size-4" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">Auriva</div>
          <div className="text-[11px] text-muted-foreground">{subtitle}</div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 p-3">
        {PRIMARY.map((item) => (
          <AdminNavItem
            key={item.key}
            icon={item.icon}
            label={item.label}
            href={item.href}
            soon={item.soon}
            active={item.key === active}
          />
        ))}
      </nav>

      <nav className="space-y-0.5 border-t p-3">
        <AdminNavItem
          icon={Settings}
          label="Settings"
          href="/admin/settings"
          active={active === "settings"}
          muted
        />
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="size-4 shrink-0" />
          <span>Sign out</span>
        </button>
      </nav>
    </aside>
  );
}

function AdminNavItem({
  icon: Icon,
  label,
  href,
  active,
  muted,
  soon,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href?: string;
  active?: boolean;
  muted?: boolean;
  soon?: boolean;
}) {
  const className = cn(
    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition-colors",
    muted ? "text-[13px]" : "text-sm",
    soon
      ? "cursor-default text-muted-foreground/50"
      : active
        ? "bg-accent font-semibold text-accent-foreground"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
  );
  const content = (
    <>
      <Icon className="size-4 shrink-0" />
      <span className="flex-1 text-left">{label}</span>
      {soon && (
        <span className="rounded-full border px-1.5 text-[9.5px] font-medium text-muted-foreground/70">Soon</span>
      )}
    </>
  );
  if (soon || !href) return <div className={className}>{content}</div>;
  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}
