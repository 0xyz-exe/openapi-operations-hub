import { getDb } from "./db";
import { validateTargetUrl } from "./ssrf";

export interface HealthCheckResult {
  checkId: string;
  statusCode: number | null;
  latencyMs: number;
  status: "healthy" | "degraded" | "unhealthy";
  errorMessage: string | null;
}

export async function executeHealthCheck(checkId: string): Promise<HealthCheckResult> {
  const db = getDb();
  const check = db.prepare(`
    SELECT * FROM monitoring_checks WHERE id = ?
  `).get(checkId) as any;

  if (!check) {
    throw new Error(`Monitoring check not found: ${checkId}`);
  }

  const startTime = Date.now();
  let statusCode: number | null = null;
  let status: "healthy" | "degraded" | "unhealthy" = "unhealthy";
  let errorMessage: string | null = null;
  let latencyMs = 0;

  try {
    // 1. SSRF check
    const ssrf = await validateTargetUrl(check.endpoint_url);
    if (!ssrf.allowed) {
      status = "unhealthy";
      errorMessage = `SSRF Security Block: ${ssrf.reason}`;
    } else {
      // 2. HTTP Request with AbortSignal timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), check.timeout_ms || 5000);

      try {
        const response = await fetch(check.endpoint_url, {
          method: check.method || "GET",
          signal: controller.signal,
          headers: {
            "User-Agent": "OpenAPI-Operations-Hub-Monitor/1.0",
          },
        });
        clearTimeout(timeoutId);
        latencyMs = Date.now() - startTime;
        statusCode = response.status;

        const expected = check.expected_status || 200;
        if (statusCode === expected) {
          status = latencyMs > 2000 ? "degraded" : "healthy";
        } else {
          status = "unhealthy";
          errorMessage = `HTTP Status mismatch: expected ${expected}, got ${statusCode}`;
        }
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        latencyMs = Date.now() - startTime;
        status = "unhealthy";
        errorMessage = fetchErr.name === "AbortError" ? "Request timed out" : (fetchErr.message || "Network error");
      }
    }
  } catch (err: any) {
    latencyMs = Date.now() - startTime;
    status = "unhealthy";
    errorMessage = err.message || "Unexpected probe failure";
  }

  // Record Run
  const runId = `run-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  db.prepare(`
    INSERT INTO monitoring_check_runs (id, check_id, api_id, status_code, latency_ms, status, error_message)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(runId, checkId, check.api_id, statusCode, latencyMs, status, errorMessage);

  // Update check consecutive failures & status
  let consecutiveFailures = check.consecutive_failures || 0;
  if (status === "unhealthy") {
    consecutiveFailures += 1;
  } else {
    consecutiveFailures = 0;
  }

  db.prepare(`
    UPDATE monitoring_checks
    SET last_run_at = datetime('now'),
        current_status = ?,
        consecutive_failures = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(status, consecutiveFailures, checkId);

  // Update API service overall health status
  db.prepare(`
    UPDATE api_services
    SET health_status = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(status, check.api_id);

  // Auto Incident Management
  handleIncidentLifecycle(db, check.api_id, checkId, check.name, status, consecutiveFailures, errorMessage);

  return {
    checkId,
    statusCode,
    latencyMs,
    status,
    errorMessage,
  };
}

function handleIncidentLifecycle(
  db: any,
  apiId: string,
  checkId: string,
  checkName: string,
  status: string,
  consecutiveFailures: number,
  errorMessage: string | null
) {
  // Check for open incident
  const openIncident = db.prepare(`
    SELECT * FROM monitoring_incidents
    WHERE api_id = ? AND status IN ('open', 'acknowledged')
    ORDER BY started_at DESC LIMIT 1
  `).get(apiId) as any;

  if (status === "unhealthy" && consecutiveFailures >= 2 && !openIncident) {
    // Open new incident
    const incId = `inc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const title = `Service Outage: ${checkName} failing (${errorMessage || "Checks failed"})`;
    db.prepare(`
      INSERT INTO monitoring_incidents (id, api_id, check_id, title, severity, status, notes)
      VALUES (?, ?, ?, ?, 'major', 'open', ?)
    `).run(incId, apiId, checkId, title, errorMessage || "Repeated check failure threshold exceeded.");

    db.prepare(`
      INSERT INTO incident_events (id, incident_id, event_type, message)
      VALUES (?, ?, 'incident_opened', ?)
    `).run(`evt-${Date.now()}-1`, incId, `Incident automatically opened after ${consecutiveFailures} consecutive probe failures.`);
  } else if (status === "healthy" && openIncident) {
    // Auto-resolve incident
    db.prepare(`
      UPDATE monitoring_incidents
      SET status = 'resolved',
          resolved_at = datetime('now'),
          notes = notes || '\nAuto-resolved: Service returned to healthy status.'
      WHERE id = ?
    `).run(openIncident.id);

    db.prepare(`
      INSERT INTO incident_events (id, incident_id, event_type, message)
      VALUES (?, ?, 'incident_resolved', 'Health check passed. Service marked recovered.')
    `).run(`evt-${Date.now()}-2`, openIncident.id);
  }
}
