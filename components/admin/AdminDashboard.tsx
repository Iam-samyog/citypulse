"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Incident } from "@/types/incident";
import type { InfrastructureComponent, InfrastructureDependency } from "@/types/infrastructure";

const NAV = [
  ["Overview", "⌂"], ["Infrastructure", "⌘"], ["Incidents", "△"],
  ["Analytics", "⌁"], ["AI Assistants", "✦"], ["Settings", "⚙"],
] as const;

const CATEGORY = {
  electrical: { label: "Electrical", color: "#f2b963" },
  water: { label: "Water", color: "#54c6dd" },
  transit: { label: "Transit", color: "#ef8d62" },
  comms: { label: "Communications", color: "#a991d4" },
  hospital: { label: "Healthcare", color: "#ed6b73" },
  emergency: { label: "Emergency", color: "#68cba1" },
} as const;

export function AdminDashboard() {
  const [active, setActive] = useState("Overview");
  const [components, setComponents] = useState<InfrastructureComponent[]>([]);
  const [dependencies, setDependencies] = useState<InfrastructureDependency[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [dataSource, setDataSource] = useState<"loading" | "mongodb" | "fixture">("loading");

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      fetch("/api/infrastructure").then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json();
      }),
      fetch("/api/incidents").then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json();
      }),
    ]).then(([infrastructure, incidentData]) => {
      if (!mounted) return;
      if (infrastructure.status === "fulfilled") {
        setComponents(infrastructure.value.components ?? []);
        setDependencies(infrastructure.value.dependencies ?? []);
        setDataSource(infrastructure.value.source === "mongodb" ? "mongodb" : "fixture");
      } else setDataSource("fixture");
      if (incidentData.status === "fulfilled") setIncidents(incidentData.value.incidents ?? []);
    });
    return () => { mounted = false; };
  }, []);

  const statusCounts = useMemo(() => ({
    operational: components.filter((item) => item.status === "operational").length,
    backup: components.filter((item) => item.status === "backup").length,
    degraded: components.filter((item) => item.status === "degraded").length,
    offline: components.filter((item) => item.status === "offline").length,
  }), [components]);
  const categoryCounts = useMemo(() => Object.fromEntries(
    Object.keys(CATEGORY).map((key) => [key, components.filter((item) => item.category === key).length])
  ) as Record<keyof typeof CATEGORY, number>, [components]);
  const criticalAssets = useMemo(() => [...components]
    .sort((a, b) => b.criticality - a.criticality || b.currentLoad / b.maxCapacity - a.currentLoad / a.maxCapacity)
    .slice(0, 5), [components]);
  const activeIncidents = incidents.filter((item) => item.incidentStatus !== "resolved");
  const coverage = dependencies.length
    ? Math.round((dependencies.filter((item) => item.hasBackup).length / dependencies.length) * 100)
    : 0;

  return (
    <main className="min-h-screen bg-[#f3f6f8] text-[#17242b] lg:pl-[248px]">
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[248px] flex-col border-r border-[#dfe6e9] bg-[#071b23] text-white lg:flex">
        <div className="flex h-[76px] items-center gap-3 border-b border-white/10 px-6">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e4aa56] font-serif text-xl text-[#071b23]">Ι</span>
          <div><p className="font-serif text-lg tracking-[.14em]">ITHACA</p><p className="text-[8px] uppercase tracking-[.22em] text-white/35">City operations</p></div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-6">
          <p className="mb-3 px-3 text-[8px] uppercase tracking-[.24em] text-white/25">Workspace</p>
          {NAV.map(([label, glyph]) => <button key={label} onClick={() => setActive(label)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs transition ${active === label ? "bg-[#153945] text-white" : "text-white/45 hover:bg-white/[.05] hover:text-white/80"}`}><span className={`grid h-7 w-7 place-items-center rounded-lg text-sm ${active === label ? "bg-[#e4aa56] text-[#071b23]" : "bg-white/[.04]"}`}>{glyph}</span><span>{label}</span>{label === "Incidents" && activeIncidents.length > 0 && <span className="ml-auto rounded-full bg-red-400 px-2 py-0.5 text-[8px] text-white">{activeIncidents.length}</span>}</button>)}
        </nav>
        <div className="m-4 rounded-2xl border border-white/10 bg-white/[.04] p-4">
          <p className="text-[8px] uppercase tracking-[.2em] text-[#e4aa56]">Virtual city</p>
          <p className="mt-2 text-xs leading-5 text-white/55">Explore Ithaca in the age of Odysseus.</p>
          <Link href="/city" className="mt-4 block rounded-xl bg-[#e4aa56] px-3 py-2.5 text-center text-[9px] font-semibold uppercase tracking-wider text-[#071b23]">Open live 3D city ↗</Link>
        </div>
        <div className="flex items-center gap-3 border-t border-white/10 px-5 py-4"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#184250] text-xs">OP</span><div><p className="text-xs">City Operator</p><p className="text-[9px] text-white/30">Command access</p></div><span className="ml-auto text-white/25">•••</span></div>
      </aside>

      <header className="sticky top-0 z-40 flex min-h-[76px] items-center justify-between gap-4 border-b border-[#dfe6e9] bg-white/90 px-4 backdrop-blur-xl sm:px-7">
        <div className="lg:hidden"><p className="font-serif text-lg tracking-[.12em]">ITHACA</p><p className="text-[8px] uppercase tracking-widest text-[#6c7b82]">Operations</p></div>
        <div className="hidden sm:block"><p className="text-lg font-semibold">{active}</p><p className="mt-0.5 text-[10px] text-[#76868d]">Monitor city systems and operational readiness</p></div>
        <div className="flex items-center gap-2 sm:gap-3">
          <label className="hidden h-10 w-56 items-center gap-2 rounded-xl border border-[#dfe6e9] bg-[#f6f8f9] px-3 md:flex"><span className="text-[#8b999f]">⌕</span><input placeholder="Search systems…" className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-[#9aa7ac]" /></label>
          <span className="flex h-10 items-center gap-2 rounded-xl border border-[#dfe6e9] bg-white px-3 text-[9px] uppercase tracking-wider text-[#66777e]"><span className={`h-2 w-2 rounded-full ${dataSource === "mongodb" ? "bg-emerald-500" : dataSource === "fixture" ? "bg-amber-400" : "animate-pulse bg-slate-300"}`} />{dataSource === "mongodb" ? "Live data" : dataSource === "fixture" ? "Demo data" : "Connecting"}</span>
          <Link href="/city" className="rounded-xl bg-[#0b2a35] px-4 py-3 text-[9px] font-semibold uppercase tracking-wider text-white hover:bg-[#123b48]">3D City ↗</Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] p-4 sm:p-7">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#b5792e]">System overview</p><h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Good afternoon, Operator.</h1><p className="mt-2 text-sm text-[#728189]">Here is the current state of Ithaca&apos;s monitored infrastructure.</p></div>
          <div className="flex gap-2"><button className="rounded-xl border border-[#d8e0e4] bg-white px-4 py-2.5 text-xs text-[#516168]">Export report</button><Link href="/city" className="rounded-xl bg-[#e4aa56] px-4 py-2.5 text-xs font-semibold text-[#17242b]">View virtual city</Link></div>
        </section>

        <section className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Kpi label="Infrastructure assets" value={components.length || "—"} change="6 city systems" glyph="⌘" color="#287c95" />
          <Kpi label="Operational health" value={`${components.length ? Math.round((statusCounts.operational / components.length) * 100) : 0}%`} change={`${statusCounts.operational} assets nominal`} glyph="✓" color="#32966f" />
          <Kpi label="Active incidents" value={activeIncidents.length} change={activeIncidents.length ? "Response required" : "No active threats"} glyph="△" color={activeIncidents.length ? "#d56c4b" : "#32966f"} />
          <Kpi label="Backup coverage" value={`${coverage}%`} change={`${dependencies.length} dependency links`} glyph="◈" color="#b5792e" />
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_.8fr]">
          <Card title="System health trend" subtitle="Operational service level across the last 24 hours" action="Last 24 hours">
            <HealthChart />
          </Card>
          <Card title="Asset status" subtitle="Current network distribution">
            <div className="grid min-h-[250px] place-items-center sm:grid-cols-[1fr_1.15fr] xl:grid-cols-1 2xl:grid-cols-[1fr_1.15fr]">
              <Donut counts={statusCounts} total={components.length} />
              <div className="w-full space-y-3"><Legend color="#3a9d76" label="Operational" value={statusCounts.operational} /><Legend color="#e8b75f" label="On backup" value={statusCounts.backup} /><Legend color="#e78452" label="Degraded" value={statusCounts.degraded} /><Legend color="#da5a5a" label="Offline" value={statusCounts.offline} /></div>
            </div>
          </Card>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_1fr]">
          <Card title="Infrastructure by category" subtitle="Monitored assets across each service layer">
            <div className="space-y-4">{(Object.entries(CATEGORY) as [keyof typeof CATEGORY, typeof CATEGORY[keyof typeof CATEGORY]][]).map(([key, meta]) => { const value = categoryCounts[key]; const max = Math.max(...Object.values(categoryCounts), 1); return <div key={key} className="grid grid-cols-[115px_1fr_28px] items-center gap-3"><span className="text-xs text-[#5f6e75]">{meta.label}</span><div className="h-2 overflow-hidden rounded-full bg-[#edf1f3]"><div className="h-full rounded-full" style={{ width: `${(value / max) * 100}%`, backgroundColor: meta.color }} /></div><span className="text-right text-xs font-semibold">{value || "—"}</span></div>; })}</div>
          </Card>
          <Card title="Critical assets" subtitle="Highest-priority infrastructure">
            <div className="divide-y divide-[#e8edef]">{criticalAssets.length ? criticalAssets.map((asset) => <div key={asset.id} className="flex items-center gap-3 py-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#eef4f6] text-sm text-[#287c95]">{asset.category === "electrical" ? "ϟ" : asset.category === "water" ? "≈" : asset.category === "hospital" ? "+" : "◇"}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{asset.name}</p><p className="mt-1 text-[9px] text-[#8a989e]">{asset.id} · {asset.district}</p></div><span className={`rounded-full px-2 py-1 text-[8px] uppercase ${asset.status === "operational" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{asset.status}</span></div>) : <LoadingRows />}</div>
          </Card>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_.75fr]">
          <Card title="Recent activity" subtitle="Latest operational events and incidents" action="View all">
            <div className="divide-y divide-[#e8edef]">{incidents.length ? incidents.slice(0, 5).map((incident) => <div key={incident.incidentId} className="flex items-start gap-3 py-3"><span className={`mt-1 h-2 w-2 rounded-full ${incident.severity === "critical" ? "bg-red-500" : incident.severity === "major" ? "bg-orange-500" : "bg-amber-400"}`} /><div className="flex-1"><p className="text-xs font-semibold capitalize">{incident.incidentType.replace(/_/g, " ")}</p><p className="mt-1 text-[10px] text-[#7c8a90]">{incident.componentId} · {incident.estimatedImpact.downstreamAffectedCount} downstream assets affected</p></div><span className="text-[9px] text-[#98a4a9]">{new Date(incident.startTime).toLocaleDateString()}</span></div>) : <EmptyActivity />}</div>
          </Card>
          <Card title="AI operations" subtitle="Intelligence layer readiness">
            <Agent name="Athena" role="Incident intelligence" color="#4aa9bd" letter="A" />
            <Agent name="Oracle" role="Strategic foresight" color="#947ac2" letter="Ω" />
            <div className="mt-4 rounded-xl border border-[#dce7ea] bg-[#f4f8f9] p-3 text-[10px] leading-5 text-[#65757c]">Both assistants use the configured Gemini model and remain grounded in simulation telemetry.</div>
          </Card>
        </section>
      </div>
    </main>
  );
}

function Kpi({ label, value, change, glyph, color }: { label: string; value: string | number; change: string; glyph: string; color: string }) { return <article className="rounded-2xl border border-[#dfe6e9] bg-white p-4 shadow-[0_2px_12px_rgba(22,42,50,.035)] sm:p-5"><div className="flex items-start justify-between"><p className="text-[10px] font-medium text-[#74838a]">{label}</p><span className="grid h-9 w-9 place-items-center rounded-xl text-base" style={{ color, backgroundColor: `${color}12` }}>{glyph}</span></div><p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p><p className="mt-2 text-[9px] text-[#89969c]">{change}</p></article>; }
function Card({ title, subtitle, action, children }: { title: string; subtitle: string; action?: string; children: React.ReactNode }) { return <article className="rounded-2xl border border-[#dfe6e9] bg-white p-5 shadow-[0_2px_12px_rgba(22,42,50,.035)]"><header className="mb-5 flex items-start justify-between gap-3"><div><h2 className="text-sm font-semibold">{title}</h2><p className="mt-1 text-[10px] text-[#8a979d]">{subtitle}</p></div>{action && <button className="rounded-lg border border-[#e0e6e9] px-3 py-2 text-[9px] text-[#64747b]">{action}</button>}</header>{children}</article>; }
function HealthChart() { const points = "0,105 35,96 70,99 105,80 140,86 175,62 210,70 245,47 280,55 315,38 350,43 385,26 420,34 455,18 500,24 540,12"; return <div><svg viewBox="0 0 540 140" className="h-[220px] w-full" preserveAspectRatio="none"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3e9fb6" stopOpacity=".28" /><stop offset="1" stopColor="#3e9fb6" stopOpacity="0" /></linearGradient></defs>{[20,50,80,110].map((y) => <line key={y} x1="0" x2="540" y1={y} y2={y} stroke="#e7edef" strokeDasharray="3 4" />)}<polygon points={`0,140 ${points} 540,140`} fill="url(#area)" /><polyline points={points} fill="none" stroke="#318da4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><circle cx="540" cy="12" r="5" fill="#318da4" stroke="white" strokeWidth="3" /></svg><div className="flex justify-between text-[8px] uppercase tracking-wider text-[#9aa6ab]"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>Now</span></div></div>; }
function Donut({ counts, total }: { counts: { operational: number; backup: number; degraded: number; offline: number }; total: number }) { const op = total ? counts.operational / total * 100 : 100; const backup = total ? counts.backup / total * 100 : 0; const degraded = total ? counts.degraded / total * 100 : 0; return <div className="relative h-36 w-36 rounded-full" style={{ background: `conic-gradient(#3a9d76 0 ${op}%, #e8b75f ${op}% ${op + backup}%, #e78452 ${op + backup}% ${op + backup + degraded}%, #da5a5a ${op + backup + degraded}% 100%)` }}><div className="absolute inset-5 grid place-items-center rounded-full bg-white text-center"><div><p className="text-2xl font-semibold">{total || "—"}</p><p className="text-[8px] uppercase tracking-wider text-[#91a0a6]">Assets</p></div></div></div>; }
function Legend({ color, label, value }: { color: string; label: string; value: number }) { return <div className="flex items-center text-[10px]"><span className="mr-2 h-2 w-2 rounded-full" style={{ backgroundColor: color }} /><span className="text-[#697980]">{label}</span><span className="ml-auto font-semibold">{value}</span></div>; }
function Agent({ name, role, color, letter }: { name: string; role: string; color: string; letter: string }) { return <div className="mb-2 flex items-center gap-3 rounded-xl border border-[#e3e9ec] p-3"><span className="grid h-9 w-9 place-items-center rounded-full font-serif" style={{ color, backgroundColor: `${color}14` }}>{letter}</span><div><p className="text-xs font-semibold">{name}</p><p className="mt-0.5 text-[9px] text-[#89969b]">{role}</p></div><span className="ml-auto h-2 w-2 rounded-full bg-emerald-500" /></div>; }
function EmptyActivity() { return <div className="grid min-h-40 place-items-center text-center"><div><span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-emerald-50 text-emerald-600">✓</span><p className="mt-3 text-xs font-semibold">No recent incidents</p><p className="mt-1 text-[10px] text-[#8b989e]">All monitored systems are stable.</p></div></div>; }
function LoadingRows() { return <>{[0,1,2,3].map((item) => <div key={item} className="my-2 h-12 animate-pulse rounded-xl bg-[#f1f4f5]" />)}</>; }
