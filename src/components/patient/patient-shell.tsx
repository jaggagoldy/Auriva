"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, FileText, Users, User } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

// One patient app, two optimized shells — same pages, routes, components,
// business logic and Honey/Pine design system underneath (approved 2026-07-12
// responsive direction). The deciding factor is APPLICATION MODE, not viewport:
//   • Installed PWA / mobile app (display-mode: standalone) → phone shell
//     (bottom tab bar, touch-first).
//   • Any browser (desktop or laptop) → desktop workspace (left sidebar +
//     full-width content), itself responsive down to a top bar on narrow tabs.
// Restoring the desktop workspace is step 1; per-page multi-column layouts land
// on top of this shell next.
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

// --- app-mode detection (PWA standalone vs browser) -----------------------
// useSyncExternalStore is SSR-safe (server snapshot = false = browser/desktop)
// and needs no effect, so it never trips react-hooks/set-state-in-effect.
function subscribeStandalone(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(display-mode: standalone)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
function getStandaloneSnapshot() {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}
function useIsStandalone() {
  return React.useSyncExternalStore(subscribeStandalone, getStandaloneSnapshot, () => false);
}

function AurivaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 12h3l2-6 4 12 2-6h4" />
    </svg>
  );
}

export function PatientShell({ children }: { children: React.ReactNode }) {
  const standalone = useIsStandalone();
  return standalone ? <PhoneShell>{children}</PhoneShell> : <DesktopShell>{children}</DesktopShell>;
}

// --- Phone shell (installed PWA / mobile app) ------------------------------
function PhoneShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-dvh justify-center bg-secondary">
      <div className="relative flex h-dvh w-full max-w-[440px] flex-col overflow-hidden bg-background shadow-2xl sm:my-[4vh] sm:h-[92vh] sm:rounded-[34px] sm:border">
        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
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

// --- Desktop workspace (any browser) --------------------------------------
function DesktopShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-dvh bg-secondary">
      {/* Left sidebar on lg+ */}
      <aside className="hidden w-60 shrink-0 flex-col gap-1 border-r bg-background px-3 py-4 lg:flex">
        <Link href="/patient" className="mb-4 flex items-center gap-2 px-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <AurivaMark className="size-5" />
          </span>
          <span className="font-heading text-lg font-bold tracking-tight">Auriva</span>
        </Link>
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = tabActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-honey-soft text-honey-deep" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className={cn("size-5", active && "stroke-[2.4]")} />
              {label}
            </Link>
          );
        })}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar below lg (browser on a narrow window / tablet) */}
        <header className="flex items-center gap-1 border-b bg-background px-3 py-2 lg:hidden">
          <Link href="/patient" className="mr-1 flex items-center gap-1.5 px-1">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <AurivaMark className="size-4" />
            </span>
            <span className="font-heading text-base font-bold tracking-tight">Auriva</span>
          </Link>
          <nav className="flex flex-1 items-center justify-end gap-0.5 overflow-x-auto">
            {TABS.map(({ href, label, icon: Icon }) => {
              const active = tabActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                    active ? "bg-honey-soft text-honey-deep" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="size-4" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-5xl p-4 md:p-6">{children}</div>
        </main>
      </div>

      <Toaster position="top-right" />
    </div>
  );
}
