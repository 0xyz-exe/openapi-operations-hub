import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

function sanitizeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  let str = String(val).replace(/"/g, '""');
  // Formula injection prevention
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  return `"${str}"`;
}

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "json";

    const apis = db.prepare("SELECT * FROM api_services ORDER BY created_at DESC").all() as any[];

    if (format === "csv") {
      const headers = ["ID", "Slug", "Name", "Type", "Base URL", "Owner", "Team", "Lifecycle", "Health Status", "Created At"];
      const rows = apis.map((a) => [
        sanitizeCsv(a.id),
        sanitizeCsv(a.slug),
        sanitizeCsv(a.name),
        sanitizeCsv(a.api_type),
        sanitizeCsv(a.base_url),
        sanitizeCsv(a.owner),
        sanitizeCsv(a.team),
        sanitizeCsv(a.lifecycle),
        sanitizeCsv(a.health_status),
        sanitizeCsv(a.created_at),
      ].join(","));

      const csvContent = [headers.join(","), ...rows].join("\n");
      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="api_catalog_export.csv"',
        },
      });
    }

    return NextResponse.json({ apis });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to export APIs" }, { status: 500 });
  }
}
