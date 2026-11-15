"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { InfrastructureComponent } from "@/types/infrastructure";
import { STATUS_COLOR } from "./componentStyles";

interface ImpactZoneProps {
  affectedComponents: InfrastructureComponent[];
}

/** A ground glow under every impaired component, colored by how badly it is hit. */
export function ImpactZone({ affectedComponents }: ImpactZoneProps) {
  return (
    <group>
      {affectedComponents.map((component) => (
        <ImpactPulse key={component.id} component={component} />
      ))}
    </group>
  );
}

function ImpactPulse({ component }: { component: InfrastructureComponent }) {
  const core = useRef<THREE.Mesh>(null);
  const wave = useRef<THREE.Mesh>(null);
  const phase = component.id.charCodeAt(component.id.length - 1) * 0.31;
  const radius = component.status === "offline" ? 42 : 30;

  useFrame(({ clock }) => {
    const t = (clock.elapsedTime * 0.42 + phase) % 1;
    if (wave.current) {
      wave.current.scale.setScalar(0.7 + t * 1.35);
      const material = wave.current.material as THREE.MeshBasicMaterial;
      material.opacity = (1 - t) * 0.38;
    }
    if (core.current) {
      core.current.scale.setScalar(0.95 + Math.sin(clock.elapsedTime * 2 + phase) * 0.06);
    }
  });

  const position: [number, number, number] = [
    component.coordinates.x,
    0.3,
    component.coordinates.z,
  ];
  const color = STATUS_COLOR[component.status];
  return (
    <group position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh ref={core}>
        <circleGeometry args={[radius, 40]} />
        <meshBasicMaterial color={color} transparent opacity={0.2} depthWrite={false} />
      </mesh>
      <mesh ref={wave} position={[0, 0, 0.15]}>
        <ringGeometry args={[radius * 0.82, radius, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.35} depthWrite={false} />
      </mesh>
    </group>
  );
}
