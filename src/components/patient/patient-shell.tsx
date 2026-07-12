"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, FileText, Users, User } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

// The patient app is a mobile-first phone experience (approved 2026-07-12,
// design/mockups/auriva-user.html). One UX, not two: on desktop we center the
// same phone inside a responsive container (WhatsApp Web / Apple Health), never
// a separate desktop layout. Routes are preserved (deep links + back button);
// the bottom tab bar just navigates between them.
const TABS = [
  { href: "/patient", label: "Home", icon: Home },
  { href: "/patient/book", label: "Book", icon: CalendarDays },
  { href: "/patient/records", label: "Records", icon: FileText },
  { href: "/patient/family", label: "Family", icon: Users },
  { href: "/patient/you", label: "You", icon: User },
];

function tabActive(pathname: string, href: string) {
  if (href === "/patient") return pathname === "/patient";
  return pathname === href || pathname.startsWith(href + "/");
}

export function PatientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh justify-center bg-secondary">
      {/* The phone. Full-bleed on mobile; a centered, rounded device on desktop. */}
      <div className="relative flex h-dvh w-full max-w-[440px] flex-col overflow-hidden bg-background shadow-2xl sm:my-[4vh] sm:h-[92vh] sm:rounded-[34px] sm:border">
        {/* Scrollable body — each screen renders its own sticky top bar. */}
        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>

        {/* Bottom tab bar */}
        <nav className="flex shrink-0 border-t bg-background/95 px-1.5 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur">
          {TABS.map(({ href, label, icon: Icon }) => {
            const active = tabActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-[10.5px] font-semibold transition-colors",
                  active ? "text-honey-deep" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("size-[22px]", active && "stroke-[2.4]")} />
                {label}
              </Link>
            );
          })}
        </nav>

        <Toaster position="top-center" />
      </div>
    </div>
  );
}
