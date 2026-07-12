// Sprint Registry (APS-036) — deliberately lightweight per product-guardian
// review: number/goal/dates/notes only, not a full stories/velocity/
// retrospective system. Exists so a Release can reference which sprint(s)
// fed it; sprint execution itself stays tracked the way APS-030–035 already
// do it (markdown docs), not duplicated here.

import prisma from "@/lib/prisma";

export class SprintNotFoundError extends Error {}
export class SprintInputError extends Error {}

function toJsonListOrNull(value: string[] | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value.length === 0) return null;
  return JSON.stringify(value);
}

export interface UpsertSprintInput {
  number: number;
  goal: string;
  startDate?: Date | null;
  endDate?: Date | null;
  apsItems?: string[];
  notes?: string | null;
}

export async function createSprint(input: UpsertSprintInput) {
  if (!Number.isInteger(input.number) || input.number <= 0) {
    throw new SprintInputError("Sprint number must be a positive integer.");
  }
  if (!input.goal?.trim()) throw new SprintInputError("A sprint goal is required.");

  const existing = await prisma.sprint.findUnique({ where: { number: input.number } });
  if (existing) throw new SprintInputError(`Sprint ${input.number} already exists.`);

  return prisma.sprint.create({
    data: {
      number: input.number,
      goal: input.goal.trim(),
      start_date: input.startDate ?? null,
      end_date: input.endDate ?? null,
      aps_items: toJsonListOrNull(input.apsItems) ?? null,
      notes: input.notes ?? null,
    },
  });
}

export async function updateSprint(
  number: number,
  patch: Partial<Omit<UpsertSprintInput, "number">>
) {
  const existing = await prisma.sprint.findUnique({ where: { number } });
  if (!existing) throw new SprintNotFoundError(`Sprint ${number} not found.`);
  if (patch.goal !== undefined && !patch.goal.trim()) {
    throw new SprintInputError("Sprint goal cannot be empty.");
  }

  return prisma.sprint.update({
    where: { number },
    data: {
      goal: patch.goal?.trim(),
      start_date: patch.startDate,
      end_date: patch.endDate,
      aps_items: toJsonListOrNull(patch.apsItems),
      notes: patch.notes,
    },
  });
}

export function listSprints() {
  return prisma.sprint.findMany({ orderBy: { number: "desc" } });
}

export function getSprint(number: number) {
  return prisma.sprint.findUnique({ where: { number } });
}
