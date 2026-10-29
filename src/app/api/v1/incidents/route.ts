import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser, logAuditEvent } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    let sql = `
      SELECT i.*, s.name as api_name, s.slug as api_slug, c.name as check_name
      FROM monitoring_incidents i
      JOIN api_services s ON i.api_id = s.id
      LEFT JOIN monitoring_checks c ON i.check_id = c.id
    `;
    const params: any[] = [];

    if (status) {
      sql += ` WHERE i.status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY i.started_at DESC`;

    const incidents = db.prepare(sql).all(...params) as any[];

    // Fetch events for each incident
    const formatted = incidents.map((inc) => {
      const events = db.prepare(`
        SELECT * FROM incident_events WHERE incident_id = ? ORDER BY created_at ASC
      `).all(inc.id);
      return {
        ...inc,
        events,
      };
    });

    return NextResponse.json({ incidents: formatted, total: formatted.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch incidents" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { api_id, check_id = null, title, severity = "major", notes = "" } = body;

    if (!api_id || !title) {
      return NextResponse.json({ error: "api_id and title are required" }, { status: 400 });
    }

    const db = getDb();
    const id = `inc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    db.prepare(`
      INSERT INTO monitoring_incidents (id, api_id, check_id, title, severity, status, notes)
      VALUES (?, ?, ?, ?, ?, 'open', ?)
    `).run(id, api_id, check_id, title, severity, notes);

    db.prepare(`
      INSERT INTO incident_events (id, incident_id, event_type, message)
      VALUES (?, ?, 'manual_creation', ?)
    `).run(`evt-${Date.now()}-1`, id, `Incident manually created by ${user.name} (${user.email})`);

    logAuditEvent(user.userId, user.email, "create_incident", "monitoring_incident", id, {
      api_id,
      title,
      severity,
    });

    const created = db.prepare("SELECT * FROM monitoring_incidents WHERE id = ?").get(id);
    return NextResponse.json({ incident: created }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create incident" }, { status: 500 });
  }
}
