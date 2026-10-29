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
    const logs = db.prepare("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 1000").all() as any[];

    const headers = ["ID", "User ID", "User Email", "Action", "Resource Type", "Resource ID", "Metadata", "Timestamp"];
    const rows = logs.map((l) => [
      sanitizeCsv(l.id),
      sanitizeCsv(l.user_id),
      sanitizeCsv(l.user_email),
      sanitizeCsv(l.action),
      sanitizeCsv(l.resource_type),
      sanitizeCsv(l.resource_id),
      sanitizeCsv(l.metadata),
      sanitizeCsv(l.created_at),
    ].join(","));

    const csvContent = [headers.join(","), ...rows].join("\n");
    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="audit_logs_export.csv"',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to export audit logs" }, { status: 500 });
  }
}
