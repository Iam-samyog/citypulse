"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type {
  ComponentCategory,
  InfrastructureComponent,
  InfrastructureDependency,
} from "@/types/infrastructure";
import { DEPENDENCY_COLOR } from "./componentStyles";
import { NODE_HEIGHT } from "./InfrastructureNode";

interface DependencyFlowProps {
  components: InfrastructureComponent[];
  dependencies: InfrastructureDependency[];
  selectedComponentId?: string | null;
  visibleLayers: Set<ComponentCategory>;
}

/** Moving service packets reveal edge direction and accelerate around impaired nodes. */
export function DependencyFlow({
  components,
  dependencies,
  selectedComponentId,
  visibleLayers,
}: DependencyFlowProps) {
  const flows = useMemo(() => {
    const byId = new Map(components.map((component) => [component.id, component]));
    return dependencies.flatMap((dependency) => {
      const source = byId.get(dependency.sourceId);
      const target = byId.get(dependency.targetId);
      if (!source || !target) return [];
      const selected = source.id === selectedComponentId || target.id === selectedComponentId;
      const impaired = source.status !== "operational" || target.status !== "operational";
      if (!selected && !impaired) return [];
      if (!visibleLayers.has(source.category) || !visibleLayers.has(target.category)) return [];
      return [{ dependency, source, target, urgent: impaired, selected }];
    });
  }, [components, dependencies, selectedComponentId, visibleLayers]);

  return (
    <group name="animated-dependency-flow">
      {flows.map(({ dependency, source, target, urgent, selected }, index) => (
        <FlowPacket
          key={dependency.id}
          source={source}
          target={target}
          color={DEPENDENCY_COLOR[dependency.dependencyType]}
          offset={(index * 0.173) % 1}
          speed={urgent ? 0.2 : selected ? 0.14 : 0.08}
          size={selected ? 3.2 : 2.4}
        />
      ))}
    </group>
  );
}

function FlowPacket({
  source,
  target,
  color,
  offset,
  speed,
  size,
}: {
  source: InfrastructureComponent;
  target: InfrastructureComponent;
  color: string;
  offset: number;
  speed: number;
  size: number;
}) {
  const packet = useRef<THREE.Mesh>(null);
  const start = useMemo(
    () => new THREE.Vector3(source.coordinates.x, NODE_HEIGHT + 2, source.coordinates.z),
    [source]
  );
  const end = useMemo(
    () => new THREE.Vector3(target.coordinates.x, NODE_HEIGHT + 2, target.coordinates.z),
    [target]
  );

  useFrame(({ clock }) => {
    if (!packet.current) return;
    const progress = (clock.elapsedTime * speed + offset) % 1;
    packet.current.position.lerpVectors(start, end, progress);
    const pulse = 0.75 + Math.sin(progress * Math.PI) * 0.65;
    packet.current.scale.setScalar(pulse);
  });

  return (
    <mesh ref={packet}>
      <sphereGeometry args={[size, 10, 8]} />
      <meshBasicMaterial color={color} toneMapped={false} />
      <pointLight color={color} intensity={0.5} distance={45} />
    </mesh>
  );
}
