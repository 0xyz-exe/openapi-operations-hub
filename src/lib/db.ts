import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import bcrypt from "bcryptjs";

let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (dbInstance) return dbInstance;

  const dbDir = path.resolve(process.cwd(), "data");
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = process.env.DATABASE_PATH || path.join(dbDir, "openapi_hub.sqlite");
  dbInstance = new DatabaseSync(dbPath);

  dbInstance.exec("PRAGMA journal_mode = WAL;");
  dbInstance.exec("PRAGMA foreign_keys = ON;");

  initSchema(dbInstance);
  return dbInstance;
}

function initSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'maintainer',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS api_services (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      api_type TEXT NOT NULL DEFAULT 'REST',
      base_url TEXT NOT NULL,
      owner TEXT NOT NULL,
      team TEXT NOT NULL DEFAULT 'Engineering',
      tags TEXT NOT NULL DEFAULT '[]',
      lifecycle TEXT NOT NULL DEFAULT 'active',
      visibility TEXT NOT NULL DEFAULT 'public',
      repo_url TEXT NOT NULL DEFAULT '',
      doc_url TEXT NOT NULL DEFAULT '',
      contact_email TEXT NOT NULL DEFAULT '',
      health_status TEXT NOT NULL DEFAULT 'healthy',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS api_environments (
      id TEXT PRIMARY KEY,
      api_id TEXT NOT NULL REFERENCES api_services(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      base_url TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS api_specifications (
      id TEXT PRIMARY KEY,
      api_id TEXT NOT NULL REFERENCES api_services(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      version TEXT NOT NULL,
      openapi_version TEXT NOT NULL,
      raw_spec TEXT NOT NULL,
      spec_format TEXT NOT NULL DEFAULT 'json',
      spec_hash TEXT NOT NULL,
      validation_status TEXT NOT NULL DEFAULT 'valid',
      validation_errors TEXT NOT NULL DEFAULT '[]',
      endpoints_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS api_specification_versions (
      id TEXT PRIMARY KEY,
      spec_id TEXT NOT NULL REFERENCES api_specifications(id) ON DELETE CASCADE,
      api_id TEXT NOT NULL REFERENCES api_services(id) ON DELETE CASCADE,
      version TEXT NOT NULL,
      spec_hash TEXT NOT NULL,
      raw_spec TEXT NOT NULL,
      changelog TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS monitoring_checks (
      id TEXT PRIMARY KEY,
      api_id TEXT NOT NULL REFERENCES api_services(id) ON DELETE CASCADE,
      environment_id TEXT REFERENCES api_environments(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      endpoint_url TEXT NOT NULL,
      method TEXT NOT NULL DEFAULT 'GET',
      expected_status INTEGER NOT NULL DEFAULT 200,
      interval_seconds INTEGER NOT NULL DEFAULT 60,
      timeout_ms INTEGER NOT NULL DEFAULT 5000,
      is_enabled INTEGER NOT NULL DEFAULT 1,
      last_run_at TEXT,
      current_status TEXT NOT NULL DEFAULT 'healthy',
      consecutive_failures INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS monitoring_check_runs (
      id TEXT PRIMARY KEY,
      check_id TEXT NOT NULL REFERENCES monitoring_checks(id) ON DELETE CASCADE,
      api_id TEXT NOT NULL REFERENCES api_services(id) ON DELETE CASCADE,
      status_code INTEGER,
      latency_ms INTEGER NOT NULL,
      status TEXT NOT NULL,
      error_message TEXT,
      checked_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS monitoring_incidents (
      id TEXT PRIMARY KEY,
      api_id TEXT NOT NULL REFERENCES api_services(id) ON DELETE CASCADE,
      check_id TEXT REFERENCES monitoring_checks(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'major',
      status TEXT NOT NULL DEFAULT 'open',
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      acknowledged_at TEXT,
      resolved_at TEXT,
      notes TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS incident_events (
      id TEXT PRIMARY KEY,
      incident_id TEXT NOT NULL REFERENCES monitoring_incidents(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS quality_findings (
      id TEXT PRIMARY KEY,
      spec_id TEXT NOT NULL REFERENCES api_specifications(id) ON DELETE CASCADE,
      api_id TEXT NOT NULL REFERENCES api_services(id) ON DELETE CASCADE,
      rule_id TEXT NOT NULL,
      severity TEXT NOT NULL,
      message TEXT NOT NULL,
      path TEXT NOT NULL,
      remediation TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_email TEXT NOT NULL,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      metadata TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notification_channels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      channel_type TEXT NOT NULL,
      config TEXT NOT NULL DEFAULT '{}',
      is_enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_monitoring_runs_check ON monitoring_check_runs(check_id, checked_at);
    CREATE INDEX IF NOT EXISTS idx_monitoring_runs_api ON monitoring_check_runs(api_id, checked_at);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at);
    CREATE INDEX IF NOT EXISTS idx_spec_versions_spec ON api_specification_versions(spec_id);
  `);

  // Bootstrap initial admin if empty
  const adminCheck = db.prepare("SELECT id FROM users WHERE email = ?").get("admin@apihub.local");
  if (!adminCheck) {
    const passwordHash = bcrypt.hashSync("AdminSecurePassword123!", 10);
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role)
      VALUES (?, ?, ?, ?, ?)
    `).run("usr-admin-01", "admin@apihub.local", passwordHash, "System Administrator", "admin");
  }
}
