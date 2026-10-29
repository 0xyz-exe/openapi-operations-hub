"use client";

import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Check,
  ChevronDown,
  ChevronRight,
  MessageSquare,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");

  const loadIncidents = async () => {
    try {
      setLoading(true);
      const url = statusFilter ? `/api/v1/incidents?status=${statusFilter}` : "/api/v1/incidents";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setIncidents(data.incidents || []);
      }
    } catch (err) {
      console.error("Failed to load incidents:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, [statusFilter]);

  const acknowledge = async (id: string) => {
    await fetch(`/api/v1/incidents/${id}/acknowledge`, { method: "POST" });
    await loadIncidents();
  };

  const resolve = async (id: string) => {
    await fetch(`/api/v1/incidents/${id}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolution_note: resolutionNote }),
    });
    setResolvingId(null);
    setResolutionNote("");
    await loadIncidents();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">API Operational Incidents</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Deduplicated incident tracking, lifecycle state management, and resolution audit trails.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-slate-300 focus:outline-none focus:border-sky-500"
          >
            <option value="">All Incident States</option>
            <option value="open">Open</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading incident records...</div>
      ) : incidents.length > 0 ? (
        <div className="space-y-4">
          {incidents.map((inc) => (
            <div
              key={inc.id}
              className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      inc.status === "resolved"
                        ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                        : "bg-rose-500/10 border border-rose-500/30 text-rose-400"
                    }`}
                  >
                    {inc.status === "resolved" ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">{inc.title}</h3>
                    <p className="text-xs text-slate-400">
                      Target Service: <span className="text-slate-200 font-medium">{inc.api_name}</span> ({inc.api_slug})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge status={inc.severity} size="sm" />
                  <StatusBadge status={inc.status} size="sm" />
                </div>
              </div>

              {inc.notes && (
                <div className="text-xs text-slate-300 bg-slate-900/70 p-3 rounded-lg border border-slate-800/80 font-mono whitespace-pre-wrap">
                  {inc.notes}
                </div>
              )}

              {/* Event Timeline */}
              {inc.events?.length > 0 && (
                <div className="border-t border-slate-800/60 pt-3 space-y-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Incident Timeline
                  </span>
                  <div className="space-y-1.5">
                    {inc.events.map((evt: any) => (
                      <div key={evt.id} className="flex items-center gap-2.5 text-xs text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                        <span className="font-mono text-[11px] text-slate-300">{evt.created_at}</span>
                        <span>—</span>
                        <span className="text-slate-300">{evt.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
                <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                  <span>Started: {inc.started_at}</span>
                  {inc.resolved_at && <span>• Resolved: {inc.resolved_at}</span>}
                </div>

                <div className="flex items-center gap-2">
                  {inc.status === "open" && (
                    <button
                      onClick={() => acknowledge(inc.id)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium transition-colors"
                    >
                      Acknowledge
                    </button>
                  )}
                  {inc.status !== "resolved" && (
                    <button
                      onClick={() => setResolvingId(inc.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium transition-colors"
                    >
                      Resolve Incident
                    </button>
                  )}
                </div>
              </div>

              {/* Resolution Form */}
              {resolvingId === inc.id && (
                <div className="mt-3 p-3 bg-slate-900 border border-slate-700 rounded-lg space-y-3">
                  <label className="block text-slate-300 font-medium text-xs">Resolution Notes</label>
                  <textarea
                    rows={2}
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    placeholder="Describe how the outage was addressed (e.g. rolled back deploy, fixed DNS)..."
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-white text-xs focus:outline-none focus:border-sky-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setResolvingId(null)}
                      className="px-3 py-1 rounded text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => resolve(inc.id)}
                      className="px-3 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold"
                    >
                      Confirm Resolution
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-slate-900/20 border border-dashed border-slate-800 rounded-xl space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
          <h4 className="text-sm font-semibold text-white">All Systems Operational</h4>
          <p className="text-xs text-slate-400">
            No incidents found matching the selected state filter.
          </p>
        </div>
      )}
    </div>
  );
}
