import type { Incident } from "@/types/incident";
import { ImpactReport } from "./ImpactReport";

interface IncidentPanelProps {
  incident: Incident;
}

/** Summary card for the active incident: Chapter II, "Poseidon's Wrath". */
export function IncidentPanel({ incident }: IncidentPanelProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-widest text-gold">
          {incident.incidentType.replace(/_/g, " ")}
        </p>
        <h2 className="font-serif text-2xl">Incident at {incident.componentId}</h2>
        <p className="text-sm text-ivory/60">
          Started {new Date(incident.startTime).toLocaleTimeString()} ·{" "}
          <span className="uppercase">{incident.incidentStatus}</span>
        </p>
      </div>
      <ImpactReport impact={incident.estimatedImpact} />
    </div>
  );
}
