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
    const db = getDb();
    const incident = db.prepare("SELECT * FROM monitoring_incidents WHERE id = ?").get(id) as any;
    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }

    db.prepare(`
      UPDATE monitoring_incidents
      SET status = 'acknowledged',
          acknowledged_at = datetime('now')
      WHERE id = ?
    `).run(id);

    db.prepare(`
      INSERT INTO incident_events (id, incident_id, event_type, message)
      VALUES (?, ?, 'acknowledged', ?)
    `).run(`evt-${Date.now()}`, id, `Incident acknowledged by ${user.name} (${user.email})`);

    logAuditEvent(user.userId, user.email, "acknowledge_incident", "monitoring_incident", id);

    const updated = db.prepare("SELECT * FROM monitoring_incidents WHERE id = ?").get(id);
    return NextResponse.json({ incident: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to acknowledge incident" }, { status: 500 });
  }
}
