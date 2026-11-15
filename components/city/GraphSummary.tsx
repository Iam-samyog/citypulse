"use client";

import { useMemo } from "react";
import { InfrastructureGraph } from "@/lib/simulation/graph";
import type {
  InfrastructureComponent,
  InfrastructureDependency,
} from "@/types/infrastructure";
import { STATUS_COLOR, STATUS_LABEL } from "./componentStyles";

interface GraphSummaryProps {
  components: InfrastructureComponent[];
  dependencies: InfrastructureDependency[];
}

/** A compact health readout for the whole dependency network. */
export function GraphSummary({ components, dependencies }: GraphSummaryProps) {
  const summary = useMemo(() => {
    const graph = new InfrastructureGraph(components, dependencies);
    const validation = graph.validateGraph();
    const roots = components.filter(
      (component) => graph.getIncomingDependencies(component.id).length === 0
    ).length;
    const critical = components.filter((component) => component.criticality === 5).length;
    const reachable = components.reduce(
      (total, component) => total + graph.getDownstreamClosure(component.id).size - 1,
      0
    );
    return {
      validation,
      roots,
      critical,
      averageReach: components.length ? Math.round(reachable / components.length) : 0,
    };
  }, [components, dependencies]);

  const statuses = (["operational", "backup", "degraded", "offline"] as const).map(
    (status) => ({
      status,
      count: components.filter((component) => component.status === status).length,
    })
  );

  return (
    <section className="rounded border border-cyan-200/20 bg-[#071b26]/80 p-4" aria-label="Network health">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[.24em] text-cyan-200/70">Infrastructure graph</p>
          <h2 className="font-serif text-xl">Network health</h2>
        </div>
        <span
          className={`rounded-full border px-2 py-1 text-[10px] uppercase tracking-wider ${
            summary.validation.valid
              ? "border-cyan-300/40 text-cyan-200"
              : "border-status-failed/60 text-status-failed"
          }`}
        >
          {summary.validation.valid ? "Graph valid" : "Graph invalid"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {statuses.map(({ status, count }) => (
          <div key={status} className="border-l pl-2" style={{ borderColor: STATUS_COLOR[status] }}>
            <div className="text-lg font-semibold tabular-nums" style={{ color: STATUS_COLOR[status] }}>
              {count}
            </div>
            <div className="truncate text-[9px] uppercase tracking-wide text-ivory/50">
              {STATUS_LABEL[status]}
            </div>
          </div>
        ))}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-ivory/10 pt-3 text-xs">
        <dt className="text-ivory/50">Components</dt>
        <dd className="text-right tabular-nums">{components.length}</dd>
        <dt className="text-ivory/50">Dependency links</dt>
        <dd className="text-right tabular-nums">{dependencies.length}</dd>
        <dt className="text-ivory/50">Primary sources</dt>
        <dd className="text-right tabular-nums">{summary.roots}</dd>
        <dt className="text-ivory/50">Critical assets</dt>
        <dd className="text-right tabular-nums">{summary.critical}</dd>
        <dt className="text-ivory/50">Average cascade reach</dt>
        <dd className="text-right tabular-nums">{summary.averageReach} nodes</dd>
      </dl>
    </section>
  );
}
