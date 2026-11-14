"use client";

import { useState } from "react";
import type { RepairOperation, RepairStage } from "@/types/recovery";

interface RecoveryPanelProps {
  incidentId: string;
  componentIds: string[];
  repairs: RepairOperation[];
  onAdvanceRepair: (
    componentId: string,
    repairStatus: RepairStage,
    repairId?: string
  ) => void;
}

const STAGES: RepairStage[] = [
  "reported",
  "crew_dispatched",
  "inspection_in_progress",
  "repair_in_progress",
  "awaiting_verification",
  "restored",
];

/** Chapter V: "The Return to Ithaca" — tracks repair operations per component. */
export function RecoveryPanel({
  componentIds,
  repairs,
  onAdvanceRepair,
}: RecoveryPanelProps) {
  const [selectedComponent, setSelectedComponent] = useState(componentIds[0]);

  const repairForSelected = repairs.find((r) => r.componentId === selectedComponent);
  const currentStageIndex = repairForSelected
    ? STAGES.indexOf(repairForSelected.repairStatus)
    : -1;
  const nextStage = STAGES[currentStageIndex + 1];

  return (
    <div className="border border-gold/40 rounded p-4 space-y-3">
      <h3 className="font-serif text-lg">Recovery Operations</h3>

      <select
        value={selectedComponent}
        onChange={(e) => setSelectedComponent(e.target.value)}
        className="w-full bg-transparent border border-gold/40 rounded px-2 py-1"
      >
        {componentIds.map((id) => (
          <option key={id} value={id}>
            {id}
          </option>
        ))}
      </select>

      <p className="text-sm text-ivory/70">
        Current stage:{" "}
        <span className="font-medium">
          {repairForSelected?.repairStatus.replace(/_/g, " ") ?? "not started"}
        </span>
      </p>

      {nextStage && (
        <button
          onClick={() =>
            onAdvanceRepair(selectedComponent, nextStage, repairForSelected?.repairId)
          }
          className="border border-gold px-4 py-2 text-sm uppercase tracking-wide hover:bg-gold hover:text-aegean transition-colors"
        >
          Advance to: {nextStage.replace(/_/g, " ")}
        </button>
      )}
    </div>
  );
}
