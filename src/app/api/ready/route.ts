import prisma from '@/lib/prisma';
import { logger } from '@/api/logger';
import { ok, serviceUnavailable } from '@/api/http';
import { reportAlert } from '@/lib/alerts';

// INF-5: readiness — "can this instance actually serve a request right
// now." Verifies the one real external dependency this platform has: the
// database, through Prisma. A trivial query (`SELECT 1`) proves both the
// database is reachable and Prisma's own client is initialized and able to
// execute a query — there is no separate "Prisma availability" signal apart
// from successfully running a query through it. No authentication, same
// reasoning as /api/health.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return ok({
      status: 'ready',
      checks: { database: 'ok' },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('readiness check failed: database unreachable', error);
    // RG-001 alert trigger #1: readiness/DB failure. Fire-and-forget (deduped,
    // never throws) so the probe response is never delayed or masked by alerting.
    void reportAlert({
      severity: 'critical',
      title: 'Readiness check failed: database unreachable',
      detail: error instanceof Error ? error.message : 'SELECT 1 failed',
    });
    return serviceUnavailable('Database is unreachable.');
  }
}
