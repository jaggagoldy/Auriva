import prisma from "@/lib/prisma";
import { logger } from "@/api/logger";

export interface AppEvent<T = unknown> {
  eventId: string;
  correlationId: string;
  occurredAt: Date;
  organizationId: string;
  actorId?: string | null;
  entityId: string;
  eventType: string;
  payload: T;
}

export type EventHandler<T = unknown> = (event: AppEvent<T>) => Promise<void>;

class EventRegistry {
  private handlers: Map<string, { name: string; handler: EventHandler }[]> = new Map();

  /** Register an event handler to subscribe to a specific event type */
  subscribe<T>(eventType: string, handlerName: string, handler: EventHandler<T>) {
    const list = this.handlers.get(eventType) || [];
    // Prevent duplicate subscriptions for same handler name on same event type
    if (!list.some(h => h.name === handlerName)) {
      list.push({ name: handlerName, handler: handler as EventHandler });
      this.handlers.set(eventType, list);
    }
  }

  /** Retrieve all handlers registered for a given event type */
  getHandlers(eventType: string) {
    return this.handlers.get(eventType) || [];
  }

  /** Clears all handlers (useful for clean testing environments) */
  clear() {
    this.handlers.clear();
  }
}

export const eventRegistry = new EventRegistry();

// Next.js (particularly under Turbopack) can bundle instrumentation.ts into
// a different module graph "layer" than the route handlers that actually
// call publishEvent()/replayEvent(), so a plain top-level import there isn't
// guaranteed to run against the same eventRegistry instance a request sees.
// Registering lazily, on first real use, guarantees whichever module
// instance is live for a given request registers into itself.
let handlersRegistered = false;
export async function ensureHandlersRegistered() {
  if (handlersRegistered) return;
  handlersRegistered = true;
  const { registerEventHandlers } = await import("@/lib/event-handlers");
  registerEventHandlers();
}

/**
 * Publishes an event to the shared platform database and dispatches it to subscribers.
 */
export async function publishEvent<T = unknown>(event: {
  eventType: string;
  organizationId: string;
  actorId?: string | null;
  entityId: string;
  correlationId: string;
  payload: T;
  eventId?: string; // Optional: can be specified to test custom idempotency/replays
}) {
  await ensureHandlersRegistered();

  const eventId = event.eventId || crypto.randomUUID();
  const occurredAt = new Date();

  // 1. Create the persistent EventLog record — upsert, not create, so that
  // publishing the same eventId twice (a genuine duplicate publish, e.g. a
  // caller retrying after a timeout) doesn't crash on the unique `id` and,
  // more importantly, doesn't touch the original record.
  const eventLog = await prisma.eventLog.upsert({
    where: { id: eventId },
    update: {},
    create: {
      id: eventId,
      event_type: event.eventType,
      occurred_at: occurredAt,
      organization_id: event.organizationId,
      actor_id: event.actorId ?? null,
      entity_id: event.entityId,
      correlation_id: event.correlationId,
      payload_json: JSON.stringify(event.payload),
    },
  });

  const registeredHandlers = eventRegistry.getHandlers(event.eventType);

  // 2. Create a PENDING row only for handlers with no existing log for this
  // event. A duplicate publish must not reset an already-COMPLETED or
  // DEAD_LETTER handler log back to PENDING — that would make the
  // idempotency check in dispatchHandler() unreachable. Deliberate re-runs
  // (replay, manual retry) go through event-log-service.ts, which resets
  // status itself before dispatching — this path never does.
  for (const h of registeredHandlers) {
    await prisma.eventHandlerLog.upsert({
      where: {
        event_log_id_handler_name: {
          event_log_id: eventLog.id,
          handler_name: h.name,
        },
      },
      update: {},
      create: {
        event_log_id: eventLog.id,
        handler_name: h.name,
        status: "PENDING",
      },
    });
  }

  // 3. Dispatch synchronous execution for all subscribers
  for (const h of registeredHandlers) {
    // Run execution asynchronously from the loop so they run concurrently
    dispatchHandler(eventLog.id, h.name, h.handler).catch(err => {
      logger.error(`[Event Platform] Background dispatch crash for ${h.name} on event ${eventLog.id}`, err);
    });
  }

  return eventLog;
}

/**
 * Dispatches an event log to a single handler, implementing status updates,
 * idempotency protection, progressive retry backing off, and dead-letter logic.
 */
export async function dispatchHandler(
  eventLogId: string,
  handlerName: string,
  handler: EventHandler
) {
  // Query handler log state
  const handlerLog = await prisma.eventHandlerLog.findUnique({
    where: {
      event_log_id_handler_name: {
        event_log_id: eventLogId,
        handler_name: handlerName,
      },
    },
    include: { eventLog: true },
  });

  if (!handlerLog) {
    logger.error(`[Event Platform] Handler log not found for event ${eventLogId}, handler ${handlerName}`);
    return;
  }

  // Idempotency: skip if already successfully finished or permanently dead-lettered
  if (handlerLog.status === "COMPLETED" || handlerLog.status === "DEAD_LETTER") {
    logger.debug(`[Event Platform] Idempotency skip: handler ${handlerName} is already ${handlerLog.status} for event ${eventLogId}`);
    return;
  }

  // Update status to PROCESSING
  await prisma.eventHandlerLog.update({
    where: { id: handlerLog.id },
    data: {
      status: "PROCESSING",
      last_attempt_at: new Date(),
    },
  });

  try {
    const appEvent: AppEvent = {
      eventId: handlerLog.eventLog.id,
      correlationId: handlerLog.eventLog.correlation_id,
      occurredAt: handlerLog.eventLog.occurred_at,
      organizationId: handlerLog.eventLog.organization_id,
      actorId: handlerLog.eventLog.actor_id,
      entityId: handlerLog.eventLog.entity_id,
      eventType: handlerLog.eventLog.event_type,
      payload: JSON.parse(handlerLog.eventLog.payload_json),
    };

    // Execute the handler callback
    await handler(appEvent);

    // Completed successfully
    await prisma.eventHandlerLog.update({
      where: { id: handlerLog.id },
      data: {
        status: "COMPLETED",
      },
    });
    logger.info(`[Event Platform] Handler ${handlerName} successfully processed event ${eventLogId}`);
  } catch (err) {
    const nextRetry = handlerLog.retry_count + 1;
    const isDeadLetter = nextRetry >= 3;
    const errorMessage = err instanceof Error ? err.message : String(err);

    logger.warn(`[Event Platform] Handler ${handlerName} failed on event ${eventLogId} (Attempt ${nextRetry}/3)`, errorMessage);

    await prisma.eventHandlerLog.update({
      where: { id: handlerLog.id },
      data: {
        status: isDeadLetter ? "DEAD_LETTER" : "FAILED",
        retry_count: nextRetry,
        last_error: errorMessage,
      },
    });

    // Schedule retry if limit not reached
    if (!isDeadLetter) {
      const delayMs = 1000 * nextRetry; // 1s on 1st fail, 2s on 2nd fail
      setTimeout(() => {
        dispatchHandler(eventLogId, handlerName, handler).catch(dispatchErr => {
          logger.error(`[Event Platform] Error in retrying handler ${handlerName}`, dispatchErr);
        });
      }, delayMs);
    } else {
      logger.error(`[Event Platform] Handler ${handlerName} reached retry limit on event ${eventLogId}. Moved to DEAD_LETTER.`);
    }
  }
}
