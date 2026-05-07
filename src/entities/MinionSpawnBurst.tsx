import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { Group, Mesh, Vector3 } from "three";
import { useBattleStore } from "../game/battleStore";

const BURST_DURATION_MS = 1600;

// Dark cloud puff that swells around the boss whenever a new minion appears.
// Lives in 3D space so the camera can move past it; sized large enough to
// "swallow" the boss for ~1s before fading.
export function MinionSpawnBurst({
  enemyPositionRef,
}: {
  enemyPositionRef: { current: Vector3 };
}) {
  const lastMinionSpawnAt = useBattleStore((state) => state.lastMinionSpawnAt);
  const groupRef = useRef<Group>(null);
  const startedAt = useRef<number | null>(null);
  // Snapshot the live minion count when the burst fires so the cloud envelope
  // grows with how many minions are now on the field. 1 → small puff, 3 →
  // dense thunderhead.
  const minionCountAtBurst = useRef(0);

  useEffect(() => {
    if (lastMinionSpawnAt === 0) return;
    startedAt.current = performance.now();
    minionCountAtBurst.current = useBattleStore.getState().minions.length;
  }, [lastMinionSpawnAt]);

  const cloudCount = 7;
  const cloudOffsets = useMemo(
    () =>
      Array.from({ length: cloudCount }, (_, i) => {
        const angle = (i / cloudCount) * Math.PI * 2;
        return {
          baseAngle: angle,
          radiusBase: 0.6 + Math.random() * 0.6,
          height: 0.9 + Math.random() * 1.6,
          phase: Math.random() * Math.PI * 2,
        };
      }),
    [],
  );

  useFrame(() => {
    const node = groupRef.current;
    if (!node) return;
    if (startedAt.current === null) {
      node.visible = false;
      return;
    }
    const elapsed = performance.now() - startedAt.current;
    if (elapsed > BURST_DURATION_MS) {
      node.visible = false;
      startedAt.current = null;
      return;
    }
    node.visible = true;
    const k = elapsed / BURST_DURATION_MS;
    const grow = k < 0.35 ? k / 0.35 : 1;
    const fade = k < 0.55 ? 1 : 1 - (k - 0.55) / 0.45;
    const eased = grow * (1 + Math.sin(k * Math.PI * 2) * 0.05);

    node.position.copy(enemyPositionRef.current);
    node.position.y = Math.max(node.position.y, 1.4);

    // Density scales with how many minions are currently on the field.
    // 1 minion = baseline small puff, 3 minions = full thunderhead.
    const count = Math.max(1, minionCountAtBurst.current);
    const sizeMul = 1 + (count - 1) * 0.35;
    const opacityMul = Math.min(1, 0.85 + (count - 1) * 0.08);

    node.children.forEach((child, idx) => {
      // Last 2 children are the inner core + ring; only animate orbiting
      // cloud spheres in this loop.
      if (idx >= cloudOffsets.length) {
        const mesh = child as Mesh;
        mesh.scale.setScalar(sizeMul);
        const mat = mesh.material as { opacity?: number };
        if (mat && mat.opacity !== undefined) {
          mat.opacity = (idx === cloudOffsets.length ? 0.7 : 0.78) * fade * opacityMul;
        }
        return;
      }
      const data = cloudOffsets[idx];
      const angle = data.baseAngle + k * 1.4;
      const radius = (data.radiusBase + 1.1 * eased) * 1.25 * sizeMul;
      child.position.x = Math.cos(angle) * radius;
      child.position.z = Math.sin(angle) * radius;
      child.position.y = data.height * 0.75 + Math.sin(k * 6 + data.phase) * 0.22 - 0.25;
      const mesh = child as Mesh;
      const scale = (0.8 + eased * 1.4) * sizeMul;
      mesh.scale.setScalar(scale);
      const mat = mesh.material as { opacity?: number; emissiveIntensity?: number };
      if (mat && mat.opacity !== undefined) {
        mat.opacity = 0.78 * fade * opacityMul;
      }
      if (mat && mat.emissiveIntensity !== undefined) {
        mat.emissiveIntensity = 0.28 + Math.sin(k * 8 + data.phase) * 0.18;
      }
    });
  });

  return (
    <group ref={groupRef} visible={false}>
      {cloudOffsets.map((_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[1.0, 14, 12]} />
          <meshStandardMaterial
            color="#1a1f2c"
            emissive="#3a2a5a"
            emissiveIntensity={0.2}
            transparent
            opacity={0.6}
            depthWrite={false}
          />
        </mesh>
      ))}
      {/* Inner darkening core */}
      <mesh>
        <sphereGeometry args={[1.5, 18, 16]} />
        <meshStandardMaterial
          color="#04060c"
          emissive="#0a0816"
          emissiveIntensity={0.4}
          transparent
          opacity={0.55}
          depthWrite={false}
        />
      </mesh>
      {/* Lightning crackle ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.7, 0.06, 8, 64]} />
        <meshBasicMaterial color="#a780ff" transparent opacity={0.7} toneMapped={false} />
      </mesh>
    </group>
  );
}
