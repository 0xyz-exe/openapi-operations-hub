import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser, logAuditEvent } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { resolution_note = "" } = body;

    const db = getDb();
    const incident = db.prepare("SELECT * FROM monitoring_incidents WHERE id = ?").get(id) as any;
    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    const updatedNotes = resolution_note
      ? `${incident.notes}\n[Resolution]: ${resolution_note}`
      : incident.notes;

    db.prepare(`
      UPDATE monitoring_incidents
      SET status = 'resolved',
          resolved_at = datetime('now'),
          notes = ?
      WHERE id = ?
    `).run(updatedNotes, id);

    db.prepare(`
      INSERT INTO incident_events (id, incident_id, event_type, message)
      VALUES (?, ?, 'resolved', ?)
    `).run(
      `evt-${Date.now()}`,
      id,
      `Incident resolved by ${user.name}: ${resolution_note || "Marked resolved manually"}`
    );

    logAuditEvent(user.userId, user.email, "resolve_incident", "monitoring_incident", id, {
      resolution_note,
    });

    const updated = db.prepare("SELECT * FROM monitoring_incidents WHERE id = ?").get(id);
    return NextResponse.json({ incident: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to resolve incident" }, { status: 500 });
  }
}
