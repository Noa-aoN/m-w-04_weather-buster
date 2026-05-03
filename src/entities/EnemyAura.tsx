import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group } from "three";
import type { WeatherEnemyId } from "../game/types";

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

function LightningAura({ color }: { color: string }) {
  const groupRef = useRef<Group>(null);

  useFrame(({ clock }) => {
    const node = groupRef.current;
    if (!node) {
      return;
    }
    const t = clock.getElapsedTime();
    for (let i = 0; i < node.children.length; i += 1) {
      const child = node.children[i];
      child.scale.x = 0.6 + (Math.sin(t * 9 + i) + 1) * 0.45;
      child.scale.z = 0.6 + (Math.cos(t * 11 + i) + 1) * 0.45;
      const mat = (child as { material?: { emissiveIntensity?: number } }).material;
      if (mat) {
        mat.emissiveIntensity = 1.4 + Math.abs(Math.sin(t * 14 + i)) * 2.6;
      }
    }
  });

  const bolts = [
    { x: -0.8, angle: 0.15 },
    { x: 0.0, angle: -0.08 },
    { x: 0.78, angle: 0.18 },
    { x: -0.4, angle: -0.22 },
    { x: 0.4, angle: 0.22 },
  ];

  return (
    <group ref={groupRef}>
      {bolts.map((bolt, index) => (
        <mesh key={index} position={[bolt.x, 0, -0.5]} rotation={[0, 0, bolt.angle]}>
          <boxGeometry args={[0.07, 2.6, 0.07]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.4} toneMapped={false} />
        </mesh>
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
