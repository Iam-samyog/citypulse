"use client";

import { useMemo } from "react";
import type { SimulationEvent } from "@/types/simulation";

export type PlaybackSpeed = 0.5 | 1 | 2 | 4;

interface SimulationControlsProps {
  events: SimulationEvent[];
  currentTime: number;
  playing: boolean;
  speed: PlaybackSpeed;
  onPlayingChange: (playing: boolean) => void;
  onTimeChange: (minutes: number) => void;
  onSpeedChange: (speed: PlaybackSpeed) => void;
  onRestart: () => void;
}

const SPEEDS: PlaybackSpeed[] = [0.5, 1, 2, 4];

export function SimulationControls({ events, currentTime, playing, speed, onPlayingChange, onTimeChange, onSpeedChange, onRestart }: SimulationControlsProps) {
  const sorted = useMemo(
    () => [...events].sort((a, b) => a.simulationTimeMinutes - b.simulationTimeMinutes),
    [events]
  );
  const moments = useMemo(
    () => Array.from(new Set(sorted.map((event) => event.simulationTimeMinutes))).sort((a, b) => a - b),
    [sorted]
  );
  const maxTime = moments.at(-1) ?? 0;
  const currentIndex = Math.max(0, moments.findLastIndex((moment) => moment <= currentTime));
  const exactEvents = sorted.filter((event) => event.simulationTimeMinutes === moments[currentIndex]);
  const activeEvent = exactEvents.at(-1);
  const completedCount = sorted.filter((event) => event.simulationTimeMinutes <= currentTime).length;

  function jump(direction: -1 | 1) {
    const target = moments[Math.min(moments.length - 1, Math.max(0, currentIndex + direction))];
    if (target === undefined) return;
    onPlayingChange(false);
    onTimeChange(target);
  }

  return (
    <section className="absolute bottom-5 left-1/2 z-30 w-[min(780px,calc(100vw-32px))] -translate-x-1/2 rounded-2xl border border-cyan-100/20 bg-[#04151e]/[.94] px-4 py-3 shadow-[0_18px_60px_rgba(0,0,0,.38)] backdrop-blur-xl" aria-label="Simulation playback controls">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex shrink-0 items-center gap-1">
          <ControlButton label="Restart simulation" onClick={onRestart}>↺</ControlButton>
          <ControlButton label="Previous cascade event" onClick={() => jump(-1)} disabled={currentIndex <= 0}>‹</ControlButton>
          <button
            type="button"
            onClick={() => {
              if (currentTime >= maxTime && !playing) onRestart();
              else onPlayingChange(!playing);
            }}
            className="grid h-10 w-14 place-items-center rounded-xl bg-cyan-200 text-base text-[#04151e] transition hover:brightness-110"
            aria-label={playing ? "Pause simulation" : currentTime >= maxTime ? "Replay simulation" : "Resume simulation"}
          >
            {playing ? "Ⅱ" : "▶"}
          </button>
          <ControlButton label="Next cascade event" onClick={() => jump(1)} disabled={currentIndex >= moments.length - 1}>›</ControlButton>
        </div>

        <div className="min-w-[180px] flex-1">
          <div className="mb-1.5 flex items-center justify-between gap-3 text-[9px] uppercase tracking-[.18em] text-ivory/40">
            <span className="text-cyan-200">T+{currentTime} min</span>
            <span>{completedCount}/{sorted.length} events</span>
          </div>
          <input
            type="range"
            min={moments[0] ?? 0}
            max={maxTime}
            step={1}
            value={Math.min(currentTime, maxTime)}
            onChange={(event) => {
              onPlayingChange(false);
              onTimeChange(Number(event.target.value));
            }}
            className="h-1.5 w-full cursor-pointer accent-cyan-200"
            aria-label="Simulation timeline"
          />
          <p className="mt-1.5 truncate text-[10px] text-ivory/45">
            {activeEvent ? `${activeEvent.componentId} · ${activeEvent.eventType.replace(/_/g, " ")}${exactEvents.length > 1 ? ` · ${exactEvents.length} simultaneous events` : ""}` : "Awaiting cascade event"}
          </p>
        </div>

        <div className="flex shrink-0 rounded-xl border border-ivory/10 bg-black/15 p-1" aria-label="Playback speed">
          {SPEEDS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={speed === value}
              onClick={() => onSpeedChange(value)}
              className={`rounded-lg px-2.5 py-1.5 text-[9px] font-semibold transition ${speed === value ? "bg-gold text-[#04151e]" : "text-ivory/35 hover:text-ivory"}`}
            >
              {value}×
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function ControlButton({ label, onClick, disabled = false, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return <button type="button" aria-label={label} onClick={onClick} disabled={disabled} className="grid h-10 w-9 place-items-center rounded-xl border border-ivory/10 text-lg text-ivory/55 transition hover:border-cyan-200/35 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-20">{children}</button>;
}
