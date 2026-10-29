import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const checkId = searchParams.get("check_id");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);

    let sql = `
      SELECT r.*, c.name as check_name, c.endpoint_url, s.name as api_name
      FROM monitoring_check_runs r
      JOIN monitoring_checks c ON r.check_id = c.id
      JOIN api_services s ON r.api_id = s.id
    `;
    const params: any[] = [];

    if (checkId) {
      sql += ` WHERE r.check_id = ?`;
      params.push(checkId);
    }

    sql += ` ORDER BY r.checked_at DESC LIMIT ?`;
    params.push(limit);

    const runs = db.prepare(sql).all(...params);
    return NextResponse.json({ runs, total: runs.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch runs" }, { status: 500 });
  }
}
