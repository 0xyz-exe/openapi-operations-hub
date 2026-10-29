"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck, AlertCircle, AlertTriangle, Info, CheckCircle2, Play } from "lucide-react";
import { evaluateGovernance } from "@/lib/governance";
import { parseAndValidateSpec } from "@/lib/openapi-parser";

const DEFAULT_SAMPLE_SPEC = `{
  "openapi": "3.0.1",
  "info": {
    "title": "Payment Gateway API",
    "version": "1.0.0"
  },
  "servers": [
    { "url": "http://api.payments.internal" }
  ],
  "paths": {
    "/charges": {
      "post": {
        "responses": {
          "201": { "description": "Charge created" }
        }
      }
    },
    "/refunds/{id}": {
      "get": {
        "responses": {
          "404": { "description": "Refund not found" }
        }
      }
    }
  }
}`;

export default function GovernancePage() {
  const [specText, setSpecText] = useState(DEFAULT_SAMPLE_SPEC);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runAnalysis = () => {
    setLoading(true);
    try {
      const parsed = parseAndValidateSpec(specText);
      const res = evaluateGovernance(parsed);
      setReport(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAnalysis();
  }, []);

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-slate-800">
        <h2 className="text-xl font-bold text-white tracking-tight">API Quality & Governance Rules</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Automated linting against OpenAPI standards, documentation completeness, and security requirements.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor input */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300">OpenAPI Spec to Audit</label>
            <button
              onClick={runAnalysis}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition-colors"
            >
              <Play className="w-3 h-3" />
              <span>Audit Now</span>
            </button>
          </div>
          <textarea
            rows={14}
            value={specText}
            onChange={(e) => setSpecText(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-3 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Scorecard & Findings */}
        <div className="lg:col-span-2 space-y-4">
          {report && (
            <>
              {/* Scorecard */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div
                    className={`w-16 h-16 rounded-xl flex items-center justify-center font-bold text-2xl border ${
                      report.grade === "A"
                        ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                        : report.grade === "B"
                        ? "bg-blue-950 text-blue-400 border-blue-800"
                        : report.grade === "C"
                        ? "bg-amber-950 text-amber-400 border-amber-800"
                        : "bg-rose-950 text-rose-400 border-rose-800"
                    }`}
                  >
                    {report.grade}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Quality Score: {report.score} / 100</h3>
                    <p className="text-xs text-slate-400">
                      Based on standard OpenAPI operational readiness rules
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div className="text-center">
                    <span className="block font-bold text-rose-400 text-base">{report.summary.errors}</span>
                    <span className="text-slate-400 text-[11px]">Errors</span>
                  </div>
                  <div className="text-center">
                    <span className="block font-bold text-amber-400 text-base">{report.summary.warnings}</span>
                    <span className="text-slate-400 text-[11px]">Warnings</span>
                  </div>
                  <div className="text-center">
                    <span className="block font-bold text-sky-400 text-base">{report.summary.infos}</span>
                    <span className="text-slate-400 text-[11px]">Info</span>
                  </div>
                </div>
              </div>

              {/* Findings List */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-slate-800">
                  <h3 className="text-sm font-bold text-white">
                    Governance Findings ({report.findings.length})
                  </h3>
                </div>

                <div className="divide-y divide-slate-800/80">
                  {report.findings.length > 0 ? (
                    report.findings.map((f: any, idx: number) => (
                      <div key={idx} className="p-4 hover:bg-slate-800/20 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                f.severity === "error"
                                  ? "bg-rose-950 text-rose-300 border border-rose-800"
                                  : f.severity === "warning"
                                  ? "bg-amber-950 text-amber-300 border border-amber-800"
                                  : "bg-sky-950 text-sky-300 border border-sky-800"
                              }`}
                            >
                              {f.severity}
                            </span>
                            <code className="text-slate-300 font-mono text-[11px] font-semibold">{f.ruleId}</code>
                            <span className="text-slate-300 font-mono text-[11px]">{f.path}</span>
                          </div>
                        </div>

                        <p className="text-slate-200 font-medium">{f.message}</p>
                        <p className="text-[11px] text-slate-400">
                          <span className="text-sky-400 font-semibold">Remediation:</span> {f.remediation}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-xs text-emerald-400 flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Zero governance findings! Specification passed all quality gates.</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
