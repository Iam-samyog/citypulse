"use client";

import { districts } from "@/lib/seed/infrastructure";
import type { InfrastructureComponent } from "@/types/infrastructure";
import type { Incident } from "@/types/incident";

/**
 * Demo demographics for the simulated city. Total population comes from the
 * seeded districts; the splits below are invented for the demo.
 */
const DISTRICT_META: Record<string, { men: number; women: number; children: number; household: number; color: string }> = {
  "Acropolis Heights": { men: 0.34, women: 0.37, children: 0.29, household: 3.6, color: "#287c95" },
  "Harbor of Phorcys": { men: 0.41, women: 0.33, children: 0.26, household: 3.9, color: "#e4aa56" },
  "Agora Central": { men: 0.36, women: 0.38, children: 0.26, household: 3.1, color: "#a991d4" },
  "Athena Sanctuary": { men: 0.3, women: 0.37, children: 0.33, household: 4.1, color: "#68cba1" },
};

const GROUPS = [
  { key: "men", label: "Men", color: "#287c95" },
  { key: "women", label: "Women", color: "#e4aa56" },
  { key: "children", label: "Children", color: "#68cba1" },
] as const;

const AGE_BANDS = [
  ["0–14", 0.21], ["15–24", 0.13], ["25–34", 0.17], ["35–44", 0.16],
  ["45–54", 0.13], ["55–64", 0.1], ["65+", 0.1],
] as const;

const HOUSING = [
  { label: "Family homes", share: 0.52, color: "#287c95" },
  { label: "Apartments", share: 0.27, color: "#a991d4" },
  { label: "Hillside villas", share: 0.13, color: "#e4aa56" },
  { label: "Harbor cottages", share: 0.08, color: "#54c6dd" },
] as const;

const fmt = (n: number) => n.toLocaleString("en-US");

export function CityDemographics({ district, onSelect, components, incidents }: {
  district: string | null;
  onSelect: (name: string | null) => void;
  components: InfrastructureComponent[];
  incidents: Incident[];
}) {
  const allRows = districts.map((d) => {
    const m = DISTRICT_META[d.name] ?? { men: 0.35, women: 0.37, children: 0.28, household: 3.5, color: "#8b999f" };
    const men = Math.round(d.population * m.men);
    const women = Math.round(d.population * m.women);
    const children = d.population - men - women;
    return { name: d.name, population: d.population, men, women, children, houses: Math.round(d.population / m.household), color: m.color };
  });
  const rows = district ? allRows.filter((r) => r.name === district) : allRows;
  const health = (name: string) => {
    const mine = components.filter((c) => c.district === name);
    return { total: mine.length, ok: mine.filter((c) => c.status === "operational").length, impaired: mine.filter((c) => c.status !== "operational").length };
  };
  const exposedNames = new Set(incidents.filter((i) => i.incidentStatus !== "resolved").flatMap((i) => i.estimatedImpact.affectedDistricts));
  const exposed = rows.filter((r) => exposedNames.has(r.name)).reduce((s, r) => s + r.population, 0);
  const total = rows.reduce((s, r) => s + r.population, 0);
  const sum = (k: "men" | "women" | "children" | "houses") => rows.reduce((s, r) => s + r[k], 0);
  const totals = { men: sum("men"), women: sum("women"), children: sum("children") };
  const houses = sum("houses");
  const maxPop = Math.max(...rows.map((r) => r.population));
  const maxAge = Math.max(...AGE_BANDS.map((a) => a[1]));
  const adults = totals.men + totals.women;

  return (
    <section className="mt-6">
      <div className="relative mb-4 flex min-h-[200px] items-end justify-between gap-3 overflow-hidden rounded-3xl border border-[#c9a24b]/30 p-6 shadow-[0_14px_40px_rgba(0,0,0,.45)] sm:p-8" style={{ backgroundImage: "url(/art/battle-crowd.jpg)", backgroundSize: "cover", backgroundPosition: "50% 40%" }}>
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(0deg,rgba(20,8,6,.85)_0%,rgba(20,8,6,.35)_60%,rgba(20,8,6,.2)_100%)]" />
        <div className="relative">
          <p className="text-[12px] font-semibold uppercase tracking-[.2em] text-[#e4aa56]">City at a glance</p>
          <h2 className="font-heading mt-1 text-3xl font-normal text-white drop-shadow-[0_3px_14px_rgba(0,0,0,.7)] sm:text-4xl">The people of {district ?? "Ithaca"}</h2>
        </div>
        <div className="relative">
          {district ? <button onClick={() => onSelect(null)} className="rounded-lg border border-white/30 bg-black/40 px-3 py-2 text-[11px] text-white hover:bg-black/60">✕ Clear district filter</button> : <span className="hidden text-[11px] uppercase tracking-wider text-white/80 sm:inline">Simulated census · click a district to filter</span>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        <Stat label="Total population" value={fmt(total)} note={`${rows.length} districts`} color="#17242b" glyph="☷" />
        <Stat label="Men" value={fmt(totals.men)} note={`${pct(totals.men, total)}% of residents`} color="#287c95" glyph="♂" />
        <Stat label="Women" value={fmt(totals.women)} note={`${pct(totals.women, total)}% of residents`} color="#b5792e" glyph="♀" />
        <Stat label="Children" value={fmt(totals.children)} note={`${pct(totals.children, total)}% under 15`} color="#32966f" glyph="☺" />
        <Stat label="Residents exposed" value={fmt(exposed)} note={exposed ? "In districts with active incidents" : "No active incidents"} color={exposed ? "#d56c4b" : "#32966f"} glyph="△" />
        <Stat label="Houses" value={fmt(houses)} note={`${(total / houses).toFixed(1)} people per home`} color="#7a5fb0" glyph="⌂" />
      </div>

      <div className="mt-4 grid gap-5 xl:grid-cols-3">
        <Panel title="Population mix" subtitle="Men, women and children">
          <div className="grid items-center gap-4 sm:grid-cols-[auto_1fr] xl:grid-cols-1 2xl:grid-cols-[auto_1fr]">
            <div className="mx-auto">
              <Pie slices={GROUPS.map((g) => ({ value: totals[g.key], color: g.color }))} total={total} />
            </div>
            <ul className="space-y-3">
              {GROUPS.map((g) => (
                <li key={g.key} className="flex items-center text-[13px]">
                  <span className="mr-2 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: g.color }} />
                  <span className="text-[#d8ccb0]/70">{g.label}</span>
                  <span className="ml-auto font-semibold">{fmt(totals[g.key])}</span>
                  <span className="ml-2 w-9 text-right text-[#d8ccb0]/70">{pct(totals[g.key], total)}%</span>
                </li>
              ))}
              <li className="border-t border-[#c9a24b]/25 pt-3 text-[12px] text-[#d8ccb0]/70">
                {fmt(adults)} adults · {(totals.women / totals.men * 100).toFixed(0)} women per 100 men
              </li>
            </ul>
          </div>
        </Panel>

        <Panel title="Age distribution" subtitle="Share of residents by age band">
          <div className="flex h-[190px] items-end gap-2">
            {AGE_BANDS.map(([label, share]) => (
              <div key={label} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <span className="text-[11px] font-semibold">{Math.round(share * 100)}%</span>
                <div
                  className="w-full rounded-t-lg bg-gradient-to-t from-[#c4501f] to-[#f2b963]"
                  style={{ height: `${(share / maxAge) * 78}%` }}
                  title={`${label}: ${fmt(Math.round(total * share))} people`}
                />
                <span className="text-[10px] text-[#d8ccb0]/70">{label}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Housing types" subtitle={`${fmt(houses)} homes across the city`}>
          <div className="grid items-center gap-4 sm:grid-cols-[auto_1fr] xl:grid-cols-1 2xl:grid-cols-[auto_1fr]">
            <div className="mx-auto">
              <Pie slices={HOUSING.map((h) => ({ value: h.share, color: h.color }))} total={1} center={fmt(houses)} centerLabel="Homes" />
            </div>
            <ul className="space-y-3">
              {HOUSING.map((h) => (
                <li key={h.label} className="flex items-center text-[13px]">
                  <span className="mr-2 h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: h.color }} />
                  <span className="text-[#d8ccb0]/70">{h.label}</span>
                  <span className="ml-auto font-semibold">{fmt(Math.round(houses * h.share))}</span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <Panel title="Population by district" subtitle="Click a district to filter the whole dashboard">
          <div className="space-y-4">
            {rows.map((r) => (
              <button key={r.name} onClick={() => onSelect(district === r.name ? null : r.name)} className="block w-full rounded-xl p-2 text-left transition hover:bg-white/10">
                <div className="mb-1.5 flex items-center justify-between text-[13px]">
                  <span className="flex items-center gap-2 font-medium"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.color }} />{r.name}</span>
                  <span className="text-[#d8ccb0]/70">{fmt(r.population)} residents · {health(r.name).ok}/{health(r.name).total} assets healthy</span>
                </div>
                <div className="flex h-3 overflow-hidden rounded-full bg-white/10" style={{ width: `${(r.population / maxPop) * 100}%` }}>
                  {GROUPS.map((g) => (
                    <div key={g.key} style={{ width: `${(r[g.key] / r.population) * 100}%`, backgroundColor: g.color }} title={`${g.label}: ${fmt(r[g.key])}`} />
                  ))}
                </div>
              </button>
            ))}
            <div className="flex gap-4 pt-1 text-[11px] text-[#d8ccb0]/70">
              {GROUPS.map((g) => <span key={g.key} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: g.color }} />{g.label}</span>)}
            </div>
          </div>
        </Panel>

        <Panel title="Homes by district" subtitle="Housing stock and household size">
          <div className="space-y-3">
            {rows.map((r) => (
              <button key={r.name} onClick={() => onSelect(district === r.name ? null : r.name)} className={`grid w-full grid-cols-[1fr_auto] items-center gap-3 rounded-xl border p-3 text-left transition hover:bg-white/10 ${district === r.name ? "border-[#54c6dd] bg-white/[.07]" : "border-[#c9a24b]/25"}`}>
                <div>
                  <p className="text-xs font-semibold">{r.name}</p>
                  <p className="mt-1 text-[11px] text-[#d8ccb0]/70">{(r.population / r.houses).toFixed(1)} people per home</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold leading-none">{fmt(r.houses)}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-[#d8ccb0]/70">{pct(r.houses, houses)}% of homes</p>
                </div>
              </button>
            ))}
          </div>
        </Panel>
      </div>
    </section>
  );
}

const pct = (a: number, b: number) => Math.round((a / b) * 100);

function Stat({ label, value, note, color, glyph }: { label: string; value: string; note: string; color: string; glyph: string }) {
  return (
    <article className="rounded-2xl border border-[#c9a24b]/25 bg-[#1f100d]/55 backdrop-blur-[3px] p-4 shadow-[0_10px_34px_rgba(0,0,0,.4)]">
      <div className="flex items-start justify-between">
        <p className="text-[12px] font-medium text-[#d8ccb0]/70">{label}</p>
        <span className="grid h-8 w-8 place-items-center rounded-xl text-base" style={{ color, backgroundColor: `${color}14` }}>{glyph}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1.5 text-[11px] text-[#d8ccb0]/70">{note}</p>
    </article>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <article className="rounded-2xl border border-[#c9a24b]/25 bg-[#1f100d]/55 backdrop-blur-[3px] p-5 shadow-[0_10px_34px_rgba(0,0,0,.4)]">
      <header className="mb-5"><h3 className="font-heading text-lg font-normal text-white">{title}</h3><p className="mt-1 text-[12px] text-[#d8ccb0]/70">{subtitle}</p></header>
      {children}
    </article>
  );
}

function Pie({ slices, total, center, centerLabel }: { slices: { value: number; color: string }[]; total: number; center?: string; centerLabel?: string }) {
  const r = 52, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox="0 0 140 140" className="h-36 w-36 -rotate-90">
      {slices.map((s, i) => {
        const len = (s.value / total) * c;
        const el = <circle key={i} cx="70" cy="70" r={r} fill="none" stroke={s.color} strokeWidth="22" strokeDasharray={`${Math.max(len - 1.5, 0)} ${c}`} strokeDashoffset={-offset} />;
        offset += len;
        return el;
      })}
      <g className="rotate-90" style={{ transformOrigin: "70px 70px" }}>
        <text x="70" y="70" textAnchor="middle" fontSize="18" fontWeight="600" fill="#f3ead6">{center ?? fmt(total)}</text>
        <text x="70" y="86" textAnchor="middle" fontSize="8" letterSpacing="1.5" fill="#91a0a6">{(centerLabel ?? "RESIDENTS").toUpperCase()}</text>
      </g>
    </svg>
  );
}
