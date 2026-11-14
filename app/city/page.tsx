"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { InfrastructureComponent } from "@/types/infrastructure";
import type { Incident, IncidentType } from "@/types/incident";
import { IncidentPanel } from "@/components/dashboard/IncidentPanel";

// react-three-fiber touches React internals that aren't safe during
// Next.js server-side prerendering, so the whole 3D scene is client-only.
const CityScene = dynamic(
  () => import("@/components/city/CityScene").then((mod) => mod.CityScene),
  { ssr: false }
);

/**
 * Chapter I "Ithaca — The Living City" through Chapter III "The
 * Labyrinth": explore the city, trigger a failure, see the cascade.
 *
 * This page is intentionally thin — it fetches data and wires state
 * between the 3D scene and the dashboard panels. Member 1 owns CityScene,
 * Member 2 owns the simulation API this calls, Member 4 owns the data
 * fetching contract (GET /api/infrastructure, POST /api/simulate).
 */
export default function CityPage() {
  const [components, setComponents] = useState<InfrastructureComponent[]>([]);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/infrastructure")
      .then((res) => res.json())
      .then((data) => setComponents(data.components ?? []));
  }, []);

  async function triggerFailure(incidentType: IncidentType) {
    if (!selectedComponentId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ componentId: selectedComponentId, incidentType }),
      });
      const data = await res.json();
      setIncident(data.incident);

      const refreshed = await fetch("/api/infrastructure").then((r) => r.json());
      setComponents(refreshed.components ?? []);
    } finally {
      setLoading(false);
    }
  }

  const affectedComponents = incident
    ? components.filter((c) =>
        incident.affectedComponents.some((a) => a.componentId === c.componentId)
      )
    : [];

  return (
    <div className="h-screen flex">
      <div className="flex-1 relative">
        <CityScene
          components={components}
          selectedComponentId={selectedComponentId}
          onSelectComponent={setSelectedComponentId}
          affectedComponents={affectedComponents}
        />
      </div>

      <aside className="w-96 border-l border-gold/30 p-4 overflow-y-auto space-y-4">
        <div>
          <h2 className="font-serif text-xl mb-2">Poseidon&apos;s Wrath</h2>
          <p className="text-sm text-ivory/70 mb-2">
            Selected: {selectedComponentId ?? "none — click a component in the city"}
          </p>
          <button
            disabled={!selectedComponentId || loading}
            onClick={() => triggerFailure("power_failure")}
            className="border border-gold px-4 py-2 text-sm uppercase tracking-wide hover:bg-gold hover:text-aegean transition-colors disabled:opacity-30"
          >
            {loading ? "Simulating..." : "Trigger Failure"}
          </button>
        </div>

        {incident && <IncidentPanel incident={incident} />}
      </aside>
    </div>
  );
}
