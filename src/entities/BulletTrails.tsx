import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Sprite } from "three";
import { AdditiveBlending, Mesh, Quaternion, Vector3 } from "three";
import { useBattleStore } from "../game/battleStore";
import { assetUrl } from "../shared/assets";

const TIP_TEX_URL = assetUrl("/textures/particles/muzzle.png");
useTexture.preload(TIP_TEX_URL);

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
  const tipTex = useTexture(TIP_TEX_URL);
  const coreRef = useRef<Mesh>(null);
  const haloRef = useRef<Mesh>(null);
  const tipRef = useRef<Sprite>(null);

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
    const fade = Math.max(0, 1 - ratio * 1.05);

    // Positions are in the group's local frame: the group is parked at
    // bullet.origin and rotated so local +Z points along bullet.direction,
    // so we just walk the meshes along local +Z here.
    if (coreRef.current) {
      coreRef.current.position.set(0, 0, halfDistance);
      coreRef.current.scale.set(1, 1, travel);
      const m = coreRef.current.material as { opacity?: number };
      if (m.opacity !== undefined) m.opacity = fade;
    }
    if (haloRef.current) {
      // Halo grows in width as it dissipates — sells velocity smear.
      const widen = 1 + ratio * 1.4;
      haloRef.current.position.set(0, 0, halfDistance);
      haloRef.current.scale.set(widen, widen, travel);
      const m = haloRef.current.material as { opacity?: number };
      if (m.opacity !== undefined) m.opacity = fade * 0.55;
    }
    if (tipRef.current) {
      // 光が滴るような sprite tip。先端を走り、fade と若干の収縮で消える。
      tipRef.current.position.set(0, 0, travel);
      const tipFade = Math.max(0, 1 - ratio * 1.4);
      const mat = tipRef.current.material as { opacity: number };
      mat.opacity = tipFade;
      const s = 0.32 - ratio * 0.16;
      tipRef.current.scale.set(s, s, 1);
    }
  });

  return (
    <group
      quaternion={initialQuaternion}
      position={[bullet.origin.x, bullet.origin.y, bullet.origin.z]}
    >
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
      {/* Glowing pinpoint at the leading edge — sprite で常にカメラを向く
          ソフトグロー、additive で発光感。 */}
      <sprite ref={tipRef}>
        <spriteMaterial map={tipTex} color="#fff7d0" transparent opacity={1} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
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
      // Match the gun's muzzle in PlayerWeapon: gun group sits at
      // (0.42, -0.36, -0.62) in camera-local, and the muzzle flash lives
      // another -0.62 forward inside that group. Putting the bullet origin
      // at that combined offset makes the trail leave the actual barrel.
      // Direction goes from the muzzle toward a far point along the
      // camera's forward axis from the camera — so all shots converge on
      // the crosshair regardless of the lateral barrel offset.
      const aim = new Vector3();
      camera.getWorldDirection(aim);
      const muzzle = new Vector3(0.42, -0.36, -1.24).applyQuaternion(camera.quaternion).add(camera.position);
      const aimPoint = camera.position.clone().add(aim.clone().multiplyScalar(120));
      const direction = aimPoint.sub(muzzle).normalize();
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
