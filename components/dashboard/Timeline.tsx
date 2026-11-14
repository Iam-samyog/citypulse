"use client";

import { useState } from "react";
import type { SimulationEvent } from "@/types/simulation";

interface TimelineProps {
  events: SimulationEvent[];
  onScrub?: (simulationTimeMinutes: number) => void;
}

/**
 * The Odyssey Timeline (section 5.8): lets users scrub through an
 * incident's progression rather than only seeing the final state.
 * Member 1 (3D Frontend): wire `onScrub` to filter which component states
 * are shown in CityScene at a given point in time.
 */
export function Timeline({ events, onScrub }: TimelineProps) {
  const sorted = [...events].sort(
    (a, b) => a.simulationTimeMinutes - b.simulationTimeMinutes
  );
  const maxTime = sorted.at(-1)?.simulationTimeMinutes ?? 0;
  const [current, setCurrent] = useState(0);

  function handleChange(value: number) {
    setCurrent(value);
    onScrub?.(value);
  }

  return (
    <div className="border border-gold/40 rounded p-4">
      <h3 className="font-serif text-lg mb-3">The Odyssey Timeline</h3>
      <input
        type="range"
        min={0}
        max={maxTime}
        value={current}
        onChange={(e) => handleChange(Number(e.target.value))}
        className="w-full"
      />
      <p className="text-sm text-ivory/70 mt-2">T+{current} minutes</p>
      <ul className="mt-3 space-y-1 text-sm max-h-48 overflow-y-auto">
        {sorted.map((event) => (
          <li
            key={event.eventId}
            className={event.simulationTimeMinutes <= current ? "text-ivory" : "text-ivory/30"}
          >
            T+{event.simulationTimeMinutes}m — {event.componentId}: {event.previousState} →{" "}
            {event.newState}
          </li>
        ))}
      </ul>
    </div>
  );
}
