"use client";

import type { InfrastructureComponent } from "@/types/infrastructure";

interface ImpactZoneProps {
  affectedComponents: InfrastructureComponent[];
}

/**
 * Renders a translucent ground-plane highlight beneath affected
 * components so judges can see the geographic blast radius of an incident
 * at a glance (Chapter III: The Labyrinth).
 *
 * Member 1 (3D Frontend): a simple approach is a flat circle/ellipse per
 * district centroid; a stretch goal is a shader-based pulsing radius.
 */
export function ImpactZone({ affectedComponents }: ImpactZoneProps) {
  if (affectedComponents.length === 0) return null;

  const centroid = affectedComponents.reduce(
    (acc, c) => ({
      x: acc.x + c.location.x / affectedComponents.length,
      z: acc.z + c.location.z / affectedComponents.length,
    }),
    { x: 0, z: 0 }
  );

  const radius = 40 + affectedComponents.length * 15;

  return (
    <mesh position={[centroid.x, 0.05, centroid.z]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[radius, 32]} />
      <meshBasicMaterial color="#C1440E" transparent opacity={0.15} />
    </mesh>
  );
}
