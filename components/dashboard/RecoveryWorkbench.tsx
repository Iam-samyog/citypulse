"use client";

import { useEffect, useState } from "react";
import type { Incident } from "@/types/incident";
import type { InfrastructureComponent } from "@/types/infrastructure";
import type { RepairOperation, RepairStage, VerificationStatus } from "@/types/recovery";

const STAGES: { id: RepairStage; label: string }[] = [
  { id: "reported", label: "Reported" },
  { id: "crew_dispatched", label: "Crew dispatched" },
  { id: "inspection_in_progress", label: "Inspection" },
  { id: "repair_in_progress", label: "Repair in progress" },
  { id: "awaiting_verification", label: "Awaiting verification" },
  { id: "restored", label: "Restored" },
];

interface RecoveryResult {
  repair: RepairOperation;
  incidentResolved: boolean;
  statuses: { componentId: string; status: InfrastructureComponent["status"] }[];
}

export function RecoveryWorkbench({
  incident,
  origin,
  onSaved,
}: {
  incident: Incident;
  origin?: InfrastructureComponent;
  onSaved: (result: RecoveryResult) => void;
}) {
  const [repair, setRepair] = useState<RepairOperation | null>(null);
  const [crew, setCrew] = useState("Ithaca Response Crew");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    fetch(`/api/recovery?incidentId=${encodeURIComponent(incident.incidentId)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not load recovery history");
        const repairs = (data.repairs ?? []) as RepairOperation[];
        const current = repairs.find((item) => item.componentId === incident.componentId) ?? null;
        if (active) {
          setRepair(current);
          if (current?.assignedCrew) setCrew(current.assignedCrew);
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Could not load recovery history");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [incident.incidentId, incident.componentId]);

  const save = async (repairStatus: RepairStage, verificationStatus: VerificationStatus = "pending") => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incidentId: incident.incidentId,
          componentId: incident.componentId,
          assignedCrew: crew.trim() || "Ithaca Response Crew",
          repairStatus,
          estimatedCompletion: repair?.estimatedCompletion ?? new Date(Date.now() + incident.estimatedImpact.estimatedRecoveryMinutes * 60_000).toISOString(),
          verificationStatus,
          ...(repair ? { repairId: repair.repairId } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save recovery progress");
      const result = data as RecoveryResult;
      setRepair(result.repair);
      setCrew(result.repair.assignedCrew);
      onSaved(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save recovery progress");
    } finally {
      setSaving(false);
    }
  };

  const stageIndex = repair ? STAGES.findIndex((stage) => stage.id === repair.repairStatus) : -1;
  const complete = incident.incidentStatus === "resolved" || repair?.verificationStatus === "verified";
  const nextStage = STAGES[Math.min(stageIndex + 1, STAGES.length - 1)];

  return (
    <article className="rounded-2xl border border-[#c9a24b]/25 bg-[#1f100d]/55 p-5 shadow-[0_10px_34px_rgba(0,0,0,.4)]">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-normal text-white">Recovery workbench</h2>
          <p className="mt-1 text-[12px] text-[#d8ccb0]/70">Coordinate field work and verify service restoration.</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wider ${complete ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-300"}`}>
          {complete ? "Verified" : repair ? repair.repairStatus.replace(/_/g, " ") : "Ready"}
        </span>
      </header>

      <div className="rounded-xl bg-white/[.04] p-3 text-xs">
        <p className="font-semibold">{origin?.name ?? incident.componentId}</p>
        <p className="mt-1 text-[11px] text-[#d8ccb0]/70">{origin ? `${origin.category} · ${origin.district}` : "Incident source asset"}</p>
      </div>

      <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {STAGES.map((stage, index) => {
          const passed = stageIndex >= index;
          return <li key={stage.id} className={`rounded-lg border px-2.5 py-2 text-[10px] ${passed ? "border-[#e4aa56]/50 bg-[#4a1f14]/70 text-[#f1c979]" : "border-white/10 text-[#d8ccb0]/50"}`}>
            <span className="mr-1.5">{passed ? "✓" : `${index + 1}.`}</span>{stage.label}
          </li>;
        })}
      </ol>

      {!complete && <label className="mt-4 block text-[10px] uppercase tracking-wider text-[#d8ccb0]/60">
        Assigned crew
        <input value={crew} onChange={(event) => setCrew(event.target.value)} disabled={saving} className="mt-1.5 w-full rounded-lg border border-[#c9a24b]/25 bg-black/20 px-3 py-2.5 text-xs normal-case tracking-normal text-white outline-none focus:border-[#e4aa56]/70" />
      </label>}

      {repair?.repairStatus === "restored" && !complete && (
        <p className={`mt-3 rounded-lg px-3 py-2 text-[11px] ${repair.verificationStatus === "failed_verification" ? "bg-red-400/10 text-red-200" : "bg-amber-400/10 text-amber-200"}`}>
          {repair.verificationStatus === "failed_verification" ? "The restoration check failed. The incident remains open; repair the remaining issue and verify again." : "Field work is marked restored. The incident stays open until a verification check passes."}
        </p>
      )}
      {complete && <p className="mt-3 rounded-lg bg-emerald-400/10 px-3 py-2 text-[11px] text-emerald-200">Service restoration verified. The incident is resolved.</p>}
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-400/10 px-3 py-2 text-[11px] text-red-200">{error}</p>}

      {!complete && <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[10px] text-[#d8ccb0]/55">{loading ? "Loading saved progress…" : repair ? `Estimated completion ${new Date(repair.estimatedCompletion).toLocaleString()}` : "Progress is saved to this incident."}</p>
        {repair?.repairStatus === "restored" ? <div className="flex gap-2">
          {repair.verificationStatus === "failed_verification" && <button disabled={saving || loading} onClick={() => void save("repair_in_progress")} className="rounded-lg border border-[#e4aa56]/40 px-3 py-2 text-[10px] text-[#f1c979] disabled:opacity-50">Record follow-up repair</button>}
          {repair.verificationStatus !== "failed_verification" && <button disabled={saving || loading} onClick={() => void save("restored", "failed_verification")} className="rounded-lg border border-red-300/30 px-3 py-2 text-[10px] text-red-200 disabled:opacity-50">Fail check</button>}
          <button disabled={saving || loading} onClick={() => void save("restored", "verified")} className="rounded-lg bg-emerald-400 px-3 py-2 text-[10px] font-semibold text-[#102319] disabled:opacity-50">{saving ? "Saving…" : repair.verificationStatus === "failed_verification" ? "Verify again" : "Verify restoration"}</button>
        </div> : <button disabled={saving || loading} onClick={() => void save(nextStage?.id ?? "reported")} className="rounded-lg bg-[#e4aa56] px-3.5 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-[#24140e] disabled:opacity-50">
          {saving ? "Saving…" : repair ? `Advance to ${nextStage?.label ?? "next step"}` : "Start recovery"}
        </button>}
      </div>}
    </article>
  );
}
