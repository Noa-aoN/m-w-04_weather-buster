import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { Mesh, Quaternion, Vector3 } from "three";
import { useBattleStore } from "../game/battleStore";

type Bullet = {
  id: number;
  origin: { x: number; y: number; z: number };
  direction: { x: number; y: number; z: number };
  color: string;
  spawnedAt: number;
};

const TRAIL_LIFETIME_MS = 280;
const TRAIL_MAX_LENGTH = 42;

function BulletTrail({ bullet, onExpire }: { bullet: Bullet; onExpire: (id: number) => void }) {
  const coreRef = useRef<Mesh>(null);
  const haloRef = useRef<Mesh>(null);
  const tipRef = useRef<Mesh>(null);

  const initialQuaternion = useMemo(() => {
    const q = new Quaternion();
    q.setFromUnitVectors(
      new Vector3(0, 0, 1),
      new Vector3(bullet.direction.x, bullet.direction.y, bullet.direction.z).normalize(),
    );
    return q;
  }, [bullet.direction]);

  useFrame(() => {
    const elapsed = performance.now() - bullet.spawnedAt;
    if (elapsed >= TRAIL_LIFETIME_MS) {
      onExpire(bullet.id);
      return;
    }
    const ratio = elapsed / TRAIL_LIFETIME_MS;
    // Travel growth — fast initial extend, then asymptote.
    const travel = TRAIL_MAX_LENGTH * Math.min(1, ratio * 3.0);
    const halfDistance = travel / 2;
    const cx = bullet.origin.x + bullet.direction.x * halfDistance;
    const cy = bullet.origin.y + bullet.direction.y * halfDistance;
    const cz = bullet.origin.z + bullet.direction.z * halfDistance;
    const fade = Math.max(0, 1 - ratio * 1.05);

    if (coreRef.current) {
      coreRef.current.position.set(cx, cy, cz);
      coreRef.current.scale.set(1, 1, travel);
      const m = coreRef.current.material as { opacity?: number };
      if (m.opacity !== undefined) m.opacity = fade;
    }
    if (haloRef.current) {
      // Halo grows in width as it dissipates — sells velocity smear.
      const widen = 1 + ratio * 1.4;
      haloRef.current.position.set(cx, cy, cz);
      haloRef.current.scale.set(widen, widen, travel);
      const m = haloRef.current.material as { opacity?: number };
      if (m.opacity !== undefined) m.opacity = fade * 0.55;
    }
    if (tipRef.current) {
      // Bright tip rides the leading edge.
      const tipDist = travel;
      tipRef.current.position.set(
        bullet.origin.x + bullet.direction.x * tipDist,
        bullet.origin.y + bullet.direction.y * tipDist,
        bullet.origin.z + bullet.direction.z * tipDist,
      );
      const tipFade = Math.max(0, 1 - ratio * 1.4);
      const m = tipRef.current.material as { opacity?: number };
      if (m.opacity !== undefined) m.opacity = tipFade;
      tipRef.current.scale.setScalar(1 - ratio * 0.5);
    }
  });

  return (
    <group quaternion={initialQuaternion}>
      {/* Bright white-hot core trail */}
      <mesh ref={coreRef}>
        <boxGeometry args={[0.025, 0.025, 1]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={1} toneMapped={false} depthWrite={false} />
      </mesh>
      {/* Coloured halo around the core (yellow on hit, cyan on miss) */}
      <mesh ref={haloRef}>
        <boxGeometry args={[0.075, 0.075, 1]} />
        <meshBasicMaterial color={bullet.color} transparent opacity={0.55} toneMapped={false} depthWrite={false} />
      </mesh>
      {/* Glowing pinpoint at the leading edge */}
      <mesh ref={tipRef}>
        <sphereGeometry args={[0.07, 10, 10]} />
        <meshBasicMaterial color="#fff7d0" transparent opacity={1} toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function BulletTrails() {
  const { camera } = useThree();
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const counter = useRef(0);

  useEffect(() => {
    return useBattleStore.subscribe((state, prev) => {
      if (state.lastShotAt === prev.lastShotAt || state.lastShotAt === 0) {
        return;
      }
      if (state.selectedWeaponId === "windBlade") {
        return;
      }
      const direction = new Vector3();
      camera.getWorldDirection(direction);
      const offset = new Vector3(0.34, -0.3, 0).applyQuaternion(camera.quaternion);
      const muzzle = camera.position.clone().add(offset).add(direction.clone().multiplyScalar(0.5));
      counter.current += 1;
      const bullet: Bullet = {
        id: counter.current,
        origin: { x: muzzle.x, y: muzzle.y, z: muzzle.z },
        direction: { x: direction.x, y: direction.y, z: direction.z },
        // Hit = warm gold halo, miss = cool cyan halo (white core stays the same)
        color: state.lastShotHit ? "#ffd24a" : "#7bd5ff",
        spawnedAt: performance.now(),
      };
      setBullets((current) => [...current, bullet]);
    });
  }, [camera]);

  function expire(id: number) {
    setBullets((current) => current.filter((bullet) => bullet.id !== id));
  }

  return (
    <>
      {bullets.map((bullet) => (
        <BulletTrail key={bullet.id} bullet={bullet} onExpire={expire} />
      ))}
    </>
  );
}
