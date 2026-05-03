import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group } from "three";
import { Vector3 } from "three";
import { useBattleStore } from "../game/battleStore";
import type { WeatherEnemy } from "../game/types";
import { WeatherEnemyModel } from "./WeatherEnemyModel";

const DEFEAT_GROW_MS = 360;
const DEFEAT_FADE_MS = 900;

function DefeatBurst({ color }: { color: string }) {
  const groupRef = useRef<Group>(null);
  const lastDefeatAt = useBattleStore((state) => state.lastDefeatAt);
  const startedAt = useRef<number | null>(null);
  const lastSeenDefeatAt = useRef(0);

  const particles = useMemo(() => {
    return Array.from({ length: 24 }, (_, index) => {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const direction = new Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.sin(phi) * Math.sin(theta),
        Math.cos(phi),
      );
      void index;
      return {
        direction,
        speed: 4.5 + Math.random() * 3.5,
        size: 0.08 + Math.random() * 0.06,
      };
    });
  }, []);

  useFrame(() => {
    const node = groupRef.current;
    if (!node) {
      return;
    }
    if (lastDefeatAt !== lastSeenDefeatAt.current) {
      lastSeenDefeatAt.current = lastDefeatAt;
      startedAt.current = lastDefeatAt > 0 ? performance.now() : null;
      for (const child of node.children) {
        child.position.set(0, 0, 0);
        const mat = (child as { material?: { opacity?: number; emissiveIntensity?: number } }).material;
        if (mat) {
          mat.opacity = 1;
          if (mat.emissiveIntensity !== undefined) {
            mat.emissiveIntensity = 2.4;
          }
        }
      }
    }
    if (startedAt.current === null) {
      node.visible = false;
      return;
    }
    node.visible = true;
    const elapsed = (performance.now() - startedAt.current) / 1000;
    if (elapsed > 1.4) {
      node.visible = false;
      return;
    }
    for (let i = 0; i < node.children.length; i += 1) {
      const child = node.children[i];
      const data = particles[i];
      child.position.x = data.direction.x * data.speed * elapsed;
      child.position.y = data.direction.y * data.speed * elapsed;
      child.position.z = data.direction.z * data.speed * elapsed;
      const mat = (child as { material?: { opacity?: number; emissiveIntensity?: number } }).material;
      if (mat) {
        mat.opacity = Math.max(0, 1 - elapsed * 0.85);
        if (mat.emissiveIntensity !== undefined) {
          mat.emissiveIntensity = Math.max(0, 2.4 - elapsed * 1.6);
        }
      }
    }
  });

  return (
    <group ref={groupRef}>
      {particles.map((particle, index) => (
        <mesh key={index}>
          <sphereGeometry args={[particle.size, 10, 10]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={2.4}
            transparent
            opacity={1}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function HitCracks({ color }: { color: string }) {
  const groupRef = useRef<Group>(null);
  const lastShotAt = useBattleStore((state) => state.lastShotAt);
  const lastShotHit = useBattleStore((state) => state.lastShotHit);

  useFrame(() => {
    const node = groupRef.current;
    if (!node) {
      return;
    }
    const elapsed = performance.now() - lastShotAt;
    const visible = lastShotHit && elapsed < 260;
    node.visible = visible;
    if (!visible) {
      return;
    }
    const ratio = Math.max(0, 1 - elapsed / 260);
    node.scale.setScalar(1 + (1 - ratio) * 0.16);
    node.rotation.z += 0.035;
    node.traverse((child) => {
      const mat = (child as { material?: { opacity?: number; emissiveIntensity?: number } }).material;
      if (mat) {
        if (mat.opacity !== undefined) mat.opacity = ratio;
        if (mat.emissiveIntensity !== undefined) mat.emissiveIntensity = 1.2 + ratio * 2.8;
      }
    });
  });

  const cracks = [
    { x: -0.42, y: 0.24, z: 0.7, rot: -0.55, len: 0.72 },
    { x: 0.28, y: 0.4, z: 0.72, rot: 0.7, len: 0.58 },
    { x: 0.06, y: -0.1, z: 0.74, rot: 0.12, len: 0.84 },
    { x: -0.12, y: 0.08, z: 0.76, rot: 1.2, len: 0.52 },
  ];

  return (
    <group ref={groupRef}>
      {cracks.map((crack, index) => (
        <mesh key={index} position={[crack.x, crack.y, crack.z]} rotation={[0, 0, crack.rot]}>
          <boxGeometry args={[0.035, crack.len, 0.035]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.4} transparent opacity={0} toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[0, 0.05, 0.68]}>
        <ringGeometry args={[0.52, 0.58, 48]} />
        <meshBasicMaterial color="#fff7a8" transparent opacity={0} toneMapped={false} />
      </mesh>
    </group>
  );
}

function EnemyBarrier({ color }: { color: string }) {
  const meshRef = useRef<Group>(null);
  const enemyBarrierUntil = useBattleStore((state) => state.enemyBarrierUntil);
  const lastEnemyBarrierAt = useBattleStore((state) => state.lastEnemyBarrierAt);
  useFrame(({ clock }) => {
    const node = meshRef.current;
    if (!node) {
      return;
    }
    const now = performance.now();
    const active = now < enemyBarrierUntil;
    node.visible = active;
    if (!active) {
      return;
    }
    const total = Math.max(enemyBarrierUntil - lastEnemyBarrierAt, 1);
    const elapsed = now - lastEnemyBarrierAt;
    const k = Math.min(1, elapsed / 220);
    const fadeOut = Math.max(0, Math.min(1, (enemyBarrierUntil - now) / 360));
    const ease = k * Math.min(1, fadeOut + 0.5);
    node.scale.setScalar(0.85 + ease * 0.7 + Math.sin(clock.getElapsedTime() * 8) * 0.04);
    node.rotation.y = clock.getElapsedTime() * 1.4;
    node.rotation.x = clock.getElapsedTime() * 0.7;
    node.children.forEach((child, idx) => {
      const mat = (child as { material?: { opacity?: number; emissiveIntensity?: number } }).material;
      if (mat) {
        if (mat.opacity !== undefined) mat.opacity = (idx === 0 ? 0.32 : 0.42) * fadeOut;
        if (mat.emissiveIntensity !== undefined) mat.emissiveIntensity = 1.1 + Math.sin(clock.getElapsedTime() * 6 + idx) * 0.6;
      }
    });
    void total;
  });
  return (
    <group ref={meshRef} visible={false}>
      <mesh>
        <icosahedronGeometry args={[1.55, 1]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} transparent opacity={0.32} wireframe toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.4, 24, 18]} />
        <meshBasicMaterial color={color} transparent opacity={0.22} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function EnemyFigure({ enemy, clear }: { enemy: WeatherEnemy; clear: boolean }) {
  const groupRef = useRef<Group>(null);
  const lastDefeatAt = useBattleStore((state) => state.lastDefeatAt);
  const startedAt = useRef<number | null>(null);
  const lastSeenDefeatAt = useRef(0);

  useFrame(() => {
    const node = groupRef.current;
    if (!node) {
      return;
    }

    if (lastDefeatAt !== lastSeenDefeatAt.current) {
      lastSeenDefeatAt.current = lastDefeatAt;
      startedAt.current = lastDefeatAt > 0 ? performance.now() : null;
      if (startedAt.current === null) {
        node.scale.setScalar(1);
        node.visible = true;
      }
    }

    if (!clear && startedAt.current !== null) {
      startedAt.current = null;
      node.scale.setScalar(1);
      node.visible = true;
    }

    if (startedAt.current === null) {
      node.scale.setScalar(1);
      node.visible = clear ? node.visible : true;
      return;
    }

    const elapsed = performance.now() - startedAt.current;
    if (elapsed < DEFEAT_GROW_MS) {
      const ratio = elapsed / DEFEAT_GROW_MS;
      node.scale.setScalar(1 + ratio * 0.5);
      node.visible = true;
    } else if (elapsed < DEFEAT_GROW_MS + DEFEAT_FADE_MS) {
      const ratio = (elapsed - DEFEAT_GROW_MS) / DEFEAT_FADE_MS;
      const k = Math.max(0, 1.5 - ratio * 1.6);
      node.scale.setScalar(k);
      node.visible = true;
    } else {
      node.scale.setScalar(0);
      node.visible = false;
    }
  });

  return (
    <>
      <group ref={groupRef}>
        <WeatherEnemyModel enemy={enemy} clear={clear} />
        <HitCracks color={enemy.coreColor} />
        <mesh visible>
          <sphereGeometry args={[1.45, 16, 16]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <EnemyBarrier color={enemy.accentColor} />
      </group>
      <DefeatBurst color={enemy.coreColor} />
    </>
  );
}
