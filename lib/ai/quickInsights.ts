import type { InfrastructureComponent, InfrastructureDependency } from "@/types/infrastructure";
import type { Incident } from "@/types/incident";
import type { HistorySummary, PastIncident } from "@/lib/data/history";
import type { ChartSpec } from "@/components/ai/ChatCharts";

export interface RichAnswer {
  text: string;
  charts?: ChartSpec[];
}

export interface QuickPrompt {
  label: string;
  /** Computed locally from live dashboard data — instant, no model call. */
  answer: () => RichAnswer;
}

export interface QuickData {
  components: InfrastructureComponent[];
  dependencies: InfrastructureDependency[];
  incidents: Incident[];
  history: HistorySummary;
  log: PastIncident[];
  districts: { name: string; population: number }[];
}

const pretty = (s: string) => s.replace(/_/g, " ");
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const CAT_LABEL: Record<string, string> = { electrical: "Electrical", water: "Water", transit: "Transit", comms: "Communications", hospital: "Healthcare", emergency: "Emergency" };

function weeklyCounts(log: PastIncident[]) {
  const weeks = Math.ceil(Math.max(...log.map((i) => i.daysAgo), 1) / 7);
  const counts = Array.from({ length: weeks }, () => 0);
  log.forEach((i) => { counts[weeks - 1 - Math.floor((i.daysAgo - 1) / 7)]++; });
  return counts;
}

/** Number of assets that would be reached downstream if this asset failed. */
function cascadeReach(components: InfrastructureComponent[], deps: InfrastructureDependency[]) {
  const next = new Map<string, string[]>();
  deps.forEach((d) => next.set(d.sourceId, [...(next.get(d.sourceId) ?? []), d.targetId]));
  return components.map((c) => {
    const seen = new Set<string>();
    const stack = [...(next.get(c.id) ?? [])];
    while (stack.length) {
      const id = stack.pop()!;
      if (seen.has(id) || id === c.id) continue;
      seen.add(id);
      stack.push(...(next.get(id) ?? []));
    }
    return { c, reach: seen.size };
  }).sort((a, b) => b.reach - a.reach);
}

export function buildAthenaPrompts(d: QuickData): QuickPrompt[] {
  const { components, dependencies, incidents, history, log, districts } = d;
  const count = (st: string, l = components) => l.filter((c) => c.status === st).length;
  const active = incidents.filter((i) => i.incidentStatus !== "resolved");
  const byId = new Map(components.map((c) => [c.id, c]));

  return [
    {
      label: "Give me a status briefing",
      answer: () => {
        const op = count("operational");
        const top = [...active].sort((a, b) => b.estimatedImpact.populationExposedPct - a.estimatedImpact.populationExposedPct)[0];
        return {
          text: [
            `Ithaca is at ${pct(op, components.length)}% operational health: ${op} of ${components.length} assets are fully up.`,
            active.length
              ? `There ${active.length === 1 ? "is 1 active incident" : `are ${active.length} active incidents`}.${top ? ` The largest is a ${pretty(top.incidentType)} exposing about ${Math.round(top.estimatedImpact.populationExposedPct)}% of residents, roughly ${top.estimatedImpact.estimatedRecoveryMinutes} minutes from recovery.` : ""}`
              : "No incidents are active right now.",
            `Backup coverage stands at ${pct(dependencies.filter((x) => x.hasBackup).length, dependencies.length)}%, and incidents are ${history.trendPct <= 0 ? "down" : "up"} ${Math.abs(history.trendPct)}% on the previous 30 days (simulated record).`,
          ].join("\n"),
          charts: [{
            type: "donut", title: "Asset status", centerLabel: `${pct(op, components.length)}%`,
            segments: [
              { label: "Operational", value: op, color: "#3a7d4f" }, { label: "On backup", value: count("backup"), color: "#c99a52" },
              { label: "Degraded", value: count("degraded"), color: "#d9772f" }, { label: "Offline", value: count("offline"), color: "#b3261e" },
            ],
          }],
        };
      },
    },
    {
      label: "Which assets are most at risk?",
      answer: () => {
        const troubled = components.filter((c) => c.status !== "operational");
        const ranked = (troubled.length ? troubled : components).sort((a, b) => b.criticality - a.criticality || b.currentLoad / b.maxCapacity - a.currentLoad / a.maxCapacity).slice(0, 6);
        return {
          text: troubled.length
            ? `${troubled.length} asset${troubled.length === 1 ? " is" : "s are"} not fully operational. These matter most, ranked by criticality:`
            : "Every asset is operational right now. These are the ones to watch — highest criticality, running closest to capacity:",
          charts: [{ type: "bars", title: "Load on the riskiest assets", unit: "%", max: 100, items: ranked.map((c) => ({ label: `${c.name} · ${c.criticality}/5`, value: Math.round((c.currentLoad / c.maxCapacity) * 100), color: c.status === "offline" ? "#b3261e" : c.status === "degraded" ? "#d9772f" : "#b9772b" })) }],
        };
      },
    },
    {
      label: "Which district needs help first?",
      answer: () => {
        const rows = districts.map((dist) => {
          const l = components.filter((c) => c.district === dist.name);
          const stress = count("offline", l) * 2 + count("degraded", l);
          const incidentsHere = log.filter((i) => i.district === dist.name && i.daysAgo <= 30).length;
          return { dist, stress, incidentsHere, health: pct(count("operational", l), l.length) };
        }).sort((a, b) => b.stress - a.stress || b.incidentsHere - a.incidentsHere);
        const w = rows[0];
        return {
          text: w.stress
            ? `${w.dist.name} needs attention first — ${w.health}% of its assets are operational and it houses ${w.dist.population.toLocaleString()} residents.`
            : `No district is failing right now. ${w.dist.name} has seen the most incidents in the last 30 days (${w.incidentsHere}, simulated record), so it is the one to watch.`,
          charts: [
            { type: "bars", title: "Operational health by district", unit: "%", max: 100, items: rows.map((r) => ({ label: r.dist.name, value: r.health, color: r.health >= 90 ? "#3a7d4f" : r.health >= 70 ? "#b9772b" : "#b3261e" })) },
            { type: "bars", title: "Incidents in last 30 days (simulated record)", items: rows.map((r) => ({ label: r.dist.name, value: r.incidentsHere, color: "#6b0f1a" })) },
          ],
        };
      },
    },
    {
      label: "What keeps causing failures?",
      answer: () => ({
        text: `Across the ${history.windowDays}-day simulated record there were ${history.totalIncidents} incidents and ${history.totalDowntimeHours} hours of downtime. ${history.topCauses[0]?.cause ?? "Equipment faults"} leads, and ${history.repeatOffenders[0]?.asset ?? "one asset"} is the worst repeat offender. Failures cluster around ${history.peakFailureHours.map((h) => h.hour).join(", ")}.`,
        charts: [
          { type: "bars", title: "Most common causes", items: history.topCauses.map((c) => ({ label: c.cause, value: c.count, color: "#6b0f1a" })) },
          { type: "bars", title: "Repeat offenders · downtime hours", unit: "h", items: history.repeatOffenders.slice(0, 5).map((o) => ({ label: o.asset, value: o.downtimeHours, color: "#b9772b" })) },
        ],
      }),
    },
    {
      label: "How strong is our backup coverage?",
      answer: () => {
        const covered = dependencies.filter((x) => x.hasBackup).length;
        const byCat = Object.keys(CAT_LABEL).map((k) => {
          const deps = dependencies.filter((x) => byId.get(x.targetId)?.category === k);
          return { label: CAT_LABEL[k], value: pct(deps.filter((x) => x.hasBackup).length, deps.length) };
        });
        const dry = components.filter((c) => c.criticality >= 4 && c.backupCapacityRemaining <= 0);
        return {
          text: `${pct(covered, dependencies.length)}% of dependencies have a backup path (${covered} of ${dependencies.length}).${dry.length ? ` ${dry.length} high-criticality asset${dry.length === 1 ? " has" : "s have"} no backup reserve: ${dry.slice(0, 3).map((c) => c.name).join(", ")}.` : ""}`,
          charts: [
            { type: "donut", title: "Dependencies with a backup path", centerLabel: `${pct(covered, dependencies.length)}%`, segments: [{ label: "Backed up", value: covered, color: "#3a7d4f" }, { label: "No backup", value: dependencies.length - covered, color: "#b3261e" }] },
            { type: "bars", title: "Backup coverage by service", unit: "%", max: 100, items: byCat.map((b) => ({ ...b, color: b.value >= 60 ? "#3a7d4f" : b.value >= 40 ? "#b9772b" : "#b3261e" })) },
          ],
        };
      },
    },
    {
      label: "Summarize the active incidents",
      answer: () => {
        if (!active.length) {
          return {
            text: "There are no active incidents — every recorded incident is resolved. For context, here is how past incidents split by severity in the simulated record:",
            charts: [{ type: "donut", title: "Past incidents by severity", segments: [{ label: "Minor", value: history.severityMix.minor, color: "#c99a52" }, { label: "Moderate", value: history.severityMix.moderate, color: "#d9772f" }, { label: "Major", value: history.severityMix.major, color: "#b3261e" }, { label: "Critical", value: history.severityMix.critical, color: "#5b0f14" }] }],
          };
        }
        return {
          text: `${active.length} active incident${active.length === 1 ? "" : "s"}:\n${active.slice(0, 5).map((i) => `- ${cap(pretty(i.incidentType))} at ${byId.get(i.componentId)?.name ?? i.componentId} (${i.severity}) — ${i.estimatedImpact.downstreamAffectedCount} downstream assets hit`).join("\n")}`,
          charts: [
            { type: "bars", title: "Population exposed", unit: "%", items: active.slice(0, 6).map((i) => ({ label: cap(pretty(i.incidentType)), value: Math.round(i.estimatedImpact.populationExposedPct), color: "#b3261e" })) },
            { type: "bars", title: "Estimated recovery time", unit: " min", items: active.slice(0, 6).map((i) => ({ label: cap(pretty(i.incidentType)), value: i.estimatedImpact.estimatedRecoveryMinutes, color: "#b9772b" })) },
          ],
        };
      },
    },
  ];
}

export function buildOraclePrompts(d: QuickData): QuickPrompt[] {
  const { components, dependencies, incidents, history, log, districts } = d;
  const count = (st: string, l = components) => l.filter((c) => c.status === st).length;
  const active = incidents.filter((i) => i.incidentStatus !== "resolved");
  const byId = new Map(components.map((c) => [c.id, c]));
  const backupCov = pct(dependencies.filter((x) => x.hasBackup).length, dependencies.length);

  const riskScore = () => {
    const troubled = (count("offline") + count("degraded") * 0.5) / Math.max(components.length, 1);
    return Math.max(0, Math.min(100, Math.round(15 + (100 - backupCov) * 0.2 + troubled * 140 + Math.min(active.length * 5, 20) + Math.max(history.trendPct, 0) * 0.15)));
  };

  return [
    {
      label: "What is Ithaca's risk outlook?",
      answer: () => {
        const s = riskScore();
        const level = s < 30 ? "low" : s < 55 ? "elevated" : s < 75 ? "high" : "severe";
        const color = s < 30 ? "#3a7d4f" : s < 55 ? "#b9772b" : s < 75 ? "#d9772f" : "#b3261e";
        return {
          text: `I read the omens as ${level} risk (${s}/100). The score blends current failures, the ${100 - backupCov}% of dependencies with no backup, ${active.length} active incident${active.length === 1 ? "" : "s"} and the recent incident trend. It is a modelled estimate, not a certainty.`,
          charts: [{ type: "gauge", title: "City risk score (modelled)", value: s, label: `${level} risk`, color }],
        };
      },
    },
    {
      label: "Where could a cascade begin?",
      answer: () => {
        const top = cascadeReach(components, dependencies).slice(0, 6);
        return {
          text: `If ${top[0].c.name} fell, ${top[0].reach} other assets would feel it through the dependency graph — the widest blast radius in Ithaca. These six are the city's pressure points; protecting them protects everything downstream.`,
          charts: [{ type: "bars", title: "Assets reached if this one fails", items: top.map((t) => ({ label: `${t.c.name}${t.c.status !== "operational" ? " ⚠" : ""}`, value: t.reach, color: t.c.status !== "operational" ? "#b3261e" : "#5b3d94" })) }],
        };
      },
    },
    {
      label: "Which district is most fragile?",
      answer: () => {
        const rows = districts.map((dist) => ({ dist, hours: history.districtBurden.find((b) => b.district === dist.name)?.downtimeHours ?? 0, n: history.districtBurden.find((b) => b.district === dist.name)?.incidents ?? 0 })).sort((a, b) => b.hours - a.hours);
        return {
          text: `${rows[0].dist.name} has borne the heaviest burden — ${rows[0].hours} hours of downtime across ${rows[0].n} incidents in the ${history.windowDays}-day simulated record. Fragility is where past trouble concentrates, so that is where I would invest in redundancy first.`,
          charts: [
            { type: "bars", title: "Downtime hours by district (simulated record)", unit: "h", items: rows.map((r) => ({ label: r.dist.name, value: r.hours, color: "#5b3d94" })) },
            { type: "bars", title: "Incidents by district (simulated record)", items: rows.map((r) => ({ label: r.dist.name, value: r.n, color: "#b9772b" })) },
          ],
        };
      },
    },
    {
      label: "How resilient is each service?",
      answer: () => {
        const rows = Object.keys(CAT_LABEL).map((k) => {
          const l = components.filter((c) => c.category === k);
          const deps = dependencies.filter((x) => byId.get(x.targetId)?.category === k);
          const up = pct(count("operational", l), l.length), bk = pct(deps.filter((x) => x.hasBackup).length, deps.length);
          return { label: CAT_LABEL[k], value: Math.round(up * 0.5 + bk * 0.5) };
        }).sort((a, b) => a.value - b.value);
        return {
          text: `${rows[0].label} is the weakest wall in Ithaca's defences (${rows[0].value}/100) and ${rows[rows.length - 1].label} the strongest (${rows[rows.length - 1].value}/100). Resilience here is half current uptime, half backup coverage.`,
          charts: [{ type: "bars", title: "Resilience score by service (modelled)", max: 100, items: rows.map((r) => ({ ...r, color: r.value >= 70 ? "#3a7d4f" : r.value >= 50 ? "#b9772b" : "#b3261e" })) }],
        };
      },
    },
    {
      label: "Forecast the next 30 days",
      answer: () => {
        const weeks = weeklyCounts(log);
        const recent = weeks.slice(-4), prior = weeks.slice(-8, -4);
        const avg = (a: number[]) => a.reduce((s, x) => s + x, 0) / Math.max(a.length, 1);
        const slope = (avg(recent) - avg(prior)) / 4;
        const proj = [1, 2, 3, 4].map((i) => Math.max(0, Math.round((avg(recent) + slope * i) * 10) / 10));
        const expected = Math.round(proj.reduce((s, x) => s + x, 0));
        const shown = weeks.slice(-16);
        const labels = (n: number) => (i: number) => (i === n - 1 ? "now" : `${n - 1 - i}w ago`);
        const l = labels(shown.length);
        return {
          text: `Projecting the recent trend forward, I expect about ${expected} incidents over the next four weeks (${Math.round(avg(recent) * 10) / 10} a week lately, ${slope <= 0 ? "easing" : "rising"}). This is a simple modelled projection from the simulated record — treat it as a direction, not a promise.`,
          charts: [{ type: "line", title: "Incidents per week — history and projection", projectedFrom: shown.length, points: [...shown.map((v, i) => ({ label: l(i), value: v })), ...proj.map((v, i) => ({ label: `+${i + 1}w`, value: v }))] }],
        };
      },
    },
    {
      label: "When do failures peak?",
      answer: () => {
        const hours = Array.from({ length: 24 }, (_, h) => log.filter((i) => i.hour === h).length);
        const max = Math.max(...hours);
        const peaks = hours.map((v, i) => (v >= max * 0.8 ? i : -1)).filter((i) => i >= 0);
        return {
          text: `Failures cluster at ${history.peakFailureHours.map((h) => h.hour).join(", ")} — the evening demand peak, when load is highest. Keep crews and backup reserves staged before then.`,
          charts: [{ type: "columns", title: "Incidents by hour of day (simulated record)", items: hours.map((v, h) => ({ label: `${String(h).padStart(2, "0")}h`, value: v })), highlight: peaks }],
        };
      },
    },
  ];
}
