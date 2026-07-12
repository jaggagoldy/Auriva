// Release Management (APS-036). Releases describe the Auriva platform
// itself — authoring/publishing is gated by User.is_platform_admin
// (src/api/session.ts requirePlatformAdminContext), never by the
// customer-facing `super_admin` role. All status changes go through
// transitionReleaseStatus(), the single choke-point for this entity's state
// machine (src/domain/release-status.ts), mirroring appointment/invoice/
// lab-order status transitions elsewhere in this codebase.

import prisma from "@/lib/prisma";
import { canTransitionRelease, isReleaseStatus, type ReleaseStatus } from "@/domain/release-status";
import { isValidSemver } from "@/domain/semver";

export class ReleaseNotFoundError extends Error {}
export class ReleaseInputError extends Error {}
export class InvalidReleaseTransitionError extends Error {}

const HIGHLIGHT_CATEGORIES = ["feature", "enhancement", "fix"] as const;
type HighlightCategory = (typeof HIGHLIGHT_CATEGORIES)[number];

function isHighlightCategory(value: string): value is HighlightCategory {
  return (HIGHLIGHT_CATEGORIES as readonly string[]).includes(value);
}

function toJsonListOrNull(value: string[] | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value.length === 0) return null;
  return JSON.stringify(value);
}

export function parseJsonList(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const releaseInclude = {
  highlights: { orderBy: { sort_order: "asc" as const } },
  created_by: { select: { id: true, email: true, phone_number: true } },
};

export interface ReleaseHighlightInput {
  category: string;
  title: string;
  description?: string | null;
  sortOrder?: number;
}

export interface CreateReleaseInput {
  version: string;
  name: string;
  summary: string;
  publicNotes: string;
  internalNotes?: string | null;
  breakingChanges?: string | null;
  migrationNotes?: string | null;
  knownIssues?: string | null;
  apsItems?: string[];
  sprintNumbers?: number[];
  featureFlags?: string[];
  highlights?: ReleaseHighlightInput[];
  createdByUserId: string;
}

function validateHighlights(highlights?: ReleaseHighlightInput[]) {
  for (const h of highlights ?? []) {
    if (!isHighlightCategory(h.category)) {
      throw new ReleaseInputError(`Highlight category must be one of: ${HIGHLIGHT_CATEGORIES.join(", ")}.`);
    }
    if (!h.title?.trim()) {
      throw new ReleaseInputError("Every highlight needs a title.");
    }
  }
}

export async function createRelease(input: CreateReleaseInput) {
  const version = input.version?.trim();
  if (!version || !isValidSemver(version)) {
    throw new ReleaseInputError("Version must be valid semantic versioning, e.g. 1.1.0.");
  }
  if (!input.name?.trim()) throw new ReleaseInputError("A release name is required.");
  if (!input.summary?.trim()) throw new ReleaseInputError("A summary is required.");
  if (!input.publicNotes?.trim()) throw new ReleaseInputError("Public release notes are required.");
  validateHighlights(input.highlights);

  const existing = await prisma.release.findUnique({ where: { version } });
  if (existing) throw new ReleaseInputError(`Version ${version} already exists.`);

  return prisma.release.create({
    data: {
      version,
      name: input.name.trim(),
      status: "draft",
      summary: input.summary.trim(),
      public_notes: input.publicNotes,
      internal_notes: input.internalNotes ?? null,
      breaking_changes: input.breakingChanges ?? null,
      migration_notes: input.migrationNotes ?? null,
      known_issues: input.knownIssues ?? null,
      aps_items: toJsonListOrNull(input.apsItems) ?? null,
      sprint_numbers: toJsonListOrNull(input.sprintNumbers?.map(String)) ?? null,
      feature_flags: toJsonListOrNull(input.featureFlags) ?? null,
      created_by_user_id: input.createdByUserId,
      highlights: input.highlights?.length
        ? {
            create: input.highlights.map((h, i) => ({
              category: h.category,
              title: h.title.trim(),
              description: h.description ?? null,
              sort_order: h.sortOrder ?? i,
            })),
          }
        : undefined,
    },
    include: releaseInclude,
  });
}

export interface UpdateReleaseInput {
  name?: string;
  summary?: string;
  publicNotes?: string;
  internalNotes?: string | null;
  breakingChanges?: string | null;
  migrationNotes?: string | null;
  knownIssues?: string | null;
  releaseDate?: Date | null;
  apsItems?: string[];
  sprintNumbers?: number[];
  featureFlags?: string[];
  highlights?: ReleaseHighlightInput[];
}

/** Edits a release's content. Explicitly allowed at any status, including
 * `published` (the request calls out "edit after publication" as a required
 * capability) — this only touches content fields, never `status` itself. */
export async function updateRelease(releaseId: string, patch: UpdateReleaseInput) {
  const existing = await prisma.release.findUnique({ where: { id: releaseId } });
  if (!existing) throw new ReleaseNotFoundError("Release not found.");
  if (patch.name !== undefined && !patch.name.trim()) {
    throw new ReleaseInputError("Release name cannot be empty.");
  }
  if (patch.publicNotes !== undefined && !patch.publicNotes.trim()) {
    throw new ReleaseInputError("Public release notes cannot be empty.");
  }
  validateHighlights(patch.highlights);

  return prisma.$transaction(async (tx) => {
    if (patch.highlights) {
      await tx.releaseHighlight.deleteMany({ where: { release_id: releaseId } });
    }
    return tx.release.update({
      where: { id: releaseId },
      data: {
        name: patch.name?.trim(),
        summary: patch.summary?.trim(),
        public_notes: patch.publicNotes,
        internal_notes: patch.internalNotes,
        breaking_changes: patch.breakingChanges,
        migration_notes: patch.migrationNotes,
        known_issues: patch.knownIssues,
        release_date: patch.releaseDate,
        aps_items: toJsonListOrNull(patch.apsItems),
        sprint_numbers: toJsonListOrNull(patch.sprintNumbers?.map(String)),
        feature_flags: toJsonListOrNull(patch.featureFlags),
        highlights: patch.highlights?.length
          ? {
              create: patch.highlights.map((h, i) => ({
                category: h.category,
                title: h.title.trim(),
                description: h.description ?? null,
                sort_order: h.sortOrder ?? i,
              })),
            }
          : undefined,
      },
      include: releaseInclude,
    });
  });
}

/** The single legal way a Release's status changes — see
 * src/domain/release-status.ts for the transition table. Setting
 * `published_at` (once, the first time a release reaches `published`) is a
 * side effect kept here so no caller can set it directly. */
export async function transitionReleaseStatus(releaseId: string, toStatus: string) {
  if (!isReleaseStatus(toStatus)) {
    throw new ReleaseInputError(`Unknown status: ${toStatus}`);
  }
  const release = await prisma.release.findUnique({ where: { id: releaseId } });
  if (!release) throw new ReleaseNotFoundError("Release not found.");

  const from = release.status as ReleaseStatus;
  if (!canTransitionRelease(from, toStatus)) {
    throw new InvalidReleaseTransitionError(`Cannot move a release from ${from} to ${toStatus}.`);
  }

  const isPublishing = toStatus === "published" && !release.published_at;

  return prisma.release.update({
    where: { id: releaseId },
    data: {
      status: toStatus,
      published_at: isPublishing ? new Date() : undefined,
      release_date: isPublishing && !release.release_date ? new Date() : undefined,
    },
    include: releaseInclude,
  });
}

export function getRelease(releaseId: string) {
  return prisma.release.findUnique({ where: { id: releaseId }, include: releaseInclude });
}

/** Full history for platform admins (any status). */
export function listAllReleases() {
  return prisma.release.findMany({
    orderBy: [{ published_at: "desc" }, { created_at: "desc" }],
    include: releaseInclude,
  });
}

/** What's New feed for every other caller — published only, newest first. */
export function listPublishedReleases() {
  return prisma.release.findMany({
    where: { status: "published" },
    orderBy: { published_at: "desc" },
    include: releaseInclude,
  });
}

export async function markReleaseViewed(releaseId: string, userId: string) {
  const release = await prisma.release.findUnique({ where: { id: releaseId } });
  if (!release || release.status !== "published") {
    throw new ReleaseNotFoundError("No published release with that id.");
  }
  return prisma.releaseView.upsert({
    where: { release_id_user_id: { release_id: releaseId, user_id: userId } },
    update: {},
    create: { release_id: releaseId, user_id: userId },
  });
}

/**
 * Strips fields a non-platform-admin caller must never see: internal_notes
 * (platform-team-only narrative) and migration_notes (internal deployment
 * detail) and the author's contact info. Breaking changes and known issues
 * ARE shown publicly — a customer needs to know both before they upgrade
 * behavior expectations, which is standard practice for a changelog.
 */
export function toPublicView<T extends { internal_notes: string | null; migration_notes: string | null; created_by?: unknown }>(
  release: T
) {
  const { internal_notes: _internalNotes, migration_notes: _migrationNotes, created_by: _createdBy, ...rest } = release;
  return rest;
}

/** Count of published releases this user has not yet opened — the bell badge. */
export async function countUnviewedReleases(userId: string) {
  const [published, viewed] = await Promise.all([
    prisma.release.count({ where: { status: "published" } }),
    prisma.releaseView.count({ where: { user_id: userId } }),
  ]);
  // Approximation good enough for a badge count without a second query to
  // diff the exact set — viewed rows are only ever created against
  // published releases (see markReleaseViewed), so this can only
  // undercount by zero in the normal case (a user cannot "view" an
  // unpublished release), never overcount.
  return Math.max(0, published - viewed);
}
