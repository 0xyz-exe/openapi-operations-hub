import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

function sanitizeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  let str = String(val).replace(/"/g, '""');
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  return `"${str}"`;
}

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const runs = db.prepare(`
      SELECT r.id, r.check_id, c.name as check_name, s.name as api_name,
             r.status_code, r.latency_ms, r.status, r.error_message, r.checked_at
      FROM monitoring_check_runs r
      JOIN monitoring_checks c ON r.check_id = c.id
      JOIN api_services s ON r.api_id = s.id
      ORDER BY r.checked_at DESC
      LIMIT 1000
    `).all() as any[];

    const headers = ["Run ID", "Check Name", "API Name", "Status Code", "Latency (ms)", "Status", "Error Message", "Timestamp"];
    const rows = runs.map((r) => [
      sanitizeCsv(r.id),
      sanitizeCsv(r.check_name),
      sanitizeCsv(r.api_name),
      sanitizeCsv(r.status_code),
      sanitizeCsv(r.latency_ms),
      sanitizeCsv(r.status),
      sanitizeCsv(r.error_message || ""),
      sanitizeCsv(r.checked_at),
    ].join(","));

    const csvContent = [headers.join(","), ...rows].join("\n");
    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="monitoring_runs_export.csv"',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to export monitoring history" }, { status: 500 });
  }
}
