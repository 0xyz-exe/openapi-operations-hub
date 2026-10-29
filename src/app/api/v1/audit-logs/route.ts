import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 500);

    let sql = `SELECT * FROM audit_logs`;
    const params: any[] = [];

    if (action) {
      sql += ` WHERE action = ?`;
      params.push(action);
    }

    sql += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(limit);

    const logs = db.prepare(sql).all(...params) as any[];

    const formatted = logs.map((l) => {
      let meta = {};
      try {
        meta = JSON.parse(l.metadata || "{}");
      } catch {
        meta = {};
      }
      return {
        ...l,
        metadata: meta,
      };
    });

    return NextResponse.json({ logs: formatted, total: formatted.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch audit logs" }, { status: 500 });
  }
}
