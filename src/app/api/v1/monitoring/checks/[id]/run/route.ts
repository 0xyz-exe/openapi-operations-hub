import { NextRequest, NextResponse } from "next/server";
import { executeHealthCheck } from "@/lib/monitoring-worker";
import { getCurrentUser, logAuditEvent } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser(req);

    const result = await executeHealthCheck(id);

    if (user) {
      logAuditEvent(user.userId, user.email, "run_health_check", "monitoring_check", id, {
        status: result.status,
        latencyMs: result.latencyMs,
      });
    }

    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to execute health check" }, { status: 500 });
  }
}
