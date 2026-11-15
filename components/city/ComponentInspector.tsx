"use client";

import { useMemo } from "react";
import { InfrastructureGraph } from "@/lib/simulation/graph";
import { getBackupRuntimeMinutes } from "@/lib/simulation/backupDepletion";
import type {
  InfrastructureComponent,
  InfrastructureDependency,
} from "@/types/infrastructure";
import {
  CATEGORY_LABEL,
  DEPENDENCY_LABEL,
  STATUS_COLOR,
  STATUS_LABEL,
} from "./componentStyles";

interface ComponentInspectorProps {
  componentId: string | null;
  components: InfrastructureComponent[];
  dependencies: InfrastructureDependency[];
  onSelectComponent: (componentId: string) => void;
  onClose?: () => void;
}

/** Everything about one component: its numbers, what it depends on, and what depends on it. */
export function ComponentInspector({
  componentId,
  components,
  dependencies,
  onSelectComponent,
  onClose,
}: ComponentInspectorProps) {
  const graph = useMemo(
    () => new InfrastructureGraph(components, dependencies),
    [components, dependencies]
  );
  const component = componentId ? graph.getComponent(componentId) : undefined;

  if (!component) {
    return (
      <div className="rounded border border-gold/30 p-4 text-sm text-ivory/60">
        Select a component in the city to inspect it.
      </div>
    );
  }

  const upstream = graph.getIncomingDependencies(component.id);
  const downstream = graph.getOutgoingDependencies(component.id);
  const reach = graph.getDownstreamClosure(component.id).size - 1;
  const criticalPath = graph.getCriticalPath(component.id);
  const statusColor = STATUS_COLOR[component.status];
  const loadPct = Math.round((component.currentLoad / component.maxCapacity) * 100);
  const { x, y, z } = component.coordinates;

  return (
    <section className="rounded border border-gold/40 bg-aegean/60 text-sm" aria-label={`${component.name} details`}>
      <header className="border-b border-gold/20 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-widest text-gold">
              {CATEGORY_LABEL[component.category]} · {component.id}
            </p>
            <h2 className="font-serif text-xl leading-tight">{component.name}</h2>
            <p className="mt-1 text-xs text-ivory/60">{component.district}</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close inspector"
              className="shrink-0 rounded px-2 text-lg leading-none text-ivory/60 hover:text-ivory"
            >
              ×
            </button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span
            className="inline-flex items-center gap-2 rounded-full border px-2.5 py-0.5 text-xs font-medium"
            style={{ borderColor: statusColor, color: statusColor }}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: statusColor }} />
            {STATUS_LABEL[component.status]}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-ivory/70">
            Criticality
            <span className="flex gap-0.5" aria-label={`${component.criticality} of 5`}>
              {[1, 2, 3, 4, 5].map((level) => (
                <span
                  key={level}
                  className={`h-2.5 w-2.5 rounded-sm ${level <= component.criticality ? "bg-gold" : "bg-ivory/15"}`}
                />
              ))}
            </span>
          </span>
        </div>
      </header>

      <div className="space-y-3 border-b border-gold/20 p-4">
        <CapacityBar
          label="Load"
          value={component.currentLoad}
          max={component.maxCapacity}
          color={loadPct >= 90 ? STATUS_COLOR.degraded : STATUS_COLOR.operational}
          suffix={`${loadPct}% of capacity`}
        />
        <CapacityBar
          label="Backup reserve"
          value={component.backupCapacityRemaining}
          max={Math.max(component.backupCapacityRemaining, largestBackedNeed(upstream))}
          color={STATUS_COLOR.backup}
          suffix={
            component.backupCapacityRemaining === 0
              ? "none on site"
              : `${getBackupRuntimeMinutes(component.category)}m rated runtime`
          }
        />
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1 text-xs">
          <dt className="text-ivory/60">Components downstream</dt>
          <dd className="text-right tabular-nums">{reach}</dd>
          <dt className="text-ivory/60">Map position</dt>
          <dd className="text-right tabular-nums">
            {x}, {y}, {z}
          </dd>
        </dl>
      </div>

      <DependencyList
        title="Depends on"
        empty="Nothing: this is a source."
        dependencies={upstream}
        neighborId={(dependency) => dependency.sourceId}
        graph={graph}
        onSelectComponent={onSelectComponent}
      />
      <DependencyList
        title="Supplies"
        empty="Nothing depends on this."
        dependencies={downstream}
        neighborId={(dependency) => dependency.targetId}
        graph={graph}
        onSelectComponent={onSelectComponent}
      />

      {criticalPath && criticalPath.componentIds.length > 1 && (
        <div className="p-4">
          <h3 className="mb-2 text-[11px] uppercase tracking-widest text-gold">Critical path if this fails</h3>
          <ol className="flex flex-wrap items-center gap-1 text-xs">
            {criticalPath.componentIds.map((id, index) => (
              <li key={id} className="flex items-center gap-1">
                {index > 0 && <span className="text-ivory/40">→</span>}
                <button
                  onClick={() => onSelectComponent(id)}
                  disabled={id === component.id}
                  className="rounded border border-gold/30 px-1.5 py-0.5 hover:border-gold disabled:border-gold disabled:text-gold"
                  title={graph.getComponent(id)?.name}
                >
                  {id}
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

function largestBackedNeed(upstream: InfrastructureDependency[]): number {
  return Math.max(0, ...upstream.filter((d) => d.hasBackup).map((d) => d.requiredCapacity));
}

function CapacityBar({
  label,
  value,
  max,
  color,
  suffix,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  suffix: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-xs">
        <span className="text-ivory/70">{label}</span>
        <span className="tabular-nums">
          {value}
          {label === "Load" && <span className="text-ivory/50"> / {max}</span>}
          <span className="ml-2 text-ivory/50">{suffix}</span>
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-ivory/10"
        role="progressbar"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function DependencyList({
  title,
  empty,
  dependencies,
  neighborId,
  graph,
  onSelectComponent,
}: {
  title: string;
  empty: string;
  dependencies: InfrastructureDependency[];
  neighborId: (dependency: InfrastructureDependency) => string;
  graph: InfrastructureGraph;
  onSelectComponent: (componentId: string) => void;
}) {
  return (
    <div className="border-b border-gold/20 p-4">
      <h3 className="mb-2 flex items-baseline justify-between text-[11px] uppercase tracking-widest text-gold">
        {title}
        <span className="text-ivory/50">{dependencies.length}</span>
      </h3>
      {dependencies.length === 0 ? (
        <p className="text-xs text-ivory/50">{empty}</p>
      ) : (
        <ul className="space-y-1">
          {dependencies.map((dependency) => {
            const neighbor = graph.getComponent(neighborId(dependency));
            if (!neighbor) return null;
            return (
              <li key={dependency.id}>
                <button
                  onClick={() => onSelectComponent(neighbor.id)}
                  className="flex w-full items-center gap-2 rounded border border-transparent px-2 py-1.5 text-left hover:border-gold/50 hover:bg-gold/10 focus-visible:border-gold focus-visible:outline-none"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: STATUS_COLOR[neighbor.status] }}
                    title={STATUS_LABEL[neighbor.status]}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{neighbor.name}</span>
                    <span className="block text-[11px] text-ivory/50">
                      {DEPENDENCY_LABEL[dependency.dependencyType]} · {dependency.requiredCapacity} units
                      {dependency.hasBackup && <span className="ml-1.5 text-[#B79AE0]">backup-capable</span>}
                    </span>
                  </span>
                  <span className="shrink-0 text-ivory/40">›</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
