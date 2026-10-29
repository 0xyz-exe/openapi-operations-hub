import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser, logAuditEvent } from "@/lib/auth";
import { parseAndValidateSpec } from "@/lib/openapi-parser";
import { evaluateGovernance } from "@/lib/governance";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();

    const specs = db.prepare(`
      SELECT * FROM api_specifications WHERE api_id = ? ORDER BY created_at DESC
    `).all(id) as any[];

    const formatted = specs.map((s) => {
      let errors: string[] = [];
      try {
        errors = JSON.parse(s.validation_errors || "[]");
      } catch {
        errors = [];
      }
      return {
        ...s,
        validation_errors: errors,
      };
    });

    return NextResponse.json({ specifications: formatted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load specifications" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: apiId } = await params;
    const db = getDb();
    const api = db.prepare("SELECT * FROM api_services WHERE id = ?").get(apiId) as any;
    if (!api) {
      return NextResponse.json({ error: "API not found" }, { status: 404 });
    }

    const body = await req.json();
    const { raw_spec, changelog = "Initial version" } = body;

    if (!raw_spec || typeof raw_spec !== "string") {
      return NextResponse.json({ error: "raw_spec is required (string)" }, { status: 400 });
    }

    const parsed = parseAndValidateSpec(raw_spec);
    const specId = `spec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    db.prepare(`
      INSERT INTO api_specifications (
        id, api_id, title, version, openapi_version, raw_spec,
        spec_format, spec_hash, validation_status, validation_errors, endpoints_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      specId,
      apiId,
      parsed.title,
      parsed.version,
      parsed.openapiVersion,
      raw_spec,
      parsed.format,
      parsed.specHash,
      parsed.isValid ? "valid" : "invalid",
      JSON.stringify(parsed.errors),
      parsed.endpointsCount
    );

    // Record in versions history table
    const versionId = `ver-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    db.prepare(`
      INSERT INTO api_specification_versions (id, spec_id, api_id, version, spec_hash, raw_spec, changelog)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(versionId, specId, apiId, parsed.version, parsed.specHash, raw_spec, changelog);

    // Run governance linting and record findings
    const report = evaluateGovernance(parsed);
    for (const finding of report.findings) {
      db.prepare(`
        INSERT INTO quality_findings (id, spec_id, api_id, rule_id, severity, message, path, remediation)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `find-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        specId,
        apiId,
        finding.ruleId,
        finding.severity,
        finding.message,
        finding.path,
        finding.remediation
      );
    }

    logAuditEvent(user.userId, user.email, "upload_spec", "api_specification", specId, {
      apiId,
      version: parsed.version,
      isValid: parsed.isValid,
      endpointsCount: parsed.endpointsCount,
    });

    const created = db.prepare("SELECT * FROM api_specifications WHERE id = ?").get(specId);
    return NextResponse.json({ specification: created, parsed, governance: report }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to upload specification" }, { status: 500 });
  }
}
