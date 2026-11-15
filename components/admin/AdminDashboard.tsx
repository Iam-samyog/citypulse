"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Torch } from "@/components/dashboard/Torch";
import { CityDemographics } from "@/components/dashboard/CityDemographics";
import { ChatbotWidget } from "@/components/ai/ChatbotWidget";
import { districts } from "@/lib/seed/infrastructure";
import type { Incident } from "@/types/incident";
import type { InfrastructureComponent, InfrastructureDependency } from "@/types/infrastructure";

const NAV = [
  ["Overview", "⌂"], ["Infrastructure", "⌘"], ["Incidents", "△"],
  ["Analytics", "⌁"], ["AI Assistants", "✦"]
] as const;

const ART: Record<string, { src: string; pos: string; full?: boolean }> = {
  Overview: { src: "/art/welcome-warrior.jpg", pos: "50% 30%", full: true },
  Infrastructure: { src: "/art/odysseus-sea.jpg", pos: "50% 30%" },
  Incidents: { src: "/art/battle-crowd.jpg", pos: "50% 50%" },
  Analytics: { src: "/art/odysseus-ship.jpg", pos: "50% 0%" },
  "AI Assistants": { src: "/art/odysseus-sea.jpg", pos: "50% 30%" },
};

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
  const [district, setDistrict] = useState<string | null>(null);
  const [query, setQuery] = useState(""); // text in the search box
  const [tableQuery, setTableQuery] = useState(""); // filter applied to the asset table
  const [searchOpen, setSearchOpen] = useState(false);
  const [range, setRange] = useState<"24h" | "7d" | "30d">("24h");
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState("");
  const [prefs, setPrefs] = useState({ autoRefresh: true, compact: false, alerts: true });
  const menuRef = useRef<HTMLDivElement>(null);
  const [dataSource, setDataSource] = useState<"loading" | "mongodb" | "fixture">("loading");

  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!prefs.autoRefresh) return;
    const t = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, [prefs.autoRefresh]);
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
  }, [tick]);

  const allComponents = components;
  const scoped = useMemo(() => district ? allComponents.filter((c) => c.district === district) : allComponents, [allComponents, district]);
  const scopedIds = useMemo(() => new Set(scoped.map((c) => c.id)), [scoped]);
  const scopedIncidents = useMemo(() => district
    ? incidents.filter((i) => i.estimatedImpact.affectedDistricts.includes(district) || scopedIds.has(i.componentId))
    : incidents, [incidents, district, scopedIds]);
  const scopedDeps = useMemo(() => district
    ? dependencies.filter((d) => scopedIds.has(d.sourceId) || scopedIds.has(d.targetId))
    : dependencies, [dependencies, district, scopedIds]);
  const q = tableQuery.trim().toLowerCase();
  const searched = useMemo(() => q ? scoped.filter((c) => `${c.id} ${c.name} ${c.category} ${c.district} ${c.status}`.toLowerCase().includes(q)) : scoped, [scoped, q]);

  const statusCounts = useMemo(() => ({
    operational: scoped.filter((item) => item.status === "operational").length,
    backup: scoped.filter((item) => item.status === "backup").length,
    degraded: scoped.filter((item) => item.status === "degraded").length,
    offline: scoped.filter((item) => item.status === "offline").length,
  }), [scoped]);
  const categoryCounts = useMemo(() => Object.fromEntries(
    Object.keys(CATEGORY).map((key) => [key, scoped.filter((item) => item.category === key).length])
  ) as Record<keyof typeof CATEGORY, number>, [scoped]);
  const criticalAssets = useMemo(() => [...scoped]
    .sort((a, b) => b.criticality - a.criticality || b.currentLoad / b.maxCapacity - a.currentLoad / a.maxCapacity)
    .slice(0, 5), [scoped]);
  const activeIncidents = scopedIncidents.filter((item) => item.incidentStatus !== "resolved");
  const coverage = scopedDeps.length
    ? Math.round((scopedDeps.filter((item) => item.hasBackup).length / scopedDeps.length) * 100)
    : 0;
  const health = scoped.length ? Math.round((statusCounts.operational / scoped.length) * 100) : 0;
  const population = districts.filter((d) => !district || d.name === district).reduce((s, d) => s + d.population, 0);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const title = active === "Overview" ? "Welcome back, Operator" : `${active} · ${district ?? "All districts"}`;
  const needle = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!needle) return [] as { key: string; kind: string; label: string; hint: string; run: () => void }[];
    const done = () => { setSearchOpen(false); };
    const out: { key: string; kind: string; label: string; hint: string; run: () => void }[] = [];
    NAV.forEach(([label]) => { if (label.toLowerCase().includes(needle)) out.push({ key: `t-${label}`, kind: "Page", label, hint: "Open section", run: () => { setActive(label); done(); } }); });
    districts.forEach((d) => { if (d.name.toLowerCase().includes(needle)) out.push({ key: `d-${d.name}`, kind: "District", label: d.name, hint: `${d.population.toLocaleString("en-US")} residents`, run: () => { setDistrict(d.name); setActive("Overview"); done(); } }); });
    const assets = allComponents.filter((c) => `${c.id} ${c.name} ${c.category} ${c.district} ${c.status}`.toLowerCase().includes(needle));
    assets.slice(0, 6).forEach((c) => out.push({ key: `a-${c.id}`, kind: "Asset", label: c.name, hint: `${c.id} · ${c.district} · ${c.status}`, run: () => { setDistrict(null); setTableQuery(c.id); setActive("Infrastructure"); done(); } }));
    if (assets.length > 6) out.push({ key: "a-all", kind: "Assets", label: `Show all ${assets.length} matching assets`, hint: `“${query.trim()}”`, run: () => { setDistrict(null); setTableQuery(query.trim()); setActive("Infrastructure"); done(); } });
    incidents.filter((i) => `${i.incidentId} ${i.componentId} ${i.incidentType.replace(/_/g, " ")} ${i.severity}`.toLowerCase().includes(needle)).slice(0, 4).forEach((i) => out.push({ key: `i-${i.incidentId}`, kind: "Incident", label: i.incidentType.replace(/_/g, " "), hint: `${i.componentId} · ${i.severity}`, run: () => { setDistrict(null); setActive("Incidents"); done(); } }));
    return out;
  }, [needle, query, allComponents, incidents]);

  function exportCsv() {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines: string[] = [
      "CityPulse operations report", `Generated,${esc(new Date().toISOString())}`, `Scope,${esc(district ?? "All districts")}`, "",
      "SUMMARY", `Population,${population}`, `Assets,${scoped.length}`, `Operational health %,${health}`,
      `Active incidents,${activeIncidents.length}`, `Backup coverage %,${coverage}`, "",
      "DISTRICTS", "District,Population,Assets,Healthy assets",
      ...districts.filter((d) => !district || d.name === district).map((d) => { const mine = allComponents.filter((c) => c.district === d.name); return [esc(d.name), d.population, mine.length, mine.filter((c) => c.status === "operational").length].join(","); }),
      "", "ASSETS", "ID,Name,Category,District,Status,Criticality,Load,Capacity",
      ...scoped.map((c) => [c.id, esc(c.name), c.category, esc(c.district), c.status, c.criticality, c.currentLoad, c.maxCapacity].join(",")),
      "", "INCIDENTS", "ID,Component,Type,Severity,Status,Started,Downstream affected",
      ...scopedIncidents.map((i) => [i.incidentId, i.componentId, i.incidentType, i.severity, i.incidentStatus, i.startTime, i.estimatedImpact.downstreamAffectedCount].join(",")),
    ];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `ithaca-report-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    setMenu(false); setToast("Report downloaded (CSV)");
  }
  const printReport = () => { setMenu(false); setTimeout(() => window.print(), 50); };

  return (
    <main className="relative isolate min-h-screen font-paint text-[#f3ead6] lg:pl-[248px] print:pl-0 print:bg-white print:text-black">
      <div aria-hidden className="painting print:hidden" />
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[248px] print:!hidden flex-col border-r border-[#c9a24b]/25 bg-[#170b09]/75 backdrop-blur-xl text-white lg:flex">
        <div className="flex h-[76px] items-center gap-3 border-b border-white/10 px-6">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e4aa56] font-paint text-xl text-[#1f100d]">Ι</span>
          <div><p className="font-heading text-lg tracking-[.14em]">ITHACA</p><p className="text-[10px] uppercase tracking-[.22em] text-white/35">City operations</p></div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-6">
          <p className="mb-3 px-3 text-[10px] uppercase tracking-[.24em] text-white/25">Workspace</p>
          {NAV.map(([label, glyph]) => <button key={label} onClick={() => setActive(label)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-1.5 text-left text-sm transition ${active === label ? "bg-[#5a2616] text-white" : "text-white/45 hover:bg-white/[.05] hover:text-white/80"}`}><span className="grid h-14 w-9 place-items-center"><Torch lit={active === label} className="h-14 w-7" /></span><span>{label}</span>{label === "Incidents" && prefs.alerts && activeIncidents.length > 0 && <span className="ml-auto rounded-full bg-red-400 px-2 py-0.5 text-[10px] text-white">{activeIncidents.length}</span>}</button>)}
        </nav>
        <div className="m-4 rounded-2xl border border-white/10 bg-white/[.04] p-4">
          <p className="text-[10px] uppercase tracking-[.2em] text-[#e4aa56]">Virtual city</p>
          <p className="mt-2 text-xs leading-5 text-white/55">Explore Ithaca in the age of Odysseus.</p>
          <Link href="/city" className="scroll-btn !mx-3 mt-4 block !px-2 text-center text-[11px] uppercase tracking-wide">Open live 3D city ↗</Link>
        </div>
        <div className="flex items-center gap-3 border-t border-white/10 px-5 py-4"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#6a2c1a] text-xs">OP</span><div><p className="text-xs">City Operator</p><p className="text-[11px] text-white/30">Command access</p></div><span className="ml-auto text-white/25">•••</span></div>
      </aside>

      <header className="sticky top-0 z-40 print:hidden flex min-h-[76px] items-center justify-between gap-4 border-b border-[#c9a24b]/25 bg-[#1a0c0a]/55 backdrop-blur-xl px-4 backdrop-blur-xl sm:px-7">
        <div className="lg:hidden"><p className="font-paint text-lg tracking-[.12em]">ITHACA</p><p className="text-[10px] uppercase tracking-widest text-[#d8ccb0]/70">Operations</p></div>
        <div className="hidden sm:block"><p className="text-lg font-semibold">{active}</p><p className="mt-0.5 text-[12px] text-[#d8ccb0]/70">{active === "Overview" ? "Monitor city systems and operational readiness" : active === "Infrastructure" ? "Every monitored asset across the city" : active === "Incidents" ? "Active and historical incidents" : active === "Analytics" ? "Population, housing and service trends" : "Athena and Oracle intelligence layer"}</p></div>
        <div className="flex items-center gap-2 sm:gap-3">
          <SearchBox className="hidden h-10 w-64 md:flex" query={query} setQuery={setQuery} results={results} open={searchOpen} setOpen={setSearchOpen} />
          <span className="flex h-10 items-center gap-2 rounded-xl border border-[#c9a24b]/25 bg-[#1f100d]/55 backdrop-blur-[3px] px-3 text-[11px] uppercase tracking-wider text-[#d8ccb0]/70"><span className={`h-2 w-2 rounded-full ${dataSource === "mongodb" ? "bg-emerald-400/150" : dataSource === "fixture" ? "bg-amber-400" : "animate-pulse bg-slate-300"}`} />{dataSource === "mongodb" ? "Live data" : dataSource === "fixture" ? "Demo data" : "Connecting"}</span>
          <Link href="/city" className="scroll-btn text-xs uppercase tracking-wider">3D City ↗</Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] p-4 sm:p-7">
        <SearchBox className="mb-3 flex h-11 md:hidden print:hidden" query={query} setQuery={setQuery} results={results} open={searchOpen} setOpen={setSearchOpen} />
        <nav className="-mx-1 mb-4 flex gap-1 overflow-x-auto pb-1 lg:hidden print:hidden">
          {NAV.map(([label]) => <button key={label} onClick={() => setActive(label)} className={`shrink-0 rounded-full px-4 py-2 text-[13px] ${active === label ? "bg-[#4a1f14] text-white" : "bg-[#1f100d]/55 backdrop-blur-[3px] text-[#d8ccb0]/70 border border-[#c9a24b]/25"}`}>{label}</button>)}
        </nav>

        <section className={`relative z-30 flex min-h-[300px] flex-col justify-end gap-4 rounded-3xl p-6 sm:flex-row sm:items-end sm:justify-between sm:p-10 sm:min-h-[380px]`}>
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl border border-[#c9a24b]/30 bg-[#1c0e0b] shadow-[0_18px_50px_rgba(0,0,0,.5)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ART[active].src} alt="" className={`absolute left-0 top-0 h-full w-full max-w-none object-cover ${ART[active].full ? "" : "sm:w-[112%]"}`} style={{ objectPosition: ART[active].pos }} />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(20,8,6,.85)_0%,rgba(20,8,6,.5)_38%,transparent_62%),linear-gradient(0deg,rgba(20,8,6,.6)_0%,transparent_45%)]" />
          </div>
          <div className="relative"><p className="text-[12px] font-semibold uppercase tracking-[.2em] text-[#e4aa56]">{active === "Overview" ? "System overview" : active}</p><h1 className={`font-heading mt-2 max-w-[600px] text-3xl font-normal leading-[1.15] text-white sm:text-[2.75rem]`}>{title}</h1><div className="mt-4 h-px w-24 bg-gradient-to-r from-[#e4aa56] to-transparent" /><p className="mt-3 max-w-[460px] text-sm text-[#efe5cc]/85">Showing {district ?? "all of Ithaca"}: {population.toLocaleString("en-US")} residents, {scoped.length} monitored assets.</p></div>
          <div className="relative flex gap-2 print:hidden">
            <div className="relative" ref={menuRef}>
              <button onClick={() => setMenu((v) => !v)} className="scroll-btn text-sm">Export report ▾</button>
              {menu && <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-[#c9a24b]/40 bg-[#1c0e0b] text-xs text-white shadow-2xl">
                <button onClick={exportCsv} className="block w-full px-4 py-3 text-left hover:bg-white/10">Download CSV<span className="block text-[11px] text-[#d8ccb0]/70">Summary, assets and incidents</span></button>
                <button onClick={printReport} className="block w-full border-t border-[#c9a24b]/25 px-4 py-3 text-left hover:bg-white/10">Print / Save as PDF<span className="block text-[11px] text-[#d8ccb0]/70">Current view</span></button>
              </div>}
            </div>
            <Link href="/city" className="scroll-btn text-sm">View virtual city</Link>
          </div>
        </section>

        <div className="mt-5 flex flex-wrap items-center gap-2 print:hidden">
          <span className="text-[11px] uppercase tracking-wider text-[#d8ccb0]/70">District</span>
          {[null, ...districts.map((d) => d.name)].map((name) => <button key={name ?? "all"} onClick={() => setDistrict(name)} className={`rounded-full border px-3.5 py-1.5 text-[13px] transition ${district === name ? "border-[#4a1f14] bg-[#4a1f14] text-white" : "border-[#c9a24b]/25 bg-[#1f100d]/55 backdrop-blur-[3px] text-[#d8ccb0]/70 hover:bg-white/10"}`}>{name ?? "All districts"}</button>)}
        </div>

        {(active === "Overview" || active === "Analytics") && <CityDemographics district={district} onSelect={setDistrict} components={allComponents} incidents={incidents} />}

        {active === "Overview" && <>
        <section className="mt-8 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Kpi label="Infrastructure assets" value={scoped.length || "—"} change={district ?? "6 city systems"} glyph="⌘" color="#287c95" onClick={() => setActive("Infrastructure")} />
          <Kpi label="Operational health" value={`${health}%`} change={`${statusCounts.operational} assets nominal`} glyph="✓" color="#32966f" onClick={() => setActive("Analytics")} />
          <Kpi label="Active incidents" value={activeIncidents.length} change={activeIncidents.length ? "Response required" : "No active threats"} glyph="△" color={activeIncidents.length ? "#d56c4b" : "#32966f"} onClick={() => setActive("Incidents")} />
          <Kpi label="Backup coverage" value={`${coverage}%`} change={`${scopedDeps.length} dependency links`} glyph="◈" color="#b5792e" onClick={() => setActive("Infrastructure")} />
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_.8fr]">
          <Card title="System health trend" subtitle={`Service level, ${district ?? "citywide"} (modelled)`} action={range === "24h" ? "Last 24 hours" : range === "7d" ? "Last 7 days" : "Last 30 days"} onAction={() => setRange(range === "24h" ? "7d" : range === "7d" ? "30d" : "24h")}>
            <HealthChart health={health || 100} range={range} seed={district?.length ?? 7} />
          </Card>
          <Card title="Asset status" subtitle="Current network distribution">
            <StatusPanel counts={statusCounts} total={scoped.length} />
          </Card>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_1fr]">
          <Card title="Infrastructure by category" subtitle="Monitored assets across each service layer" action="Details" onAction={() => setActive("Infrastructure")}>
            <CategoryBars counts={categoryCounts} />
          </Card>
          <Card title="Critical assets" subtitle="Highest-priority infrastructure" action="All assets" onAction={() => setActive("Infrastructure")}>
            <div className="divide-y divide-[#c9a24b]/20">{criticalAssets.length ? criticalAssets.map((asset) => <div key={asset.id} className="flex items-center gap-3 py-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white/[.07] text-sm text-[#7fd0e0]">{asset.category === "electrical" ? "ϟ" : asset.category === "water" ? "≈" : asset.category === "hospital" ? "+" : "◇"}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{asset.name}</p><p className="mt-1 text-[11px] text-[#d8ccb0]/70">{asset.id} · {asset.district}</p></div><span className={`rounded-full px-2 py-1 text-[10px] uppercase ${asset.status === "operational" ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-300"}`}>{asset.status}</span></div>) : <LoadingRows />}</div>
          </Card>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_.75fr]">
          <Card title="Recent activity" subtitle="Latest operational events and incidents" action="View all" onAction={() => setActive("Incidents")}>
            <IncidentList incidents={scopedIncidents.slice(0, 5)} />
          </Card>
          <Card title="AI operations" subtitle="Intelligence layer readiness">
            <Agent name="Athena" role="Incident intelligence" color="#4aa9bd" letter="A" />
            <Agent name="Oracle" role="Strategic foresight" color="#947ac2" letter="Ω" />
            <Link href="/city" className="mt-3 block rounded-xl bg-[#4a1f14] px-3 py-2.5 text-center text-[12px] font-semibold uppercase tracking-wider text-white print:hidden">Open in 3D city ↗</Link>
          </Card>
        </section>
        </>}

        {active === "Analytics" && <section className="mt-5 grid gap-5 xl:grid-cols-2">
          <Card title="Asset status" subtitle={`${district ?? "Citywide"} network distribution`}><StatusPanel counts={statusCounts} total={scoped.length} /></Card>
          <Card title="Infrastructure by category" subtitle="Assets per service layer"><CategoryBars counts={categoryCounts} /></Card>
          <Card title="System health trend" subtitle="Service level (modelled)" action={range === "24h" ? "Last 24 hours" : range === "7d" ? "Last 7 days" : "Last 30 days"} onAction={() => setRange(range === "24h" ? "7d" : range === "7d" ? "30d" : "24h")}><HealthChart health={health || 100} range={range} seed={district?.length ?? 7} /></Card>
          <Card title="Infrastructure per 1,000 residents" subtitle="Assets relative to population served">
            <div className="space-y-4">{districts.map((d) => { const n = allComponents.filter((c) => c.district === d.name).length; const per = n / d.population * 1000; return <button key={d.name} onClick={() => setDistrict(d.name)} className="grid w-full grid-cols-[130px_1fr_40px] items-center gap-3 text-left"><span className="text-xs text-[#d8ccb0]/70">{d.name}</span><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#287c95]" style={{ width: `${Math.min(per / 1.2, 1) * 100}%` }} /></div><span className="text-right text-xs font-semibold">{per.toFixed(2)}</span></button>; })}</div>
          </Card>
        </section>}

        {active === "Infrastructure" && <Card title="Infrastructure assets" subtitle={`${searched.length} of ${allComponents.length} assets${q ? ` matching “${tableQuery}”` : ""}`} action={q ? "Clear search" : undefined} onAction={() => setTableQuery("")}>
          <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead><tr className="border-b border-[#c9a24b]/25 text-[11px] uppercase tracking-wider text-[#d8ccb0]/70"><th className="py-2">ID</th><th>Name</th><th>Category</th><th>District</th><th>Load</th><th>Crit.</th><th>Status</th></tr></thead><tbody>
            {searched.map((c) => <tr key={c.id} className="border-b border-[#c9a24b]/25"><td className={`${prefs.compact ? "py-1.5" : "py-3"} text-[#d8ccb0]/70`}>{c.id}</td><td className="font-semibold">{c.name}</td><td><span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY[c.category].color }} />{CATEGORY[c.category].label}</td><td>{c.district}</td><td><div className="flex items-center gap-2"><div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-[#287c95]" style={{ width: `${Math.min(c.currentLoad / c.maxCapacity, 1) * 100}%` }} /></div>{Math.round(c.currentLoad / c.maxCapacity * 100)}%</div></td><td>{"●".repeat(c.criticality)}</td><td><span className={`rounded-full px-2 py-1 text-[10px] uppercase ${c.status === "operational" ? "bg-emerald-400/15 text-emerald-300" : c.status === "offline" ? "bg-red-400/15 text-red-300" : "bg-amber-400/15 text-amber-300"}`}>{c.status}</span></td></tr>)}
            {!searched.length && <tr><td colSpan={7} className="py-10 text-center text-[#d8ccb0]/70">{allComponents.length ? "No assets match." : "Loading assets…"}</td></tr>}
          </tbody></table></div>
        </Card>}

        {active === "Incidents" && <Card title="Incidents" subtitle={`${scopedIncidents.length} recorded · ${activeIncidents.length} active`}><IncidentList incidents={scopedIncidents} /></Card>}

        {active === "AI Assistants" && <section className="mt-5 grid gap-5 md:grid-cols-[1.35fr_.65fr]">
          <ChatbotWidget embedded components={allComponents} incidents={scopedIncidents} />
          <Card title="Oracle" subtitle="Strategic foresight"><p className="text-xs leading-6 text-[#d8ccb0]/70">Reviews resilience and backup endurance to forecast cascading risk. Current backup coverage is {coverage}%. {activeIncidents.length ? `${activeIncidents.length} active incident(s) are ready for review.` : "No active incidents are ready for review."}</p><Link href="/city" className="mt-4 inline-block rounded-xl bg-[#947ac2] px-4 py-2.5 text-xs font-semibold text-white">Consult Oracle in 3D city ↗</Link></Card>
        </section>}

      </div>
      {toast && <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-[#4a1f14] px-5 py-3 text-xs text-white shadow-xl print:hidden">{toast}</div>}
    </main>
  );
}

function Kpi({ label, value, change, glyph, color, onClick }: { label: string; value: string | number; change: string; glyph: string; color: string; onClick?: () => void }) { return <article onClick={onClick} className="cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md rounded-2xl border border-[#c9a24b]/25 bg-[#1f100d]/55 backdrop-blur-[3px] p-4 shadow-[0_10px_34px_rgba(0,0,0,.4)] sm:p-5"><div className="flex items-start justify-between"><p className="text-[12px] font-medium text-[#d8ccb0]/70">{label}</p><span className="grid h-9 w-9 place-items-center rounded-xl text-base" style={{ color, backgroundColor: `${color}12` }}>{glyph}</span></div><p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p><p className="mt-2 text-[11px] text-[#d8ccb0]/70">{change}</p></article>; }
function Card({ title, subtitle, action, onAction, children }: { title: string; subtitle: string; action?: string; onAction?: () => void; children: React.ReactNode }) { return <article className="rounded-2xl border border-[#c9a24b]/25 bg-[#1f100d]/55 backdrop-blur-[3px] p-5 shadow-[0_10px_34px_rgba(0,0,0,.4)]"><header className="mb-5 flex items-start justify-between gap-3"><div><h2 className="font-heading text-lg font-normal text-white">{title}</h2><p className="mt-1 text-[12px] text-[#d8ccb0]/70">{subtitle}</p></div>{action && <button onClick={onAction} className="rounded-lg border border-[#c9a24b]/25 px-3 py-2 text-[11px] text-[#d8ccb0]/70 hover:bg-white/10 print:hidden">{action}</button>}</header>{children}</article>; }
function HealthChart({ health, range, seed }: { health: number; range: "24h" | "7d" | "30d"; seed: number }) {
  const n = 16, amp = range === "24h" ? 4 : range === "7d" ? 7 : 10;
  const ys = Array.from({ length: n }, (_, i) => { const v = i === n - 1 ? health : Math.min(100, health - Math.abs(Math.sin(i * 1.7 + seed)) * amp - (n - 1 - i) * 0.1); return 130 - ((v - 60) / 40) * 118; });
  const points = ys.map((y, i) => `${Math.round((i / (n - 1)) * 540)},${y.toFixed(1)}`).join(" ");
  const labels = range === "24h" ? ["00:00", "06:00", "12:00", "18:00", "Now"] : range === "7d" ? ["7d", "5d", "3d", "1d", "Now"] : ["30d", "22d", "15d", "7d", "Now"];
  return <div><svg viewBox="0 0 540 140" className="h-[220px] w-full" preserveAspectRatio="none"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3e9fb6" stopOpacity=".28" /><stop offset="1" stopColor="#3e9fb6" stopOpacity="0" /></linearGradient></defs>{[20,50,80,110].map((y) => <line key={y} x1="0" x2="540" y1={y} y2={y} stroke="rgba(255,255,255,.14)" strokeDasharray="3 4" />)}<polygon points={`0,140 ${points} 540,140`} fill="url(#area)" /><polyline points={points} fill="none" stroke="#318da4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><circle cx="540" cy={ys[n - 1]} r="5" fill="#318da4" stroke="#1f100d" strokeWidth="3" /></svg><div className="flex justify-between text-[10px] uppercase tracking-wider text-[#d8ccb0]/70">{labels.map((l) => <span key={l}>{l}</span>)}</div></div>;
}
function StatusPanel({ counts, total }: { counts: { operational: number; backup: number; degraded: number; offline: number }; total: number }) {
  return <div className="grid min-h-[250px] place-items-center sm:grid-cols-[1fr_1.15fr] xl:grid-cols-1 2xl:grid-cols-[1fr_1.15fr]"><Donut counts={counts} total={total} /><div className="w-full space-y-3"><Legend color="#3a9d76" label="Operational" value={counts.operational} /><Legend color="#e8b75f" label="On backup" value={counts.backup} /><Legend color="#e78452" label="Degraded" value={counts.degraded} /><Legend color="#da5a5a" label="Offline" value={counts.offline} /></div></div>;
}
function CategoryBars({ counts }: { counts: Record<keyof typeof CATEGORY, number> }) {
  const max = Math.max(...Object.values(counts), 1);
  return <div className="space-y-4">{(Object.entries(CATEGORY) as [keyof typeof CATEGORY, typeof CATEGORY[keyof typeof CATEGORY]][]).map(([key, meta]) => <div key={key} className="grid grid-cols-[115px_1fr_28px] items-center gap-3"><span className="text-xs text-[#d8ccb0]/70">{meta.label}</span><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${(counts[key] / max) * 100}%`, backgroundColor: meta.color }} /></div><span className="text-right text-xs font-semibold">{counts[key] || "—"}</span></div>)}</div>;
}
function IncidentList({ incidents }: { incidents: Incident[] }) {
  if (!incidents.length) return <EmptyActivity />;
  return <div className="divide-y divide-[#c9a24b]/20">{incidents.map((incident) => <div key={incident.incidentId} className="flex items-start gap-3 py-3"><span className={`mt-1 h-2 w-2 rounded-full ${incident.severity === "critical" ? "bg-red-400/150" : incident.severity === "major" ? "bg-orange-500" : "bg-amber-400"}`} /><div className="flex-1"><p className="text-xs font-semibold capitalize">{incident.incidentType.replace(/_/g, " ")} <span className="ml-1 rounded-full bg-white/[.07] px-2 py-0.5 text-[10px] font-normal uppercase text-[#d8ccb0]/70">{incident.incidentStatus}</span></p><p className="mt-1 text-[12px] text-[#d8ccb0]/70">{incident.componentId} · {incident.estimatedImpact.downstreamAffectedCount} downstream assets · {incident.estimatedImpact.affectedDistricts.join(", ") || "no districts"}</p></div><span className="text-[11px] text-[#d8ccb0]/70">{new Date(incident.startTime).toLocaleDateString()}</span></div>)}</div>;
}
function Donut({ counts, total }: { counts: { operational: number; backup: number; degraded: number; offline: number }; total: number }) { const op = total ? counts.operational / total * 100 : 100; const backup = total ? counts.backup / total * 100 : 0; const degraded = total ? counts.degraded / total * 100 : 0; return <div className="relative h-36 w-36 rounded-full" style={{ background: `conic-gradient(#3a9d76 0 ${op}%, #e8b75f ${op}% ${op + backup}%, #e78452 ${op + backup}% ${op + backup + degraded}%, #da5a5a ${op + backup + degraded}% 100%)` }}><div className="absolute inset-5 grid place-items-center rounded-full bg-[#1f100d]/55 backdrop-blur-[3px] text-center"><div><p className="text-2xl font-semibold">{total || "—"}</p><p className="text-[10px] uppercase tracking-wider text-[#d8ccb0]/70">Assets</p></div></div></div>; }
function Legend({ color, label, value }: { color: string; label: string; value: number }) { return <div className="flex items-center text-[12px]"><span className="mr-2 h-2 w-2 rounded-full" style={{ backgroundColor: color }} /><span className="text-[#d8ccb0]/70">{label}</span><span className="ml-auto font-semibold">{value}</span></div>; }
function Agent({ name, role, color, letter }: { name: string; role: string; color: string; letter: string }) { return <div className="mb-2 flex items-center gap-3 rounded-xl border border-[#c9a24b]/25 p-3"><span className="grid h-9 w-9 place-items-center rounded-full font-paint" style={{ color, backgroundColor: `${color}14` }}>{letter}</span><div><p className="text-xs font-semibold">{name}</p><p className="mt-0.5 text-[11px] text-[#d8ccb0]/70">{role}</p></div><span className="ml-auto h-2 w-2 rounded-full bg-emerald-400/150" /></div>; }
function EmptyActivity() { return <div className="grid min-h-40 place-items-center text-center"><div><span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-emerald-400/15 text-emerald-300">✓</span><p className="mt-3 text-xs font-semibold">No recent incidents</p><p className="mt-1 text-[12px] text-[#d8ccb0]/70">All monitored systems are stable.</p></div></div>; }
function LoadingRows() { return <>{[0,1,2,3].map((item) => <div key={item} className="my-2 h-12 animate-pulse rounded-xl bg-white/[.07]" />)}</>; }

function SearchBox({ className, query, setQuery, results, open, setOpen }: { className: string; query: string; setQuery: (v: string) => void; results: { key: string; kind: string; label: string; hint: string; run: () => void }[]; open: boolean; setOpen: (v: boolean) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest("[data-searchbox]")) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [setOpen]);
  return (
    <div ref={ref} data-searchbox className={`relative ${className}`}>
      <form role="search" onSubmit={(e) => { e.preventDefault(); results[0]?.run(); }} className="flex h-full w-full items-center gap-2 rounded-xl border border-[#c9a24b]/25 bg-white/[.07] px-3 transition focus-within:border-[#e4aa56]/70 focus-within:bg-white/10">
        <button type="submit" aria-label="Search" className="text-[#d8ccb0]/80 hover:text-white">⌕</button>
        <input value={query} onChange={(e) => { setQuery(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }} placeholder="Search assets, districts, incidents…" className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-[#d8ccb0]/70" />
        {query && <button type="button" aria-label="Clear search" onClick={() => { setQuery(""); setOpen(false); }} className="text-[#d8ccb0]/70 hover:text-white">✕</button>}
      </form>
      {open && query.trim() && (
        <div className="absolute left-0 right-0 top-full z-[70] mt-2 max-h-80 min-w-[300px] overflow-y-auto rounded-xl border border-[#c9a24b]/40 bg-[#1c0e0b] text-xs text-white shadow-2xl">
          {results.length ? results.map((r) => (
            <button key={r.key} type="button" onMouseDown={(e) => e.preventDefault()} onClick={r.run} className="flex w-full items-center gap-3 border-b border-[#c9a24b]/15 px-4 py-3 text-left last:border-0 hover:bg-white/10">
              <span className="w-16 shrink-0 text-[10px] uppercase tracking-wider text-[#e4aa56]">{r.kind}</span>
              <span className="min-w-0 flex-1"><span className="block truncate capitalize">{r.label}</span><span className="block truncate text-[11px] text-[#d8ccb0]/70">{r.hint}</span></span>
            </button>
          )) : <p className="px-4 py-5 text-center text-[#d8ccb0]/70">No results for “{query.trim()}”</p>}
        </div>
      )}
    </div>
  );
}
