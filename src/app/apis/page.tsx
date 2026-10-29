"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Layers,
  Search,
  Plus,
  ExternalLink,
  Activity,
  FileCode,
  Shield,
  ArrowRight,
  Filter,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { CreateApiModal } from "@/components/CreateApiModal";

export default function ApiCatalogPage() {
  const [apis, setApis] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [lifecycle, setLifecycle] = useState("");
  const [health, setHealth] = useState("");
  const [apiType, setApiType] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchApis = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (lifecycle) params.set("lifecycle", lifecycle);
      if (health) params.set("health", health);
      if (apiType) params.set("type", apiType);

      const res = await fetch(`/api/v1/apis?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setApis(data.apis || []);
      }
    } catch (err) {
      console.error("Failed to load APIs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(fetchApis, 250);
    return () => clearTimeout(handler);
  }, [search, lifecycle, health, apiType]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">API Inventory Catalog</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Discover, track lifecycles, and view documentation for all services across the organization.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-slate-950 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Register New API</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl flex flex-wrap items-center gap-3 text-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by API name, slug, owner, or tags..."
            className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-white placeholder-slate-300 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={lifecycle}
            onChange={(e) => setLifecycle(e.target.value)}
            className="bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-sky-500"
          >
            <option value="">All Lifecycles</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="deprecated">Deprecated</option>
            <option value="archived">Archived</option>
          </select>

          <select
            value={health}
            onChange={(e) => setHealth(e.target.value)}
            className="bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-sky-500"
          >
            <option value="">All Health</option>
            <option value="healthy">Healthy</option>
            <option value="degraded">Degraded</option>
            <option value="unhealthy">Unhealthy</option>
          </select>

          <select
            value={apiType}
            onChange={(e) => setApiType(e.target.value)}
            className="bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-sky-500"
          >
            <option value="">All Types</option>
            <option value="REST">REST</option>
            <option value="GraphQL">GraphQL</option>
            <option value="gRPC">gRPC</option>
          </select>
        </div>
      </div>

      {/* APIs Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400">Loading API Catalog...</div>
      ) : apis.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {apis.map((api) => (
            <div
              key={api.id}
              className="bg-slate-900/40 border border-slate-800 hover:border-slate-700 rounded-xl p-5 flex flex-col justify-between transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-white text-sm hover:text-sky-400 transition-colors">
                      <Link href={`/apis/${api.id}`}>{api.name}</Link>
                    </h3>
                    <code className="text-[11px] text-slate-300 font-mono">{api.slug}</code>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={api.health_status} size="sm" />
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">
                      {api.lifecycle}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {api.description || "No description provided."}
                </p>

                <div className="text-[11px] font-mono text-slate-400 bg-slate-900/80 p-2 rounded border border-slate-800/80 truncate">
                  {api.base_url}
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                  <div className="flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-sky-400" />
                    <span>{api.specs_count} spec{api.specs_count !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{api.checks_count} check{api.checks_count !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Shield className="w-3.5 h-3.5 text-slate-400" />
                    <span>{api.team}</span>
                  </div>
                </div>

                {api.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {api.tags.map((t: string) => (
                      <span
                        key={t}
                        className="text-[10px] px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Lead: {api.owner}</span>
                <Link
                  href={`/apis/${api.id}`}
                  className="flex items-center gap-1 text-xs font-semibold text-sky-400 hover:text-sky-300 transition-colors"
                >
                  <span>Explore Docs</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-slate-900/20 border border-dashed border-slate-800 rounded-xl space-y-3">
          <Layers className="w-8 h-8 text-slate-400 mx-auto" />
          <h4 className="text-sm font-semibold text-white">No APIs Found</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No API services matched your active search or filters. Try adjusting criteria or register a new service.
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-slate-950 transition-colors"
          >
            Register API
          </button>
        </div>
      )}

      <CreateApiModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={fetchApis}
      />
    </div>
  );
}
