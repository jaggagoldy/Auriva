"use client";

// APS-036 — What's New. One shared component mounted in every workspace
// shell (Doctor/Staff/Patient/Admin) rather than four bespoke ones, per the
// "reuse existing architecture" mandate. Reads GET /api/releases (published
// only, non-admin fields already stripped server-side by
// release-service.toPublicView) and POSTs /api/releases/[id]/view on open.

import * as React from "react";
import ReactMarkdown from "react-markdown";
import { Bell, Sparkles, Wrench, Bug } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface ReleaseHighlight {
  id: string;
  category: "feature" | "enhancement" | "fix";
  title: string;
  description: string | null;
}

interface PublicRelease {
  id: string;
  version: string;
  name: string;
  summary: string;
  public_notes: string;
  breaking_changes: string | null;
  known_issues: string | null;
  release_date: string | null;
  published_at: string | null;
  highlights: ReleaseHighlight[];
}

const CATEGORY_META: Record<ReleaseHighlight["category"], { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  feature: { label: "New", icon: Sparkles },
  enhancement: { label: "Improved", icon: Wrench },
  fix: { label: "Fixed", icon: Bug },
};

export default function WhatsNew() {
  const [open, setOpen] = React.useState(false);
  const [releases, setReleases] = React.useState<PublicRelease[] | null>(null);
  const [unreadCount, setUnreadCount] = React.useState(0);

  const loadUnreadCount = React.useCallback(() => {
    fetch("/api/releases/unread-count", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { count: 0 }))
      .then((data) => setUnreadCount(data.count ?? 0))
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    loadUnreadCount();
  }, [loadUnreadCount]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) return;

    fetch("/api/releases", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: PublicRelease[]) => {
        setReleases(data);
        // Mark every currently-visible release as viewed — best-effort,
        // failures don't block reading the notes themselves.
        data.forEach((release) => {
          fetch(`/api/releases/${release.id}/view`, { method: "POST" }).catch(() => {});
        });
        setUnreadCount(0);
      })
      .catch(() => setReleases([]));
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="What's new"
        className="relative"
        onClick={(event) => {
          // Safe even when not nested in a Link (Doctor shell mounts this
          // inside the profile row's anchor) — preventDefault/stopPropagation
          // on a plain button click is a no-op.
          event.preventDefault();
          event.stopPropagation();
          handleOpenChange(true);
        }}
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 flex size-2.5 items-center justify-center rounded-full bg-primary" />
        )}
      </Button>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>What&apos;s new</SheetTitle>
          <SheetDescription>Recent Auriva releases and improvements.</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-4">
          {releases === null && (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
          {releases?.length === 0 && (
            <p className="text-sm text-muted-foreground">No releases published yet.</p>
          )}
          {releases?.map((release, i) => (
            <div key={release.id}>
              {i > 0 && <Separator className="mb-5" />}
              <div className="mb-1.5 flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-[10px]">
                  v{release.version}
                </Badge>
                <h3 className="text-sm font-semibold">{release.name}</h3>
              </div>
              {release.release_date && (
                <p className="mb-2 text-[11px] text-muted-foreground">
                  {new Date(release.release_date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              )}
              <p className="mb-3 text-[13px] text-muted-foreground">{release.summary}</p>

              {release.highlights.length > 0 && (
                <ul className="mb-3 space-y-2">
                  {release.highlights.map((h) => {
                    const meta = CATEGORY_META[h.category];
                    const Icon = meta.icon;
                    return (
                      <li key={h.id} className="flex items-start gap-2">
                        <span
                          className={cn(
                            "mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full",
                            h.category === "feature" && "bg-primary/10 text-primary",
                            h.category === "enhancement" && "bg-accent text-accent-foreground",
                            h.category === "fix" && "bg-warning/15 text-warning"
                          )}
                        >
                          <Icon className="size-2.5" />
                        </span>
                        <span className="text-[12.5px]">
                          <span className="font-medium">{h.title}</span>
                          {h.description && (
                            <span className="text-muted-foreground"> — {h.description}</span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="prose-sm text-[12.5px] leading-relaxed [&_a]:underline [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-4">
                <ReactMarkdown>{release.public_notes}</ReactMarkdown>
              </div>

              {release.breaking_changes && (
                <div className="mt-3 rounded-lg border border-warning/30 bg-warning/5 p-2.5 text-[12px]">
                  <p className="mb-1 font-semibold text-warning">Breaking changes</p>
                  <ReactMarkdown>{release.breaking_changes}</ReactMarkdown>
                </div>
              )}
              {release.known_issues && (
                <div className="mt-2 rounded-lg border bg-muted/30 p-2.5 text-[12px] text-muted-foreground">
                  <p className="mb-1 font-semibold">Known issues</p>
                  <ReactMarkdown>{release.known_issues}</ReactMarkdown>
                </div>
              )}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
