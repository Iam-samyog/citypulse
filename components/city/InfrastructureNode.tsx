"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { ComponentCategory, InfrastructureComponent } from "@/types/infrastructure";
import { STATUS_COLOR } from "./componentStyles";

/** Markers float above the rooftops so the procedural city never hides them. */
export const NODE_HEIGHT = 62;

function CategoryGeometry({ category, size }: { category: ComponentCategory; size: number }) {
  switch (category) {
    case "electrical":
      return <octahedronGeometry args={[size * 0.75]} />;
    case "water":
      return <sphereGeometry args={[size * 0.62, 20, 16]} />;
    case "transit":
      return <cylinderGeometry args={[size * 0.7, size * 0.7, size * 0.45, 6]} />;
    case "comms":
      return <coneGeometry args={[size * 0.55, size * 1.3, 4]} />;
    case "hospital":
      return <boxGeometry args={[size, size, size]} />;
    case "emergency":
      return <dodecahedronGeometry args={[size * 0.68]} />;
  }
}

interface InfrastructureNodeProps {
  component: InfrastructureComponent;
  onSelect?: (componentId: string) => void;
  selected?: boolean;
}

/** One component: a status-colored, category-shaped marker on a stem down to its site. */
export function InfrastructureNode({ component, onSelect, selected }: InfrastructureNodeProps) {
  const marker = useRef<THREE.Mesh>(null);
  const selectionRing = useRef<THREE.Mesh>(null);
  const color = STATUS_COLOR[component.status];
  const size = 9 + component.criticality * 2;
  const { x, y, z } = component.coordinates;

  useFrame(({ clock }, delta) => {
    if (marker.current) {
      marker.current.rotation.y += delta * (component.status === "offline" ? 1.2 : 0.35);
      const activePulse = component.status === "offline" || component.status === "degraded" || selected;
      const pulse = activePulse ? 1 + Math.sin(clock.elapsedTime * 3.4 + component.criticality) * 0.08 : 1;
      marker.current.scale.setScalar((selected ? 1.35 : 1) * pulse);
      marker.current.position.y = NODE_HEIGHT + Math.sin(clock.elapsedTime * 1.2 + x * 0.01) * 1.2;
    }
    if (selectionRing.current) {
      selectionRing.current.rotation.z += delta * 0.7;
      const pulse = 1 + Math.sin(clock.elapsedTime * 2.8) * 0.12;
      selectionRing.current.scale.setScalar(pulse);
    }
  });

  return (
    <group position={[x, y, z]}>
      <mesh position={[0, NODE_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[0.6, 0.6, NODE_HEIGHT, 6]} />
        <meshBasicMaterial color={color} transparent opacity={0.45} />
      </mesh>
      <mesh
        ref={marker}
        position={[0, NODE_HEIGHT, 0]}
        onClick={(event) => {
          event.stopPropagation();
          onSelect?.(component.id);
        }}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "auto")}
      >
        <CategoryGeometry category={component.category} size={size} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={selected ? 1.1 : 0.45} />
      </mesh>
      {(selected || component.status === "offline") && (
        <pointLight
          position={[0, NODE_HEIGHT, 0]}
          color={color}
          intensity={selected ? 2.2 : 1.2}
          distance={95}
        />
      )}
      {selected && (
        <mesh ref={selectionRing} position={[0, 0.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[size * 1.1, size * 1.4, 40]} />
          <meshBasicMaterial color="#F3DBA7" />
        </mesh>
      )}
    </group>
  );
}
