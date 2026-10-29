"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  Layers,
  FileCode,
  Activity,
  AlertTriangle,
  ShieldCheck,
  Globe,
  Settings,
  Play,
  UploadCloud,
  ArrowLeft,
  Clock,
  Trash2,
} from "lucide-react";
import { StatusBadge, MethodBadge } from "@/components/StatusBadge";
import { ApiDocViewer } from "@/components/ApiDocViewer";
import { ImportSpecModal } from "@/components/ImportSpecModal";
import { parseAndValidateSpec } from "@/lib/openapi-parser";

export default function ApiDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [apiData, setApiData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"docs" | "specs" | "monitoring" | "quality" | "incidents" | "settings">("docs");
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [activeSpec, setActiveSpec] = useState<any>(null);
  const [parsedEndpoints, setParsedEndpoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkLoading, setCheckLoading] = useState<string | null>(null);

  const loadApi = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/apis/${id}`);
      if (res.ok) {
        const data = await res.json();
        setApiData(data.api);

        if (data.api.specifications?.length > 0) {
          const specRes = await fetch(`/api/v1/apis/${id}/specifications`);
          if (specRes.ok) {
            const specData = await specRes.json();
            const latest = specData.specifications[0];
            setActiveSpec(latest);
            if (latest?.raw_spec) {
              const parsed = parseAndValidateSpec(latest.raw_spec);
              setParsedEndpoints(parsed.endpoints);
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to load API details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApi();
  }, [id]);

  const triggerCheck = async (checkId: string) => {
    try {
      setCheckLoading(checkId);
      await fetch(`/api/v1/monitoring/checks/${checkId}/run`, { method: "POST" });
      await loadApi();
    } finally {
      setCheckLoading(null);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading API details...</div>;
  }

  if (!apiData) {
    return (
      <div className="p-12 text-center space-y-3">
        <h3 className="text-white font-bold">API Not Found</h3>
        <Link href="/apis" className="text-xs text-sky-400 underline">
          Back to API Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4 pb-4 border-b border-slate-800">
        <Link
          href="/apis"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Catalog</span>
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white tracking-tight">{apiData.name}</h2>
              <StatusBadge status={apiData.health_status} />
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold uppercase">
                {apiData.api_type}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <code className="text-slate-300 font-mono">{apiData.slug}</code>
              <span>•</span>
              <span>Owner: {apiData.owner}</span>
              <span>•</span>
              <span>Team: {apiData.team}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsImportOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-slate-950 transition-colors"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Import New Spec Version</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 pt-2 border-t border-slate-800/60 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab("docs")}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "docs"
                ? "bg-sky-500/15 text-sky-400 border border-sky-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Interactive Docs</span>
          </button>
          <button
            onClick={() => setActiveTab("specs")}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "specs"
                ? "bg-sky-500/15 text-sky-400 border border-sky-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Specifications ({apiData.specifications?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab("monitoring")}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "monitoring"
                ? "bg-sky-500/15 text-sky-400 border border-sky-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Health Checks ({apiData.checks?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab("incidents")}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "incidents"
                ? "bg-sky-500/15 text-sky-400 border border-sky-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Incidents ({apiData.incidents?.length || 0})</span>
          </button>
        </div>
      </div>

      {/* Tab: Documentation */}
      {activeTab === "docs" && (
        <div className="space-y-4">
          {parsedEndpoints.length > 0 ? (
            <ApiDocViewer endpoints={parsedEndpoints} baseUrl={apiData.base_url} />
          ) : (
            <div className="p-12 text-center bg-slate-900/30 border border-dashed border-slate-800 rounded-xl space-y-3">
              <FileCode className="w-8 h-8 text-slate-400 mx-auto" />
              <h4 className="text-sm font-semibold text-white">No Specification Uploaded</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Upload or import an OpenAPI 3.0 / 3.1 specification to generate interactive documentation and endpoint explorers.
              </p>
              <button
                onClick={() => setIsImportOpen(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-slate-950 transition-colors"
              >
                Import Specification
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab: Specifications */}
      {activeTab === "specs" && (
        <div className="space-y-4">
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3 font-medium">Title</th>
                  <th className="p-3 font-medium">Version</th>
                  <th className="p-3 font-medium">OpenAPI Standard</th>
                  <th className="p-3 font-medium">Endpoints</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Spec Hash</th>
                  <th className="p-3 font-medium">Uploaded At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {apiData.specifications?.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-800/30">
                    <td className="p-3 font-medium text-white">{s.title}</td>
                    <td className="p-3 font-mono text-sky-400 font-semibold">{s.version}</td>
                    <td className="p-3 font-mono text-slate-400">{s.openapi_version}</td>
                    <td className="p-3 font-mono">{s.endpoints_count} ops</td>
                    <td className="p-3">
                      <StatusBadge status={s.validation_status} size="sm" />
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-300">
                      {s.spec_hash.substring(0, 12)}...
                    </td>
                    <td className="p-3 text-slate-400">{s.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Monitoring */}
      {activeTab === "monitoring" && (
        <div className="space-y-4">
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3 font-medium">Check Name</th>
                  <th className="p-3 font-medium">Method</th>
                  <th className="p-3 font-medium">Endpoint URL</th>
                  <th className="p-3 font-medium">Interval</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Last Run</th>
                  <th className="p-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {apiData.checks?.map((chk: any) => (
                  <tr key={chk.id} className="hover:bg-slate-800/30">
                    <td className="p-3 font-medium text-white">{chk.name}</td>
                    <td className="p-3">
                      <MethodBadge method={chk.method} />
                    </td>
                    <td className="p-3 font-mono text-slate-400 truncate max-w-xs">
                      {chk.endpoint_url}
                    </td>
                    <td className="p-3 text-slate-400">{chk.interval_seconds}s</td>
                    <td className="p-3">
                      <StatusBadge status={chk.current_status} size="sm" />
                    </td>
                    <td className="p-3 text-slate-400">{chk.last_run_at || "Never"}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => triggerCheck(chk.id)}
                        disabled={checkLoading === chk.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 transition-colors disabled:opacity-50"
                      >
                        <Play className="w-3 h-3" />
                        <span>{checkLoading === chk.id ? "Testing..." : "Run Check"}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Incidents */}
      {activeTab === "incidents" && (
        <div className="space-y-4">
          {apiData.incidents?.length > 0 ? (
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3 font-medium">Title</th>
                    <th className="p-3 font-medium">Severity</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Started At</th>
                    <th className="p-3 font-medium">Resolved At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {apiData.incidents.map((inc: any) => (
                    <tr key={inc.id} className="hover:bg-slate-800/30">
                      <td className="p-3 font-medium text-white">{inc.title}</td>
                      <td className="p-3">
                        <StatusBadge status={inc.severity} size="sm" />
                      </td>
                      <td className="p-3">
                        <StatusBadge status={inc.status} size="sm" />
                      </td>
                      <td className="p-3 text-slate-400">{inc.started_at}</td>
                      <td className="p-3 text-slate-400">{inc.resolved_at || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">
              No incidents recorded for this API service.
            </div>
          )}
        </div>
      )}

      <ImportSpecModal
        isOpen={isImportOpen}
        apiId={apiData.id}
        onClose={() => setIsImportOpen(false)}
        onImported={loadApi}
      />
    </div>
  );
}
