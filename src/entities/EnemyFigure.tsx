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
        <mesh visible>
          <sphereGeometry args={[1.45, 16, 16]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
      <DefeatBurst color={enemy.coreColor} />
    </>
  );
}
