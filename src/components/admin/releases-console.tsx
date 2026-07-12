"use client";

// APS-036 — Admin Release Console. Folded into the existing Admin/Org
// workspace shell (not a separate console surface, per product-guardian
// scoping review) and further gated to User.is_platform_admin by
// src/app/admin/releases/layout.tsx. Drafts, edits, previews, and
// transitions Releases through the Draft -> Internal QA -> Ready for
// Review -> Approved -> Published -> Archived workflow.

import * as React from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { canTransitionRelease, RELEASE_STATUSES, type ReleaseStatus } from "@/domain/release-status";

interface Highlight {
  id?: string;
  category: "feature" | "enhancement" | "fix";
  title: string;
  description: string;
}

interface ReleaseRecord {
  id: string;
  version: string;
  name: string;
  status: ReleaseStatus;
  summary: string;
  public_notes: string;
  internal_notes: string | null;
  breaking_changes: string | null;
  migration_notes: string | null;
  known_issues: string | null;
  release_date: string | null;
  aps_items: string | null;
  sprint_numbers: string | null;
  feature_flags: string | null;
  highlights: Highlight[];
}

function parseList(json: string | null): string {
  if (!json) return "";
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.join(", ") : "";
  } catch {
    return "";
  }
}

function toArray(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const STATUS_LABEL: Record<ReleaseStatus, string> = {
  draft: "Draft",
  internal_qa: "Internal QA",
  ready_for_review: "Ready for Review",
  approved: "Approved",
  published: "Published",
  archived: "Archived",
};

const STATUS_TONE: Record<ReleaseStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  internal_qa: "bg-accent text-accent-foreground",
  ready_for_review: "bg-warning/15 text-warning",
  approved: "bg-primary/10 text-primary",
  published: "bg-success/15 text-success",
  archived: "bg-muted text-muted-foreground/60",
};

const emptyForm = {
  version: "",
  name: "",
  summary: "",
  publicNotes: "",
  internalNotes: "",
  breakingChanges: "",
  migrationNotes: "",
  knownIssues: "",
  apsItems: "",
  sprintNumbers: "",
  featureFlags: "",
  highlights: [] as Highlight[],
};

export default function ReleasesConsole() {
  const [releases, setReleases] = React.useState<ReleaseRecord[] | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState(emptyForm);
  const [preview, setPreview] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(() => {
    fetch("/api/releases", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then(setReleases)
      .catch(() => setReleases([]));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setPreview(false);
    setDialogOpen(true);
  };

  const openEdit = (release: ReleaseRecord) => {
    setEditingId(release.id);
    setForm({
      version: release.version,
      name: release.name,
      summary: release.summary,
      publicNotes: release.public_notes,
      internalNotes: release.internal_notes ?? "",
      breakingChanges: release.breaking_changes ?? "",
      migrationNotes: release.migration_notes ?? "",
      knownIssues: release.known_issues ?? "",
      apsItems: parseList(release.aps_items),
      sprintNumbers: parseList(release.sprint_numbers),
      featureFlags: parseList(release.feature_flags),
      highlights: release.highlights.map((h) => ({
        id: h.id,
        category: h.category,
        title: h.title,
        description: h.description ?? "",
      })),
    });
    setPreview(false);
    setDialogOpen(true);
  };

  const addHighlight = () => {
    setForm((f) => ({
      ...f,
      highlights: [...f.highlights, { category: "feature", title: "", description: "" }],
    }));
  };

  const updateHighlight = (index: number, patch: Partial<Highlight>) => {
    setForm((f) => ({
      ...f,
      highlights: f.highlights.map((h, i) => (i === index ? { ...h, ...patch } : h)),
    }));
  };

  const removeHighlight = (index: number) => {
    setForm((f) => ({ ...f, highlights: f.highlights.filter((_, i) => i !== index) }));
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      version: form.version.trim(),
      name: form.name.trim(),
      summary: form.summary.trim(),
      public_notes: form.publicNotes,
      internal_notes: form.internalNotes || null,
      breaking_changes: form.breakingChanges || null,
      migration_notes: form.migrationNotes || null,
      known_issues: form.knownIssues || null,
      aps_items: toArray(form.apsItems),
      sprint_numbers: toArray(form.sprintNumbers).map(Number).filter((n) => !Number.isNaN(n)),
      feature_flags: toArray(form.featureFlags),
      highlights: form.highlights
        .filter((h) => h.title.trim())
        .map((h, i) => ({
          category: h.category,
          title: h.title.trim(),
          description: h.description || null,
          sortOrder: i,
        })),
    };
    try {
      const res = await fetch(editingId ? `/api/releases/${editingId}` : "/api/releases", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Could not save release");
      toast.success(editingId ? "Release updated" : "Release drafted");
      setDialogOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save release");
    } finally {
      setSaving(false);
    }
  };

  const handleTransition = async (release: ReleaseRecord, toStatus: ReleaseStatus) => {
    try {
      const res = await fetch(`/api/releases/${release.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: toStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Could not change status");
      toast.success(`Moved to ${STATUS_LABEL[toStatus]}`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change status");
    }
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-6">
        <div>
          <h1 className="text-sm font-semibold">Releases</h1>
          <p className="text-[11px] text-muted-foreground">
            Auriva platform release notes — draft, review, publish
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-3.5" />
          New release
        </Button>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Release date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {releases === null && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {releases?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No releases yet.
                  </TableCell>
                </TableRow>
              )}
              {releases?.map((release) => {
                const nextStatuses = RELEASE_STATUSES.filter((s) =>
                  canTransitionRelease(release.status, s)
                );
                return (
                  <TableRow key={release.id}>
                    <TableCell className="font-mono">{release.version}</TableCell>
                    <TableCell className="font-medium">{release.name}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_TONE[release.status]}>
                        {STATUS_LABEL[release.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {release.release_date
                        ? new Date(release.release_date).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {nextStatuses.map((s) => (
                          <Button
                            key={s}
                            size="sm"
                            variant="outline"
                            onClick={() => handleTransition(release, s)}
                          >
                            {STATUS_LABEL[s]}
                          </Button>
                        ))}
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label="Edit release"
                          onClick={() => openEdit(release)}
                        >
                          <Pencil />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit release" : "Draft a new release"}</DialogTitle>
            <DialogDescription>
              {editingId
                ? "Edits apply immediately, even to a published release."
                : "Starts in Draft — move it through the workflow once ready."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rel-version">Version (semver)</Label>
                <Input
                  id="rel-version"
                  placeholder="1.1.0"
                  value={form.version}
                  disabled={!!editingId}
                  onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rel-name">Release name</Label>
                <Input
                  id="rel-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rel-summary">Summary</Label>
              <Input
                id="rel-summary"
                value={form.summary}
                onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="rel-public-notes">Public release notes (Markdown)</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setPreview((p) => !p)}
                >
                  <Eye className="size-3.5" />
                  {preview ? "Edit" : "Preview"}
                </Button>
              </div>
              {preview ? (
                <div className="min-h-24 rounded-md border bg-muted/30 p-3 text-[13px]">
                  <ReactMarkdown>{form.publicNotes || "*Nothing to preview yet.*"}</ReactMarkdown>
                </div>
              ) : (
                <Textarea
                  id="rel-public-notes"
                  rows={6}
                  value={form.publicNotes}
                  onChange={(e) => setForm((f) => ({ ...f, publicNotes: e.target.value }))}
                />
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Highlights</Label>
                <Button type="button" size="sm" variant="outline" onClick={addHighlight}>
                  <Plus className="size-3.5" />
                  Add
                </Button>
              </div>
              {form.highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Select
                    value={h.category}
                    onValueChange={(v) => updateHighlight(i, { category: v as Highlight["category"] })}
                  >
                    <SelectTrigger className="w-36 shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="feature">Feature</SelectItem>
                      <SelectItem value="enhancement">Enhancement</SelectItem>
                      <SelectItem value="fix">Fix</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Title"
                    value={h.title}
                    onChange={(e) => updateHighlight(i, { title: e.target.value })}
                  />
                  <Input
                    placeholder="Description (optional)"
                    value={h.description}
                    onChange={(e) => updateHighlight(i, { description: e.target.value })}
                  />
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Remove highlight"
                    onClick={() => removeHighlight(i)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rel-breaking">Breaking changes (public)</Label>
                <Textarea
                  id="rel-breaking"
                  rows={3}
                  value={form.breakingChanges}
                  onChange={(e) => setForm((f) => ({ ...f, breakingChanges: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rel-known-issues">Known issues (public)</Label>
                <Textarea
                  id="rel-known-issues"
                  rows={3}
                  value={form.knownIssues}
                  onChange={(e) => setForm((f) => ({ ...f, knownIssues: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rel-internal-notes">Internal notes (platform-admin only)</Label>
                <Textarea
                  id="rel-internal-notes"
                  rows={3}
                  value={form.internalNotes}
                  onChange={(e) => setForm((f) => ({ ...f, internalNotes: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rel-migration-notes">Migration notes (internal only)</Label>
                <Textarea
                  id="rel-migration-notes"
                  rows={3}
                  value={form.migrationNotes}
                  onChange={(e) => setForm((f) => ({ ...f, migrationNotes: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rel-aps">APS items</Label>
                <Input
                  id="rel-aps"
                  placeholder="APS-040, APS-041"
                  value={form.apsItems}
                  onChange={(e) => setForm((f) => ({ ...f, apsItems: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rel-sprints">Sprint numbers</Label>
                <Input
                  id="rel-sprints"
                  placeholder="12, 13"
                  value={form.sprintNumbers}
                  onChange={(e) => setForm((f) => ({ ...f, sprintNumbers: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rel-flags">Feature flags</Label>
                <Input
                  id="rel-flags"
                  placeholder="teleconsult_beta"
                  value={form.featureFlags}
                  onChange={(e) => setForm((f) => ({ ...f, featureFlags: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter showCloseButton>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editingId ? "Save changes" : "Create draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
