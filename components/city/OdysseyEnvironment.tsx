"use client";

import { useRef } from "react";
import { Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const SEA_VERTEX = `
  uniform float uTime;
  varying float vWave;
  void main() {
    vec3 p = position;
    float broad = sin(p.x * 0.014 + uTime * 0.55) * 2.2;
    float cross = cos(p.y * 0.019 - uTime * 0.42) * 1.4;
    float detail = sin((p.x + p.y) * 0.035 + uTime) * 0.45;
    p.z += broad + cross + detail;
    vWave = (broad + cross + detail) / 4.05;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const SEA_FRAGMENT = `
  varying float vWave;
  void main() {
    vec3 deep = vec3(0.015, 0.16, 0.23);
    vec3 crest = vec3(0.10, 0.48, 0.58);
    vec3 color = mix(deep, crest, clamp(vWave * 0.35 + 0.48, 0.0, 1.0));
    gl_FragColor = vec4(color, 0.92);
  }
`;

/** Three.js-native sea, sky lighting and mythic atmospheric particles. */
export function OdysseyEnvironment({ reduced = false }: { reduced?: boolean }) {
  const seaMaterial = useRef<THREE.ShaderMaterial>(null);
  const sun = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (seaMaterial.current) seaMaterial.current.uniforms.uTime.value = clock.elapsedTime;
    if (sun.current) sun.current.rotation.y = clock.elapsedTime * 0.025;
  });

  return (
    <>
      <color attach="background" args={["#061923"]} />
      <fog attach="fog" args={["#081e29", 680, 1750]} />
      <hemisphereLight args={["#8bdff2", "#17271f", 0.85]} />
      <directionalLight
        position={[-380, 620, -240]}
        intensity={2.2}
        color="#ffe0a0"
        castShadow
      />
      <pointLight position={[380, 180, 260]} intensity={1.5} color="#49d7ff" distance={900} />

      {!reduced && (
        <mesh ref={sun} position={[-560, 420, -720]}>
          <sphereGeometry args={[38, 32, 24]} />
          <meshBasicMaterial color="#ffd27a" toneMapped={false} />
          <pointLight intensity={5} color="#ffc86b" distance={1200} />
        </mesh>
      )}

      {!reduced && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -10, 0]} receiveShadow>
          <planeGeometry args={[2200, 1900, 90, 90]} />
          <shaderMaterial
            ref={seaMaterial}
            vertexShader={SEA_VERTEX}
            fragmentShader={SEA_FRAGMENT}
            uniforms={{ uTime: { value: 0 } }}
            transparent
            depthWrite
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {!reduced && (
        <Sparkles
          count={110}
          scale={[1200, 480, 1100]}
          position={[0, 250, 0]}
          size={2.2}
          speed={0.18}
          opacity={0.35}
          color="#d8f7ff"
          noise={1.2}
        />
      )}
    </>
  );
}
