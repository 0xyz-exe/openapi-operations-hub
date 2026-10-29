import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { compareSpecs } from "@/lib/openapi-diff";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { spec_id_1, spec_id_2, raw_spec_1, raw_spec_2 } = body;

    const db = getDb();
    let oldSpec = raw_spec_1;
    let newSpec = raw_spec_2;

    if (spec_id_1 && !oldSpec) {
      const row1 = db.prepare("SELECT raw_spec FROM api_specifications WHERE id = ?").get(spec_id_1) as any;
      if (!row1) return NextResponse.json({ error: `Specification ${spec_id_1} not found` }, { status: 404 });
      oldSpec = row1.raw_spec;
    }

    if (spec_id_2 && !newSpec) {
      const row2 = db.prepare("SELECT raw_spec FROM api_specifications WHERE id = ?").get(spec_id_2) as any;
      if (!row2) return NextResponse.json({ error: `Specification ${spec_id_2} not found` }, { status: 404 });
      newSpec = row2.raw_spec;
    }

    if (!oldSpec || !newSpec) {
      return NextResponse.json({ error: "Two specifications are required for comparison" }, { status: 400 });
    }

    const diff = compareSpecs(oldSpec, newSpec);
    return NextResponse.json({ diff });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to compare specifications" }, { status: 500 });
  }
}
