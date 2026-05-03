import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh, PointLight } from "three";
import { useBattleStore } from "../game/battleStore";

type AttackMarker = {
  id: number;
  x: number;
  z: number;
  triggersAt: number;
  spawnAt: number;
  fromX: number;
  fromY: number;
  fromZ: number;
  radius: number;
  damage: number;
  color: string;
  trailGlow: number;
  kind: "arc" | "linear" | "falling";
};

function MarkerRing({
  x,
  z,
  triggersAt,
  spawnAt,
  radius,
  color,
}: {
  x: number;
  z: number;
  triggersAt: number;
  spawnAt: number;
  radius: number;
  color: string;
}) {
  const ringRef = useRef<Mesh>(null);
  const innerRef = useRef<Mesh>(null);

  useFrame(() => {
    const now = performance.now();
    const total = Math.max(triggersAt - spawnAt, 1);
    const ratio = Math.min(1, Math.max(0, (now - spawnAt) / total));
    const pulse = 0.6 + Math.sin(now * 0.022) * 0.4;

    if (ringRef.current) {
      const material = ringRef.current.material as { emissiveIntensity?: number };
      material.emissiveIntensity = 1.1 + ratio * 2.4 + pulse;
      ringRef.current.scale.setScalar(1 + Math.sin(now * 0.014) * 0.05);
    }
    if (innerRef.current) {
      const material = innerRef.current.material as { opacity?: number };
      material.opacity = 0.16 + ratio * 0.55;
    }
  });

  return (
    <group position={[x, 0.02, z]}>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius * 0.86, radius, 64]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.4}
          toneMapped={false}
          transparent
          opacity={0.92}
        />
      </mesh>
      <mesh ref={innerRef} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius * 0.85, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.22} toneMapped={false} />
      </mesh>
    </group>
  );
}

function MarkerProjectile({
  marker,
}: {
  marker: AttackMarker;
}) {
  const meshRef = useRef<Mesh>(null);
  const trailRef = useRef<Mesh>(null);
  const lightRef = useRef<PointLight>(null);

  useFrame(() => {
    const node = meshRef.current;
    if (!node) {
      return;
    }
    const now = performance.now();
    const total = Math.max(marker.triggersAt - marker.spawnAt, 1);
    const t = Math.max(0, Math.min(1, (now - marker.spawnAt) / total));

    const x = marker.fromX + (marker.x - marker.fromX) * t;
    const z = marker.fromZ + (marker.z - marker.fromZ) * t;
    let y: number;
    if (marker.kind === "linear") {
      const targetY = 1.6;
      y = marker.fromY + (targetY - marker.fromY) * t;
    } else if (marker.kind === "falling") {
      y = marker.fromY + (0.3 - marker.fromY) * t;
    } else {
      const linearY = marker.fromY + (0.4 - marker.fromY) * t;
      const arc = 4 * t * (1 - t) * Math.max(2, marker.fromY);
      y = linearY + arc;
    }
    node.position.set(x, y, z);

    if (marker.kind === "linear") {
      const dx = marker.x - marker.fromX;
      const dz = marker.z - marker.fromZ;
      const dy = 1.6 - marker.fromY;
      node.rotation.set(0, Math.atan2(dx, dz), Math.atan2(-dy, Math.sqrt(dx * dx + dz * dz)));
      node.scale.set(1, 1, 1);
    } else if (marker.kind === "falling") {
      node.rotation.set(0, 0, 0);
      const stretch = 1 + (1 - t) * 1.2;
      node.scale.set(0.9, stretch, 0.9);
    } else {
      node.rotation.set(0, 0, 0);
      node.scale.set(1, 1, 1);
    }

    if (trailRef.current) {
      trailRef.current.position.copy(node.position);
      trailRef.current.scale.setScalar(1 + Math.sin(now * 0.04) * 0.18);
      const mat = trailRef.current.material as { opacity?: number };
      if (mat.opacity !== undefined) {
        mat.opacity = 0.42 * (1 - t * 0.6);
      }
    }
    if (lightRef.current) {
      lightRef.current.position.copy(node.position);
      lightRef.current.intensity = 2.4 + marker.trailGlow * (1 - t);
    }
  });

  return (
    <group>
      <mesh ref={meshRef}>
        {marker.kind === "linear" ? (
          <capsuleGeometry args={[0.16, 0.9, 8, 12]} />
        ) : marker.kind === "falling" ? (
          <capsuleGeometry args={[0.18, 1.2, 8, 12]} />
        ) : (
          <sphereGeometry args={[0.22, 14, 14]} />
        )}
        <meshStandardMaterial
          color={marker.color}
          emissive={marker.color}
          emissiveIntensity={2.6}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={trailRef}>
        <sphereGeometry args={[0.55, 12, 12]} />
        <meshBasicMaterial color={marker.color} transparent opacity={0.42} toneMapped={false} />
      </mesh>
      <pointLight ref={lightRef} color={marker.color} distance={6} intensity={2.4} />
    </group>
  );
}

export function LightningWarnings() {
  const markers = useBattleStore((state) => state.lightningMarkers) as AttackMarker[];
  return (
    <>
      {markers.map((marker) => (
        <MarkerRing
          key={`ring-${marker.id}`}
          x={marker.x}
          z={marker.z}
          triggersAt={marker.triggersAt}
          spawnAt={marker.spawnAt}
          radius={marker.radius}
          color={marker.color}
        />
      ))}
      {markers.map((marker) => (
        <MarkerProjectile key={`proj-${marker.id}`} marker={marker} />
      ))}
    </>
  );
}
