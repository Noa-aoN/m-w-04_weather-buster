import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Group, Mesh } from "three";
import { Vector3 } from "three";
import { findMinionType, weatherEnemies } from "../game/data";
import { useBattleStore } from "../game/battleStore";
import type { Minion } from "../game/types";
import { WeatherEnemyModel } from "./WeatherEnemyModel";
import { minionGroupsByMinionId, setMinionRoot } from "./minionRegistry";

// Slot offsets — left / right / behind, biased forward (toward the player)
// so minions sit roughly half-way between the boss and the player and act as
// front-line interceptors instead of clustering behind the boss.
const SLOT_OFFSETS: Array<[number, number]> = [
  [-3.0, 6.0],
  [3.0, 6.0],
  [0, 7.5],
  [-1.8, 4.2],
  [1.8, 4.2],
];

function MinionInstance({
  minion,
  bossPosition,
}: {
  minion: Minion;
  bossPosition: { current: Vector3 };
}) {
  const groupRef = useRef<Group>(null);
  const type = findMinionType(minion.typeId);
  const baseEnemy = useMemo(
    () => weatherEnemies.find((candidate) => candidate.id === type.baseEnemyId) ?? weatherEnemies[0],
    [type.baseEnemyId],
  );
  const status = useBattleStore((state) => state.status);
  const offset = SLOT_OFFSETS[minion.slot % SLOT_OFFSETS.length];

  useEffect(() => {
    const node = groupRef.current;
    if (!node) return;
    node.userData.minionId = minion.id;
    node.userData.isMinion = true;
    minionGroupsByMinionId.set(minion.id, node);
    return () => {
      minionGroupsByMinionId.delete(minion.id);
    };
  }, [minion.id]);

  useFrame((state) => {
    const node = groupRef.current;
    if (!node) return;
    const t = state.clock.getElapsedTime();
    const bx = bossPosition.current.x;
    const bz = bossPosition.current.z;
    const targetX = bx + offset[0];
    const targetZ = bz + offset[1];
    // Smooth follow at boss position so minions drift around the boss as it
    // moves. Slow lerp so they read as deliberate, hittable targets rather
    // than fast-darting specks.
    const k = 0.03;
    node.position.x += (targetX - node.position.x) * k;
    node.position.z += (targetZ - node.position.z) * k;
    node.position.y = type.hoverY + Math.sin(t * 1.3 + minion.slot) * type.hoverAmp;
    node.rotation.y = Math.sin(t * 0.6 + minion.slot) * 0.3;
    if (status !== "battle") {
      node.visible = false;
    } else {
      node.visible = true;
    }
  });

  const hpRatio = Math.max(0, Math.min(1, minion.hp / minion.maxHp));

  return (
    <group ref={groupRef} scale={type.scale}>
      <WeatherEnemyModel enemy={baseEnemy} compact />
      <Html
        position={[0, 1.6, 0]}
        center
        distanceFactor={6}
        zIndexRange={[20, 0]}
        wrapperClass="minionHpWrapper"
        style={{ pointerEvents: "none" }}
      >
        <div className="minionHpBar" aria-hidden="true">
          <i style={{ width: `${hpRatio * 100}%` }} />
        </div>
      </Html>
    </group>
  );
}

type DeathEvent = {
  key: number;
  position: Vector3;
  startedAt: number;
  accentColor: string;
};

const DEATH_DURATION_MS = 900;
const DEATH_SHARDS = 14;

function MinionDeathBurst({ event }: { event: DeathEvent }) {
  const groupRef = useRef<Group>(null);
  const shards = useMemo(
    () =>
      Array.from({ length: DEATH_SHARDS }, () => {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * 0.9 + 0.1;
        const speed = 5.6 + Math.random() * 3.2;
        return {
          vx: Math.cos(theta) * Math.sin(phi) * speed,
          vy: Math.cos(phi) * speed * 0.7 + 1.6,
          vz: Math.sin(theta) * Math.sin(phi) * speed,
          spin: (Math.random() - 0.5) * 12,
          tilt: Math.random() * Math.PI * 2,
          scale: 0.18 + Math.random() * 0.18,
        };
      }),
    [],
  );

  useEffect(() => {
    const node = groupRef.current;
    if (!node) return;
    node.position.copy(event.position);
    node.children.forEach((child, i) => {
      child.position.set(0, 0, 0);
      const data = shards[i % shards.length];
      child.rotation.set(data.tilt, data.tilt * 0.8, 0);
      const mesh = child as Mesh;
      mesh.scale.setScalar(data.scale);
    });
  }, [event.position, shards]);

  useFrame((_, delta) => {
    const node = groupRef.current;
    if (!node) return;
    const elapsed = performance.now() - event.startedAt;
    const k = Math.min(1, elapsed / DEATH_DURATION_MS);
    const fade = k < 0.5 ? 1 : 1 - (k - 0.5) / 0.5;
    node.children.forEach((child, i) => {
      const data = shards[i % shards.length];
      child.position.x += data.vx * delta;
      child.position.y += data.vy * delta - 9 * delta * (elapsed / 1000);
      child.position.z += data.vz * delta;
      child.rotation.x += data.spin * delta;
      child.rotation.y += data.spin * 0.8 * delta;
      const mesh = child as Mesh;
      mesh.scale.setScalar(data.scale * (1 - k * 0.4));
      const mat = mesh.material as { opacity?: number; emissiveIntensity?: number };
      if (mat?.opacity !== undefined) mat.opacity = 0.95 * fade;
      if (mat?.emissiveIntensity !== undefined) mat.emissiveIntensity = 1.6 * fade;
    });
  });

  return (
    <group ref={groupRef}>
      {shards.map((_, i) => (
        <mesh key={i}>
          <tetrahedronGeometry args={[0.32, 0]} />
          <meshStandardMaterial
            color="#dff8ff"
            emissive={event.accentColor}
            emissiveIntensity={1.6}
            transparent
            opacity={0.95}
            depthWrite={false}
          />
        </mesh>
      ))}
      {/* Bright pop sphere — quick punchy burst at the spawn instant */}
      <mesh>
        <sphereGeometry args={[0.6, 16, 12]} />
        <meshStandardMaterial
          color={event.accentColor}
          emissive={event.accentColor}
          emissiveIntensity={2.0}
          transparent
          opacity={0.6}
          depthWrite={false}
        />
      </mesh>
      {/* Outer shockwave torus */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.9, 0.05, 6, 48]} />
        <meshBasicMaterial color={event.accentColor} transparent opacity={0.7} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function MinionField({
  enemyPositionRef,
}: {
  enemyPositionRef: { current: Vector3 };
}) {
  const minions = useBattleStore((state) => state.minions);
  const groupRef = useRef<Group>(null);
  const prevMinionsRef = useRef<Minion[]>([]);
  const [deathEvents, setDeathEvents] = useState<DeathEvent[]>([]);

  useEffect(() => {
    setMinionRoot(groupRef.current);
    return () => {
      setMinionRoot(null);
    };
  }, []);

  // Detect minion removal — capture last known world position before its
  // group unmounts, queue a one-shot death burst, schedule it to drop out of
  // state after the animation finishes (fire-and-forget timeout).
  useEffect(() => {
    const previous = prevMinionsRef.current;
    const currentIds = new Set(minions.map((m) => m.id));
    const removed = previous.filter((m) => !currentIds.has(m.id));
    prevMinionsRef.current = minions;
    if (removed.length === 0) return;
    const newEvents: DeathEvent[] = [];
    const accent = weatherEnemies.find((e) => e.id === "cloudy")?.accentColor ?? "#a0d8ff";
    for (const minion of removed) {
      const group = minionGroupsByMinionId.get(minion.id);
      if (!group) continue;
      const pos = new Vector3();
      group.getWorldPosition(pos);
      newEvents.push({
        key: minion.id * 1000 + (Date.now() % 1000),
        position: pos,
        startedAt: performance.now(),
        accentColor: accent,
      });
    }
    if (newEvents.length === 0) return;
    setDeathEvents((prev) => [...prev, ...newEvents]);
    const eventKeys = new Set(newEvents.map((e) => e.key));
    window.setTimeout(() => {
      setDeathEvents((prev) => prev.filter((e) => !eventKeys.has(e.key)));
    }, DEATH_DURATION_MS + 100);
  }, [minions]);

  return (
    <group ref={groupRef}>
      {minions.map((minion) => (
        <MinionInstance key={minion.id} minion={minion} bossPosition={enemyPositionRef} />
      ))}
      {deathEvents.map((event) => (
        <MinionDeathBurst key={event.key} event={event} />
      ))}
    </group>
  );
}
