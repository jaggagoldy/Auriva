"use client";

// Batch E · Experience Polish & Consistency — the shared resilience states.
// Auriva had ~20 hand-rolled "empty" blocks and ~47 ad-hoc loading spinners,
// each slightly different. These give every workflow ONE vocabulary for the
// four moments between "nothing" and "data": loading, empty, error, and
// no-access. They match the codebase's established language (the dashed
// rounded-xl card, the size-12 muted icon chip, text-sm/font-medium heading,
// text-xs muted description) so adoption is a clean swap, not a redesign.

import { AlertTriangle, CheckCircle2, Inbox, Loader2, RefreshCw, ShieldAlert, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "danger" | "muted" | "success";

const CHIP: Record<Tone, string> = {
  neutral: "border bg-muted/50 text-muted-foreground",
  danger: "bg-rose-500/10 text-rose-600",
  muted: "bg-amber-500/10 text-amber-600",
  success: "bg-success/10 text-success",
};

function StateShell({
  icon: Icon,
  tone,
  dashed,
  title,
  description,
  className,
  children,
}: {
  icon?: LucideIcon;
  tone: Tone;
  dashed?: boolean;
  title: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl px-6 py-12 text-center",
        dashed ? "border border-dashed" : tone === "danger" ? "border border-rose-500/20 bg-rose-500/5" : "border",
        className
      )}
    >
      {Icon && (
        <div className={cn("flex size-12 items-center justify-center rounded-xl", CHIP[tone])}>
          <Icon className="size-6" />
        </div>
      )}
      <div className="space-y-1">
        <p className="text-sm font-medium text-balance">{title}</p>
        {description && <p className="mx-auto max-w-sm text-xs text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="mt-1">{children}</div>}
    </div>
  );
}

/** Nothing here yet — the neutral, dashed "there's room for something" state. */
export function EmptyState({
  icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <StateShell icon={icon} tone="neutral" dashed title={title} description={description} className={className}>
      {action}
    </StateShell>
  );
}

/**
 * Something failed — PKG-6 §5 three tiers:
 *   - "recoverable" (default): couldn't load — calm, inline, **Retry**.
 *   - "action":      an action failed — amber, **Try again**.
 *   - "critical":    unavailable — red, **Contact support**.
 * Every error carries icon + plain explanation + a recovery action (no codes).
 */
export function ErrorState({
  icon = AlertTriangle,
  tier = "recoverable",
  title,
  description,
  onRetry,
  retryLabel,
  className,
}: {
  icon?: LucideIcon;
  tier?: "recoverable" | "action" | "critical";
  title?: React.ReactNode;
  description?: React.ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}) {
  const defaults = {
    recoverable: { title: "Couldn't load this", description: "This didn't load. Please try again.", label: "Retry" },
    action: { title: "That didn't go through", description: "The action couldn't be completed. Please try again.", label: "Try again" },
    critical: { title: "This is temporarily unavailable", description: "Please try again shortly, or contact support if it continues.", label: "Contact support" },
  }[tier];
  const tone: Tone = tier === "action" ? "muted" : "danger";
  return (
    <StateShell
      icon={icon}
      tone={tone}
      title={title ?? defaults.title}
      description={description ?? defaults.description}
      className={className}
    >
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="size-4" /> {retryLabel ?? defaults.label}
        </Button>
      )}
    </StateShell>
  );
}

/** The caller is signed in but this area isn't in their role — a calm, non-alarming block. */
export function PermissionState({
  icon = ShieldAlert,
  title = "You don't have access",
  description = "Your role doesn't include this area. Ask your practice owner if you need it.",
  className,
}: {
  icon?: LucideIcon;
  title?: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
}) {
  return <StateShell icon={icon} tone="muted" title={title} description={description} className={className} />;
}

/**
 * A completed action worth a full-page moment rather than a fleeting toast —
 * "Clinic created", "Team invited", "Payment collected" — ideally paired with
 * the next recommended action. Toasts still cover the small, incidental successes.
 */
export function SuccessState({
  icon = CheckCircle2,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <StateShell icon={icon} tone="success" title={title} description={description} className={className}>
      {action}
    </StateShell>
  );
}

/** A consistent centred spinner for the loading moment (content-shaped loading uses <Skeleton/>). */
export function LoadingState({ label = "Loading…", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground", className)}>
      <Loader2 className="size-5 animate-spin" />
      <p className="text-xs">{label}</p>
    </div>
  );
}
