import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser, logAuditEvent } from "@/lib/auth";
import { parseAndValidateSpec } from "@/lib/openapi-parser";
import { validateTargetUrl } from "@/lib/ssrf";
import { evaluateGovernance } from "@/lib/governance";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { api_id, raw_spec, import_url, changelog = "Imported specification" } = body;

    let contentToParse = "";

    if (import_url) {
      // 1. SSRF check
      const ssrf = await validateTargetUrl(import_url);
      if (!ssrf.allowed) {
        return NextResponse.json(
          { error: `URL Import blocked by security policy: ${ssrf.reason}` },
          { status: 400 }
        );
      }

      // 2. Fetch with timeout & size limit
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch(import_url, {
          signal: controller.signal,
          headers: {
            "User-Agent": "OpenAPI-Operations-Hub-Importer/1.0",
            Accept: "application/json, application/yaml, text/yaml, text/plain",
          },
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          return NextResponse.json(
            { error: `Remote server returned HTTP ${response.status}: ${response.statusText}` },
            { status: 502 }
          );
        }

        const text = await response.text();
        if (text.length > 5 * 1024 * 1024) {
          return NextResponse.json({ error: "Remote file exceeds maximum limit of 5MB" }, { status: 413 });
        }
        contentToParse = text;
      } catch (fetchErr: any) {
        clearTimeout(timeoutId);
        return NextResponse.json(
          { error: `Failed to fetch remote specification: ${fetchErr.message}` },
          { status: 502 }
        );
      }
    } else if (raw_spec && typeof raw_spec === "string") {
      contentToParse = raw_spec;
    } else {
      return NextResponse.json(
        { error: "Either 'raw_spec' or 'import_url' must be provided." },
        { status: 400 }
      );
    }

    const parsed = parseAndValidateSpec(contentToParse);
    if (!parsed.isValid && parsed.errors.length > 0 && parsed.endpointsCount === 0) {
      return NextResponse.json(
        { error: "Invalid OpenAPI specification", details: parsed.errors },
        { status: 422 }
      );
    }

    const db = getDb();
    let targetApiId = api_id;

    // If no target api_id, create new API Service automatically
    if (!targetApiId) {
      const slugBase = parsed.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "imported-api";
      let uniqueSlug = slugBase;
      let counter = 1;
      while (db.prepare("SELECT id FROM api_services WHERE slug = ?").get(uniqueSlug)) {
        uniqueSlug = `${slugBase}-${counter++}`;
      }

      targetApiId = `api-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const baseUrl = parsed.servers[0]?.url || "https://api.example.com";

      db.prepare(`
        INSERT INTO api_services (
          id, slug, name, description, api_type, base_url, owner, team, tags, lifecycle, visibility
        ) VALUES (?, ?, ?, ?, 'REST', ?, ?, 'Engineering', '[]', 'active', 'public')
      `).run(targetApiId, uniqueSlug, parsed.title, parsed.description || "Imported API specification", baseUrl, user.name);

      db.prepare(`
        INSERT INTO api_environments (id, api_id, name, base_url, is_default)
        VALUES (?, ?, 'Production', ?, 1)
      `).run(`env-${Date.now()}-1`, targetApiId, baseUrl);
    }

    const specId = `spec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    db.prepare(`
      INSERT INTO api_specifications (
        id, api_id, title, version, openapi_version, raw_spec,
        spec_format, spec_hash, validation_status, validation_errors, endpoints_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      specId,
      targetApiId,
      parsed.title,
      parsed.version,
      parsed.openapiVersion,
      contentToParse,
      parsed.format,
      parsed.specHash,
      parsed.isValid ? "valid" : "invalid",
      JSON.stringify(parsed.errors),
      parsed.endpointsCount
    );

    const versionId = `ver-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    db.prepare(`
      INSERT INTO api_specification_versions (id, spec_id, api_id, version, spec_hash, raw_spec, changelog)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(versionId, specId, targetApiId, parsed.version, parsed.specHash, contentToParse, changelog);

    // Run governance check
    const governance = evaluateGovernance(parsed);
    for (const finding of governance.findings) {
      db.prepare(`
        INSERT INTO quality_findings (id, spec_id, api_id, rule_id, severity, message, path, remediation)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `find-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        specId,
        targetApiId,
        finding.ruleId,
        finding.severity,
        finding.message,
        finding.path,
        finding.remediation
      );
    }

    logAuditEvent(user.userId, user.email, "import_spec", "api_specification", specId, {
      apiId: targetApiId,
      title: parsed.title,
      version: parsed.version,
      source: import_url ? "url" : "direct",
    });

    const api = db.prepare("SELECT * FROM api_services WHERE id = ?").get(targetApiId);
    return NextResponse.json({
      success: true,
      api,
      specId,
      parsed,
      governance,
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to import specification" }, { status: 500 });
  }
}
