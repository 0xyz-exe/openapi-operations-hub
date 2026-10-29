"use client";

import React, { useState } from "react";
import { MethodBadge, StatusBadge } from "./StatusBadge";
import { Play, Copy, Check, ChevronDown, ChevronRight, Send, AlertCircle, Clock } from "lucide-react";

interface Endpoint {
  method: string;
  path: string;
  summary: string;
  description: string;
  operationId?: string;
  tags: string[];
  parameters: Array<{
    name: string;
    in: "path" | "query" | "header" | "cookie";
    required?: boolean;
    description?: string;
    schema?: any;
  }>;
  requestBody?: any;
  responses: Record<string, any>;
  deprecated?: boolean;
}

export function ApiDocViewer({
  endpoints,
  baseUrl,
}: {
  endpoints: Endpoint[];
  baseUrl: string;
}) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [testingEndpoint, setTestingEndpoint] = useState<Endpoint | null>(null);

  // Try It Out state
  const [testPath, setTestPath] = useState("");
  const [testMethod, setTestMethod] = useState("GET");
  const [testBody, setTestBody] = useState("");
  const [testResult, setTestResult] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [copied, setCopied] = useState(false);

  const openTryItOut = (ep: Endpoint) => {
    setTestingEndpoint(ep);
    setTestMethod(ep.method);
    setTestPath(ep.path);
    setTestBody(ep.requestBody ? '{\n  "example": "value"\n}' : "");
    setTestResult(null);
  };

  const executeTest = async () => {
    if (!testingEndpoint) return;
    setIsExecuting(true);
    setTestResult(null);

    try {
      const fullUrl = `${baseUrl.replace(/\/$/, "")}/${testPath.replace(/^\//, "")}`;
      let parsedBody: any = undefined;
      if (testBody && ["POST", "PUT", "PATCH"].includes(testMethod)) {
        try {
          parsedBody = JSON.parse(testBody);
        } catch {
          parsedBody = testBody;
        }
      }

      const res = await fetch("/api/v1/proxy/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: fullUrl,
          method: testMethod,
          body: parsedBody,
        }),
      });

      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ status: 500, statusText: "Failed to run test", data: err.message });
    } finally {
      setIsExecuting(false);
    }
  };

  const copyCurl = (ep: Endpoint) => {
    const curl = `curl -X ${ep.method} "${baseUrl.replace(/\/$/, "")}${ep.path}" \\
  -H "Accept: application/json"`;
    navigator.clipboard.writeText(curl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 p-3.5 rounded-lg text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Target Base URL:</span>
          <code className="text-sky-400 font-mono bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
            {baseUrl}
          </code>
        </div>
        <span className="text-slate-300">{endpoints.length} endpoints defined</span>
      </div>

      <div className="space-y-3">
        {endpoints.map((ep, idx) => {
          const isExpanded = expandedIndex === idx;

          return (
            <div
              key={`${ep.method}-${ep.path}-${idx}`}
              className="bg-slate-900/40 border border-slate-800 rounded-lg overflow-hidden transition-all"
            >
              <div
                onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 select-none"
              >
                <div className="flex items-center gap-3">
                  <MethodBadge method={ep.method} />
                  <span className="font-mono text-sm font-semibold text-slate-200">{ep.path}</span>
                  {ep.summary && <span className="text-xs text-slate-400 truncate max-w-md">— {ep.summary}</span>}
                  {ep.deprecated && (
                    <span className="text-[11px] px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800">
                      Deprecated
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openTryItOut(ep);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 transition-colors"
                  >
                    <Play className="w-3 h-3" />
                    <span>Try It Out</span>
                  </button>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="p-4 border-t border-slate-800 bg-[#0c1222]/50 space-y-4">
                  {ep.description && (
                    <div>
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Description
                      </h4>
                      <p className="text-sm text-slate-300">{ep.description}</p>
                    </div>
                  )}

                  {/* Parameters */}
                  {ep.parameters && ep.parameters.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Parameters ({ep.parameters.length})
                      </h4>
                      <div className="border border-slate-800 rounded-lg overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-800/60 text-slate-400 border-b border-slate-800">
                            <tr>
                              <th className="p-2.5 font-medium">Name</th>
                              <th className="p-2.5 font-medium">In</th>
                              <th className="p-2.5 font-medium">Required</th>
                              <th className="p-2.5 font-medium">Description</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 text-slate-300">
                            {ep.parameters.map((p, pIdx) => (
                              <tr key={pIdx} className="hover:bg-slate-800/30">
                                <td className="p-2.5 font-mono text-sky-400 font-semibold">{p.name}</td>
                                <td className="p-2.5 capitalize">{p.in}</td>
                                <td className="p-2.5">
                                  {p.required ? (
                                    <span className="text-rose-400 font-semibold">Yes</span>
                                  ) : (
                                    <span className="text-slate-300">No</span>
                                  )}
                                </td>
                                <td className="p-2.5 text-slate-400">{p.description || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Responses */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Responses
                    </h4>
                    <div className="space-y-1.5">
                      {Object.entries(ep.responses || {}).map(([code, resObj]: [string, any]) => (
                        <div
                          key={code}
                          className="flex items-center gap-3 p-2 rounded-md bg-slate-900/60 border border-slate-800 text-xs"
                        >
                          <span
                            className={`px-2 py-0.5 rounded font-mono font-bold ${
                              code.startsWith("2")
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                : code.startsWith("4")
                                ? "bg-amber-950 text-amber-400 border border-amber-800"
                                : "bg-rose-950 text-rose-400 border border-rose-800"
                            }`}
                          >
                            {code}
                          </span>
                          <span className="text-slate-300">{resObj.description || "Successful response"}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-300">
                    <button
                      onClick={() => copyCurl(ep)}
                      className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? "Copied cURL!" : "Copy cURL"}</span>
                    </button>
                    {ep.tags?.length > 0 && (
                      <div className="flex gap-1.5">
                        {ep.tags.map((t) => (
                          <span key={t} className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[11px]">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Try It Out Modal */}
      {testingEndpoint && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-[#0e1628] border border-slate-800 rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <MethodBadge method={testMethod} />
                <h3 className="font-semibold text-white text-sm">Interactive Console (Try It Out)</h3>
              </div>
              <button
                onClick={() => setTestingEndpoint(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-slate-800"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Target Endpoint URL</label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-mono">{baseUrl}</span>
                  <input
                    type="text"
                    value={testPath}
                    onChange={(e) => setTestPath(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {["POST", "PUT", "PATCH"].includes(testMethod) && (
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Request Body (JSON)</label>
                  <textarea
                    rows={4}
                    value={testBody}
                    onChange={(e) => setTestBody(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-300">
                  Protected with SSRF validation (local & cloud metadata IPs blocked)
                </span>
                <button
                  onClick={executeTest}
                  disabled={isExecuting}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold transition-colors disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isExecuting ? "Executing..." : "Send Request"}</span>
                </button>
              </div>

              {testResult && (
                <div className="mt-4 p-3 bg-slate-900/90 border border-slate-800 rounded-lg space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-medium">Status:</span>
                      <span
                        className={`font-mono font-bold ${
                          testResult.status >= 200 && testResult.status < 300
                            ? "text-emerald-400"
                            : "text-rose-400"
                        }`}
                      >
                        {testResult.status} {testResult.statusText}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>{testResult.latencyMs} ms</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-300 uppercase font-bold tracking-wider">
                      Response Data
                    </span>
                    <pre className="mt-1 p-2 bg-[#090d16] rounded font-mono text-[11px] text-slate-300 overflow-x-auto max-h-48">
                      {typeof testResult.data === "object"
                        ? JSON.stringify(testResult.data, null, 2)
                        : String(testResult.data)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
