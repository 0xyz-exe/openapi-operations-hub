import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser, logAuditEvent } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);

    const q = searchParams.get("q") || "";
    const lifecycle = searchParams.get("lifecycle") || "";
    const health = searchParams.get("health") || "";
    const apiType = searchParams.get("type") || "";

    let sql = `
      SELECT s.*, 
        (SELECT COUNT(*) FROM api_specifications WHERE api_id = s.id) as specs_count,
        (SELECT COUNT(*) FROM monitoring_checks WHERE api_id = s.id) as checks_count
      FROM api_services s
      WHERE 1=1
    `;
    const params: any[] = [];

    if (q) {
      sql += ` AND (s.name LIKE ? OR s.description LIKE ? OR s.slug LIKE ? OR s.tags LIKE ? OR s.owner LIKE ?)`;
      const queryPattern = `%${q}%`;
      params.push(queryPattern, queryPattern, queryPattern, queryPattern, queryPattern);
    }

    if (lifecycle) {
      sql += ` AND s.lifecycle = ?`;
      params.push(lifecycle);
    }

    if (health) {
      sql += ` AND s.health_status = ?`;
      params.push(health);
    }

    if (apiType) {
      sql += ` AND s.api_type = ?`;
      params.push(apiType);
    }

    sql += ` ORDER BY s.updated_at DESC`;

    const apis = db.prepare(sql).all(...params) as any[];

    // Parse tags JSON
    const formatted = apis.map((api) => {
      let tags: string[] = [];
      try {
        tags = JSON.parse(api.tags || "[]");
      } catch {
        tags = [];
      }
      return {
        ...api,
        tags,
      };
    });

    return NextResponse.json({ apis: formatted, total: formatted.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch APIs" }, { status: 500 });
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
      name,
      slug,
      description = "",
      api_type = "REST",
      base_url,
      owner,
      team = "Engineering",
      tags = [],
      lifecycle = "active",
      visibility = "public",
      repo_url = "",
      doc_url = "",
      contact_email = "",
    } = body;

    if (!name || !slug || !base_url || !owner) {
      return NextResponse.json(
        { error: "name, slug, base_url, and owner are required fields" },
        { status: 400 }
      );
    }

    const db = getDb();
    const existing = db.prepare("SELECT id FROM api_services WHERE slug = ?").get(slug);
    if (existing) {
      return NextResponse.json({ error: `API slug '${slug}' is already in use` }, { status: 409 });
    }

    const id = `api-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : []);

    db.prepare(`
      INSERT INTO api_services (
        id, slug, name, description, api_type, base_url, owner, team, tags,
        lifecycle, visibility, repo_url, doc_url, contact_email, health_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'healthy')
    `).run(
      id,
      slug,
      name,
      description,
      api_type,
      base_url,
      owner,
      team,
      tagsJson,
      lifecycle,
      visibility,
      repo_url,
      doc_url,
      contact_email
    );

    // Create default environment
    db.prepare(`
      INSERT INTO api_environments (id, api_id, name, base_url, is_default)
      VALUES (?, ?, 'Production', ?, 1)
    `).run(`env-${Date.now()}-1`, id, base_url);

    logAuditEvent(user.userId, user.email, "create_api", "api_service", id, { slug, name });

    const created = db.prepare("SELECT * FROM api_services WHERE id = ?").get(id);
    return NextResponse.json({ api: created }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create API" }, { status: 500 });
  }
}
