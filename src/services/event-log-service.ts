// Read + replay side of the Shared Event Platform (Epic C) — backs the
// Developer Event Hub (/admin/events) and its API routes. Publishing lives in
// src/lib/events.ts; this is the query/operator layer on top of it.

import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { dispatchHandler, ensureHandlersRegistered, eventRegistry, publishEvent } from "@/lib/events";
import { logger } from "@/api/logger";

export class EventNotFoundError extends Error {}
export class EventHandlerNotFoundError extends Error {}

type HandlerStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "DEAD_LETTER";

export interface EventHandlerView {
  id: string;
  handlerName: string;
  status: HandlerStatus;
  retryCount: number;
  lastError: string | null;
  lastAttemptAt: Date | null;
}

export interface EventView {
  id: string;
  eventType: string;
  occurredAt: Date;
  organizationId: string;
  actorId: string | null;
  entityId: string;
  correlationId: string;
  payload: unknown;
  status: "completed" | "pending" | "dead_letter" | "no_subscribers";
  handlers: EventHandlerView[];
}

type EventLogWithHandlers = Prisma.EventLogGetPayload<{ include: { handlers: true } }>;

function overallStatus(handlers: { status: string }[]): EventView["status"] {
  if (handlers.length === 0) return "no_subscribers";
  if (handlers.some((h) => h.status === "DEAD_LETTER")) return "dead_letter";
  if (handlers.some((h) => h.status !== "COMPLETED")) return "pending";
  return "completed";
}

function toView(row: EventLogWithHandlers): EventView {
  return {
    id: row.id,
    eventType: row.event_type,
    occurredAt: row.occurred_at,
    organizationId: row.organization_id,
    actorId: row.actor_id,
    entityId: row.entity_id,
    correlationId: row.correlation_id,
    payload: JSON.parse(row.payload_json),
    status: overallStatus(row.handlers),
    handlers: row.handlers.map((h) => ({
      id: h.id,
      handlerName: h.handler_name,
      status: h.status as HandlerStatus,
      retryCount: h.retry_count,
      lastError: h.last_error,
      lastAttemptAt: h.last_attempt_at,
    })),
  };
}

export async function listEvents(filters: {
  organizationId: string;
  eventType?: string | null;
  status?: string | null;
  limit: number;
}): Promise<EventView[]> {
  const rows = await prisma.eventLog.findMany({
    where: {
      organization_id: filters.organizationId,
      ...(filters.eventType ? { event_type: filters.eventType } : {}),
    },
    include: { handlers: true },
    orderBy: { occurred_at: "desc" },
    take: filters.limit,
  });
  const views = rows.map(toView);
  return filters.status ? views.filter((e) => e.status === filters.status) : views;
}

async function findOwnedEvent(eventLogId: string, organizationId: string) {
  const event = await prisma.eventLog.findFirst({
    where: { id: eventLogId, organization_id: organizationId },
  });
  if (!event) throw new EventNotFoundError(`Event ${eventLogId} not found.`);
  return event;
}

async function loadView(eventLogId: string): Promise<EventView> {
  const row = await prisma.eventLog.findUniqueOrThrow({
    where: { id: eventLogId },
    include: { handlers: true },
  });
  return toView(row);
}

/**
 * Re-dispatches an event to every handler currently registered for its
 * event type — a handler added after the original publish will pick up
 * events replayed from here, which is the point of a replay tool.
 */
export async function replayEvent(eventLogId: string, organizationId: string): Promise<EventView> {
  await ensureHandlersRegistered();
  const event = await findOwnedEvent(eventLogId, organizationId);
  const registered = eventRegistry.getHandlers(event.event_type);

  for (const h of registered) {
    await prisma.eventHandlerLog.upsert({
      where: { event_log_id_handler_name: { event_log_id: eventLogId, handler_name: h.name } },
      update: { status: "PENDING", retry_count: 0, last_error: null },
      create: { event_log_id: eventLogId, handler_name: h.name, status: "PENDING" },
    });
  }
  for (const h of registered) {
    dispatchHandler(eventLogId, h.name, h.handler).catch((err) => {
      logger.error(`[Event Platform] Replay dispatch crash for ${h.name} on event ${eventLogId}`, err);
    });
  }
  return loadView(eventLogId);
}

/** Manually retries a single handler, bypassing its scheduled backoff delay. */
export async function retryHandler(
  eventLogId: string,
  organizationId: string,
  handlerName: string
): Promise<EventView> {
  await ensureHandlersRegistered();
  const event = await findOwnedEvent(eventLogId, organizationId);
  const registered = eventRegistry
    .getHandlers(event.event_type)
    .find((h) => h.name === handlerName);
  if (!registered) {
    throw new EventHandlerNotFoundError(
      `Handler "${handlerName}" is not registered for event type "${event.event_type}".`
    );
  }

  await prisma.eventHandlerLog.update({
    where: { event_log_id_handler_name: { event_log_id: eventLogId, handler_name: handlerName } },
    data: { status: "PENDING", retry_count: 0, last_error: null },
  });
  dispatchHandler(eventLogId, handlerName, registered.handler).catch((err) => {
    logger.error(`[Event Platform] Manual retry crash for ${handlerName} on event ${eventLogId}`, err);
  });
  return loadView(eventLogId);
}

/**
 * Publishes a synthetic event to the deliberately-failing test subscriber
 * (see event-handlers.ts) — proves the retry/backoff/dead-letter path works
 * end to end without needing a real business failure to trigger it.
 */
export async function simulateFailure(organizationId: string, actorUserId?: string | null) {
  const event = await publishEvent({
    eventType: "system.test.flaky",
    organizationId,
    entityId: "simulated",
    correlationId: crypto.randomUUID(),
    actorId: actorUserId,
    payload: { note: "Manually triggered from the Developer Event Hub" },
  });
  return loadView(event.id);
}
