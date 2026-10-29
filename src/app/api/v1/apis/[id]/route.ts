import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser, logAuditEvent } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();

    const api = db.prepare(`
      SELECT * FROM api_services WHERE id = ? OR slug = ?
    `).get(id, id) as any;

    if (!api) {
      return NextResponse.json({ error: "API not found" }, { status: 404 });
    }

    let tags: string[] = [];
    try {
      tags = JSON.parse(api.tags || "[]");
    } catch {
      tags = [];
    }

    const environments = db.prepare(`
      SELECT * FROM api_environments WHERE api_id = ? ORDER BY is_default DESC, name ASC
    `).all(api.id);

    const specifications = db.prepare(`
      SELECT id, title, version, openapiVersion, spec_format, spec_hash, validation_status, endpoints_count, created_at, updated_at
      FROM api_specifications WHERE api_id = ? ORDER BY created_at DESC
    `).all(api.id);

    const checks = db.prepare(`
      SELECT * FROM monitoring_checks WHERE api_id = ? ORDER BY created_at DESC
    `).all(api.id);

    const incidents = db.prepare(`
      SELECT * FROM monitoring_incidents WHERE api_id = ? ORDER BY started_at DESC LIMIT 10
    `).all(api.id);

    return NextResponse.json({
      api: {
        ...api,
        tags,
        environments,
        specifications,
        checks,
        incidents,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load API" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const db = getDb();
    const existing = db.prepare("SELECT * FROM api_services WHERE id = ?").get(id) as any;
    if (!existing) {
      return NextResponse.json({ error: "API not found" }, { status: 404 });
    }

    const body = await req.json();
    const {
      name = existing.name,
      description = existing.description,
      api_type = existing.api_type,
      base_url = existing.base_url,
      owner = existing.owner,
      team = existing.team,
      lifecycle = existing.lifecycle,
      visibility = existing.visibility,
      tags = existing.tags,
      repo_url = existing.repo_url,
      doc_url = existing.doc_url,
      contact_email = existing.contact_email,
    } = body;

    const tagsJson = typeof tags === "string" ? tags : JSON.stringify(tags);

    db.prepare(`
      UPDATE api_services SET
        name = ?, description = ?, api_type = ?, base_url = ?, owner = ?,
        team = ?, lifecycle = ?, visibility = ?, tags = ?, repo_url = ?,
        doc_url = ?, contact_email = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      name,
      description,
      api_type,
      base_url,
      owner,
      team,
      lifecycle,
      visibility,
      tagsJson,
      repo_url,
      doc_url,
      contact_email,
      id
    );

    logAuditEvent(user.userId, user.email, "update_api", "api_service", id, body);

    const updated = db.prepare("SELECT * FROM api_services WHERE id = ?").get(id);
    return NextResponse.json({ api: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update API" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(req);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: Admin role required to delete APIs" }, { status: 403 });
    }

    const { id } = await params;
    const db = getDb();

    const existing = db.prepare("SELECT * FROM api_services WHERE id = ?").get(id) as any;
    if (!existing) {
      return NextResponse.json({ error: "API not found" }, { status: 404 });
    }

    db.prepare("DELETE FROM api_services WHERE id = ?").run(id);
    logAuditEvent(user.userId, user.email, "delete_api", "api_service", id, { name: existing.name });

    return NextResponse.json({ success: true, message: `API '${existing.name}' deleted.` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete API" }, { status: 500 });
  }
}
