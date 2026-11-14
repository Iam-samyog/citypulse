"use client";

import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { InfrastructureCategory, InfrastructureComponent } from "@/types/infrastructure";
import { InfrastructureLayer } from "./InfrastructureLayer";
import { ImpactZone } from "./ImpactZone";

const ALL_CATEGORIES: InfrastructureCategory[] = [
  "electricity",
  "water",
  "transportation",
  "communication",
  "hospital",
  "emergency",
  "residential",
  "commercial",
];

interface CitySceneProps {
  components: InfrastructureComponent[];
  onSelectComponent?: (componentId: string) => void;
  selectedComponentId?: string | null;
  affectedComponents?: InfrastructureComponent[];
}

/**
 * The main 3D scene: the city of Ithaca. Member 1 (3D Frontend) owns this
 * file — ground plane, district layout, camera framing, lighting, and the
 * Odyssey visual theme all live here. The data-driven pieces
 * (InfrastructureLayer / InfrastructureNode / ImpactZone) are split out so
 * they can be swapped for richer models without touching scene setup.
 */
export function CityScene({
  components,
  onSelectComponent,
  selectedComponentId,
  affectedComponents = [],
}: CitySceneProps) {
  const [visibleLayers, setVisibleLayers] = useState<Set<InfrastructureCategory>>(
    new Set(ALL_CATEGORIES)
  );

  return (
    <div className="relative w-full h-full">
      <Canvas camera={{ position: [250, 250, 250], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[200, 300, 100]} intensity={1} />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <planeGeometry args={[1000, 1000]} />
          <meshStandardMaterial color="#0B2545" />
        </mesh>

        <ImpactZone affectedComponents={affectedComponents} />

        {ALL_CATEGORIES.map((category) => (
          <InfrastructureLayer
            key={category}
            category={category}
            components={components}
            visible={visibleLayers.has(category)}
            selectedComponentId={selectedComponentId}
            onSelectComponent={onSelectComponent}
          />
        ))}

        <OrbitControls />
      </Canvas>

      <LayerToggles visibleLayers={visibleLayers} onChange={setVisibleLayers} />
    </div>
  );
}

function LayerToggles({
  visibleLayers,
  onChange,
}: {
  visibleLayers: Set<InfrastructureCategory>;
  onChange: (layers: Set<InfrastructureCategory>) => void;
}) {
  function toggle(category: InfrastructureCategory) {
    const next = new Set(visibleLayers);
    if (next.has(category)) {
      next.delete(category);
    } else {
      next.add(category);
    }
    onChange(next);
  }

  return (
    <div className="absolute top-4 left-4 bg-aegean/80 border border-gold/40 p-3 rounded text-sm space-y-1">
      {ALL_CATEGORIES.map((category) => (
        <label key={category} className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={visibleLayers.has(category)}
            onChange={() => toggle(category)}
          />
          <span className="capitalize">{category}</span>
        </label>
      ))}
    </div>
  );
}
