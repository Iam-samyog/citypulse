"use client";

import { type RefObject, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type {
  ComponentCategory,
  InfrastructureComponent,
  InfrastructureDependency,
} from "@/types/infrastructure";
import { InfrastructureLayer } from "./InfrastructureLayer";
import { NODE_HEIGHT } from "./InfrastructureNode";
import { ImpactZone } from "./ImpactZone";
import { CityDistricts } from "./CityDistricts";
import { DependencyFlow } from "./DependencyFlow";
import { OdysseyEnvironment } from "./OdysseyEnvironment";
import { ALL_CATEGORIES, DEPENDENCY_COLOR } from "./componentStyles";

const UPSTREAM_COLOR = "#F3DBA7";
const DOWNSTREAM_COLOR = "#57E1FF";
interface CitySceneProps {
  components: InfrastructureComponent[];
  dependencies?: InfrastructureDependency[];
  onSelectComponent?: (componentId: string) => void;
  selectedComponentId?: string | null;
  affectedComponents?: InfrastructureComponent[];
  viewMode?: "city" | "graph";
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
  dependencies = [],
  onSelectComponent,
  selectedComponentId,
  affectedComponents = [],
  viewMode = "city",
}: CitySceneProps) {
  const visibleLayers = useMemo(() => new Set<ComponentCategory>(ALL_CATEGORIES), []);
  const controlsRef = useRef<OrbitControlsImpl>(null);

  const visibleDependencies = dependencies;

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#081b25]">
      <Canvas
        className="!absolute inset-0"
        camera={{ position: [520, 550, 650], fov: 43, far: 5000 }}
        shadows={viewMode === "city"}
        dpr={[1, 1.35]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <OdysseyEnvironment reduced={viewMode === "graph"} />
        {viewMode === "city" ? <CityDistricts /> : <GraphGround />}

        {viewMode === "city" && <ImpactZone affectedComponents={affectedComponents} />}

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

        {viewMode === "graph" && (
          <>
            <DependencyLinks
              selectedComponentId={selectedComponentId}
              components={components}
              dependencies={visibleDependencies}
              visibleLayers={visibleLayers}
              showWholeNetwork
            />

            <DependencyFlow
              components={components}
              dependencies={visibleDependencies}
              selectedComponentId={selectedComponentId}
              visibleLayers={visibleLayers}
            />
          </>
        )}

        <CameraDirector
          focus={components.find((component) => component.id === selectedComponentId)}
          controlsRef={controlsRef}
          viewMode={viewMode}
        />
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.07}
          minDistance={145}
          maxDistance={1450}
          maxPolarAngle={viewMode === "graph" ? Math.PI * 0.5 : Math.PI * 0.47}
        />
      </Canvas>

    </div>
  );
}

function GraphGround() {
  return (
    <group position={[0, -3, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[760, 720]} />
        <meshStandardMaterial color="#07151d" roughness={1} metalness={0.15} />
      </mesh>
      <gridHelper args={[720, 24, "#266b79", "#123944"]} position={[0, 0.3, 0]} />
    </group>
  );
}

function CameraDirector({
  focus,
  controlsRef,
  viewMode,
}: {
  focus?: InfrastructureComponent;
  controlsRef: RefObject<OrbitControlsImpl | null>;
  viewMode: "city" | "graph";
}) {
  const { camera } = useThree();
  const flight = useRef<{
    startedAt: number;
    fromPosition: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toPosition: THREE.Vector3;
    toTarget: THREE.Vector3;
  } | null>(null);

  useEffect(() => {
    if (!controlsRef.current) return;
    const toTarget = viewMode === "graph"
      ? new THREE.Vector3(0, 0, 0)
      : focus
        ? new THREE.Vector3(focus.coordinates.x, 25, focus.coordinates.z)
        : new THREE.Vector3(0, 0, 0);
    const toPosition = viewMode === "graph"
      ? new THREE.Vector3(20, 760, 140)
      : focus
        ? toTarget.clone().add(new THREE.Vector3(185, 155, 210))
        : new THREE.Vector3(520, 550, 650);
    flight.current = {
      startedAt: -1,
      fromPosition: camera.position.clone(),
      fromTarget: controlsRef.current.target.clone(),
      toPosition,
      toTarget,
    };
  }, [focus, viewMode, camera, controlsRef]);

  useFrame(({ clock }) => {
    const active = flight.current;
    const controls = controlsRef.current;
    if (!active || !controls) return;
    if (active.startedAt < 0) active.startedAt = clock.elapsedTime;
    const elapsed = (clock.elapsedTime - active.startedAt) / 1.15;
    const t = Math.min(1, elapsed);
    const eased = t * t * (3 - 2 * t);
    camera.position.lerpVectors(active.fromPosition, active.toPosition, eased);
    controls.target.lerpVectors(active.fromTarget, active.toTarget, eased);
    controls.update();
    if (t >= 1) flight.current = null;
  });

  return null;
}
/** Lines from the selected component to what it needs (gold) and what needs it (cyan). */
function DependencyLinks({
  selectedComponentId,
  components,
  dependencies,
  visibleLayers,
  showWholeNetwork,
}: {
  selectedComponentId?: string | null;
  components: InfrastructureComponent[];
  dependencies: InfrastructureDependency[];
  visibleLayers: Set<ComponentCategory>;
  showWholeNetwork: boolean;
}) {
  const byId = new Map(components.map((component) => [component.id, component]));

  return (
    <group>
      {dependencies
        .filter(
          (dependency) =>
            showWholeNetwork ||
            dependency.sourceId === selectedComponentId ||
            dependency.targetId === selectedComponentId
        )
        .map((dependency) => {
          const source = byId.get(dependency.sourceId);
          const target = byId.get(dependency.targetId);
          if (!source || !target) return null;
          if (!visibleLayers.has(source.category) || !visibleLayers.has(target.category)) return null;
          const isSelected =
            dependency.sourceId === selectedComponentId || dependency.targetId === selectedComponentId;
          return (
            <Line
              key={dependency.id}
              points={[
                [source.coordinates.x, NODE_HEIGHT, source.coordinates.z],
                [target.coordinates.x, NODE_HEIGHT, target.coordinates.z],
              ]}
              color={
                isSelected
                  ? dependency.targetId === selectedComponentId
                    ? UPSTREAM_COLOR
                    : DOWNSTREAM_COLOR
                  : DEPENDENCY_COLOR[dependency.dependencyType]
              }
              lineWidth={isSelected ? 3 : 1}
              opacity={isSelected ? 0.95 : 0.2}
              transparent
              dashed={dependency.hasBackup}
              dashSize={10}
              gapSize={6}
            />
          );
        })}
    </group>
  );
}
