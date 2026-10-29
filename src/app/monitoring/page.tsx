"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  Play,
  Plus,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { StatusBadge, MethodBadge } from "@/components/StatusBadge";

export default function MonitoringPage() {
  const [checks, setChecks] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [apis, setApis] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [runningId, setRunningId] = useState<string | null>(null);

  // Form State
  const [apiId, setApiId] = useState("");
  const [name, setName] = useState("");
  const [endpointUrl, setEndpointUrl] = useState("https://api.example.com/health");
  const [method, setMethod] = useState("GET");
  const [expectedStatus, setExpectedStatus] = useState(200);
  const [intervalSeconds, setIntervalSeconds] = useState(60);

  const loadData = async () => {
    try {
      setLoading(true);
      const [checksRes, runsRes, apisRes] = await Promise.all([
        fetch("/api/v1/monitoring/checks"),
        fetch("/api/v1/monitoring/runs?limit=25"),
        fetch("/api/v1/apis"),
      ]);

      if (checksRes.ok) {
        const cData = await checksRes.json();
        setChecks(cData.checks || []);
      }
      if (runsRes.ok) {
        const rData = await runsRes.json();
        setRuns(rData.runs || []);
      }
      if (apisRes.ok) {
        const aData = await apisRes.json();
        setApis(aData.apis || []);
        if (aData.apis?.length > 0 && !apiId) {
          setApiId(aData.apis[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load monitoring data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 20000);
    return () => clearInterval(timer);
  }, []);

  const triggerRun = async (checkId: string) => {
    setRunningId(checkId);
    try {
      await fetch(`/api/v1/monitoring/checks/${checkId}/run`, { method: "POST" });
      await loadData();
    } finally {
      setRunningId(null);
    }
  };

  const handleCreateCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/v1/monitoring/checks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_id: apiId,
          name,
          endpoint_url: endpointUrl,
          method,
          expected_status: expectedStatus,
          interval_seconds: intervalSeconds,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setName("");
        await loadData();
      }
    } catch (err) {
      console.error("Failed to create check:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Active API Health Monitoring</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time synthetic probes, uptime tracking, and automated failure detection.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-slate-950 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Configure Health Check</span>
          </button>
        </div>
      </div>

      {/* Monitoring Checks List */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Configured Probes ({checks.length})</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3 font-medium">Check Name</th>
                <th className="p-3 font-medium">Target API</th>
                <th className="p-3 font-medium">Method</th>
                <th className="p-3 font-medium">Target URL</th>
                <th className="p-3 font-medium">Interval</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Last Run</th>
                <th className="p-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {checks.length > 0 ? (
                checks.map((chk) => (
                  <tr key={chk.id} className="hover:bg-slate-800/20">
                    <td className="p-3 font-medium text-white">{chk.name}</td>
                    <td className="p-3 text-slate-400">{chk.api_name}</td>
                    <td className="p-3">
                      <MethodBadge method={chk.method} />
                    </td>
                    <td className="p-3 font-mono text-slate-400 truncate max-w-xs">{chk.endpoint_url}</td>
                    <td className="p-3 text-slate-400">{chk.interval_seconds}s</td>
                    <td className="p-3">
                      <StatusBadge status={chk.current_status} size="sm" />
                    </td>
                    <td className="p-3 text-slate-400">{chk.last_run_at || "Never"}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => triggerRun(chk.id)}
                        disabled={runningId === chk.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 transition-colors disabled:opacity-50"
                      >
                        <Play className="w-3 h-3" />
                        <span>{runningId === chk.id ? "Testing..." : "Run Now"}</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No monitoring checks configured yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Realtime Check Runs History */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Recent Telemetry Execution Runs</h3>
          <span className="text-xs text-slate-400">Auto-refreshed</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3 font-medium">Timestamp</th>
                <th className="p-3 font-medium">Check Name</th>
                <th className="p-3 font-medium">API</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">HTTP Code</th>
                <th className="p-3 font-medium">Latency</th>
                <th className="p-3 font-medium">Error Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {runs.map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/20">
                  <td className="p-3 text-slate-400">{r.checked_at}</td>
                  <td className="p-3 font-medium text-white">{r.check_name}</td>
                  <td className="p-3 text-slate-400">{r.api_name}</td>
                  <td className="p-3">
                    <StatusBadge status={r.status} size="sm" />
                  </td>
                  <td className="p-3 font-mono">{r.status_code || "ERR"}</td>
                  <td className="p-3 font-mono">{r.latency_ms} ms</td>
                  <td className="p-3 text-slate-400 truncate max-w-xs">{r.error_message || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Check Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-[#0e1628] border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-semibold text-white text-base">New Health Check</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCheck} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Target API Service</label>
                <select
                  value={apiId}
                  onChange={(e) => setApiId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                >
                  {apis.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.slug})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Check Display Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Production Liveness Probe"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Endpoint URL</label>
                <input
                  type="url"
                  required
                  value={endpointUrl}
                  onChange={(e) => setEndpointUrl(e.target.value)}
                  placeholder="https://api.example.com/health"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">HTTP Method</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="HEAD">HEAD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Expected HTTP Code</label>
                  <input
                    type="number"
                    value={expectedStatus}
                    onChange={(e) => setExpectedStatus(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Interval (Seconds)</label>
                <input
                  type="number"
                  value={intervalSeconds}
                  onChange={(e) => setIntervalSeconds(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold"
                >
                  Save Probe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
