"use client";

/** Small SVG charts rendered inside chat answers — styled as ink-and-bronze plates on parchment. */

export type ChartSpec =
  | { type: "bars"; title: string; items: { label: string; value: number; color?: string }[]; unit?: string; max?: number }
  | { type: "donut"; title: string; segments: { label: string; value: number; color: string }[]; centerLabel?: string }
  | { type: "line"; title: string; points: { label: string; value: number }[]; projectedFrom?: number; unit?: string }
  | { type: "columns"; title: string; items: { label: string; value: number }[]; highlight?: number[] }
  | { type: "gauge"; title: string; value: number; label: string; color: string };

const INK = "#2a150a";
const MUTED = "#6b4a22";
const TRACK = "rgba(59,36,18,.14)";
const BRONZE = "#8a5a1f";
const PALETTE = ["#8f1424", "#b9772b", "#2f7f8f", "#5b3d94", "#3a7d4f", "#a8512f"];

const MEANDER = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='22' height='10' viewBox='0 0 22 10'><path d='M0 9H16V1H5V6H11V4' fill='none' stroke='%238a5a1f' stroke-width='1.3' stroke-opacity='.7'/></svg>")`;

export function ChatCharts({ charts }: { charts: ChartSpec[] }) {
  return (
    <div className="mt-1 grid gap-4">
      {charts.map((c, i) => (
        <figure key={i} className="relative rounded-xl border border-[#8a5a1f]/55 bg-[linear-gradient(180deg,#fdf5dc,#f6e7bd)] p-4 shadow-[inset_0_0_0_3px_rgba(253,245,220,.9),inset_0_0_0_4px_rgba(138,90,31,.3),0_3px_8px_rgba(60,30,10,.18)]">
          <figcaption className="mb-3.5 flex items-center gap-2.5">
            <span aria-hidden className="text-[11px]" style={{ color: "#8f1424" }}>◆</span>
            <span className="text-[13px] font-bold uppercase tracking-[.2em]" style={{ color: "#8f1424" }}>{c.title}</span>
            <span aria-hidden className="h-[10px] min-w-6 flex-1" style={{ backgroundImage: MEANDER, backgroundRepeat: "repeat-x", backgroundSize: "22px 10px", opacity: .55 }} />
          </figcaption>
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
    <div className="space-y-3">
      {items.map((it, i) => {
        const color = it.color ?? PALETTE[i % PALETTE.length];
        return (
          <div key={it.label} className="grid grid-cols-[1.6rem_minmax(110px,34%)_1fr_auto] items-center gap-3 text-[14px]">
            <span className="grid h-6 w-6 place-items-center rounded-full border text-[11px] font-bold" style={{ borderColor: `${BRONZE}88`, color: "#8f1424", background: "rgba(255,248,226,.8)" }}>{i + 1}</span>
            <span className="truncate font-semibold" style={{ color: INK }} title={it.label}>{it.label}</span>
            <span className="h-3 overflow-hidden rounded-full shadow-[inset_0_1px_2px_rgba(59,36,18,.35)]" style={{ background: TRACK }}>
              <span className="block h-full rounded-full shadow-[inset_0_-2px_0_rgba(0,0,0,.18),inset_0_1px_0_rgba(255,255,255,.3)]" style={{ width: `${Math.max(3, (it.value / top) * 100)}%`, background: `linear-gradient(90deg, ${color}, ${color}dd)` }} />
            </span>
            <span className="min-w-14 text-right text-[15px] font-bold tabular-nums" style={{ color: INK }}>{Math.round(it.value * 10) / 10}{unit}</span>
          </div>
        );
      })}
    </div>
  );
}

function Donut({ segments, centerLabel }: Extract<ChartSpec, { type: "donut" }>) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const R = 38, C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg viewBox="0 0 100 100" className="h-36 w-36 shrink-0 -rotate-90" role="img" aria-label="Donut chart">
        <circle cx="50" cy="50" r="47" fill="none" stroke={`${BRONZE}55`} strokeWidth=".8" />
        <circle cx="50" cy="50" r="29" fill="none" stroke={`${BRONZE}55`} strokeWidth=".8" />
        <circle cx="50" cy="50" r={R} fill="none" stroke={TRACK} strokeWidth="14" />
        {segments.filter((s) => s.value > 0).map((s) => {
          const len = (s.value / total) * C;
          const el = <circle key={s.label} cx="50" cy="50" r={R} fill="none" stroke={s.color} strokeWidth="14" strokeDasharray={`${Math.max(len - 0.8, 0)} ${C - Math.max(len - 0.8, 0)}`} strokeDashoffset={-offset} />;
          offset += len;
          return el;
        })}
        {centerLabel && <text x="50" y="50" textAnchor="middle" dominantBaseline="central" transform="rotate(90 50 50)" fontSize="15" fontWeight="700" fill={INK}>{centerLabel}</text>}
      </svg>
      <ul className="min-w-[170px] flex-1 space-y-2 text-[14px]">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2.5 border-b border-dashed border-[#8a5a1f]/30 pb-1.5" style={{ color: INK }}>
            <span className="h-3 w-3 rounded-sm shadow-[inset_0_-1px_0_rgba(0,0,0,.25)]" style={{ background: s.color }} />
            <span className="flex-1 font-semibold">{s.label}</span>
            <span className="text-[15px] font-bold tabular-nums">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Line({ points, projectedFrom, unit = "" }: Extract<ChartSpec, { type: "line" }>) {
  const W = 460, H = 160, L = 32, R = 10, T = 14, B = 26;
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
      {ticks.map((t) => <g key={t}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke={`${BRONZE}55`} strokeDasharray="3 4" /><text x={L - 5} y={y(t) + 3} textAnchor="end" fontSize="10" fill={MUTED}>{t}{unit}</text></g>)}
      {labelIdx.map((i) => <text key={i} x={x(i)} y={H - 7} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} fontSize="10" fill={MUTED}>{points[i]?.label}</text>)}
      {projectedFrom !== undefined && <rect x={x(split - 1)} y={T} width={Math.max(0, W - R - x(split - 1))} height={H - T - B} fill="rgba(91,61,148,.09)" />}
      <polyline points={`${x(0)},${y(0)} ${path(real, 0)} ${x(real.length - 1)},${y(0)}`} fill="rgba(143,20,36,.1)" stroke="none" />
      <polyline points={path(real, 0)} fill="none" stroke="#8f1424" strokeWidth="2.4" strokeLinejoin="round" />
      {projectedFrom !== undefined && <polyline points={path(proj, split - 1)} fill="none" stroke="#5b3d94" strokeWidth="2.4" strokeDasharray="5 4" strokeLinejoin="round" />}
      {real.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.value)} r="2.2" fill="#8f1424" />)}
      {projectedFrom !== undefined && <text x={W - R - 4} y={T + 11} textAnchor="end" fontSize="10" fontStyle="italic" fill="#5b3d94">projected</text>}
    </svg>
  );
}

function Columns({ items, highlight = [] }: Extract<ChartSpec, { type: "columns" }>) {
  const W = 460, H = 140, L = 8, B = 22, T = 8;
  const max = Math.max(...items.map((i) => i.value), 1);
  const bw = (W - L * 2) / items.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Column chart">
      <line x1={L} x2={W - L} y1={H - B} y2={H - B} stroke={`${BRONZE}88`} />
      {items.map((it, i) => {
        const h = (it.value / max) * (H - T - B);
        return <g key={i}>
          <rect x={L + i * bw + 1.5} y={H - B - h} width={bw - 3} height={Math.max(h, 1)} rx="2.5" fill={highlight.includes(i) ? "#8f1424" : "#c99a52"} />
          {i % 3 === 0 && <text x={L + i * bw + bw / 2} y={H - 7} textAnchor="middle" fontSize="10" fill={MUTED}>{it.label}</text>}
        </g>;
      })}
    </svg>
  );
}

function Gauge({ value, label, color }: Extract<ChartSpec, { type: "gauge" }>) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="flex items-center gap-6">
      <div className="relative w-44 shrink-0">
        <svg viewBox="0 0 120 70" className="w-full" role="img" aria-label={`${label}: ${v} out of 100`}>
          <path d="M8 62 A52 52 0 0 1 112 62" pathLength="100" fill="none" stroke={TRACK} strokeWidth="11" strokeLinecap="round" />
          <path d="M8 62 A52 52 0 0 1 112 62" pathLength="100" fill="none" stroke={color} strokeWidth="11" strokeLinecap="round" strokeDasharray={`${v} 100`} />
        </svg>
        <div className="absolute inset-x-0 bottom-0 text-center"><p className="text-3xl font-bold leading-none" style={{ color: INK }}>{v}</p></div>
      </div>
      <p className="text-[15px] font-bold uppercase tracking-[.18em]" style={{ color }}>{label}</p>
    </div>
  );
}
