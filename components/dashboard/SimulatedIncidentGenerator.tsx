"use client";

import { useState } from "react";
import type { Incident } from "@/types/incident";

export function SimulatedIncidentGenerator({ onGenerated }: { onGenerated: (incidents: Incident[]) => void }) {
  const [count, setCount] = useState(25);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  async function generate() {
    setBusy(true);
    setMessage("");
    setError(false);
    try {
      const response = await fetch("/api/simulated-incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not generate simulated incidents");
      onGenerated(data.incidents ?? []);
      setMessage(data.message ?? `${count} simulated incidents added.`);
    } catch (reason) {
      setError(true);
      setMessage(reason instanceof Error ? reason.message : "Could not generate simulated incidents");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mb-4 rounded-xl border border-[#c9a24b]/20 bg-white/[.03] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold text-white">Add simulated history</h3>
          <p className="mt-1 text-[11px] text-[#d8ccb0]/70">Create resolved incidents from Ithaca’s infrastructure model. Live asset status stays unchanged.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="simulatedIncidentCount">Number of incidents</label>
          <select id="simulatedIncidentCount" value={count} onChange={(event) => setCount(Number(event.target.value))} disabled={busy} className="rounded-lg border border-[#c9a24b]/25 bg-[#1f100d] px-2.5 py-2 text-xs text-white outline-none focus:border-[#e4aa56]/70">
            {[10, 25, 50].map((value) => <option key={value} value={value}>{value} incidents</option>)}
          </select>
          <button onClick={() => void generate()} disabled={busy} className="rounded-lg bg-[#e4aa56] px-3.5 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#24140e] disabled:opacity-50">
            {busy ? "Generating…" : "Generate"}
          </button>
        </div>
      </div>
      {message && <p role={error ? "alert" : "status"} className={`mt-3 text-[11px] ${error ? "text-red-300" : "text-emerald-300"}`}>{message}</p>}
    </section>
  );
}
