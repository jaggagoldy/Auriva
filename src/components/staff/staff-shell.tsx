"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  LayoutDashboard,
  ListChecks,
  LogOut,
  UserPlus,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { getInitials } from "@/shared/queue";

interface StaffShellProps {
  displayName: string;
  role: "receptionist" | "super_admin";
  children: React.ReactNode;
}

export default function StaffShell({ displayName, role, children }: StaffShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
    }
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Toaster position="bottom-right" />
      <aside className="flex w-60 shrink-0 flex-col bg-zinc-950 text-zinc-400">
        <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-white/10 px-4">
          <div className="flex size-7 items-center justify-center rounded-md bg-white text-zinc-950">
            <Activity className="size-4" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-zinc-100">Aegis Clinic OS</div>
            <div className="text-[11px] text-zinc-500">Reception</div>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 p-3">
          <NavItem
            icon={LayoutDashboard}
            label="Dashboard"
            href="/staff/dashboard"
            active={pathname === "/staff/dashboard"}
          />
          <NavItem
            icon={ListChecks}
            label="Queue Board"
            href="/staff/queue"
            active={pathname === "/staff/queue"}
          />
          <NavItem
            icon={UserPlus}
            label="Walk-In"
            href="/staff/walkin"
            active={pathname === "/staff/walkin"}
          />
        </nav>

        <div className="flex items-center gap-2.5 border-t border-white/10 p-3">
          <Avatar className="size-8">
            <AvatarFallback className="bg-white/10 text-xs font-semibold text-zinc-100">
              {getInitials(displayName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-sm font-medium text-zinc-100">{displayName}</div>
            <div className="truncate text-[11px] text-zinc-500 capitalize">
              {role.replace("_", " ")}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Log out"
            disabled={loggingOut}
            onClick={handleLogout}
            className="text-zinc-500 hover:bg-white/10 hover:text-zinc-100"
          >
            <LogOut />
          </Button>
        </div>
      </aside>

      <div className="min-w-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

function NavItem({
  icon: Icon,
  label,
  href,
  active,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors",
        active
          ? "bg-white/10 font-medium text-white"
          : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="flex-1 text-left">{label}</span>
    </Link>
  );
}
