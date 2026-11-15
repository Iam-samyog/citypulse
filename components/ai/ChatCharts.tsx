"use client";

/** Small SVG charts rendered inside chat answers (parchment-ink styling). */

export type ChartSpec =
  | { type: "bars"; title: string; items: { label: string; value: number; color?: string }[]; unit?: string; max?: number }
  | { type: "donut"; title: string; segments: { label: string; value: number; color: string }[]; centerLabel?: string }
  | { type: "line"; title: string; points: { label: string; value: number }[]; projectedFrom?: number; unit?: string }
  | { type: "columns"; title: string; items: { label: string; value: number }[]; highlight?: number[] }
  | { type: "gauge"; title: string; value: number; label: string; color: string };

const INK = "#3b2412";
const MUTED = "#6b4a22";
const TRACK = "rgba(59,36,18,.12)";
const PALETTE = ["#6b0f1a", "#b9772b", "#2f7f8f", "#5b3d94", "#3a7d4f", "#a8512f"];

export function ChatCharts({ charts }: { charts: ChartSpec[] }) {
  return (
    <div className="mt-4 grid gap-3 font-sans">
      {charts.map((c, i) => (
        <figure key={i} className="rounded-xl border border-[#b98a4a]/45 bg-[#fffaf0]/80 p-3.5">
          <figcaption className="mb-2.5 text-[10px] font-semibold uppercase tracking-[.2em]" style={{ color: MUTED }}>{c.title}</figcaption>
          {c.type === "bars" && <Bars {...c} />}
          {c.type === "donut" && <Donut {...c} />}
          {c.type === "line" && <Line {...c} />}
          {c.type === "columns" && <Columns {...c} />}
          {c.type === "gauge" && <Gauge {...c} />}
        </figure>
      ))}
    </div>
  );
}

function Bars({ items, unit = "", max }: Extract<ChartSpec, { type: "bars" }>) {
  const top = max ?? Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={it.label} className="grid grid-cols-[minmax(90px,38%)_1fr_auto] items-center gap-2.5 text-[12px]">
          <span className="truncate" style={{ color: INK }} title={it.label}>{it.label}</span>
          <span className="h-2.5 overflow-hidden rounded-full" style={{ background: TRACK }}>
            <span className="block h-full rounded-full" style={{ width: `${Math.max(2, (it.value / top) * 100)}%`, background: it.color ?? PALETTE[i % PALETTE.length] }} />
          </span>
          <span className="w-14 text-right font-semibold tabular-nums" style={{ color: INK }}>{Math.round(it.value * 10) / 10}{unit}</span>
        </div>
      ))}
    </div>
  );
}

function Donut({ segments, centerLabel }: Extract<ChartSpec, { type: "donut" }>) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const R = 38, C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg viewBox="0 0 100 100" className="h-32 w-32 shrink-0 -rotate-90" role="img" aria-label="Donut chart">
        <circle cx="50" cy="50" r={R} fill="none" stroke={TRACK} strokeWidth="14" />
        {segments.filter((s) => s.value > 0).map((s) => {
          const len = (s.value / total) * C;
          const el = <circle key={s.label} cx="50" cy="50" r={R} fill="none" stroke={s.color} strokeWidth="14" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} />;
          offset += len;
          return el;
        })}
        {centerLabel && <text x="50" y="50" textAnchor="middle" dominantBaseline="central" transform="rotate(90 50 50)" fontSize="15" fontWeight="700" fill={INK}>{centerLabel}</text>}
      </svg>
      <ul className="min-w-[140px] flex-1 space-y-1.5 text-[12px]">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2" style={{ color: INK }}>
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
            <span className="flex-1">{s.label}</span>
            <span className="font-semibold tabular-nums">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Line({ points, projectedFrom, unit = "" }: Extract<ChartSpec, { type: "line" }>) {
  const W = 460, H = 150, L = 30, R = 10, T = 12, B = 24;
  const max = Math.max(...points.map((p) => p.value), 1) * 1.15;
  const x = (i: number) => L + (i / Math.max(points.length - 1, 1)) * (W - L - R);
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const split = projectedFrom ?? points.length;
  const real = points.slice(0, split);
  const proj = points.slice(Math.max(split - 1, 0));
  const path = (arr: typeof points, start: number) => arr.map((p, i) => `${x(start + i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const ticks = [0, Math.round(max / 2), Math.round(max)];
  const labelIdx = [0, Math.floor((points.length - 1) / 2), points.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Line chart">
      {ticks.map((t) => <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke={TRACK} strokeDasharray="3 4" /><text x={L - 5} y={y(t) + 3} textAnchor="end" fontSize="9" fill={MUTED}>{t}{unit}</text></g>)}
      {labelIdx.map((i) => <text key={i} x={x(i)} y={H - 7} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} fontSize="9" fill={MUTED}>{points[i]?.label}</text>)}
      {projectedFrom !== undefined && <rect x={x(split - 1)} y={T} width={Math.max(0, W - R - x(split - 1))} height={H - T - B} fill="rgba(91,61,148,.07)" />}
      <polyline points={path(real, 0)} fill="none" stroke="#6b0f1a" strokeWidth="2.2" strokeLinejoin="round" />
      {projectedFrom !== undefined && <polyline points={path(proj, split - 1)} fill="none" stroke="#5b3d94" strokeWidth="2.2" strokeDasharray="5 4" strokeLinejoin="round" />}
      {projectedFrom !== undefined && <text x={W - R - 4} y={T + 10} textAnchor="end" fontSize="9" fontStyle="italic" fill="#5b3d94">projected</text>}
    </svg>
  );
}

function Columns({ items, highlight = [] }: Extract<ChartSpec, { type: "columns" }>) {
  const W = 460, H = 130, L = 8, B = 20, T = 8;
  const max = Math.max(...items.map((i) => i.value), 1);
  const bw = (W - L * 2) / items.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Column chart">
      {items.map((it, i) => {
        const h = (it.value / max) * (H - T - B);
        return <g key={i}>
          <rect x={L + i * bw + 1.5} y={H - B - h} width={bw - 3} height={Math.max(h, 1)} rx="2" fill={highlight.includes(i) ? "#6b0f1a" : "#c99a52"} />
          {i % 3 === 0 && <text x={L + i * bw + bw / 2} y={H - 6} textAnchor="middle" fontSize="8.5" fill={MUTED}>{it.label}</text>}
        </g>;
      })}
    </svg>
  );
}

function Gauge({ value, label, color }: Extract<ChartSpec, { type: "gauge" }>) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="flex items-center gap-5">
      <div className="relative w-40 shrink-0">
        <svg viewBox="0 0 120 70" className="w-full" role="img" aria-label={`${label}: ${v} out of 100`}>
          <path d="M8 62 A52 52 0 0 1 112 62" pathLength="100" fill="none" stroke={TRACK} strokeWidth="10" strokeLinecap="round" />
          <path d="M8 62 A52 52 0 0 1 112 62" pathLength="100" fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${v} 100`} />
        </svg>
        <div className="absolute inset-x-0 bottom-0 text-center"><p className="text-3xl font-bold leading-none" style={{ color: INK }}>{v}</p></div>
      </div>
      <p className="text-[12px] font-semibold uppercase tracking-[.18em]" style={{ color }}>{label}</p>
    </div>
  );
}
