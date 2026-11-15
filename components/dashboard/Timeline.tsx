"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  const sorted = useMemo(
    () => [...events].sort((a, b) => a.simulationTimeMinutes - b.simulationTimeMinutes),
    [events]
  );
  const maxTime = sorted.at(-1)?.simulationTimeMinutes ?? 0;
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const moments = useMemo(
    () => Array.from(new Set(sorted.map((event) => event.simulationTimeMinutes))).sort((a, b) => a - b),
    [sorted]
  );

  useEffect(() => {
    setCurrent(0);
    setPlaying(false);
    onScrub?.(0);
  }, [events, onScrub]);

  const handleChange = useCallback(
    (value: number) => {
      setCurrent(value);
      onScrub?.(value);
    },
    [onScrub]
  );

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      const next = moments.find((moment) => moment > current);
      if (next === undefined) {
        setPlaying(false);
        return;
      }
      handleChange(next);
    }, 750);
    return () => window.clearTimeout(timer);
  }, [playing, current, moments, handleChange]);

  return (
    <div className="rounded border border-gold/40 bg-aegean/40 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-gold">Cascade playback</p>
          <h3 className="font-serif text-lg">The Odyssey Timeline</h3>
        </div>
        <button
          type="button"
          onClick={() => {
            if (current >= maxTime) handleChange(0);
            setPlaying((value) => !value);
          }}
          className="rounded border border-gold/50 px-3 py-1 text-xs uppercase tracking-wider hover:bg-gold hover:text-aegean"
        >
          {playing ? "Pause" : current >= maxTime ? "Replay" : "Play"}
        </button>
      </div>
      <input
        type="range"
        min={0}
        max={maxTime}
        value={current}
        onChange={(e) => handleChange(Number(e.target.value))}
        className="w-full"
      />
      <div className="mt-2 flex justify-between text-xs text-ivory/60">
        <span>T+{current} minutes</span>
        <span>{sorted.filter((event) => event.simulationTimeMinutes <= current).length} / {sorted.length} events</span>
      </div>
      <ul className="mt-3 space-y-1 text-sm max-h-48 overflow-y-auto">
        {sorted.map((event) => (
          <li
            key={event.eventId}
            className={`rounded border-l-2 px-2 py-1.5 ${
              event.simulationTimeMinutes <= current
                ? event.eventType === "backup_depleted"
                  ? "border-status-failed bg-status-failed/10 text-ivory"
                  : event.eventType === "backup_warning"
                    ? "border-status-degraded bg-status-degraded/10 text-ivory"
                    : "border-cyan-300/50 text-ivory"
                : "border-ivory/10 text-ivory/30"
            }`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span>
                T+{event.simulationTimeMinutes}m — {event.componentId}
              </span>
              <span className="text-[9px] uppercase tracking-wider opacity-70">
                {event.eventType.replace(/_/g, " ")}
              </span>
            </div>
            <div className="text-xs opacity-75">
              {event.previousState} → {event.newState}
              {event.detail && <span className="mt-0.5 block">{event.detail}</span>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
