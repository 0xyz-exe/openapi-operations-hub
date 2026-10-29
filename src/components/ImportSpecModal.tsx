"use client";

import React, { useState } from "react";
import { UploadCloud, Link as LinkIcon, FileCode, X } from "lucide-react";

export function ImportSpecModal({
  isOpen,
  apiId,
  onClose,
  onImported,
}: {
  isOpen: boolean;
  apiId?: string;
  onClose: () => void;
  onImported: () => void;
}) {
  const [mode, setMode] = useState<"text" | "url" | "file">("text");
  const [rawSpec, setRawSpec] = useState("");
  const [importUrl, setImportUrl] = useState("");
  const [changelog, setChangelog] = useState("Imported spec update");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setRawSpec(event.target?.result as string);
      setMode("text");
    };
    reader.readAsText(file);
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const payload: any = {
        api_id: apiId,
        changelog,
      };

      if (mode === "url") {
        payload.import_url = importUrl;
      } else {
        payload.raw_spec = rawSpec;
      }

      const res = await fetch("/api/v1/specifications/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to import specification");
      }

      onImported();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div className="bg-[#0e1628] border border-slate-800 rounded-xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-sky-400" />
            <h3 className="font-semibold text-white text-base">Import OpenAPI Specification</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-lg">
            {error}
          </div>
        )}

        <div className="flex gap-2 p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => setMode("text")}
            className={`flex-1 py-1.5 rounded-md font-medium flex items-center justify-center gap-2 transition-colors ${
              mode === "text" ? "bg-sky-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Paste JSON / YAML</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("url")}
            className={`flex-1 py-1.5 rounded-md font-medium flex items-center justify-center gap-2 transition-colors ${
              mode === "url" ? "bg-sky-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Import via URL</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("file")}
            className={`flex-1 py-1.5 rounded-md font-medium flex items-center justify-center gap-2 transition-colors ${
              mode === "file" ? "bg-sky-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>File Upload</span>
          </button>
        </div>

        <form onSubmit={handleImport} className="space-y-3.5 text-xs">
          {mode === "text" && (
            <div>
              <label className="block text-slate-300 font-medium mb-1">OpenAPI 3.0 / 3.1 Spec (JSON or YAML)</label>
              <textarea
                required
                rows={8}
                value={rawSpec}
                onChange={(e) => setRawSpec(e.target.value)}
                placeholder={'{\n  "openapi": "3.0.0",\n  "info": { "title": "Example API", "version": "1.0.0" },\n  "paths": {}\n}'}
                className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
              />
            </div>
          )}

          {mode === "url" && (
            <div className="space-y-2">
              <label className="block text-slate-300 font-medium mb-1">Specification Public URL</label>
              <input
                type="url"
                required
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://petstore.swagger.io/v2/swagger.json"
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
              />
              <p className="text-[11px] text-slate-300">
                Outbound requests are strictly guarded against SSRF, internal RFC1918 addresses, and cloud metadata.
              </p>
            </div>
          )}

          {mode === "file" && (
            <div>
              <label className="block text-slate-300 font-medium mb-1">Upload .json, .yaml, or .yml</label>
              <input
                type="file"
                accept=".json,.yaml,.yml"
                onChange={handleFileUpload}
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-sky-500 file:text-slate-950 hover:file:bg-sky-400"
              />
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-medium mb-1">Changelog / Version Note</label>
            <input
              type="text"
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              placeholder="e.g. Added user search endpoints"
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? "Importing & Validating..." : "Import Specification"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
