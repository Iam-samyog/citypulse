"use client";

import { useEffect, useRef, useState } from "react";
import type { Incident, IncidentType } from "@/types/incident";
import type { AIAnalysis } from "@/types/simulation";

export type IntelligenceId = "athena" | "oracle";

export interface ChatExchange {
  id: string;
  question?: string;
  analysis: AIAnalysis;
}

export interface OdysseyScenario {
  id: string;
  componentId: string;
  incidentType: IncidentType;
  title: string;
  chapter: string;
  prompt: string;
  accent: string;
}

export const ODYSSEY_SCENARIOS: OdysseyScenario[] = [
  { id: "helios-dark", componentId: "EL-01", incidentType: "power_failure", title: "Helios Goes Dark", chapter: "Poseidon's Wrath", prompt: "Collapse primary generation and reveal the city's electrical dependencies.", accent: "#F6C85F" },
  { id: "scylla-waterworks", componentId: "WA-01", incidentType: "water_main_break", title: "Scylla at the Waterworks", chapter: "The Labyrinth", prompt: "Stop the waterworks and follow hospitals, pumps, and emergency reserves.", accent: "#57C7E3" },
  { id: "silence-hermes", componentId: "CO-01", incidentType: "communication_outage", title: "The Silence of Hermes", chapter: "Athena's Strategy", prompt: "Sever the exchange and expose failures in dispatch, relays, and transit.", accent: "#B79AE0" },
  { id: "citadel-falls", componentId: "EL-02", incidentType: "power_failure", title: "The Citadel Falls", chapter: "The Return to Ithaca", prompt: "Take the citadel offline and test the hospital corridor and local battery.", accent: "#EF8A62" },
];

interface AICommandChatProps {
  active: IntelligenceId | null;
  onActiveChange: (assistant: IntelligenceId | null) => void;
  incident: Incident | null;
  athenaHistory: ChatExchange[];
  oracleHistory: ChatExchange[];
  loading: boolean;
  asking: IntelligenceId | null;
  error: string | null;
  simulationControlsVisible?: boolean;
  unavailableComponentIds: Set<string>;
  onRunScenario: (scenario: OdysseyScenario) => void;
  onAsk: (assistant: IntelligenceId, question: string) => void;
}

const INTELLIGENCE = {
  athena: { name: "Athena", title: "Incident Intelligence", eyebrow: "Gemini intelligence", letter: "A", accent: "#57C7E3", intro: "I explain what happened, trace the cascade, and translate the city's telemetry into decisive action.", placeholder: "Ask Athena about this incident…" },
  oracle: { name: "Oracle", title: "Strategic Foresight", eyebrow: "Gemini · Oracle agent", letter: "Ω", accent: "#B79AE0", intro: "I challenge assumptions, expose recovery blind spots, and reason about what the city should do next.", placeholder: "Ask Oracle for strategic counsel…" },
} as const;

export function AICommandChat({ active, onActiveChange, incident, athenaHistory, oracleHistory, loading, asking, error, simulationControlsVisible = false, unavailableComponentIds, onRunScenario, onAsk }: AICommandChatProps) {
  const [question, setQuestion] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const profile = active ? INTELLIGENCE[active] : null;
  const history = active === "oracle" ? oracleHistory : athenaHistory;

  useEffect(() => setQuestion(""), [active]);
  useEffect(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), [history.length, asking]);

  return (
    <>
      {!active && (
        <div className={`absolute right-6 z-30 flex flex-col items-end gap-2 transition-[bottom] sm:flex-row ${simulationControlsVisible ? "bottom-32" : "bottom-6"}`}>
          <Launcher assistant="oracle" onClick={() => onActiveChange("oracle")} />
          <Launcher assistant="athena" onClick={() => onActiveChange("athena")} />
        </div>
      )}

      <aside aria-label={profile ? `${profile.name} intelligence` : "AI intelligence"} aria-hidden={!active} className={`absolute inset-y-0 right-0 z-40 flex w-[min(480px,100vw)] flex-col border-l border-cyan-100/15 bg-[#04151e]/[.97] shadow-[-24px_0_80px_rgba(0,0,0,.38)] backdrop-blur-xl transition duration-300 ${active ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-full opacity-0"}`}>
        {profile && active && (
          <>
            <header className="shrink-0 border-b border-cyan-100/10 px-5 pb-0 pt-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3"><Avatar assistant={active} large /><div><p className="text-[9px] uppercase tracking-[.28em]" style={{ color: profile.accent }}>{profile.eyebrow}</p><h1 className="font-serif text-xl text-ivory">{profile.name} <span className="text-ivory/40">· {profile.title}</span></h1></div></div>
                <button type="button" onClick={() => onActiveChange(null)} className="grid h-9 w-9 place-items-center rounded-full border border-ivory/15 text-lg text-ivory/55 transition hover:border-ivory/40 hover:text-ivory" aria-label="Close intelligence sidebar">×</button>
              </div>
              <nav className="mt-5 grid grid-cols-2 gap-1" aria-label="Choose intelligence">
                {(["athena", "oracle"] as IntelligenceId[]).map((id) => <button key={id} type="button" onClick={() => onActiveChange(id)} className={`border-b-2 px-3 py-3 text-xs uppercase tracking-[.18em] transition ${active === id ? "text-ivory" : "border-transparent text-ivory/35 hover:text-ivory/65"}`} style={active === id ? { borderColor: INTELLIGENCE[id].accent } : undefined}>{INTELLIGENCE[id].name}</button>)}
              </nav>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5">
              <div className="rounded-2xl border bg-white/[.025] p-4" style={{ borderColor: `${profile.accent}35` }}><p className="text-sm leading-relaxed text-ivory/75">{profile.intro}</p></div>

              {active === "athena" && !incident && (
                <section className="mt-5"><p className="mb-3 text-[9px] uppercase tracking-[.25em] text-gold">Begin an Odyssey</p><div className="grid gap-2 sm:grid-cols-2">
                  {ODYSSEY_SCENARIOS.map((scenario) => { const unavailable = unavailableComponentIds.has(scenario.componentId); return <button key={scenario.id} type="button" disabled={loading || unavailable} onClick={() => onRunScenario(scenario)} className="rounded-xl border bg-white/[.02] p-3 text-left transition hover:-translate-y-0.5 hover:bg-white/[.055] disabled:cursor-not-allowed disabled:opacity-35" style={{ borderColor: `${scenario.accent}55` }}><span className="text-[8px] uppercase tracking-wider" style={{ color: scenario.accent }}>{scenario.chapter} · {scenario.componentId}</span><span className="mt-1 block font-serif text-base text-ivory">{scenario.title}</span><span className="mt-1 block text-[10px] leading-relaxed text-ivory/40">{unavailable ? "Already in an open incident." : scenario.prompt}</span></button>; })}
                </div></section>
              )}

              {active === "oracle" && !incident && <div className="mt-5 rounded-2xl border border-[#B79AE0]/25 bg-[#B79AE0]/5 p-5 text-center"><p className="font-serif text-lg text-ivory">The Oracle awaits a disturbance.</p><p className="mt-2 text-xs leading-relaxed text-ivory/45">Ask Athena to initiate a scenario, then return for an independent strategic assessment.</p><button type="button" onClick={() => onActiveChange("athena")} className="mt-4 rounded-full border border-[#B79AE0]/40 px-4 py-2 text-[10px] uppercase tracking-widest text-[#d8c7f1] hover:bg-[#B79AE0]/10">Open Athena</button></div>}

              {loading && <StatusMessage color="#C9A24B" text="The cascade is unfolding. Both intelligences are reading the city…" />}
              {error && <p role="alert" className="mt-4 rounded-xl border border-status-failed/45 bg-status-failed/10 p-3 text-xs leading-relaxed text-[#ffb7a4]">{error}</p>}
              {incident && <IncidentCard incident={incident} />}

              <div className="mt-4 space-y-4">
                {history.map((exchange) => <div key={exchange.id}>{exchange.question && <div className="mb-2 ml-10 rounded-2xl rounded-br-sm bg-white/[.07] px-4 py-3 text-sm leading-relaxed text-ivory/75">{exchange.question}</div>}<AnalysisMessage assistant={active} analysis={exchange.analysis} /></div>)}
                {asking === active && <StatusMessage color={profile.accent} text={`${profile.name} is interpreting the city's signals…`} />}
              </div>
            </div>

            <form className="shrink-0 border-t border-cyan-100/10 bg-[#04151e]/95 p-4" onSubmit={(event) => { event.preventDefault(); const value = question.trim(); if (!value || !incident || asking) return; onAsk(active, value); setQuestion(""); }}>
              <div className="flex gap-2 rounded-2xl border border-cyan-100/15 bg-white/[.025] p-2"><input value={question} onChange={(event) => setQuestion(event.target.value)} disabled={!incident || Boolean(asking)} placeholder={incident ? profile.placeholder : "Run a scenario with Athena first…"} className="min-w-0 flex-1 bg-transparent px-2 text-sm text-ivory outline-none placeholder:text-ivory/25 disabled:opacity-45" /><button type="submit" disabled={!incident || Boolean(asking) || !question.trim()} className="grid h-9 w-9 place-items-center rounded-xl text-sm text-[#04151e] transition hover:brightness-110 disabled:opacity-25" style={{ backgroundColor: profile.accent }} aria-label={`Ask ${profile.name}`}>↑</button></div>
              <p className="mt-2 text-center text-[9px] text-ivory/25">AI counsel is advisory. Simulation telemetry remains the source of truth.</p>
            </form>
          </>
        )}
      </aside>
    </>
  );
}

function Launcher({ assistant, onClick }: { assistant: IntelligenceId; onClick: () => void }) { const profile = INTELLIGENCE[assistant]; return <button type="button" onClick={onClick} className="group flex items-center gap-3 rounded-full border bg-[#061923]/92 py-2.5 pl-3 pr-5 text-left backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-[#0b2532]" style={{ borderColor: `${profile.accent}55` }} aria-label={`Open ${profile.name} intelligence`}><Avatar assistant={assistant} /><span><span className="block text-[8px] uppercase tracking-[.25em] text-ivory/35">{profile.title}</span><span className="text-sm font-medium text-ivory">Ask {profile.name}</span></span></button>; }

function Avatar({ assistant, large = false }: { assistant: IntelligenceId; large?: boolean }) { const profile = INTELLIGENCE[assistant]; return <span className={`grid shrink-0 place-items-center rounded-full border font-serif ${large ? "h-11 w-11 text-xl" : "h-10 w-10 text-lg"}`} style={{ color: profile.accent, borderColor: `${profile.accent}80`, backgroundColor: `${profile.accent}12` }}>{profile.letter}</span>; }

function StatusMessage({ color, text }: { color: string; text: string }) { return <div className="mt-4 flex items-center gap-3 rounded-xl border bg-white/[.025] p-3 text-xs text-ivory/60" style={{ borderColor: `${color}35` }}><span className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: color }} />{text}</div>; }

function IncidentCard({ incident }: { incident: Incident }) { return <section className="mt-4 rounded-xl border border-ivory/10 bg-black/10 p-3"><div className="flex items-center justify-between gap-3"><div><p className="text-[8px] uppercase tracking-widest text-gold">Active incident</p><p className="font-serif text-lg text-ivory">{incident.componentId} cascade</p></div><span className="rounded-full border border-status-failed/40 px-2 py-1 text-[8px] uppercase tracking-wider text-status-failed">{incident.severity}</span></div><div className="mt-3 grid grid-cols-3 gap-2 text-center"><Metric value={`${incident.estimatedImpact.populationExposedPct}%`} label="Exposed" /><Metric value={String(incident.estimatedImpact.downstreamAffectedCount)} label="Affected" /><Metric value={String(incident.estimatedImpact.criticalFacilitiesAffected.length)} label="Critical" /></div></section>; }

function Metric({ value, label }: { value: string; label: string }) { return <div className="rounded-lg bg-white/[.035] px-2 py-2"><div className="text-lg font-semibold tabular-nums text-ivory">{value}</div><div className="text-[8px] uppercase tracking-wider text-ivory/40">{label}</div></div>; }

function AnalysisMessage({ assistant, analysis }: { assistant: IntelligenceId; analysis: AIAnalysis }) { const profile = INTELLIGENCE[assistant]; return <article className="flex gap-3"><Avatar assistant={assistant} /><div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm border bg-white/[.025] p-4" style={{ borderColor: `${profile.accent}30` }}><p className="mb-2 text-[8px] uppercase tracking-[.2em]" style={{ color: profile.accent }}>{profile.name} intelligence</p><p className="text-sm leading-relaxed text-ivory/75">{analysis.generatedSummary}</p>{analysis.recommendations.length > 0 && <ul className="mt-3 space-y-1.5 text-xs leading-relaxed text-ivory/50">{analysis.recommendations.map((item, index) => <li key={`${item}-${index}`} className="flex gap-2"><span style={{ color: profile.accent }}>—</span><span>{item}</span></li>)}</ul>}</div></article>; }
