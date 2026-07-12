import { ok } from '@/api/http';
import packageJson from '../../../../package.json';

// INF-5: liveness — "is the process up and able to respond at all." No
// dependency checks (database, etc.) on purpose: a liveness check exists so
// an orchestrator/monitor can tell whether to restart the process itself,
// which a database outage should never trigger (restarting a healthy
// process doesn't fix a database that's down, and would take real traffic
// offline needlessly). Dependency checks live at /api/ready instead. No
// authentication — infra/monitoring tooling hits this, not a signed-in user.
export async function GET() {
  return ok({
    status: 'ok',
    version: packageJson.version,
    uptime_seconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}
