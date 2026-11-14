"use client";

import { useEffect, useState } from "react";
import type { Incident } from "@/types/incident";
import type { AIAnalysis } from "@/types/simulation";
import type { RepairOperation, RepairStage } from "@/types/recovery";
import { AthenaAnalysis } from "@/components/ai/AthenaAnalysis";
import { OracleReview } from "@/components/ai/OracleReview";
import { RecoveryPanel } from "@/components/dashboard/RecoveryPanel";

/**
 * Chapter IV "Athena's Strategy" through Chapter V "The Return to
 * Ithaca": review AI analysis of the selected incident, compare Gemini vs
 * Grok, and drive the recovery workflow.
 */
export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [geminiAnalysis, setGeminiAnalysis] = useState<AIAnalysis | null>(null);
  const [grokAnalysis, setGrokAnalysis] = useState<AIAnalysis | null>(null);
  const [repairs, setRepairs] = useState<RepairOperation[]>([]);
  const [aiLoading, setAiLoading] = useState<"gemini" | "grok" | null>(null);

  useEffect(() => {
    fetch("/api/incidents")
      .then((res) => res.json())
      .then((data) => setIncidents(data.incidents ?? []));
  }, []);

  const selectedIncident = incidents.find((i) => i.incidentId === selectedIncidentId) ?? null;

  async function askGemini(question?: string) {
    if (!selectedIncidentId) return;
    setAiLoading("gemini");
    try {
      const res = await fetch("/api/ai/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId: selectedIncidentId, question }),
      });
      const data = await res.json();
      setGeminiAnalysis(data.analysis);
    } finally {
      setAiLoading(null);
    }
  }

  async function askGrok() {
    if (!selectedIncidentId) return;
    setAiLoading("grok");
    try {
      const res = await fetch("/api/ai/grok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId: selectedIncidentId }),
      });
      const data = await res.json();
      setGrokAnalysis(data.analysis);
    } finally {
      setAiLoading(null);
    }
  }

  async function advanceRepair(
    componentId: string,
    repairStatus: RepairStage,
    repairId?: string
  ) {
    if (!selectedIncidentId) return;
    const res = await fetch("/api/recovery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        incidentId: selectedIncidentId,
        componentId,
        repairId,
        assignedCrew: "Crew Odysseus-1",
        repairStatus,
        estimatedCompletion: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        verificationStatus: repairStatus === "restored" ? "verified" : "pending",
      }),
    });
    const data = await res.json();
    setRepairs((prev) => {
      const next = prev.filter((r) => r.repairId !== data.repair.repairId);
      return [...next, data.repair];
    });
  }

  return (
    <div className="min-h-screen p-6 grid grid-cols-[280px_1fr] gap-6">
      <aside className="space-y-2">
        <h2 className="font-serif text-xl mb-2">Incidents</h2>
        {incidents.map((incident) => (
          <button
            key={incident.incidentId}
            onClick={() => setSelectedIncidentId(incident.incidentId)}
            className={`block w-full text-left px-3 py-2 rounded border ${
              incident.incidentId === selectedIncidentId
                ? "border-gold bg-gold/10"
                : "border-gold/20"
            }`}
          >
            <p className="text-sm font-medium">{incident.componentId}</p>
            <p className="text-xs text-ivory/60">{incident.severity}</p>
          </button>
        ))}
      </aside>

      <section className="space-y-6">
        {!selectedIncident && (
          <p className="text-ivory/60">Select an incident to view Athena&apos;s and the Oracle&apos;s analysis.</p>
        )}

        {selectedIncident && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <AthenaAnalysis
                incidentId={selectedIncident.incidentId}
                analysis={geminiAnalysis}
                onAskQuestion={askGemini}
                loading={aiLoading === "gemini"}
              />
              <OracleReview
                analysis={grokAnalysis}
                onRequestReview={askGrok}
                loading={aiLoading === "grok"}
              />
            </div>

            <RecoveryPanel
              incidentId={selectedIncident.incidentId}
              componentIds={[
                selectedIncident.componentId,
                ...selectedIncident.affectedComponents.map((a) => a.componentId),
              ]}
              repairs={repairs}
              onAdvanceRepair={advanceRepair}
            />
          </>
        )}
      </section>
    </div>
  );
}
