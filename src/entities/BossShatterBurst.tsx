import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { Group, Mesh, Vector3 } from "three";
import { weatherEnemies } from "../game/data";
import { useBattleStore } from "../game/battleStore";

const SHARD_COUNT = 18;
const SHATTER_DURATION_MS = 1600;
const GRAVITY = 4.5;

// Shatter the boss into a brief shower of glowing shards on defeat. Lives at
// the boss's last world position; the camera pans upward as part of the
// clear sequence, so the shards naturally fall out of view rather than
// covering the post-clear sky.
export function BossShatterBurst({
  enemyPositionRef,
}: {
  enemyPositionRef: { current: Vector3 };
}) {
  const lastDefeatAt = useBattleStore((state) => state.lastDefeatAt);
  const selectedEnemyId = useBattleStore((state) => state.selectedEnemyId);
  const enemy = weatherEnemies.find((candidate) => candidate.id === selectedEnemyId) ?? weatherEnemies[0];
  const groupRef = useRef<Group>(null);
  const startedAt = useRef<number | null>(null);
  const seedAt = useRef(0);

  // Per-shard velocity / spin. Stable across mounts via useMemo so a remount
  // doesn't reset directions mid-burst.
  const shards = useMemo(
    () =>
      Array.from({ length: SHARD_COUNT }, () => {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * 0.8 + 0.2;
        const speed = 4.2 + Math.random() * 3.4;
        return {
          vx: Math.cos(theta) * Math.sin(phi) * speed,
          vy: Math.cos(phi) * speed * 0.7 + 1.4,
          vz: Math.sin(theta) * Math.sin(phi) * speed,
          spin: (Math.random() - 0.5) * 6,
          tilt: Math.random() * Math.PI * 2,
          scale: 0.32 + Math.random() * 0.32,
          startScale: 0.6 + Math.random() * 0.5,
        };
      }),
    [],
  );

  useEffect(() => {
    if (lastDefeatAt === 0) return;
    if (lastDefeatAt === seedAt.current) return;
    seedAt.current = lastDefeatAt;
    startedAt.current = performance.now();
    const node = groupRef.current;
    if (!node) return;
    // Anchor at boss position at the moment of defeat; the shards then
    // animate locally in the group's frame so the burst doesn't follow
    // the (now-fading) boss.
    node.position.copy(enemyPositionRef.current);
    // Reset child positions / rotations
    node.children.forEach((child, i) => {
      child.position.set(0, 0, 0);
      const data = shards[i % shards.length];
      child.rotation.set(data.tilt, data.tilt * 0.7, 0);
      const mesh = child as Mesh;
      mesh.scale.setScalar(data.startScale);
    });
  }, [lastDefeatAt, enemyPositionRef, shards]);

  useFrame((_, delta) => {
    const node = groupRef.current;
    if (!node) return;
    if (startedAt.current === null) {
      node.visible = false;
      return;
    }
    const elapsed = performance.now() - startedAt.current;
    if (elapsed > SHATTER_DURATION_MS) {
      node.visible = false;
      startedAt.current = null;
      return;
    }
    node.visible = true;
    const k = elapsed / SHATTER_DURATION_MS;
    const fade = k < 0.55 ? 1 : 1 - (k - 0.55) / 0.45;

    node.children.forEach((child, i) => {
      const data = shards[i % shards.length];
      child.position.x += data.vx * delta;
      child.position.y += data.vy * delta - GRAVITY * delta * (elapsed / 1000);
      child.position.z += data.vz * delta;
      child.rotation.x += data.spin * delta;
      child.rotation.y += data.spin * 0.7 * delta;
      const mesh = child as Mesh;
      mesh.scale.setScalar(data.scale * (1 - k * 0.3));
      const mat = mesh.material as { opacity?: number; emissiveIntensity?: number };
      if (mat && mat.opacity !== undefined) {
        mat.opacity = 0.9 * fade;
      }
      if (mat && mat.emissiveIntensity !== undefined) {
        mat.emissiveIntensity = 1.2 * fade;
      }
    });
  });

  return (
    <group ref={groupRef} visible={false}>
      {shards.map((s, i) => (
        <mesh key={i} rotation={[s.tilt, s.tilt * 0.7, 0]}>
          <tetrahedronGeometry args={[0.4, 0]} />
          <meshStandardMaterial
            color={enemy.coreColor}
            emissive={enemy.accentColor}
            emissiveIntensity={1.2}
            transparent
            opacity={0.9}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
