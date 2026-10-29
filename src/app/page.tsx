"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Layers,
  Activity,
  AlertTriangle,
  Clock,
  CheckCircle,
  Plus,
  UploadCloud,
  FileSpreadsheet,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";
import { StatusBadge, MethodBadge } from "@/components/StatusBadge";
import { CreateApiModal } from "@/components/CreateApiModal";
import { ImportSpecModal } from "@/components/ImportSpecModal";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export default function DashboardPage() {
  const [summary, setSummary] = useState<any>(null);
  const [recentRuns, setRecentRuns] = useState<any[]>([]);
  const [recentIncidents, setRecentIncidents] = useState<any[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [sumRes, runsRes, incRes] = await Promise.all([
        fetch("/api/v1/monitoring/summary"),
        fetch("/api/v1/monitoring/runs?limit=10"),
        fetch("/api/v1/incidents?status=open"),
      ]);

      if (sumRes.ok) setSummary(await sumRes.json());
      if (runsRes.ok) {
        const rData = await runsRes.json();
        setRecentRuns(rData.runs || []);
      }
      if (incRes.ok) {
        const iData = await incRes.json();
        setRecentIncidents(iData.incidents || []);
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">API Operations Hub</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time API catalog inventory, automated health monitoring, and governance portal.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsImportOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <UploadCloud className="w-3.5 h-3.5 text-sky-400" />
            <span>Import Spec</span>
          </button>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-slate-950 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Register API</span>
          </button>
        </div>
      </div>

      {/* Active Incidents Banner */}
      {recentIncidents.length > 0 && (
        <div className="bg-rose-950/40 border border-rose-800/80 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-rose-200">
                {recentIncidents.length} Active Outage Incident{recentIncidents.length > 1 ? "s" : ""}
              </h4>
              <p className="text-[11px] text-rose-300/80">
                {recentIncidents[0].title} on API: {recentIncidents[0].api_name}
              </p>
            </div>
          </div>
          <Link
            href="/incidents"
            className="flex items-center gap-1 text-xs font-semibold text-rose-300 hover:text-white underline underline-offset-4"
          >
            <span>Review Incidents</span>
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Catalog APIs</span>
            <Layers className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {summary?.totalApis ?? 0}
          </div>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
            <span className="text-emerald-400 font-semibold">{summary?.healthyApis ?? 0} healthy</span>
            <span>•</span>
            <span className="text-rose-400 font-semibold">{summary?.unhealthyApis ?? 0} down</span>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Active Health Checks</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {summary?.activeChecks ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-emerald-400" />
            <span>Automated interval probes</span>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Average Latency</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {summary?.avgLatency ?? 0} <span className="text-xs font-normal text-slate-400">ms</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-sky-400" />
            <span>Across last 100 runs</span>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Service Availability</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {summary?.availability ?? 100}%
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            <span>Uptime metric from actual probes</span>
          </div>
        </div>
      </div>

      {/* Latency Trend Chart */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Monitoring Latency History</h3>
            <p className="text-xs text-slate-400">Response time (ms) recorded across recent health probes</p>
          </div>
        </div>

        <div className="h-48 w-full pt-2">
          {summary?.trends?.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={summary.trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} unit="ms" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    fontSize: "12px",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="latency"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#38bdf8" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              No monitoring latency data recorded yet. Configure checks to begin telemetry.
            </div>
          )}
        </div>
      </div>

      {/* Recent Health Check Probes Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Recent Health Check Probes</h3>
          <Link
            href="/monitoring"
            className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1"
          >
            <span>All Checks</span>
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3 font-medium">Check Name</th>
                <th className="p-3 font-medium">Target API</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">HTTP Code</th>
                <th className="p-3 font-medium">Latency</th>
                <th className="p-3 font-medium">Checked At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {recentRuns.length > 0 ? (
                recentRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-slate-800/20">
                    <td className="p-3 font-medium text-white">{run.check_name}</td>
                    <td className="p-3 text-slate-400">{run.api_name}</td>
                    <td className="p-3">
                      <StatusBadge status={run.status} size="sm" />
                    </td>
                    <td className="p-3 font-mono">{run.status_code || "ERR"}</td>
                    <td className="p-3 font-mono text-slate-300">{run.latency_ms} ms</td>
                    <td className="p-3 text-slate-400">{run.checked_at}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400">
                    No probe runs recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateApiModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={loadData}
      />
      <ImportSpecModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImported={loadData}
      />
    </div>
  );
}
