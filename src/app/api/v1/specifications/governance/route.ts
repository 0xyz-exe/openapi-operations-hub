import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { parseAndValidateSpec } from "@/lib/openapi-parser";
import { evaluateGovernance } from "@/lib/governance";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { spec_id, raw_spec } = body;

    let content = raw_spec;
    if (spec_id && !content) {
      const db = getDb();
      const spec = db.prepare("SELECT raw_spec FROM api_specifications WHERE id = ?").get(spec_id) as any;
      if (!spec) return NextResponse.json({ error: "Specification not found" }, { status: 404 });
      content = spec.raw_spec;
    }

    if (!content) {
      return NextResponse.json({ error: "spec_id or raw_spec is required" }, { status: 400 });
    }

    const parsed = parseAndValidateSpec(content);
    const report = evaluateGovernance(parsed);

    return NextResponse.json({ report, parsed });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to evaluate governance" }, { status: 500 });
  }
}
