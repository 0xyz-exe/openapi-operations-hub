"use client";

import React, { useEffect, useState } from "react";
import { Settings, Shield, Database, Download, Server, Cpu, CheckCircle } from "lucide-react";

export default function SettingsPage() {
  const [health, setHealth] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/v1/system/health").then((r) => r.json()),
      fetch("/api/v1/system/stats").then((r) => r.json()),
    ])
      .then(([hData, sData]) => {
        setHealth(hData);
        setStats(sData);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-slate-800">
        <h2 className="text-xl font-bold text-white tracking-tight">System Settings & Data Management</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Workspace diagnostics, SSRF egress security configuration, and database exports.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* System Diagnostics */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
            <Server className="w-4 h-4 text-sky-400" />
            <h3 className="font-bold text-sm text-white">System Diagnostics & Health</h3>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400">Database Engine</span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>SQLite (Node 22+ Native DatabaseSync, WAL)</span>
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400">Database Connectivity</span>
              <span className="font-mono text-emerald-400 capitalize">{health?.database || "Connected"}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400">Platform Version</span>
              <span className="font-mono text-slate-200">v{health?.version || "1.0.0"}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400">Process Memory Usage (RSS)</span>
              <span className="font-mono text-slate-200">{health?.memory?.rssMb || 64} MB</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-slate-400">System Uptime</span>
              <span className="font-mono text-slate-200">{Math.round(health?.uptime || 0)}s</span>
            </div>
          </div>
        </div>

        {/* Security & SSRF Protection */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
            <Shield className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm text-white">SSRF Security Policy</h3>
          </div>

          <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
            <p>
              All outbound synthetic monitoring requests and remote OpenAPI imports are validated against the central SSRF filter.
            </p>

            <div className="space-y-1.5 pt-2">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Loopback & Localhost (127.0.0.0/8, ::1) blocked</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>RFC 1918 Private IPv4 ranges (10.x, 172.16.x, 192.168.x) blocked</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Cloud Instance Metadata (169.254.169.254) blocked</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Pre-flight DNS validation prevents rebinding vulnerabilities</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Exports */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
          <Download className="w-4 h-4 text-sky-400" />
          <h3 className="font-bold text-sm text-white">Data Export & Backup</h3>
        </div>

        <p className="text-xs text-slate-400">
          Export full database collections as sanitized CSV spreadsheets. All cell formulas are escaped to prevent formula injection.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <a
            href="/api/v1/export/apis?format=csv"
            download="api_catalog_export.csv"
            className="flex items-center justify-center gap-2 p-3 rounded-lg bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-xs text-white font-medium transition-colors"
          >
            <Download className="w-4 h-4 text-sky-400" />
            <span>Export API Catalog (CSV)</span>
          </a>

          <a
            href="/api/v1/export/monitoring"
            download="monitoring_runs_export.csv"
            className="flex items-center justify-center gap-2 p-3 rounded-lg bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-xs text-white font-medium transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export Telemetry Runs (CSV)</span>
          </a>

          <a
            href="/api/v1/export/audit-logs"
            download="audit_logs_export.csv"
            className="flex items-center justify-center gap-2 p-3 rounded-lg bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-xs text-white font-medium transition-colors"
          >
            <Download className="w-4 h-4 text-purple-400" />
            <span>Export Audit Trail (CSV)</span>
          </a>
        </div>
      </div>
    </div>
  );
}
