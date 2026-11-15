"use client";

import { Billboard, Text } from "@react-three/drei";

const districts = [
  ["THE COMMONS", 10, 0, 14], ["COLLEGETOWN", 90, 0, -110],
  ["EAST HILL", 220, 0, -30], ["NORTHSIDE", -75, 0, -180],
  ["SOUTHSIDE", -30, 0, 205], ["WEST END", -220, 0, -45],
  ["EAST SHORE", 245, 0, 155], ["INDUSTRIAL HARBOR", -245, 0, 155],
  ["AGORA", 175, 0, 175], ["PENELOPE HEIGHTS", -175, 0, 85],
] as const;

function Building({ x, z, w, d, h, color }: { x: number; z: number; w: number; d: number; h: number; color: string }) {
  return <group position={[x, 0, z]}>
    <mesh position={[0, h / 2, 0]} castShadow receiveShadow><boxGeometry args={[w, h, d]} /><meshStandardMaterial color={color} roughness={0.88} /></mesh>
    <mesh position={[0, h + 0.5, 0]} castShadow><coneGeometry args={[Math.max(w, d) * 0.72, 2, 4]} /><meshStandardMaterial color="#633f32" roughness={0.9} /></mesh>
    <mesh position={[0, h * 0.55, d / 2 + 0.06]}><planeGeometry args={[w * 0.32, h * 0.24]} /><meshStandardMaterial color="#8dd8dc" emissive="#347786" emissiveIntensity={0.25} /></mesh>
  </group>;
}

function Landmark({ title, position, color, kind }: { title: string; position: [number, number, number]; color: string; kind: "power" | "water" | "transit" | "sanctuary" }) {
  return <group position={position}>
    {kind === "power" && <><mesh position={[0, 18, 0]} castShadow><boxGeometry args={[40, 36, 32]} /><meshStandardMaterial color="#344c56" metalness={0.5} /></mesh>{[-12, 0, 12].map((x) => <mesh key={x} position={[x, 39, -8]}><cylinderGeometry args={[3, 4, 12, 12]} /><meshStandardMaterial color="#83979b" emissive={color} emissiveIntensity={0.4} /></mesh>)}</>}
    {kind === "water" && <><mesh position={[0, 5, 0]} castShadow><boxGeometry args={[52, 10, 36]} /><meshStandardMaterial color="#657b79" /></mesh>{[-15, 0, 15].map((x) => <mesh key={x} position={[x, 15, 0]}><cylinderGeometry args={[7, 7, 12, 16]} /><meshStandardMaterial color="#638b91" metalness={0.35} /></mesh>)}</>}
    {kind === "transit" && <><mesh position={[0, 1, 0]} rotation={[-Math.PI / 2, 0, 0]}><boxGeometry args={[30, 105, 1]} /><meshStandardMaterial color="#183e52" emissive={color} emissiveIntensity={0.8} /></mesh>{[-8, 0, 8].map((x) => <mesh key={x} position={[x, 2, 0]} rotation={[-Math.PI / 2, 0, 0]}><boxGeometry args={[0.8, 100, 0.8]} /><meshStandardMaterial color="#77edff" emissive="#18cfff" emissiveIntensity={2} /></mesh>)}</>}
    {kind === "sanctuary" && <><mesh position={[0, 8, 0]} castShadow><cylinderGeometry args={[23, 27, 16, 24]} /><meshStandardMaterial color="#d3b989" /></mesh><mesh position={[0, 19, 0]} castShadow><sphereGeometry args={[17, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#7fa9a7" metalness={0.35} /></mesh>{[-30, -15, 15, 30].map((x) => <mesh key={x} position={[x, 1, 30]} rotation={[-0.18, 0, 0]}><boxGeometry args={[12, 1, 16]} /><meshStandardMaterial color="#285d72" metalness={0.4} /></mesh>)}</>}
    <Billboard position={[0, 48, 0]} follow lockX={false} lockY={false} lockZ={false}>
      <Text
        color="#e6f7f5"
        fontSize={6}
        letterSpacing={0.08}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.45}
        outlineColor="#07151c"
      >
        {title}
      </Text>
    </Billboard>
  </group>;
}

/** Procedural, selectable-scale 3D city shell; all geography is fictional demo data. */
export function CityDistricts() {
  const buildings = districts.flatMap(([_, cx, __, cz], districtIndex) => {
    const items = [];
    for (let row = 0; row < 5; row++) for (let col = 0; col < 6; col++) {
      const seed = districtIndex * 31 + row * 7 + col * 13;
      const jitterX = ((seed * 17) % 11) - 5;
      const jitterZ = ((seed * 23) % 13) - 6;
      items.push(<Building key={`${districtIndex}-${row}-${col}`} x={cx + (col - 2.5) * 13 + jitterX} z={cz + (row - 2) * 13 + jitterZ} w={7 + seed % 5} d={7 + (seed * 3) % 5} h={9 + (seed * 7) % 17} color={["#b68c64", "#c4a273", "#987456", "#d0b382"][seed % 4]} />);
    }
    return items;
  });
  return <group>
    {/* stepped peninsula, cliffs, and bay */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4, 0]}><planeGeometry args={[720, 680]} /><meshStandardMaterial color="#43564a" /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[365, -5, 15]}><planeGeometry args={[260, 900]} /><meshStandardMaterial color="#10506a" roughness={0.28} metalness={0.2} /></mesh>
    {[[-340, 7, 0, 18, 28, 660], [320, 8, -250, 30, 32, 160], [320, 8, 250, 30, 32, 160], [-10, 5, 320, 650, 24, 26]].map(([x,y,z,w,h,d],i) => <mesh key={i} position={[x,y,z]} castShadow><boxGeometry args={[w,h,d]} /><meshStandardMaterial color="#62594b" /></mesh>)}
    {/* arterial street grid */}
    {[-260,-170,-80,10,100,190,280].map((v) => <mesh key={`r${v}`} rotation={[-Math.PI/2,0,0]} position={[v,-2.8,0]}><planeGeometry args={[6,620]} /><meshStandardMaterial color="#343d3c" /></mesh>)}
    {[-260,-170,-80,10,100,190,280].map((v) => <mesh key={`c${v}`} rotation={[-Math.PI/2,0,0]} position={[0,-2.7,v]}><planeGeometry args={[620,6]} /><meshStandardMaterial color="#343d3c" /></mesh>)}
    {buildings}
    {districts.map(([label,x,_,z]) => (
      <Billboard key={label} position={[x, 42, z - 43]} follow lockX={false} lockY={false} lockZ={false}>
        <Text
          color="#f3dba7"
          fontSize={5.5}
          letterSpacing={0.14}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.35}
          outlineColor="#07151c"
        >
          {label}
        </Text>
      </Billboard>
    ))}
    <Landmark title="THE POWER CITADEL" position={[-270, 8, 35]} color="#31d9ff" kind="power" />
    <Landmark title="POSEIDON WATERWORKS" position={[-100, 3, 255]} color="#43d8f2" kind="water" />
    <Landmark title="HERMES TRANSIT NETWORK" position={[40, 0, 60]} color="#37ddff" kind="transit" />
    <Landmark title="ATHENA SANCTUARY" position={[255, 8, -85]} color="#ffd06b" kind="sanctuary" />
  </group>;
}
