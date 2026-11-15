
"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Torch } from "@/components/dashboard/Torch";
import { CityDemographics } from "@/components/dashboard/CityDemographics";
import { RecoveryWorkbench } from "@/components/dashboard/RecoveryWorkbench";
import { SimulatedIncidentGenerator } from "@/components/dashboard/SimulatedIncidentGenerator";
import { ChatbotWidget } from "@/components/ai/ChatbotWidget";
import { buildAthenaPrompts, buildOraclePrompts, type QuickData } from "@/lib/ai/quickInsights";
import { buildHistory, historyFromIncidents, summarizeHistory, HISTORY_DAYS } from "@/lib/data/history";
import { createAnnouncement } from "@/lib/notifications/announcement";
import { districts } from "@/lib/seed/infrastructure";
import type { Incident } from "@/types/incident";
import type { InfrastructureComponent, InfrastructureDependency } from "@/types/infrastructure";

const NAV = [
  ["Overview", "⌂"], ["Infrastructure", "⌘"], ["Incidents", "△"],
  ["Advisors", "✦"], ["Simulator", "◭"]
] as const;

const ART: Record<string, { src: string; pos: string; full?: boolean }> = {
  Overview: { src: "/art/welcome-warrior.jpg", pos: "50% 30%", full: true },
  Infrastructure: { src: "/art/odysseus-sea.jpg", pos: "50% 30%" },
  Incidents: { src: "/art/battle-crowd.jpg", pos: "50% 50%" },
  "Advisors": { src: "/art/athena-odysseus.jpg", pos: "50% 62%" },
  Simulator: { src: "/art/odysseus-sea.jpg", pos: "50% 40%" },
};

const DEMO_ALERT_INCIDENT = {
  incidentId: "demo-alert-water-main",
  type: "water main break",
  severity: "moderate",
  status: "active",
  componentId: "WA-01",
  componentName: "Poseidon Waterworks",
  district: "Harbor of Phorcys",
  affectedDistricts: ["Harbor of Phorcys"],
  downstreamAffectedCount: 3,
};

interface SimKpi { label: string; value: string | number }
interface SimLiveState {
  scenario: string; scenarioTitle: string; clock: string; phase: string;
  playing: boolean; done: boolean; severity: number; kpis: SimKpi[];
}
interface SimFinishedRun {
  scenario: string; scenarioTitle: string;
  options: { o1?: string; o1Label?: string; o2?: string; o2Label?: string };
  outcome: string; outcomeText: string; durationSimMinutes: number;
  severity: number; maxSeverity: number; kpis: SimKpi[];
  curve: { t: number; sev: number }[]; events: { t: number; text: string; kind: string }[];
  startedAt?: string; endedAt?: string;
}
interface SimHistoryEntry extends SimFinishedRun { _id?: string; runId?: string }

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
  // null = the Advisors landing page (wallpaper + two cards); otherwise that advisor's chat is open.
  const [advisor, setAdvisor] = useState<"athena" | "oracle" | null>(null);
  const chatOpen = active === "Advisors" && advisor !== null;
  const hideHero = chatOpen || active === "Simulator";
  const [range, setRange] = useState<"24h" | "7d" | "30d">("24h");
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState("");
  const [sendingAlert, setSendingAlert] = useState(false);
  const [demoAlertPreview, setDemoAlertPreview] = useState("");
  const [prefs, setPrefs] = useState({ autoRefresh: true, compact: false, alerts: true });
  const menuRef = useRef<HTMLDivElement>(null);

  const [simLive, setSimLive] = useState<SimLiveState | null>(null);
  const [simFinished, setSimFinished] = useState<SimFinishedRun | null>(null);
  const [simHistory, setSimHistory] = useState<SimHistoryEntry[]>([]);
  const [simDbConnected, setSimDbConnected] = useState<boolean | null>(null);
  const [simCurve, setSimCurve] = useState<number[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [incStatus, setIncStatus] = useState<"all" | "open" | "resolved">("all");
  const [incSeverity, setIncSeverity] = useState<"all" | "critical" | "major" | "moderate" | "minor">("all");
  const [incLimit, setIncLimit] = useState(20);

  const loadSimHistory = () => {
    fetch("/api/simulator-history?limit=60").then(async (r) => r.json()).then((data) => {
      setSimDbConnected(data.connected !== false);
      setSimHistory(data.items ?? []);
    }).catch(() => setSimDbConnected(false));
  };
  useEffect(() => { loadSimHistory(); }, []);
  useEffect(() => {
    // The simulator opens in its own window (window.opener links back here) and
    // reports progress via postMessage — live ticks while it runs, the finished
    // summary, then a confirmation once the user presses "Save to history" there.
    function onMessage(e: MessageEvent) {
      const data = e.data;
      if (!data || data.source !== "citysim") return;
      if (data.type === "start" || data.type === "reset") { setSimLive(null); setSimFinished(null); setSimCurve([]); }
      if (data.type === "tick") { setSimLive(data as SimLiveState); setSimCurve((c) => [...c, data.severity].slice(-120)); }
      if (data.type === "finish") { setSimLive(data as SimLiveState); setSimFinished(data as SimFinishedRun); setSimCurve((c) => [...c, data.severity].slice(-120)); }
      if (data.type === "saved") { setToast(`Saved "${data.scenarioTitle}" to simulation history`); loadSimHistory(); }
      if (data.type === "saveFailed") setToast("Could not reach the database — run was not saved");
    }
    window.addEventListener("message", onMessage);
    // The simulator tab broadcasts on this channel, so updates arrive even when it was
    // opened by a plain link (which has no window.opener back to the dashboard).
    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel("citysim");
      channel.onmessage = onMessage;
    }
    return () => { window.removeEventListener("message", onMessage); channel?.close(); };
  }, []);

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
      }
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

  /** Compact, citywide snapshot handed to Gemini for the Athena and Oracle advisors. */
  // Real stored incidents when there are enough to analyse; otherwise a generated record.
  const history = useMemo(() => incidents.length >= 30 ? historyFromIncidents(incidents, allComponents) : buildHistory(allComponents), [incidents, allComponents]);
  const historySummary = useMemo(() => summarizeHistory(history), [history]);
  const districtHistory = useMemo(() => district ? summarizeHistory(history.filter((i) => i.district === district)) : null, [history, district]);
  const focusAssets = district ? allComponents.filter((c) => c.district === district) : allComponents;
  const focusIncidents = district ? incidents.filter((i) => i.estimatedImpact.affectedDistricts.includes(district) || focusAssets.some((c) => c.id === i.componentId)) : incidents;

  const quickData: QuickData = district
    ? { components: focusAssets, dependencies: dependencies.filter((d) => focusAssets.some((c) => c.id === d.sourceId || c.id === d.targetId)), incidents: focusIncidents, history: districtHistory ?? historySummary, log: history.filter((i) => i.district === district), districts: districts.filter((d) => d.name === district) }
    : { components: allComponents, dependencies, incidents, history: historySummary, log: history, districts };
  const athenaPrompts = useMemo(() => buildAthenaPrompts(quickData), [JSON.stringify(quickData.components.map((c) => c.status)), quickData.incidents.length, district, history]); // eslint-disable-line react-hooks/exhaustive-deps
  const oraclePrompts = useMemo(() => buildOraclePrompts(quickData), [JSON.stringify(quickData.components.map((c) => c.status)), quickData.incidents.length, district, history]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Compact snapshot handed to Gemini. With a district selected it carries a "focus" block for that district. */
  function buildAdvisorContext() {
    const byId = new Map(allComponents.map((c) => [c.id, c]));
    const count = (list: InfrastructureComponent[], st: string) => list.filter((c) => c.status === st).length;
    const districtsView = districts.map((d) => {
      const list = allComponents.filter((c) => c.district === d.name);
      return { district: d.name, population: d.population, assets: list.length, offline: count(list, "offline"), degraded: count(list, "degraded"), onBackup: count(list, "backup") };
    });
    const ids = new Set(focusAssets.map((c) => c.id));
    const depsWithBackup = dependencies.filter((d) => d.hasBackup).length;
    // Open incidents first — they are what the advisors should talk about — then the most recent.
    const incView = (list: Incident[]) => [...list].sort((a, b) => Number(b.incidentStatus !== "resolved") - Number(a.incidentStatus !== "resolved") || b.startTime.localeCompare(a.startTime)).slice(0, 8).map((i) => ({
      type: i.incidentType, severity: i.severity, status: i.incidentStatus, startedAt: i.startTime,
      origin: byId.get(i.componentId)?.name ?? i.componentId,
      failedAtSource: i.estimatedImpact.directlyFailedCount, downstreamAffected: i.estimatedImpact.downstreamAffectedCount,
      populationExposedPct: Math.round(i.estimatedImpact.populationExposedPct), recoveryMinutes: i.estimatedImpact.estimatedRecoveryMinutes,
      districts: i.estimatedImpact.affectedDistricts, criticalFacilities: i.estimatedImpact.criticalFacilitiesAffected,
    }));
    const assetView = (c: InfrastructureComponent) => ({ name: c.name, category: c.category, district: c.district, status: c.status, criticality: c.criticality, loadPct: Math.round((c.currentLoad / c.maxCapacity) * 100), backupLeft: c.backupCapacityRemaining });
    const base = {
      city: "Ithaca, age of Odysseus",
      assets: { total: allComponents.length, operational: count(allComponents, "operational"), onBackup: count(allComponents, "backup"), degraded: count(allComponents, "degraded"), offline: count(allComponents, "offline") },
      districts: districtsView,
      backupCoveragePct: dependencies.length ? Math.round((depsWithBackup / dependencies.length) * 100) : 0,
    };
    if (district) {
      const info = districts.find((d) => d.name === district);
      const localDeps = dependencies.filter((d) => ids.has(d.sourceId) || ids.has(d.targetId));
      const crossIn = dependencies.filter((d) => ids.has(d.targetId) && !ids.has(d.sourceId)).map((d) => byId.get(d.sourceId)).filter((c): c is InfrastructureComponent => !!c);
      const crossOut = dependencies.filter((d) => ids.has(d.sourceId) && !ids.has(d.targetId)).map((d) => byId.get(d.targetId)).filter((c): c is InfrastructureComponent => !!c);
      return JSON.stringify({
        ...base,
        focus: {
          district, population: info?.population, character: info?.character,
          assets: { total: focusAssets.length, operational: count(focusAssets, "operational"), onBackup: count(focusAssets, "backup"), degraded: count(focusAssets, "degraded"), offline: count(focusAssets, "offline") },
          healthPct: focusAssets.length ? Math.round((count(focusAssets, "operational") / focusAssets.length) * 100) : 0,
          backupCoveragePct: localDeps.length ? Math.round((localDeps.filter((d) => d.hasBackup).length / localDeps.length) * 100) : 0,
          byCategory: Object.fromEntries(Object.keys(CATEGORY).map((k) => { const l = focusAssets.filter((c) => c.category === k); return [k, { total: l.length, offline: count(l, "offline"), degraded: count(l, "degraded") }]; })),
          allAssets: focusAssets.map(assetView),
          dependsOnOtherDistricts: [...new Map(crossIn.map((c) => [c.id, { name: c.name, district: c.district, status: c.status }])).values()].slice(0, 8),
          otherDistrictsDependOnUs: [...new Map(crossOut.map((c) => [c.id, { name: c.name, district: c.district, status: c.status }])).values()].slice(0, 8),
          incidents: incView(focusIncidents),
          history: districtHistory,
        },
        cityHistoryForComparison: { totalIncidents: historySummary.totalIncidents, trendPct: historySummary.trendPct, districtBurden: historySummary.districtBurden },
        recentSimulations: simHistory.slice(0, 3).map((h) => ({ scenario: h.scenarioTitle, outcome: h.outcome, peakSeverity: Math.round(h.maxSeverity) })),
      });
    }
    return JSON.stringify({
      ...base,
      byCategory: Object.fromEntries(Object.keys(CATEGORY).map((k) => { const l = allComponents.filter((c) => c.category === k); return [k, { total: l.length, offline: count(l, "offline"), degraded: count(l, "degraded") }]; })),
      troubledAssets: allComponents.filter((c) => c.status !== "operational").sort((a, b) => b.criticality - a.criticality).slice(0, 10).map(assetView),
      mostCriticalAssets: [...allComponents].sort((a, b) => b.criticality - a.criticality).slice(0, 6).map((c) => ({ name: c.name, status: c.status, district: c.district })),
      incidents: incView(incidents),
      history: historySummary,
      recentSimulations: simHistory.slice(0, 3).map((h) => ({ scenario: h.scenarioTitle, outcome: h.outcome, peakSeverity: Math.round(h.maxSeverity), durationMinutes: Math.round(h.durationSimMinutes) })),
    });
  }
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

  const title = active === "Overview" ? "Welcome back, Operator" : active === "Simulator" ? "3D Crisis Simulator" : `${active} · ${district ?? "All districts"}`;
  function handleNavClick(label: string) {
    setActive(label);
    if (label === "Advisors") setAdvisor(null);
    if (label === "Simulator") window.open("/simulator/index.html", "_blank");
  }
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
      "Oracle of Ithaca operations report", `Generated,${esc(new Date().toISOString())}`, `Scope,${esc(district ?? "All districts")}`, "",
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

  const previewDemoAlert = () => {
    const announcement = createAnnouncement({
      source: "CITYPULSE",
      scope: "citywide",
      city: "Ithaca",
      generatedAt: new Date().toISOString(),
      summary: {
        totalPopulation: districts.reduce((total, item) => total + item.population, 0),
        totalInfrastructureAssets: components.length,
        offlineAssets: components.filter((component) => component.status === "offline").length,
        degradedAssets: components.filter((component) => component.status === "degraded").length,
        activeIncidentCount: 1,
      },
      incidents: [{ ...DEMO_ALERT_INCIDENT, startedAt: new Date().toISOString() }],
    });
    setDemoAlertPreview(`DEMO PREVIEW — No real alert has been sent. ${announcement}`);
  };

  // Send a citywide emergency alert, regardless of the currently selected district.
  const handleSendAlert = async () => {
    if (sendingAlert) return;

    const citywideActiveIncidents = incidents.filter(
      (incident) => incident.incidentStatus !== "resolved"
    );

    if (citywideActiveIncidents.length === 0) {
      previewDemoAlert();
      return;
    }

    const affectedComponentIds = new Set(
      citywideActiveIncidents.map((incident) => incident.componentId)
    );

    const affectedComponents = components
      .filter((component) => affectedComponentIds.has(component.id))
      .map((component) => ({
        id: component.id,
        name: component.name,
        category: component.category,
        district: component.district,
        status: component.status,
        criticality: component.criticality,
      }));

    const citywideSummary = {
      totalPopulation: districts.reduce(
        (total, item) => total + item.population,
        0
      ),
      totalInfrastructureAssets: components.length,
      offlineAssets: components.filter(
        (component) => component.status === "offline"
      ).length,
      degradedAssets: components.filter(
        (component) => component.status === "degraded"
      ).length,
      activeIncidentCount: citywideActiveIncidents.length,
    };

    const payload = {
      source: "CITYPULSE" as const,
      scope: "citywide" as const,
      city: "Ithaca",
      generatedAt: new Date().toISOString(),
      summary: citywideSummary,
      incidents: citywideActiveIncidents.map((incident) => {
        const component = components.find(
          (item) => item.id === incident.componentId
        );

        return {
          incidentId: incident.incidentId,
          type: incident.incidentType,
          severity: incident.severity,
          status: incident.incidentStatus,
          componentId: incident.componentId,
          componentName: component?.name,
          district: component?.district,
          startedAt: incident.startTime,
          affectedDistricts: incident.estimatedImpact.affectedDistricts,
          downstreamAffectedCount:
            incident.estimatedImpact.downstreamAffectedCount,
        };
      }),
      affectedInfrastructure: affectedComponents,
    };

    try {
      setSendingAlert(true);
      setToast("Generating emergency announcement...");

      const response = await fetch("/api/alerts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Failed to process emergency alert."
        );
      }

      const delivery = result.delivery;

      if (!delivery) {
        throw new Error("No delivery report was returned.");
      }

      if (delivery.failedRecipients > 0) {
        setToast(
          `Alert partially delivered: ${delivery.textDelivered}/${delivery.totalRecipients} texts, ${delivery.audioDelivered}/${delivery.totalRecipients} audio messages.`
        );
      } else {
        setToast(
          `Emergency alert delivered: ${delivery.textDelivered} texts and ${delivery.audioDelivered} audio messages.`
        );
      }

      console.log("CITYPULSE alert delivery report:", result);
    } catch (error) {
      console.error("CITYPULSE alert error:", error);

      setToast(
        error instanceof Error
          ? error.message
          : "Failed to send emergency alert."
      );
    } finally {
      setSendingAlert(false);
    }
  };

  return (
    <main className="relative isolate min-h-screen font-paint text-[#f3ead6] lg:pl-[248px] print:pl-0 print:bg-white print:text-black">
      <div aria-hidden className="painting print:hidden" />
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[248px] print:!hidden flex-col border-r border-[#c9a24b]/25 bg-[#170b09]/75 backdrop-blur-xl text-white lg:flex">
        <div className="flex h-[76px] items-center gap-3 border-b border-white/10 px-6">
          <img src="/art/helmet.png" alt="" aria-hidden className="h-11 w-auto drop-shadow-[0_2px_6px_rgba(0,0,0,.6)]" />
          <div><p className="font-heading text-lg tracking-[.14em]">ITHACA</p><p className="text-[10px] uppercase tracking-[.22em] text-white/35">City operations</p></div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-6">
          <p className="mb-3 px-3 text-[10px] uppercase tracking-[.24em] text-white/25">Workspace</p>
          {NAV.map(([label, glyph]) => <button key={label} onClick={() => handleNavClick(label)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-1.5 text-left text-sm transition ${active === label ? "bg-[#5a2616] text-white" : "text-white/45 hover:bg-white/[.05] hover:text-white/80"}`}><span className="grid h-14 w-9 place-items-center"><Torch lit={active === label} className="h-14 w-7" /></span><span>{label}</span>{label === "Incidents" && prefs.alerts && activeIncidents.length > 0 && <span className="ml-auto rounded-full bg-red-400 px-2 py-0.5 text-[10px] text-white">{activeIncidents.length}</span>}</button>)}
        </nav>
        <div className="m-4 rounded-2xl border border-white/10 bg-white/[.04] p-4">
          <p className="text-[10px] uppercase tracking-[.2em] text-[#e4aa56]">Virtual city</p>
          <p className="mt-2 text-xs leading-5 text-white/55">Explore Ithaca in the age of Odysseus.</p>
          <div className="pt-6"><Link href="/city" className="scroll-btn font-heading !mx-3 block !px-2 text-center text-[12px] font-bold uppercase tracking-[.12em]">Open live 3D city ↗</Link></div>
        </div>
        <div className="flex items-center gap-3 border-t border-white/10 px-5 py-4"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#6a2c1a] text-xs">OP</span><div><p className="text-xs">City Operator</p><p className="text-[11px] text-white/30">Command access</p></div><span className="ml-auto text-white/25">•••</span></div>
      </aside>

      <header className="sticky top-0 z-40 print:hidden flex min-h-[76px] items-center justify-between gap-4 border-b border-[#c9a24b]/25 bg-[#1a0c0a]/55 backdrop-blur-xl px-4 backdrop-blur-xl sm:px-7">
        <div className="flex items-center gap-2.5 lg:hidden"><img src="/art/helmet.png" alt="" aria-hidden className="h-9 w-auto" /><div><p className="font-paint text-lg tracking-[.12em]">ITHACA</p><p className="text-[10px] uppercase tracking-widest text-[#d8ccb0]/70">Operations</p></div></div>
        <div className="hidden sm:block"><p className="text-lg font-semibold">{active}</p><p className="mt-0.5 text-[12px] text-[#d8ccb0]/70">{active === "Overview" ? "Monitor city systems and operational readiness" : active === "Infrastructure" ? "Every monitored asset across the city" : active === "Incidents" ? "Active and historical incidents" : active === "Simulator" ? "Live insights from the 3D crisis simulator" : "Athena and Oracle intelligence layer"}</p></div>
        <div className="flex items-center gap-2 sm:gap-3">
          <SearchBox className="hidden h-10 w-64 md:flex" query={query} setQuery={setQuery} results={results} open={searchOpen} setOpen={setSearchOpen} />
          <Link href="/city" className="scroll-btn text-xs uppercase tracking-wider">3D City ↗</Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] p-4 sm:p-7">
        <SearchBox className="mb-3 flex h-11 md:hidden print:hidden" query={query} setQuery={setQuery} results={results} open={searchOpen} setOpen={setSearchOpen} />
        <nav className="-mx-1 mb-4 flex gap-1 overflow-x-auto pb-1 lg:hidden print:hidden">
          {NAV.map(([label]) => <button key={label} onClick={() => handleNavClick(label)} className={`shrink-0 rounded-full px-4 py-2 text-[13px] ${active === label ? "bg-[#4a1f14] text-white" : "bg-[#1f100d]/55 backdrop-blur-[3px] text-[#d8ccb0]/70 border border-[#c9a24b]/25"}`}>{label}</button>)}
        </nav>

        <section className={`${hideHero ? "hidden" : ""} relative z-30 flex min-h-[300px] flex-col justify-end gap-4 rounded-3xl p-6 sm:flex-row sm:items-end sm:justify-between sm:p-10 sm:min-h-[380px]`}>
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl border border-[#c9a24b]/30 bg-[#1c0e0b] shadow-[0_18px_50px_rgba(0,0,0,.5)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ART[active].src} alt="" className={`absolute left-0 top-0 h-full w-full max-w-none object-cover ${ART[active].full ? "" : "sm:w-[112%]"}`} style={{ objectPosition: ART[active].pos }} />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(20,8,6,.85)_0%,rgba(20,8,6,.5)_38%,transparent_62%),linear-gradient(0deg,rgba(20,8,6,.6)_0%,transparent_45%)]" />
          </div>
          <div className="relative"><p className="text-[12px] font-semibold uppercase tracking-[.2em] text-[#e4aa56]">{active === "Overview" ? "System overview" : active}</p><h1 className={`font-heading mt-2 max-w-[600px] text-3xl font-normal leading-[1.15] text-white sm:text-[2.75rem]`}>{title}</h1><div className="mt-4 h-px w-24 bg-gradient-to-r from-[#e4aa56] to-transparent" /><p className="mt-3 max-w-[460px] text-sm text-[#efe5cc]/85">Showing {district ?? "all of Ithaca"}: {population.toLocaleString("en-US")} residents, {scoped.length} monitored assets.</p></div>
          <div className="relative flex flex-wrap gap-2 print:hidden">
            <div className="relative" ref={menuRef}>
              <button onClick={() => setMenu((v) => !v)} className="scroll-btn text-sm">Export report ▾</button>
              {menu && <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-[#c9a24b]/40 bg-[#1c0e0b] text-xs text-white shadow-2xl">
                <button onClick={exportCsv} className="block w-full px-4 py-3 text-left hover:bg-white/10">Download CSV<span className="block text-[11px] text-[#d8ccb0]/70">Summary, assets and incidents</span></button>
                <button onClick={printReport} className="block w-full border-t border-[#c9a24b]/25 px-4 py-3 text-left hover:bg-white/10">Print / Save as PDF<span className="block text-[11px] text-[#d8ccb0]/70">Current view</span></button>
              </div>}
            </div>

            <button
              type="button"
              onClick={handleSendAlert}
              disabled={sendingAlert}
              className="scroll-btn text-sm disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="mr-2 inline-block h-2 w-2 rounded-full bg-red-400 animate-pulse" />
              {sendingAlert ? "Sending..." : "Send Alert"}
            </button>

            <Link href="/city" className="scroll-btn text-sm">View virtual city</Link>
          </div>
        </section>

        <div className={`${hideHero ? "hidden" : ""} my-6 flex flex-wrap items-center gap-2 print:hidden`}>
          <span className="text-[11px] uppercase tracking-wider text-[#d8ccb0]/70">District</span>
          {[null, ...districts.map((d) => d.name)].map((name) => <button key={name ?? "all"} onClick={() => setDistrict(name)} className={`rounded-full border px-3.5 py-1.5 text-[13px] transition ${district === name ? "border-[#4a1f14] bg-[#4a1f14] text-white" : "border-[#c9a24b]/25 bg-[#1f100d]/55 backdrop-blur-[3px] text-[#d8ccb0]/70 hover:bg-white/10"}`}>{name ?? "All districts"}</button>)}
        </div>

        {active === "Overview" && <CityDemographics district={district} onSelect={setDistrict} components={allComponents} incidents={incidents} />}

        {active === "Overview" && <>
        <section className="mt-8 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Kpi label="Infrastructure assets" value={scoped.length || "—"} change={district ?? "6 city systems"} glyph="⌘" color="#287c95" onClick={() => setActive("Infrastructure")} />
          <Kpi label="Operational health" value={`${health}%`} change={`${statusCounts.operational} assets nominal`} glyph="✓" color="#32966f" />
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

        {active === "Infrastructure" && <Card title="Infrastructure assets" subtitle={`${searched.length} of ${allComponents.length} assets${q ? ` matching “${tableQuery}”` : ""}`} action={q ? "Clear search" : undefined} onAction={() => setTableQuery("")}>
          <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead><tr className="border-b border-[#c9a24b]/25 text-[11px] uppercase tracking-wider text-[#d8ccb0]/70"><th className="py-2">ID</th><th>Name</th><th>Category</th><th>District</th><th>Load</th><th>Crit.</th><th>Status</th></tr></thead><tbody>
            {searched.map((c) => <tr key={c.id} className="border-b border-[#c9a24b]/25"><td className={`${prefs.compact ? "py-1.5" : "py-3"} text-[#d8ccb0]/70`}>{c.id}</td><td className="font-semibold">{c.name}</td><td><span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY[c.category].color }} />{CATEGORY[c.category].label}</td><td>{c.district}</td><td><div className="flex items-center gap-2"><div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-[#287c95]" style={{ width: `${Math.min(c.currentLoad / c.maxCapacity, 1) * 100}%` }} /></div>{Math.round(c.currentLoad / c.maxCapacity * 100)}%</div></td><td>{"●".repeat(c.criticality)}</td><td><span className={`rounded-full px-2 py-1 text-[10px] uppercase ${c.status === "operational" ? "bg-emerald-400/15 text-emerald-300" : c.status === "offline" ? "bg-red-400/15 text-red-300" : "bg-amber-400/15 text-amber-300"}`}>{c.status}</span></td></tr>)}
            {!searched.length && <tr><td colSpan={7} className="py-10 text-center text-[#d8ccb0]/70">{allComponents.length ? "No assets match." : "Loading assets…"}</td></tr>}
          </tbody></table></div>
        </Card>}

        {active === "Incidents" && (() => {
          const rows = scopedIncidents.filter((i) => (incStatus === "all" || (incStatus === "open" ? i.incidentStatus !== "resolved" : i.incidentStatus === "resolved")) && (incSeverity === "all" || i.severity === incSeverity));
          const chip = (on: boolean) => `rounded-full border px-3 py-1 text-[11px] uppercase tracking-wider transition ${on ? "border-[#e4aa56]/70 bg-[#4a1f14] text-white" : "border-[#c9a24b]/25 bg-white/[.03] text-[#d8ccb0]/70 hover:bg-white/10"}`;
          return (
            <>
          <SimulatedIncidentGenerator onGenerated={(created) => {
            setIncidents((current) => [...created, ...current].sort((a, b) => b.startTime.localeCompare(a.startTime)));
            setToast(`${created.length} simulated historical incidents added`);
          }} />
            <Card title="Incidents" subtitle={`${scopedIncidents.length} recorded · ${activeIncidents.length} open · click one for its overview`}>
              <div className="mb-4 rounded-2xl border border-dashed border-[#e4aa56]/40 bg-[#e4aa56]/[.06] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2"><p className="text-xs font-semibold text-white">Always-available demo incident</p><span className="rounded-full bg-[#e4aa56]/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#e8c783]">Simulated</span></div>
                    <p className="mt-1 text-[11px] text-[#d8ccb0]/70">Water main break · WA-01 Poseidon Waterworks · Harbor of Phorcys · Moderate · 3 downstream assets</p>
                    <p className="mt-1 text-[10px] text-[#d8ccb0]/50">Use it to preview the announcement when there are no live incidents. Preview mode never sends messages.</p>
                  </div>
                  <button type="button" onClick={previewDemoAlert} className="scroll-btn shrink-0 text-xs">Preview alert</button>
                </div>
              </div>
              <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
                {(["all", "open", "resolved"] as const).map((v) => <button key={v} onClick={() => { setIncStatus(v); setIncLimit(20); }} className={chip(incStatus === v)}>{v}</button>)}
                <span className="mx-1 h-4 w-px bg-white/15" />
                {(["all", "critical", "major", "moderate", "minor"] as const).map((v) => <button key={v} onClick={() => { setIncSeverity(v); setIncLimit(20); }} className={chip(incSeverity === v)}>{v}</button>)}
                <span className="ml-auto text-[11px] text-[#d8ccb0]/60">{rows.length} shown</span>
              </div>
              <IncidentList incidents={rows.slice(0, incLimit)} onSelect={(id) => { setSelectedIncidentId(id); setSelectedRunId(null); setActive("Simulator"); }} />
              {rows.length > incLimit && <div className="mt-5 text-center print:hidden"><button onClick={() => setIncLimit((n) => n + 30)} className="scroll-btn text-xs uppercase tracking-wider">Show more · {rows.length - incLimit} left</button></div>}
              {rows.length === 0 && incidents.length > 0 && <p className="py-8 text-center text-xs text-[#d8ccb0]/70">No incidents match these filters.</p>}
            </Card>
            </>
          );
        })()}

        {active === "Advisors" && (
          <>
            {chatOpen && <button onClick={() => setAdvisor(null)} className="mb-3 text-xs uppercase tracking-wider text-[#e4aa56] hover:text-white">← Back to advisors</button>}
            {!chatOpen && (
              <section className="mt-5 grid items-start gap-5 md:grid-cols-2">
                <Card title="Athena" subtitle="Incident intelligence">
                  <p className="text-xs leading-6 text-[#d8ccb0]/70">Analyses live failures and recommends response steps, grounded in simulation telemetry. {activeIncidents.length ? `${activeIncidents.length} active incident(s) are ready for review.` : "No active incidents right now."}</p>
                  <button onClick={() => setAdvisor("athena")} className="mt-4 inline-block rounded-xl bg-[#4aa9bd] px-4 py-2.5 text-xs font-semibold text-[#071b23]">Chat with Athena ✦</button>
                </Card>
                <Card title="Oracle" subtitle="Strategic foresight">
                  <p className="text-xs leading-6 text-[#d8ccb0]/70">Reviews resilience and backup endurance to forecast cascading risk. Current backup coverage is {coverage}%. {activeIncidents.length ? `${activeIncidents.length} active incident(s) are ready for review.` : "No active incidents are ready for review."}</p>
                  <button onClick={() => setAdvisor("oracle")} className="mt-4 inline-block rounded-xl bg-[#947ac2] px-4 py-2.5 text-xs font-semibold text-white">Chat with Oracle Ω</button>
                </Card>
              </section>
            )}
            <div className={chatOpen ? "h-[calc(100dvh-150px)] min-h-[480px]" : "hidden"}>
              <div className={advisor === "athena" ? "h-full" : "hidden"}><ChatbotWidget agent="athena" getContext={buildAdvisorContext} quickPrompts={athenaPrompts} /></div>
              <div className={advisor === "oracle" ? "h-full" : "hidden"}><ChatbotWidget agent="oracle" getContext={buildAdvisorContext} quickPrompts={oraclePrompts} /></div>
            </div>
          </>
        )}

        {active === "Simulator" && (() => {
          const selected = incidents.find((i) => i.incidentId === selectedIncidentId) ?? incidents[0] ?? null;
          const selectedRun = selectedRunId ? simHistory.find((h, i) => (h.runId ?? String(i)) === selectedRunId) ?? null : null;
          const scenarios = [
            { id: "fire", title: "Palace fire", note: "Contain a fast-moving fire", color: "#fb8066", mark: "♨" },
            { id: "rain", title: "Great rains", note: "Protect Ithaca from flooding", color: "#57c5dc", mark: "≈" },
            { id: "attack", title: "Raiders", note: "Defend the city from the sea", color: "#e5b45d", mark: "⚔" },
            { id: "quake", title: "Earthquake", note: "Respond to a citywide quake", color: "#b39ae2", mark: "⌁" },
          ];
          const coveredScenarios = new Set(simHistory.map((run) => run.scenario)).size;
          const containedRuns = simHistory.filter((run) => run.outcome === "good").length;
          const containmentRate = simHistory.length ? Math.round((containedRuns / simHistory.length) * 100) : null;
          const openSimulator = () => window.open("/simulator/index.html", "_blank", "noopener,noreferrer");
          return (
          <section className="mt-5 space-y-5">
            <div className="relative overflow-hidden rounded-3xl border border-[#c9a24b]/30 bg-[radial-gradient(ellipse_at_85%_20%,rgba(77,145,158,.24),transparent_42%),linear-gradient(120deg,rgba(54,27,21,.96),rgba(28,17,16,.92))] p-6 shadow-[0_18px_48px_rgba(0,0,0,.35)] sm:p-8">
              <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full border border-[#e4aa56]/10" />
              <div className="absolute -right-2 -top-10 h-44 w-44 rounded-full border border-[#e4aa56]/10" />
              <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
                <div className="max-w-2xl">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#e4aa56]/25 bg-black/20 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.18em] text-[#e8c783]">
                    <span className={`h-2 w-2 rounded-full ${simLive && !simLive.done ? "animate-pulse bg-emerald-400" : "bg-[#e4aa56]"}`} />
                    {simLive && !simLive.done ? "Simulation live" : "Resilience command center"}
                  </div>
                  <h2 className="font-heading text-3xl font-normal tracking-tight text-white sm:text-4xl">Test the response before the crisis.</h2>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-[#eadfc8]/75">Run a city-scale scenario, follow its impact as it unfolds, and learn which response keeps Ithaca standing.</p>
                </div>
                <button onClick={openSimulator} className="shrink-0 rounded-xl bg-[#e4aa56] px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#25130d] shadow-lg transition hover:bg-[#f0bd70]">Open 3D simulator <span aria-hidden="true">↗</span></button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <SimMetric label="Monitored assets" value={allComponents.length || "—"} detail={`${health}% operational readiness`} mark="◇" color="#63c8a2" />
              <SimMetric label="Active incidents" value={activeIncidents.length} detail={`${incidents.length} total recorded`} mark="!" color={activeIncidents.length ? "#fb8066" : "#63c8a2"} />
              <SimMetric label="Scenarios covered" value={`${coveredScenarios}/4`} detail={simHistory.length ? `${simHistory.length} saved simulation${simHistory.length === 1 ? "" : "s"}` : "Save a run to build coverage"} mark="⌁" color="#70bfd1" />
              <SimMetric label="Containment rate" value={containmentRate === null ? "—" : `${containmentRate}%`} detail={simHistory.length ? `${containedRuns} of ${simHistory.length} runs contained` : "Based on saved runs"} mark="✓" color="#e4aa56" />
            </div>

            <div className="grid items-stretch gap-5 xl:grid-cols-[1.35fr_.85fr]">
              <Card paper title="Live insights" subtitle={simLive ? `${simLive.scenarioTitle} · ${simLive.phase}` : "Streaming directly from the 3D crisis simulator"}>
                {simLive ? <div>
                  <div className="grid gap-4 sm:grid-cols-[.7fr_1.3fr]">
                    <div className="rounded-2xl border border-white/[.07] bg-black/20 p-4">
                      <p className="text-[10px] uppercase tracking-[.16em] text-[#d8ccb0]/60">Current severity</p>
                      <div className="mt-2 flex items-end gap-2"><p className="text-5xl font-semibold tracking-tight">{Math.round(simLive.severity)}</p><span className="pb-1 text-xs text-[#d8ccb0]/60">/ 100</span></div>
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full transition-all ${simLive.severity < 15 ? "bg-emerald-400" : simLive.severity < 35 ? "bg-amber-400" : simLive.severity < 60 ? "bg-orange-400" : "bg-red-400"}`} style={{ width: `${Math.max(0, Math.min(100, simLive.severity))}%` }} /></div>
                      <p className="mt-3 text-[11px] text-[#d8ccb0]/70">{simLive.clock} <span className="mx-1">·</span> {simLive.playing ? "Scenario in progress" : simLive.done ? "Scenario complete" : "Simulation paused"}</p>
                    </div>
                    <div className="rounded-2xl border border-white/[.07] bg-black/20 p-4"><div className="flex items-center justify-between"><p className="text-[10px] uppercase tracking-[.16em] text-[#d8ccb0]/60">Severity trend</p><span className="text-[10px] text-[#d8ccb0]/50">Live telemetry</span></div>{simCurve.length > 1 ? <SeverityChart values={simCurve} /> : <div className="mt-3 grid h-16 place-items-center rounded-lg bg-black/20 text-[11px] text-[#d8ccb0]/55">Collecting first telemetry points…</div>}</div>
                  </div>
                  {simLive.kpis.length > 0 && <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">{simLive.kpis.map((k) => <div key={k.label} className="rounded-xl border border-white/[.06] bg-white/[.035] p-3"><p className="text-xl font-semibold">{k.value}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-[#d8ccb0]/60">{k.label}</p></div>)}</div>}
                  {simFinished && <p className="mt-4 rounded-xl border border-[#e4aa56]/20 bg-[#e4aa56]/[.07] p-3 text-xs leading-5 text-[#eadfc8]/80">{simFinished.outcomeText} <span className="text-[#e8c783]">Save to history in the simulator to keep this run.</span></p>}
                </div> : <div className="grid min-h-48 flex-1 place-items-center rounded-2xl border border-dashed border-[#c9a24b]/25 bg-black/10 px-6 py-8 text-center"><div><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-[#e4aa56]/20 bg-[#e4aa56]/[.08] text-xl text-[#e4aa56]">⌁</span><p className="mt-4 text-sm font-semibold text-white">Your command view is ready</p><p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-[#d8ccb0]/65">Start any scenario in the 3D simulator. Severity, phase, and city impact will appear here in real time.</p><button onClick={openSimulator} className="mt-4 text-sm font-bold text-[#6b0f1a] underline underline-offset-4 hover:text-black">Launch a scenario ↗</button></div></div>}
              </Card>

              <Card paper title="Scenario library" subtitle="Four ways to stress-test Ithaca">
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                  {scenarios.map((scenario) => {
                    const runs = simHistory.filter((run) => run.scenario === scenario.id).length;
                    return <button key={scenario.id} onClick={openSimulator} className="group flex min-h-[98px] items-center gap-3 rounded-2xl border border-white/[.07] bg-white/[.035] p-3 text-left transition hover:border-[#e4aa56]/40 hover:bg-white/[.07]">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-lg" style={{ color: scenario.color, backgroundColor: `${scenario.color}16` }}>{scenario.mark}</span>
                      <span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-white">{scenario.title}</span><span className="mt-1 block text-[10px] leading-4 text-[#d8ccb0]/60">{scenario.note}</span><span className="mt-1.5 block text-[9px] uppercase tracking-wider text-[#d8ccb0]/45">{runs} saved {runs === 1 ? "run" : "runs"}</span></span>
                      <span className="text-[#d8ccb0]/35 transition group-hover:translate-x-0.5 group-hover:text-[#e8c783]">↗</span>
                    </button>;
                  })}
                </div>
              </Card>
            </div>

            <div className="grid items-start gap-5 xl:grid-cols-[.9fr_1.1fr]">
              <div className="space-y-5">
              <Card paper title="Simulation history" subtitle={simDbConnected === false ? "Database unavailable" : `${simHistory.length} saved run${simHistory.length === 1 ? "" : "s"}`} action="Refresh" onAction={loadSimHistory}>
                <div className="flex max-h-[410px] flex-col gap-2 overflow-y-auto pr-1">
                  {simHistory.length ? simHistory.map((h, i) => (
                    <button key={h.runId ?? i} onClick={() => { setSelectedRunId(h.runId ?? String(i)); setSelectedIncidentId(null); }} className={`w-full rounded-xl p-3 text-left transition ${selectedRunId === (h.runId ?? String(i)) ? "border border-[#6b0f1a] bg-[#6b0f1a]/20" : "border border-transparent bg-white/[.04] hover:bg-white/[.09]"}`}>
                      <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold">{h.scenarioTitle}</span><span className="shrink-0 text-[10px] text-[#d8ccb0]/60">{h.endedAt ? new Date(h.endedAt).toLocaleDateString() : ""}</span></div>
                      <p className="mt-1 text-[11px] text-[#d8ccb0]/65">{h.options?.o1Label} · {h.options?.o2Label}</p>
                      <div className="mt-2 flex items-center justify-between gap-2"><span className={`text-[10px] ${h.outcome === "good" ? "text-emerald-300" : "text-amber-300"}`}>{h.outcome === "good" ? "Contained" : "Escalated"} · peak severity {Math.round(h.maxSeverity)}</span><span className="text-[10px] text-[#d8ccb0]/45">View run →</span></div>
                    </button>
                  )) : <p className="py-8 text-center text-xs leading-5 text-[#d8ccb0]/60">{simDbConnected === false ? "Could not reach the database." : "No saved runs yet. Complete a scenario and save it in the simulator to build your history."}</p>}
                </div>
              </Card>
              {!selectedRun && selected && <>
                {selected.incidentStatus !== "resolved" && <RecoveryWorkbench
                  key={selected.incidentId}
                  incident={selected}
                  origin={allComponents.find((component) => component.id === selected.componentId)}
                  onSaved={(result) => {
                    setIncidents((current) => current.map((item) => item.incidentId === selected.incidentId
                      ? { ...item, incidentStatus: result.incidentResolved ? "resolved" : "recovering" }
                      : item));
                    setComponents((current) => {
                      const statusById = new Map(result.statuses.map((status) => [status.componentId, status.status]));
                      return current.map((component) => ({ ...component, status: statusById.get(component.id) ?? component.status }));
                    });
                    setToast(result.incidentResolved ? "Restoration verified · incident resolved" : `Recovery progress saved · ${result.repair.repairStatus.replace(/_/g, " ")}`);
                  }}
                />}
                {selected.incidentStatus === "resolved" && <RecoveryWorkbench key={selected.incidentId} incident={selected} origin={allComponents.find((component) => component.id === selected.componentId)} onSaved={() => undefined} />}
              </>}
              </div>
              {selectedRun ? <RunOverview run={selectedRun} onClose={() => setSelectedRunId(null)} /> : selected ? <div className="space-y-5">
                <Card paper title="Incident response" subtitle="Select an incident to inspect its city impact">
                  <div className="flex max-h-[205px] flex-col gap-2 overflow-y-auto pr-1">
                    {incidents.length ? incidents.map((inc) => {
                      const on = selected?.incidentId === inc.incidentId;
                      return <button key={inc.incidentId} onClick={() => { setSelectedIncidentId(inc.incidentId); setSelectedRunId(null); }} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${on ? "border-[#6b0f1a] bg-[#6b0f1a]/20" : "border-[#c9a24b]/20 bg-white/[.03] hover:bg-white/[.08]"}`}>
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${inc.severity === "critical" ? "bg-red-400" : inc.severity === "major" ? "bg-orange-500" : "bg-amber-400"}`} />
                        <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold capitalize">{inc.incidentType.replace(/_/g, " ")}</span><span className="block truncate text-[10px] text-[#d8ccb0]/60">{inc.componentId} · {inc.incidentStatus}</span></span>
                        <span className="text-[9px] uppercase tracking-wider text-[#d8ccb0]/55">{inc.severity}</span>
                      </button>;
                    }) : <EmptyActivity />}
                  </div>
                </Card>
                <IncidentOverview incident={selected} components={allComponents} />
              </div> : <Card paper title="Incident response" subtitle="Live operational context"><EmptyActivity /></Card>}
            </div>
          </section>
          );
        })()}

      </div>
      {demoAlertPreview && <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4 print:hidden" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDemoAlertPreview(""); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="demo-alert-title" className="w-full max-w-2xl rounded-2xl border border-[#e4aa56]/40 bg-[#1c0e0b] p-6 text-white shadow-2xl">
          <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#e4aa56]">Simulated incident · no message sent</p><h2 id="demo-alert-title" className="font-heading mt-2 text-2xl">Demo alert preview</h2></div><button type="button" onClick={() => setDemoAlertPreview("")} aria-label="Close preview" className="rounded-lg px-3 py-1 text-lg text-white/60 hover:bg-white/10 hover:text-white">×</button></div>
          <p className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-[#efe5cc]/90">{demoAlertPreview}</p>
          <div className="mt-5 flex justify-end"><button type="button" onClick={() => setDemoAlertPreview("")} className="scroll-btn text-sm">Close preview</button></div>
        </section>
      </div>}
      {toast && <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-[#4a1f14] px-5 py-3 text-xs text-white shadow-xl print:hidden">{toast}</div>}
    </main>
  );
}

function SimMetric({ label, value, detail, mark, color }: { label: string; value: string | number; detail: string; mark: string; color: string }) { return <article className="rounded-2xl border border-[#c9a24b]/20 bg-[#1f100d]/55 p-4 shadow-[0_10px_34px_rgba(0,0,0,.24)] sm:p-5"><div className="flex items-start justify-between gap-2"><p className="text-[11px] font-medium text-[#d8ccb0]/65">{label}</p><span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-sm" style={{ color, backgroundColor: `${color}16` }}>{mark}</span></div><p className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{value}</p><p className="mt-1.5 truncate text-[10px] text-[#d8ccb0]/55">{detail}</p></article>; }
function Kpi({ label, value, change, glyph, color, onClick }: { label: string; value: string | number; change: string; glyph: string; color: string; onClick?: () => void }) { return <article onClick={onClick} className="cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md rounded-2xl border border-[#c9a24b]/25 bg-[#1f100d]/55 backdrop-blur-[3px] p-4 shadow-[0_10px_34px_rgba(0,0,0,.4)] sm:p-5"><div className="flex items-start justify-between"><p className="text-[12px] font-medium text-[#d8ccb0]/70">{label}</p><span className="grid h-9 w-9 place-items-center rounded-xl text-base" style={{ color, backgroundColor: `${color}12` }}>{glyph}</span></div><p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p><p className="mt-2 text-[11px] text-[#d8ccb0]/70">{change}</p></article>; }
function Card({ title, subtitle, action, onAction, paper, children }: { title: string; subtitle: string; action?: string; onAction?: () => void; /** Parchment paper with a crimson heading bar, like the advisor chat. */ paper?: boolean; children: React.ReactNode }) {
  return (
    <article className={`rounded-2xl border ${paper ? "paper flex flex-col overflow-hidden border-[#6b4220]/70" : "border-[#c9a24b]/25 bg-[#1f100d]/55 p-5 backdrop-blur-[3px] shadow-[0_10px_34px_rgba(0,0,0,.4)]"}`}>
      <header className={`flex items-start justify-between gap-3 ${paper ? "paper-head bg-[#6b0f1a] px-5 py-3.5" : "mb-5"}`}>
        <div><h2 className={`font-heading font-normal ${paper ? "text-lg tracking-[.12em] text-[#f6e6c4]" : "text-lg text-white"}`}>{title}</h2><p className={`mt-1 text-[12px] ${paper ? "text-[#f6e6c4]/65" : "text-[#d8ccb0]/70"}`}>{subtitle}</p></div>
        {action && <button onClick={onAction} className="rounded-lg border border-[#c9a24b]/25 px-3 py-2 text-[11px] text-[#d8ccb0]/70 hover:bg-white/10 print:hidden">{action}</button>}
      </header>
      {paper ? <div className="flex flex-1 flex-col p-5">{children}</div> : children}
    </article>
  );
}
function SeverityChart({ values }: { values: number[] }) {
  const w = 300, h = 64, max = 100;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - (Math.min(v, max) / max) * (h - 6) - 3}`).join(" ");
  const last = values[values.length - 1] ?? 0;
  const color = last < 15 ? "#4ade80" : last < 35 ? "#fbbf24" : last < 60 ? "#fb923c" : "#f87171";
  return <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="mt-3 h-16 w-full rounded-lg bg-black/20"><polyline points={points} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg>;
}
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
function IncidentList({ incidents, onSelect }: { incidents: Incident[]; onSelect?: (incidentId: string) => void }) {
  if (!incidents.length) return <EmptyActivity />;
  return <div className="divide-y divide-[#c9a24b]/20">{incidents.map((incident) => <div key={incident.incidentId} onClick={onSelect ? () => onSelect(incident.incidentId) : undefined} className={`flex items-start gap-3 py-3 ${onSelect ? "cursor-pointer rounded-lg px-2 transition hover:bg-white/[.05]" : ""}`}><span className={`mt-1 h-2 w-2 rounded-full ${incident.severity === "critical" ? "bg-red-400" : incident.severity === "major" ? "bg-orange-500" : "bg-amber-400"}`} /><div className="flex-1"><p className="text-xs font-semibold capitalize">{incident.incidentType.replace(/_/g, " ")} <span className="ml-1 rounded-full bg-white/[.07] px-2 py-0.5 text-[10px] font-normal uppercase text-[#d8ccb0]/70">{incident.incidentStatus}</span></p><p className="mt-1 text-[12px] text-[#d8ccb0]/70">{incident.componentId} · {incident.estimatedImpact.downstreamAffectedCount} downstream assets · {incident.estimatedImpact.affectedDistricts.join(", ") || "no districts"}</p></div><span className="text-[11px] text-[#d8ccb0]/70">{new Date(incident.startTime).toLocaleDateString()}</span></div>)}</div>;
}
function Donut({ counts, total }: { counts: { operational: number; backup: number; degraded: number; offline: number }; total: number }) { const op = total ? counts.operational / total * 100 : 100; const backup = total ? counts.backup / total * 100 : 0; const degraded = total ? counts.degraded / total * 100 : 0; return <div className="relative h-36 w-36 rounded-full" style={{ background: `conic-gradient(#3a9d76 0 ${op}%, #e8b75f ${op}% ${op + backup}%, #e78452 ${op + backup}% ${op + backup + degraded}%, #da5a5a ${op + backup + degraded}% 100%)` }}><div className="absolute inset-5 grid place-items-center rounded-full bg-[#1f100d]/55 backdrop-blur-[3px] text-center"><div><p className="text-2xl font-semibold">{total || "—"}</p><p className="text-[10px] uppercase tracking-wider text-[#d8ccb0]/70">Assets</p></div></div></div>; }
function Legend({ color, label, value }: { color: string; label: string; value: number }) { return <div className="flex items-center text-[12px]"><span className="mr-2 h-2 w-2 rounded-full" style={{ backgroundColor: color }} /><span className="text-[#d8ccb0]/70">{label}</span><span className="ml-auto font-semibold">{value}</span></div>; }
function Agent({ name, role, color, letter }: { name: string; role: string; color: string; letter: string }) { return <div className="mb-2 flex items-center gap-3 rounded-xl border border-[#c9a24b]/25 p-3"><span className="grid h-9 w-9 place-items-center rounded-full font-paint" style={{ color, backgroundColor: `${color}14` }}>{letter}</span><div><p className="text-xs font-semibold">{name}</p><p className="mt-0.5 text-[11px] text-[#d8ccb0]/70">{role}</p></div><span className="ml-auto h-2 w-2 rounded-full bg-emerald-400" /></div>; }
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

function IncidentOverview({ incident, components }: { incident: Incident; components: InfrastructureComponent[] }) {
  const origin = components.find((c) => c.id === incident.componentId);
  const impact = incident.estimatedImpact;
  const hrs = impact.estimatedRecoveryMinutes >= 60 ? `${Math.floor(impact.estimatedRecoveryMinutes / 60)}h ${impact.estimatedRecoveryMinutes % 60}m` : `${impact.estimatedRecoveryMinutes}m`;
  const sevColor = incident.severity === "critical" ? "text-red-300" : incident.severity === "major" ? "text-orange-300" : "text-amber-300";
  const stats: [string, string | number][] = [
    ["Failed at source", impact.directlyFailedCount],
    ["Downstream hit", impact.downstreamAffectedCount],
    ["Population exposed", `${Math.round(impact.populationExposedPct)}%`],
    ["Est. recovery", hrs],
  ];
  return (
    <Card paper title="Incident overview" subtitle={incident.incidentId}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold capitalize">{incident.incidentType.replace(/_/g, " ")}</p>
        <span className={`rounded-full bg-white/[.07] px-2.5 py-1 text-[10px] uppercase tracking-wider ${sevColor}`}>{incident.severity}</span>
      </div>
      <p className="mt-1 text-[11px] text-[#d8ccb0]/70">Started {new Date(incident.startTime).toLocaleString()} · <span className="capitalize">{incident.incidentStatus}</span></p>
      <div className="mt-4 rounded-xl bg-white/[.04] p-3 text-xs"><p className="text-[10px] uppercase tracking-wider text-[#d8ccb0]/60">Origin asset</p><p className="mt-1 font-semibold">{origin?.name ?? incident.componentId}</p>{origin && <p className="text-[11px] text-[#d8ccb0]/70">{origin.category} · {origin.district}</p>}</div>
      <div className="mt-3 grid grid-cols-2 gap-2">{stats.map(([label, value]) => <div key={label} className="rounded-xl bg-white/[.04] p-3 text-center"><p className="text-lg font-semibold">{value}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-[#d8ccb0]/70">{label}</p></div>)}</div>
      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
        <span className="rounded-full bg-red-400/15 px-2.5 py-1 text-red-300">{impact.statusBreakdown.offline} offline</span>
        <span className="rounded-full bg-orange-400/15 px-2.5 py-1 text-orange-300">{impact.statusBreakdown.degraded} degraded</span>
        <span className="rounded-full bg-amber-400/15 px-2.5 py-1 text-amber-300">{impact.statusBreakdown.backup} on backup</span>
      </div>
      {impact.affectedDistricts.length > 0 && <p className="mt-3 text-[11px] text-[#d8ccb0]/70"><span className="uppercase tracking-wider text-[#d8ccb0]/50">Districts: </span>{impact.affectedDistricts.join(", ")}</p>}
      {impact.criticalFacilitiesAffected.length > 0 && <p className="mt-1.5 text-[11px] text-[#d8ccb0]/70"><span className="uppercase tracking-wider text-[#d8ccb0]/50">Critical facilities: </span>{impact.criticalFacilitiesAffected.join(", ")}</p>}
    </Card>
  );
}

function RunOverview({ run, onClose }: { run: SimFinishedRun; onClose: () => void }) {
  const curve = run.curve?.length ? run.curve : [];
  const W = 480, H = 190, L = 34, R = 10, T = 12, B = 26;
  const maxT = Math.max(run.durationSimMinutes, ...curve.map((c) => c.t), 1);
  const x = (t: number) => L + (t / maxT) * (W - L - R);
  const y = (v: number) => T + (1 - Math.min(Math.max(v, 0), 100) / 100) * (H - T - B);
  const pts = curve.map((c) => `${x(c.t).toFixed(1)},${y(c.sev).toFixed(1)}`).join(" ");
  const peak = curve.reduce((m, c) => (c.sev > m.sev ? c : m), curve[0] ?? { t: 0, sev: run.maxSeverity });
  const good = run.outcome === "good";
  const hhmm = (m: number) => `${Math.floor(m / 60)}h ${Math.round(m % 60)}m`;
  return (
    <Card paper title="Run overview" subtitle={run.scenarioTitle} action="Close" onAction={onClose}>
      <div className="flex items-center justify-between gap-2 text-[11px] text-[#d8ccb0]/70">
        <span>{run.endedAt ? new Date(run.endedAt).toLocaleString() : ""}</span>
        <span className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wider ${good ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-300"}`}>{good ? "Contained" : "Escalated"}</span>
      </div>
      <p className="mt-2 text-xs leading-5">{run.outcomeText}</p>
      <p className="mt-1 text-[11px] text-[#d8ccb0]/70">{run.options?.o1Label} · {run.options?.o2Label}</p>
      <p className="mt-4 text-[10px] uppercase tracking-wider text-[#d8ccb0]/60">Severity over time</p>
      {curve.length > 1 ? (
        <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full rounded-xl bg-black/20" role="img" aria-label="Severity over simulated time">
          {[0, 25, 50, 75, 100].map((v) => <g key={v}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="rgba(59,36,18,.18)" strokeDasharray="3 4" /><text x={L - 6} y={y(v) + 3} textAnchor="end" fontSize="11" fill="#000">{v}</text></g>)}
          {[0, .25, .5, .75, 1].map((f) => <text key={f} x={x(maxT * f)} y={H - 8} textAnchor="middle" fontSize="11" fill="#000">{hhmm(maxT * f)}</text>)}
          <polygon points={`${x(curve[0].t)},${y(0)} ${pts} ${x(curve[curve.length - 1].t)},${y(0)}`} fill="rgba(107,15,26,.14)" />
          <polyline points={pts} fill="none" stroke="#6b0f1a" strokeWidth="2" strokeLinejoin="round" />
          <circle cx={x(peak.t)} cy={y(peak.sev)} r="4" fill="#9b1c1c" />
          <text x={Math.min(x(peak.t) + 8, W - 70)} y={Math.max(y(peak.sev) - 6, 12)} fontSize="12" fill="#9b1c1c">Peak {Math.round(peak.sev)}</text>
        </svg>
      ) : <p className="mt-2 rounded-xl bg-black/20 p-4 text-center text-[11px] text-[#d8ccb0]/70">No severity data was recorded for this run.</p>}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[["Peak severity", Math.round(run.maxSeverity)], ["Final severity", Math.round(run.severity)], ["Duration", hhmm(run.durationSimMinutes)]].map(([label, value]) => <div key={label as string} className="rounded-xl bg-white/[.04] p-3 text-center"><p className="text-lg font-semibold">{value}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-[#d8ccb0]/70">{label}</p></div>)}
      </div>
      {run.kpis?.length > 0 && <div className="mt-2 grid grid-cols-2 gap-2">{run.kpis.map((k) => <div key={k.label} className="rounded-xl bg-white/[.04] p-3 text-center"><p className="text-base font-semibold">{k.value}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-[#d8ccb0]/70">{k.label}</p></div>)}</div>}
      {run.events?.length > 0 && <div className="mt-4"><p className="text-[10px] uppercase tracking-wider text-[#d8ccb0]/60">Timeline</p><ul className="mt-2 max-h-40 space-y-1.5 overflow-y-auto pr-1">{run.events.map((e, i) => <li key={i} className="flex gap-2 text-[11px] leading-5 text-[#d8ccb0]/80"><span className="shrink-0 text-[#e4aa56]">{hhmm(e.t)}</span><span>{e.text}</span></li>)}</ul></div>}
    </Card>
  );
}
