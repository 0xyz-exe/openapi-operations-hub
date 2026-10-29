import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "../src/lib/db";
import { executeHealthCheck } from "../src/lib/monitoring-worker";

describe("Database & Monitoring Worker", () => {
  let db: any;

  beforeAll(() => {
    db = getDb();
  });

  it("initializes tables and seeds default administrator", () => {
    const admin = db.prepare("SELECT * FROM users WHERE email = ?").get("admin@apihub.local");
    expect(admin).toBeDefined();
    expect(admin.role).toBe("admin");
  });

  it("handles API lifecycle CRUD properly", () => {
    const testId = `test-api-${Date.now()}`;
    db.prepare(`
      INSERT INTO api_services (id, slug, name, description, api_type, base_url, owner, team)
      VALUES (?, ?, 'Test Service', 'Description', 'REST', 'https://api.test.com', 'Tester', 'DevOps')
    `).run(testId, `slug-${Date.now()}`);

    const retrieved = db.prepare("SELECT * FROM api_services WHERE id = ?").get(testId);
    expect(retrieved.name).toBe("Test Service");

    // Clean up
    db.prepare("DELETE FROM api_services WHERE id = ?").run(testId);
    const deleted = db.prepare("SELECT * FROM api_services WHERE id = ?").get(testId);
    expect(deleted).toBeUndefined();
  });

  it("executes health check against mock target and persists run", async () => {
    // Insert mock check
    const checkId = `chk-test-${Date.now()}`;
    const apiId = `api-test-${Date.now()}`;

    db.prepare(`
      INSERT INTO api_services (id, slug, name, description, base_url, owner)
      VALUES (?, ?, 'Mock API', 'Desc', 'https://httpbin.org', 'Lead')
    `).run(apiId, `slug-mock-${Date.now()}`);

    db.prepare(`
      INSERT INTO monitoring_checks (id, api_id, name, endpoint_url, method, expected_status)
      VALUES (?, ?, 'HTTP 200 Probe', 'https://httpbin.org/status/200', 'GET', 200)
    `).run(checkId, apiId);

    const result = await executeHealthCheck(checkId);
    expect(result.checkId).toBe(checkId);
    expect(result.status).toBeDefined();

    // Verify run recorded
    const run = db.prepare("SELECT * FROM monitoring_check_runs WHERE check_id = ?").get(checkId);
    expect(run).toBeDefined();

    // Cleanup
    db.prepare("DELETE FROM api_services WHERE id = ?").run(apiId);
  });
});
