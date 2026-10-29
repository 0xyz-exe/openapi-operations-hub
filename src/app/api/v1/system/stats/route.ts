import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const apis = (db.prepare("SELECT COUNT(*) as count FROM api_services").get() as any)?.count || 0;
    const specs = (db.prepare("SELECT COUNT(*) as count FROM api_specifications").get() as any)?.count || 0;
    const checks = (db.prepare("SELECT COUNT(*) as count FROM monitoring_checks").get() as any)?.count || 0;
    const runs = (db.prepare("SELECT COUNT(*) as count FROM monitoring_check_runs").get() as any)?.count || 0;
    const incidents = (db.prepare("SELECT COUNT(*) as count FROM monitoring_incidents").get() as any)?.count || 0;
    const findings = (db.prepare("SELECT COUNT(*) as count FROM quality_findings").get() as any)?.count || 0;
    const auditLogs = (db.prepare("SELECT COUNT(*) as count FROM audit_logs").get() as any)?.count || 0;

    return NextResponse.json({
      apis,
      specs,
      checks,
      runs,
      incidents,
      findings,
      auditLogs,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
