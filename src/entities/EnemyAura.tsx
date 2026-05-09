import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import { useMemo, useRef } from "react";
import type { Group } from "three";
import type { WeatherEnemyId } from "../game/types";

// Decorative lightning bolts must not steal the shoot raycast from the
// enemy body. The aura sits inside the enemy group, so without this no-op
// the bolts could be picked up first and the bullet would register a hit
// against an aura line instead of the boss.
const NOOP_RAYCAST: import("three").Object3D["raycast"] = () => {};

function RainAura({ color }: { color: string }) {
  const groupRef = useRef<Group>(null);
  const drops = useMemo(
    () =>
      Array.from({ length: 28 }, () => ({
        x: (Math.random() - 0.5) * 2.6,
        y: Math.random() * 2.4 + 0.4,
        z: (Math.random() - 0.5) * 1.4 - 0.6,
        speed: 1.6 + Math.random() * 1.4,
      })),
    [],
  );

  useFrame((_, delta) => {
    const node = groupRef.current;
    if (!node) {
      return;
    }
    for (let i = 0; i < node.children.length; i += 1) {
      const child = node.children[i];
      child.position.y -= drops[i].speed * delta;
      if (child.position.y < -1.2) {
        child.position.y = 2.4;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {drops.map((drop, index) => (
        <mesh key={index} position={[drop.x, drop.y, drop.z]}>
          <boxGeometry args={[0.018, 0.32, 0.018]} />
          <meshBasicMaterial color={color} transparent opacity={0.65} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function SnowAura({ color }: { color: string }) {
  const groupRef = useRef<Group>(null);
  const flakes = useMemo(
    () =>
      Array.from({ length: 32 }, () => ({
        x: (Math.random() - 0.5) * 2.8,
        y: Math.random() * 2.6,
        z: (Math.random() - 0.5) * 1.6 - 0.4,
        speed: 0.3 + Math.random() * 0.5,
        sway: Math.random() * Math.PI * 2,
      })),
    [],
  );

  useFrame((state, delta) => {
    const node = groupRef.current;
    if (!node) {
      return;
    }
    const t = state.clock.getElapsedTime();
    for (let i = 0; i < node.children.length; i += 1) {
      const child = node.children[i];
      child.position.y -= flakes[i].speed * delta;
      child.position.x += Math.sin(t * 1.2 + flakes[i].sway) * delta * 0.3;
      if (child.position.y < -1.2) {
        child.position.y = 2.4;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {flakes.map((flake, index) => (
        <mesh key={index} position={[flake.x, flake.y, flake.z]}>
          <sphereGeometry args={[0.04, 6, 6]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

// Tall zigzag lightning bolts arranged like a cage around the thunderstorm.
// Each path is anchored at top / bottom to the same x so the bolt looks
// like a proper vertical stroke, with intermediate jags at randomised
// offsets. Two passes per bolt — a thick outer halo and a thin bright
// core — give the bolts proper electric depth.
function makeBoltPath(baseX: number, baseZ: number, jitter: number): Array<[number, number, number]> {
  const segments = 7;
  const points: Array<[number, number, number]> = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const y = 1.4 - t * 2.8;
    const wobble = i === 0 || i === segments ? 0 : (Math.random() - 0.5) * jitter;
    const dz = i === 0 || i === segments ? 0 : (Math.random() - 0.5) * jitter * 0.7;
    points.push([baseX + wobble, y, baseZ + dz]);
  }
  return points;
}

function LightningAura({ color }: { color: string }) {
  const bolts = useMemo(
    () => [
      { path: makeBoltPath(-0.95, -0.45, 0.28), phase: 0 },
      { path: makeBoltPath(-0.5, -0.55, 0.3), phase: 0.5 },
      { path: makeBoltPath(-0.15, -0.6, 0.34), phase: 1.0 },
      { path: makeBoltPath(0.2, -0.6, 0.34), phase: 1.5 },
      { path: makeBoltPath(0.55, -0.55, 0.3), phase: 2.0 },
      { path: makeBoltPath(0.95, -0.45, 0.28), phase: 2.6 },
    ],
    [],
  );
  const groupRef = useRef<Group>(null);

  useFrame(({ clock }) => {
    const node = groupRef.current;
    if (!node) return;
    const t = clock.getElapsedTime();
    // Each bolt is rendered as a pair (halo + core) inside one sub-group.
    node.children.forEach((child, i) => {
      const phase = bolts[i]?.phase ?? 0;
      const cycle = (t * 6 + phase) % 1;
      child.visible = cycle > 0.18;
    });
  });

  return (
    <group ref={groupRef}>
      {bolts.map((bolt, index) => (
        <group key={index}>
          {/* Soft outer halo — wider, low opacity, gives the volumetric glow. */}
          <Line
            points={bolt.path}
            color={color}
            lineWidth={6}
            transparent
            opacity={0.45}
            toneMapped={false}
            raycast={NOOP_RAYCAST}
          />
          {/* Bright core — narrow and near-white for the actual stroke. */}
          <Line
            points={bolt.path}
            color="#fffce0"
            lineWidth={2.2}
            transparent
            opacity={1}
            toneMapped={false}
            raycast={NOOP_RAYCAST}
          />
        </group>
      ))}
    </group>
  );
}

function VortexAura({ color }: { color: string }) {
  const groupRef = useRef<Group>(null);
  const particles = useMemo(
    () =>
      Array.from({ length: 48 }, (_, index) => ({
        angle: (index / 48) * Math.PI * 2,
        radius: 0.8 + Math.random() * 0.6,
        height: -1 + (index / 48) * 2.6,
        speed: 1 + Math.random() * 0.8,
      })),
    [],
  );

  useFrame((state, delta) => {
    const node = groupRef.current;
    if (!node) {
      return;
    }
    for (let i = 0; i < node.children.length; i += 1) {
      const child = node.children[i];
      const data = particles[i];
      data.angle += data.speed * delta;
      child.position.x = Math.cos(data.angle) * data.radius;
      child.position.z = Math.sin(data.angle) * data.radius - 0.4;
    }
    node.rotation.y = state.clock.getElapsedTime() * 0.3;
  });

  return (
    <group ref={groupRef}>
      {particles.map((particle, index) => (
        <mesh key={index} position={[Math.cos(particle.angle) * particle.radius, particle.height, Math.sin(particle.angle) * particle.radius - 0.4]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function MistAura({ color }: { color: string }) {
  const groupRef = useRef<Group>(null);

  useFrame(({ clock }) => {
    const node = groupRef.current;
    if (!node) {
      return;
    }
    const t = clock.getElapsedTime();
    for (let i = 0; i < node.children.length; i += 1) {
      const child = node.children[i];
      child.position.x = Math.sin(t * 0.4 + i) * 0.8 + (i - 4) * 0.2;
      child.position.y = Math.sin(t * 0.5 + i * 0.4) * 0.2 + 0.2;
    }
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: 8 }, (_, index) => (
        <mesh key={index} position={[(index - 4) * 0.3, 0.2, -0.4]}>
          <sphereGeometry args={[0.32, 16, 16]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.18} transparent opacity={0.45} />
        </mesh>
      ))}
    </group>
  );
}

function DropletAura({ color }: { color: string }) {
  const groupRef = useRef<Group>(null);

  useFrame(({ clock }) => {
    const node = groupRef.current;
    if (!node) {
      return;
    }
    const t = clock.getElapsedTime();
    for (let i = 0; i < node.children.length; i += 1) {
      const child = node.children[i];
      const phase = t * 1.5 + i * 0.7;
      child.position.y = -0.4 + ((phase % 3) / 3) * 2;
      child.scale.setScalar(0.7 + Math.sin(phase * 2) * 0.3);
    }
  });

  return (
    <group ref={groupRef}>
      {Array.from({ length: 10 }, (_, index) => (
        <mesh key={index} position={[(index - 5) * 0.26, 0.2, -0.4]}>
          <sphereGeometry args={[0.07, 12, 12]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

export function EnemyAura({ enemyId, color }: { enemyId: WeatherEnemyId; color: string }) {
  if (enemyId === "cloudy") return <MistAura color={color} />;
  if (enemyId === "heavyRain") return <RainAura color={color} />;
  if (enemyId === "rainySeason") return <DropletAura color={color} />;
  if (enemyId === "thunderstorm") return <LightningAura color={color} />;
  if (enemyId === "tornado" || enemyId === "typhoon") return <VortexAura color={color} />;
  if (enemyId === "blizzard") return <SnowAura color={color} />;
  return null;
}
