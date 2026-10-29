import React from "react";

export function StatusBadge({
  status,
  size = "md",
}: {
  status: string;
  size?: "sm" | "md";
}) {
  const norm = status.toLowerCase();

  let colors = "bg-slate-800 text-slate-300 border-slate-700";
  let dotColor = "bg-slate-400";

  if (norm === "healthy" || norm === "active" || norm === "valid" || norm === "resolved") {
    colors = "bg-emerald-950/60 text-emerald-300 border-emerald-800/80";
    dotColor = "bg-emerald-400";
  } else if (norm === "degraded" || norm === "acknowledged" || norm === "warning") {
    colors = "bg-amber-950/60 text-amber-300 border-amber-800/80";
    dotColor = "bg-amber-400";
  } else if (norm === "unhealthy" || norm === "open" || norm === "invalid" || norm === "error" || norm === "critical") {
    colors = "bg-rose-950/60 text-rose-300 border-rose-800/80";
    dotColor = "bg-rose-400";
  } else if (norm === "draft" || norm === "info") {
    colors = "bg-sky-950/60 text-sky-300 border-sky-800/80";
    dotColor = "bg-sky-400";
  } else if (norm === "deprecated") {
    colors = "bg-purple-950/60 text-purple-300 border-purple-800/80";
    dotColor = "bg-purple-400";
  }

  const padding = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs";

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${colors} ${padding}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span className="capitalize">{status}</span>
    </span>
  );
}

export function MethodBadge({ method }: { method: string }) {
  const m = method.toUpperCase();
  let bg = "bg-slate-800 text-slate-300 border-slate-700";

  if (m === "GET") bg = "bg-blue-950/80 text-blue-400 border-blue-800/80";
  else if (m === "POST") bg = "bg-emerald-950/80 text-emerald-400 border-emerald-800/80";
  else if (m === "PUT") bg = "bg-amber-950/80 text-amber-400 border-amber-800/80";
  else if (m === "PATCH") bg = "bg-orange-950/80 text-orange-400 border-orange-800/80";
  else if (m === "DELETE") bg = "bg-rose-950/80 text-rose-400 border-rose-800/80";

  return (
    <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs border ${bg}`}>
      {m}
    </span>
  );
}
