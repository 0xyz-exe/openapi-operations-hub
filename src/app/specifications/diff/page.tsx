"use client";

import React, { useState } from "react";
import { GitCompare, AlertTriangle, CheckCircle, Info, ArrowRight } from "lucide-react";
import { MethodBadge } from "@/components/StatusBadge";

export default function SpecDiffPage() {
  const [spec1, setSpec1] = useState(`{
  "openapi": "3.0.0",
  "info": { "title": "Store API", "version": "1.0.0" },
  "paths": {
    "/products": {
      "get": {
        "summary": "List products",
        "parameters": [
          { "name": "limit", "in": "query", "required": false }
        ],
        "responses": { "200": { "description": "OK" } }
      },
      "delete": {
        "summary": "Delete product",
        "responses": { "204": { "description": "Deleted" } }
      }
    }
  }
}`);

  const [spec2, setSpec2] = useState(`{
  "openapi": "3.0.0",
  "info": { "title": "Store API", "version": "2.0.0" },
  "paths": {
    "/products": {
      "get": {
        "summary": "List products",
        "parameters": [
          { "name": "limit", "in": "query", "required": false },
          { "name": "category_id", "in": "query", "required": true }
        ],
        "responses": { "200": { "description": "OK" } }
      }
    },
    "/orders": {
      "post": {
        "summary": "Create order",
        "responses": { "201": { "description": "Created" } }
      }
    }
  }
}`);

  const [diffResult, setDiffResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCompare = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/specifications/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw_spec_1: spec1,
          raw_spec_2: spec2,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to compare specs");
      setDiffResult(data.diff);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-slate-800">
        <h2 className="text-xl font-bold text-white tracking-tight">OpenAPI Version Diff & Breaking Changes</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Detect added endpoints, removed operations, modified schemas, and breaking contract mutations.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-lg">
          {error}
        </div>
      )}

      {/* Inputs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="space-y-2">
          <label className="block text-slate-300 font-semibold">Base Version (v1 / Previous)</label>
          <textarea
            rows={10}
            value={spec1}
            onChange={(e) => setSpec1(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-3 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-slate-300 font-semibold">Target Version (v2 / Proposed)</label>
          <textarea
            rows={10}
            value={spec2}
            onChange={(e) => setSpec2(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-3 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleCompare}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition-colors shadow-sm disabled:opacity-50"
        >
          <GitCompare className="w-4 h-4" />
          <span>{loading ? "Analyzing Differences..." : "Compare Specifications"}</span>
        </button>
      </div>

      {/* Diff Results View */}
      {diffResult && (
        <div className="space-y-4 pt-2">
          {/* Summary counters */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-rose-950/40 border border-rose-800/80 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-rose-300 font-medium">Breaking Changes</span>
                <div className="text-2xl font-bold text-rose-200 mt-1">
                  {diffResult.breakingCount}
                </div>
              </div>
              <AlertTriangle className="w-6 h-6 text-rose-400" />
            </div>

            <div className="bg-amber-950/40 border border-amber-800/80 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-amber-300 font-medium">Potentially Breaking</span>
                <div className="text-2xl font-bold text-amber-200 mt-1">
                  {diffResult.potentiallyBreakingCount}
                </div>
              </div>
              <Info className="w-6 h-6 text-amber-400" />
            </div>

            <div className="bg-emerald-950/40 border border-emerald-800/80 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-emerald-300 font-medium">Non-Breaking</span>
                <div className="text-2xl font-bold text-emerald-200 mt-1">
                  {diffResult.nonBreakingCount}
                </div>
              </div>
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            </div>
          </div>

          {/* Itemized Changes Table */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Itemized Changes ({diffResult.totalChanges})</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3 font-medium">Classification</th>
                    <th className="p-3 font-medium">Action</th>
                    <th className="p-3 font-medium">Category</th>
                    <th className="p-3 font-medium">Path / Method</th>
                    <th className="p-3 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-300">
                  {diffResult.items.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-800/20">
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                            item.type === "breaking"
                              ? "bg-rose-950 text-rose-300 border border-rose-800"
                              : item.type === "potentially_breaking"
                              ? "bg-amber-950 text-amber-300 border border-amber-800"
                              : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                          }`}
                        >
                          {item.type.replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-3 font-semibold uppercase text-[11px]">{item.action}</td>
                      <td className="p-3 text-slate-400 capitalize">{item.category}</td>
                      <td className="p-3 font-mono text-slate-200">
                        {item.method && <span className="text-sky-400 mr-1.5">{item.method}</span>}
                        {item.path}
                      </td>
                      <td className="p-3 text-slate-300">{item.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
