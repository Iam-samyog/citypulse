"use client";

import { useMemo } from "react";
import type { InfrastructureComponent, OperationalStatus } from "@/types/infrastructure";

const STATUS_COLOR: Record<OperationalStatus, string> = {
  operational: "#2E6F95",
  degraded: "#D99A2B",
  at_risk: "#D99A2B",
  failed: "#C1440E",
  repairing: "#7B4F9E",
  restored: "#3C8C5B",
};

interface InfrastructureNodeProps {
  component: InfrastructureComponent;
  onSelect?: (componentId: string) => void;
  selected?: boolean;
}

/**
 * A single infrastructure component rendered as a selectable 3D node.
 * Member 1 (3D Frontend): swap this box geometry for category-specific
 * models (substation, pump station, hospital, etc.) as time allows — the
 * color-by-status logic and click handling should stay the same.
 */
export function InfrastructureNode({
  component,
  onSelect,
  selected,
}: InfrastructureNodeProps) {
  const color = useMemo(
    () => STATUS_COLOR[component.operationalStatus],
    [component.operationalStatus]
  );

  const size = 6 + component.capacity / 50;

  return (
    <mesh
      position={[component.location.x, component.location.y + size / 2, component.location.z]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(component.componentId);
      }}
    >
      <boxGeometry args={[size, size, size]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={selected ? 0.8 : 0.2}
      />
    </mesh>
  );
}
