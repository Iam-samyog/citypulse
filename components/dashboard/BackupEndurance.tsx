import type { BackupEnduranceEstimate } from "@/lib/simulation/backupDepletion";

interface BackupEnduranceProps {
  endurance: BackupEnduranceEstimate[];
  horizonMinutes: number;
}

/** Ranked reserve runtimes for components currently drawing backup energy. */
export function BackupEndurance({ endurance, horizonMinutes }: BackupEnduranceProps) {
  if (endurance.length === 0) return null;
  const scale = Math.max(1, Math.min(horizonMinutes, Math.max(...endurance.map((item) => item.estimatedMinutesRemaining))));

  return (
    <section className="rounded border border-[#B79AE0]/45 bg-[#B79AE0]/5 p-4" aria-label="Backup endurance projection">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[#B79AE0]">Finite reserves</p>
          <h2 className="font-serif text-xl">Backup endurance</h2>
        </div>
        <span className="rounded-full border border-[#B79AE0]/40 px-2 py-1 text-[10px] uppercase tracking-wider text-[#CDB5EA]">
          Live projection
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-ivory/55">
        Runtime changes with actual draw. When a reserve expires, the network is recalculated and the failure can spread again.
      </p>
      <ol className="mt-4 space-y-3">
        {endurance.map((item) => {
          const pct = Math.min(100, (item.estimatedMinutesRemaining / scale) * 100);
          const urgent = item.estimatedMinutesRemaining <= 45;
          return (
            <li key={item.componentId}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
                <span className="font-medium">{item.componentId}</span>
                <span className={`tabular-nums ${urgent ? "text-status-degraded" : "text-[#CDB5EA]"}`}>
                  {formatDuration(item.estimatedMinutesRemaining)} remaining
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-ivory/10">
                <div
                  className={`h-full rounded-full ${urgent ? "bg-status-degraded" : "bg-[#9B6FD1]"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] text-ivory/40">
                Drawing {Math.round(item.drawRate * 10) / 10} units · {item.ratedRuntimeMinutes}m rated at full load
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
}
