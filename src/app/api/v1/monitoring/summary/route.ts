import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const db = getDb();

    const totalApisRow = db.prepare("SELECT COUNT(*) as count FROM api_services").get() as any;
    const totalApis = totalApisRow?.count || 0;

    const healthyRow = db.prepare("SELECT COUNT(*) as count FROM api_services WHERE health_status = 'healthy'").get() as any;
    const healthyApis = healthyRow?.count || 0;

    const degradedRow = db.prepare("SELECT COUNT(*) as count FROM api_services WHERE health_status = 'degraded'").get() as any;
    const degradedApis = degradedRow?.count || 0;

    const unhealthyRow = db.prepare("SELECT COUNT(*) as count FROM api_services WHERE health_status = 'unhealthy'").get() as any;
    const unhealthyApis = unhealthyRow?.count || 0;

    const totalChecksRow = db.prepare("SELECT COUNT(*) as count FROM monitoring_checks WHERE is_enabled = 1").get() as any;
    const activeChecks = totalChecksRow?.count || 0;

    const openIncidentsRow = db.prepare("SELECT COUNT(*) as count FROM monitoring_incidents WHERE status IN ('open', 'acknowledged')").get() as any;
    const openIncidents = openIncidentsRow?.count || 0;

    // Latency & availability over last 200 runs
    const runs = db.prepare(`
      SELECT r.*, s.name as api_name
      FROM monitoring_check_runs r
      JOIN api_services s ON r.api_id = s.id
      ORDER BY r.checked_at DESC
      LIMIT 100
    `).all() as any[];

    let avgLatency = 0;
    let availability = 100;

    if (runs.length > 0) {
      const sumLatency = runs.reduce((acc, r) => acc + (r.latency_ms || 0), 0);
      avgLatency = Math.round(sumLatency / runs.length);

      const successfulRuns = runs.filter((r) => r.status === "healthy" || r.status === "degraded").length;
      availability = Math.round((successfulRuns / runs.length) * 1000) / 10;
    }

    // Trend points (last 15 runs reversed for chronological display)
    const trends = runs.slice(0, 15).reverse().map((r) => ({
      time: r.checked_at.slice(11, 16),
      latency: r.latency_ms,
      api: r.api_name,
      status: r.status,
    }));

    return NextResponse.json({
      totalApis,
      healthyApis,
      degradedApis,
      unhealthyApis,
      activeChecks,
      openIncidents,
      avgLatency,
      availability,
      trends,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to calculate monitoring summary" }, { status: 500 });
  }
}
