"use client";

import React, { useEffect, useState } from "react";
import { FileText, Download, Filter, RefreshCw, Shield } from "lucide-react";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [actionFilter, setActionFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const url = actionFilter ? `/api/v1/audit-logs?action=${actionFilter}` : "/api/v1/audit-logs";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [actionFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Security & Governance Audit Trail</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable log of all administrative actions, specification mutations, and security events.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href="/api/v1/export/audit-logs"
            download="audit_logs.csv"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-300 focus:outline-none focus:border-sky-500"
          >
            <option value="">All Actions</option>
            <option value="login">User Login</option>
            <option value="create_api">Create API</option>
            <option value="update_api">Update API</option>
            <option value="upload_spec">Upload Spec</option>
            <option value="import_spec">Import Spec</option>
            <option value="run_health_check">Execute Check</option>
            <option value="create_incident">Create Incident</option>
            <option value="acknowledge_incident">Acknowledge Incident</option>
            <option value="resolve_incident">Resolve Incident</option>
          </select>
        </div>

        <span className="text-slate-400">{logs.length} audit records</span>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3 font-medium">Timestamp</th>
                <th className="p-3 font-medium">Actor</th>
                <th className="p-3 font-medium">Action</th>
                <th className="p-3 font-medium">Resource Type</th>
                <th className="p-3 font-medium">Resource ID</th>
                <th className="p-3 font-medium">Metadata Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400">
                    Loading records...
                  </td>
                </tr>
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/20">
                    <td className="p-3 font-mono text-slate-400 whitespace-nowrap">{log.created_at}</td>
                    <td className="p-3 font-medium text-white">{log.user_email}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono text-[11px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 capitalize text-slate-300">{log.resource_type.replace("_", " ")}</td>
                    <td className="p-3 font-mono text-[11px] text-slate-400 truncate max-w-xs">{log.resource_id}</td>
                    <td className="p-3 font-mono text-[11px] text-slate-400 max-w-md truncate">
                      {JSON.stringify(log.metadata)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No audit records found matching the filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
