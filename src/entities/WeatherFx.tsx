import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group, Mesh, PointLight } from "three";

// Weather visual effects used inside the battle scene's <Canvas>. Pure visuals
// (no store coupling), so they're easy to drop into other scenes / previews.

function LightningBolt({
  origin,
  target,
  color,
}: {
  origin: [number, number, number];
  target: [number, number, number];
  color: string;
}) {
  const meshRef = useRef<Mesh>(null);
  const lightRef = useRef<PointLight>(null);
  const segments = useMemo(() => {
    const dx = target[0] - origin[0];
    const dy = target[1] - origin[1];
    const dz = target[2] - origin[2];
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
    return { length, dx, dy, dz };
  }, [origin, target]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const flicker = 0.6 + Math.abs(Math.sin(t * 18)) * 0.7;
    if (meshRef.current) {
      const material = meshRef.current.material as { emissiveIntensity?: number };
      material.emissiveIntensity = 1.2 + flicker * 1.8;
      meshRef.current.scale.x = 0.85 + Math.sin(t * 22) * 0.18;
      meshRef.current.scale.z = 0.85 + Math.cos(t * 19) * 0.18;
    }
    if (lightRef.current) {
      lightRef.current.intensity = 1.5 + flicker * 4.5;
    }
  });

  const midX = (origin[0] + target[0]) / 2;
  const midY = (origin[1] + target[1]) / 2;
  const midZ = (origin[2] + target[2]) / 2;
  const angle = Math.atan2(segments.dx, segments.dy);

  return (
    <group>
      <mesh ref={meshRef} position={[midX, midY, midZ]} rotation={[0, 0, -angle]}>
        <boxGeometry args={[0.1, segments.length, 0.1]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.4} toneMapped={false} />
      </mesh>
      <pointLight ref={lightRef} position={[midX, midY, midZ]} color={color} distance={6} />
    </group>
  );
}

export function ThunderstormStrikes() {
  const groupRef = useRef<Group>(null);
  const startedAtRef = useRef(performance.now());

  useFrame(() => {
    const node = groupRef.current;
    if (!node) {
      return;
    }
    const elapsed = (performance.now() - startedAtRef.current) / 1000;
    const visibleFor = 3.4;
    const fadeFor = 1.8;
    const total = visibleFor + fadeFor;
    if (elapsed > total) {
      node.visible = false;
      return;
    }
    node.visible = true;
    const opacity = elapsed < visibleFor ? 1 : 1 - (elapsed - visibleFor) / fadeFor;
    node.traverse((child) => {
      const mat = (child as { material?: { opacity?: number; transparent?: boolean; emissiveIntensity?: number } }).material;
      if (mat && mat.opacity !== undefined) {
        mat.transparent = true;
        mat.opacity = opacity;
      }
      if (mat && mat.emissiveIntensity !== undefined) {
        mat.emissiveIntensity = mat.emissiveIntensity * opacity + 0.001;
      }
    });
  });

  return (
    <group ref={groupRef}>
      <LightningBolt origin={[0.2, 4.6, -5.2]} target={[-0.4, 0.1, -4.2]} color="#fff7a8" />
      <LightningBolt origin={[-1.4, 5.1, -5.0]} target={[-2.6, 0.1, -4.0]} color="#ffd84d" />
      <LightningBolt origin={[1.6, 5.4, -5.4]} target={[2.4, 0.1, -3.8]} color="#ffe16a" />
      <LightningBolt origin={[-0.7, 4.1, -5.1]} target={[-1.3, 1.4, -4.4]} color="#ffe88a" />
      <LightningBolt origin={[0.9, 4.2, -5.1]} target={[1.5, 1.5, -4.4]} color="#ffe88a" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -4]}>
        <ringGeometry args={[1.4, 2.8, 64]} />
        <meshStandardMaterial color="#ffd84d" emissive="#ffd84d" emissiveIntensity={1.6} transparent opacity={0.55} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function RainStreaks({ color }: { color: string }) {
  const groupRef = useRef<Group>(null);
  const streaks = useMemo(() => {
    return Array.from({ length: 80 }, () => ({
      x: (Math.random() - 0.5) * 24,
      y: Math.random() * 8 + 1,
      z: (Math.random() - 0.5) * 18 - 4,
      speed: 6 + Math.random() * 4,
    }));
  }, []);

  useFrame((_, delta) => {
    const node = groupRef.current;
    if (!node) {
      return;
    }
    for (let i = 0; i < node.children.length; i += 1) {
      const child = node.children[i];
      child.position.y -= streaks[i].speed * delta;
      if (child.position.y < 0) {
        child.position.y = 9;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {streaks.map((streak, index) => (
        <mesh key={index} position={[streak.x, streak.y, streak.z]}>
          <boxGeometry args={[0.02, 0.45, 0.02]} />
          <meshBasicMaterial color={color} transparent opacity={0.55} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

export function SnowDrift({ color }: { color: string }) {
  const groupRef = useRef<Group>(null);
  const flakes = useMemo(() => {
    return Array.from({ length: 90 }, () => ({
      x: (Math.random() - 0.5) * 26,
      y: Math.random() * 9,
      z: (Math.random() - 0.5) * 18 - 4,
      speed: 0.6 + Math.random() * 0.8,
      sway: Math.random() * Math.PI * 2,
    }));
  }, []);

  useFrame((state, delta) => {
    const node = groupRef.current;
    if (!node) {
      return;
    }
    const t = state.clock.getElapsedTime();
    for (let i = 0; i < node.children.length; i += 1) {
      const child = node.children[i];
      child.position.y -= flakes[i].speed * delta;
      child.position.x += Math.sin(t * 1.1 + flakes[i].sway) * delta * 0.4;
      if (child.position.y < 0) {
        child.position.y = 9;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {flakes.map((flake, index) => (
        <mesh key={index} position={[flake.x, flake.y, flake.z]}>
          <sphereGeometry args={[0.05, 6, 6]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
