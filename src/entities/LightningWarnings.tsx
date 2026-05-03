import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group, Mesh, PointLight } from "three";
import { useBattleStore } from "../game/battleStore";
import type { WeatherEnemyId } from "../game/types";

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
  enemyId: WeatherEnemyId;
};

function MarkerRing({
  x,
  z,
  triggersAt,
  spawnAt,
  radius,
  color,
  enemyId,
}: {
  x: number;
  z: number;
  triggersAt: number;
  spawnAt: number;
  radius: number;
  color: string;
  enemyId: WeatherEnemyId;
}) {
  const ringRef = useRef<Mesh>(null);
  const innerRef = useRef<Mesh>(null);
  const xRef = useRef<Mesh>(null);

  useFrame(() => {
    const now = performance.now();
    const total = Math.max(triggersAt - spawnAt, 1);
    const ratio = Math.min(1, Math.max(0, (now - spawnAt) / total));
    const pulse = 0.6 + Math.sin(now * 0.022) * 0.4;

    if (ringRef.current) {
      const material = ringRef.current.material as { emissiveIntensity?: number };
      material.emissiveIntensity = 1.1 + ratio * 2.4 + pulse;
      ringRef.current.scale.setScalar(1 + Math.sin(now * 0.014) * 0.05);
      ringRef.current.rotation.z = enemyId === "tornado" || enemyId === "typhoon" ? now * 0.003 : 0;
    }
    if (innerRef.current) {
      const material = innerRef.current.material as { opacity?: number };
      material.opacity = 0.16 + ratio * 0.55;
    }
    if (xRef.current) {
      xRef.current.rotation.z = -now * 0.003;
    }
  });

  const isThunder = enemyId === "thunderstorm";
  const isVortex = enemyId === "tornado" || enemyId === "typhoon";

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
      {isThunder ? (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <ringGeometry args={[radius * 0.4, radius * 0.46, 24]} />
          <meshBasicMaterial color={color} transparent opacity={0.85} toneMapped={false} />
        </mesh>
      ) : null}
      {isVortex ? (
        <mesh ref={xRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
          <ringGeometry args={[radius * 0.5, radius * 0.55, 32, 1, 0, Math.PI * 1.5]} />
          <meshBasicMaterial color={color} transparent opacity={0.6} toneMapped={false} />
        </mesh>
      ) : null}
    </group>
  );
}

function CloudyProjectile({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[-0.18, 0, 0]}>
        <sphereGeometry args={[0.18, 16, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.4} toneMapped={false} />
      </mesh>
      <mesh position={[0.18, 0.08, 0]}>
        <sphereGeometry args={[0.16, 16, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.4} toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.06, 0]}>
        <sphereGeometry args={[0.14, 16, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.6} toneMapped={false} />
      </mesh>
    </group>
  );
}

function ThunderboltProjectile({ color }: { color: string }) {
  const groupRef = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.rotation.z = Math.sin(t * 30) * 0.18;
    groupRef.current.children.forEach((c) => {
      const mat = (c as { material?: { emissiveIntensity?: number } }).material;
      if (mat?.emissiveIntensity !== undefined) {
        mat.emissiveIntensity = 2.2 + Math.abs(Math.sin(t * 24)) * 2.2;
      }
    });
  });
  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.4, 0]} rotation={[0, 0, 0.18]}>
        <boxGeometry args={[0.14, 0.6, 0.14]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.6} toneMapped={false} />
      </mesh>
      <mesh position={[0.05, -0.1, 0]} rotation={[0, 0, -0.4]}>
        <boxGeometry args={[0.13, 0.5, 0.13]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.4} toneMapped={false} />
      </mesh>
      <mesh position={[-0.05, -0.55, 0]} rotation={[0, 0, 0.32]}>
        <boxGeometry args={[0.11, 0.42, 0.11]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.4} toneMapped={false} />
      </mesh>
    </group>
  );
}

function VortexProjectile({ color }: { color: string }) {
  const groupRef = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y = clock.getElapsedTime() * 8;
  });
  return (
    <group ref={groupRef}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.22, 0.05, 12, 36]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.4} toneMapped={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0.5]} position={[0, 0.06, 0]}>
        <torusGeometry args={[0.16, 0.04, 12, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.4} toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.8} toneMapped={false} />
      </mesh>
    </group>
  );
}

function IcicleProjectile({ color }: { color: string }) {
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.16, 0.7, 6]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.2} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, -0.08]}>
        <octahedronGeometry args={[0.14, 0]} />
        <meshStandardMaterial color="#ffffff" emissive={color} emissiveIntensity={1.8} toneMapped={false} />
      </mesh>
    </group>
  );
}

function DropletProjectile({ color }: { color: string }) {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.22, 16, 14]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.4} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.18, 0]}>
        <coneGeometry args={[0.14, 0.32, 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.2} toneMapped={false} />
      </mesh>
    </group>
  );
}

function WindBladeProjectile({ color }: { color: string }) {
  const groupRef = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.x = clock.getElapsedTime() * 14;
  });
  return (
    <group ref={groupRef}>
      <mesh rotation={[0, 0, Math.PI / 4]}>
        <torusGeometry args={[0.28, 0.04, 8, 32, Math.PI]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.6} toneMapped={false} />
      </mesh>
      <mesh rotation={[0, 0, -Math.PI / 4]}>
        <torusGeometry args={[0.22, 0.035, 8, 28, Math.PI]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.4} toneMapped={false} />
      </mesh>
    </group>
  );
}

function StyledProjectileShape({ enemyId, color, kind }: { enemyId: WeatherEnemyId; color: string; kind: AttackMarker["kind"] }) {
  if (enemyId === "thunderstorm") return <ThunderboltProjectile color={color} />;
  if (enemyId === "tornado") return <VortexProjectile color={color} />;
  if (enemyId === "typhoon") return <WindBladeProjectile color={color} />;
  if (enemyId === "blizzard") return <IcicleProjectile color={color} />;
  if (enemyId === "rainySeason") return <DropletProjectile color={color} />;
  if (enemyId === "cloudy") return <CloudyProjectile color={color} />;
  if (enemyId === "heavyRain") {
    if (kind === "linear") {
      return (
        <mesh>
          <capsuleGeometry args={[0.13, 0.7, 8, 12]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.6} toneMapped={false} />
        </mesh>
      );
    }
    return <DropletProjectile color={color} />;
  }
  // Fallback
  return (
    <mesh>
      <sphereGeometry args={[0.22, 14, 14]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.6} toneMapped={false} />
    </mesh>
  );
}

function MarkerProjectile({ marker }: { marker: AttackMarker }) {
  const groupRef = useRef<Group>(null);
  const trailRef = useRef<Mesh>(null);
  const lightRef = useRef<PointLight>(null);
  const trailParticles = useMemo(
    () =>
      Array.from({ length: 4 }, (_, i) => ({
        offset: -0.12 - i * 0.08,
        scale: 0.55 - i * 0.08,
        opacity: 0.45 - i * 0.08,
      })),
    [],
  );

  useFrame(() => {
    const node = groupRef.current;
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
    } else if (marker.kind === "falling") {
      node.rotation.set(0, 0, 0);
    } else {
      node.rotation.set(0, 0, 0);
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
      <group ref={groupRef}>
        <StyledProjectileShape enemyId={marker.enemyId} color={marker.color} kind={marker.kind} />
        {trailParticles.map((p, i) => (
          <mesh key={i} position={[0, 0, p.offset]}>
            <sphereGeometry args={[0.18 * p.scale, 10, 10]} />
            <meshBasicMaterial color={marker.color} transparent opacity={p.opacity} toneMapped={false} />
          </mesh>
        ))}
      </group>
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
          enemyId={marker.enemyId}
        />
      ))}
      {markers.map((marker) => (
        <MarkerProjectile key={`proj-${marker.id}`} marker={marker} />
      ))}
    </>
  );
}
