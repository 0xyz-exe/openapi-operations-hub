import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    // Test database readiness
    const dbCheck = db.prepare("SELECT 1 as live").get() as any;

    return NextResponse.json({
      status: "healthy",
      database: dbCheck?.live === 1 ? "connected" : "disconnected",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapUsedMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ status: "unhealthy", error: err.message }, { status: 503 });
  }
}
