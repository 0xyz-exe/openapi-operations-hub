import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser, logAuditEvent } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const apiId = searchParams.get("api_id");

    let sql = `
      SELECT c.*, s.name as api_name, s.slug as api_slug, e.name as environment_name
      FROM monitoring_checks c
      JOIN api_services s ON c.api_id = s.id
      LEFT JOIN api_environments e ON c.environment_id = e.id
    `;
    const params: any[] = [];

    if (apiId) {
      sql += ` WHERE c.api_id = ?`;
      params.push(apiId);
    }

    sql += ` ORDER BY c.created_at DESC`;

    const checks = db.prepare(sql).all(...params);
    return NextResponse.json({ checks });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch checks" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      api_id,
      environment_id = null,
      name,
      endpoint_url,
      method = "GET",
      expected_status = 200,
      interval_seconds = 60,
      timeout_ms = 5000,
      is_enabled = 1,
    } = body;

    if (!api_id || !name || !endpoint_url) {
      return NextResponse.json({ error: "api_id, name, and endpoint_url are required" }, { status: 400 });
    }

    const db = getDb();
    const id = `chk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    db.prepare(`
      INSERT INTO monitoring_checks (
        id, api_id, environment_id, name, endpoint_url, method,
        expected_status, interval_seconds, timeout_ms, is_enabled, current_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'healthy')
    `).run(
      id,
      api_id,
      environment_id,
      name,
      endpoint_url,
      method.toUpperCase(),
      expected_status,
      interval_seconds,
      timeout_ms,
      is_enabled ? 1 : 0
    );

    logAuditEvent(user.userId, user.email, "create_monitoring_check", "monitoring_check", id, {
      api_id,
      name,
      endpoint_url,
    });

    const created = db.prepare("SELECT * FROM monitoring_checks WHERE id = ?").get(id);
    return NextResponse.json({ check: created }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create check" }, { status: 500 });
  }
}
