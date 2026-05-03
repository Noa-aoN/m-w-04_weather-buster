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

const TRAIL_LIFETIME_MS = 220;
const TRAIL_MAX_LENGTH = 36;

function BulletTrail({ bullet, onExpire }: { bullet: Bullet; onExpire: (id: number) => void }) {
  const meshRef = useRef<Mesh>(null);

  const initialQuaternion = useMemo(() => {
    const q = new Quaternion();
    q.setFromUnitVectors(
      new Vector3(0, 0, 1),
      new Vector3(bullet.direction.x, bullet.direction.y, bullet.direction.z).normalize(),
    );
    return q;
  }, [bullet.direction]);

  useFrame(() => {
    const node = meshRef.current;
    if (!node) {
      return;
    }
    const elapsed = performance.now() - bullet.spawnedAt;
    if (elapsed >= TRAIL_LIFETIME_MS) {
      onExpire(bullet.id);
      return;
    }
    const ratio = elapsed / TRAIL_LIFETIME_MS;
    const length = TRAIL_MAX_LENGTH * Math.min(1, ratio * 2.4);
    const halfDistance = length / 2;
    node.position.set(
      bullet.origin.x + bullet.direction.x * halfDistance,
      bullet.origin.y + bullet.direction.y * halfDistance,
      bullet.origin.z + bullet.direction.z * halfDistance,
    );
    node.scale.set(1, 1, length);
    const material = node.material as { opacity?: number; emissiveIntensity?: number };
    material.opacity = Math.max(0, 1 - ratio * 1.05);
    if (material.emissiveIntensity !== undefined) {
      material.emissiveIntensity = 2 * (1 - ratio);
    }
  });

  return (
    <mesh ref={meshRef} quaternion={initialQuaternion}>
      <boxGeometry args={[0.04, 0.04, 1]} />
      <meshStandardMaterial
        color={bullet.color}
        emissive={bullet.color}
        emissiveIntensity={2}
        transparent
        opacity={1}
        toneMapped={false}
      />
    </mesh>
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
      const direction = new Vector3();
      camera.getWorldDirection(direction);
      const offset = new Vector3(0.34, -0.3, 0).applyQuaternion(camera.quaternion);
      const muzzle = camera.position.clone().add(offset).add(direction.clone().multiplyScalar(0.5));
      counter.current += 1;
      const bullet: Bullet = {
        id: counter.current,
        origin: { x: muzzle.x, y: muzzle.y, z: muzzle.z },
        direction: { x: direction.x, y: direction.y, z: direction.z },
        color: state.lastShotHit ? "#ffe16a" : "#9be3ff",
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
