import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { AdditiveBlending, DoubleSide, Group, Quaternion, Vector3 } from "three";
import { useBattleStore } from "../game/battleStore";

// Mid-range crescent fired by windBlade right-click. Subscribes to
// `lastSlashProjectileAt` (NOT lastShotAt) so the close-range slash
// visuals don't double-fire. The crescent travels forward at a fixed
// speed, fading and stretching as it goes — sells "the blade hurled a
// pressure wave forward" rather than another carve in front of the camera.

type Projectile = {
  id: number;
  spawnedAt: number;
  origin: Vector3;
  quaternion: Quaternion;
  hit: boolean;
  critical: boolean;
};

// Travel for ~360ms before despawning. The reach is ~22m, so at 60m/s the
// crescent crosses the play area in roughly that window even when the
// enemy starts near max distance. Lifetime is intentionally a bit shorter
// than the cooldown (650ms) so two crescents never overlap on screen.
const PROJECTILE_LIFETIME_MS = 360;
const PROJECTILE_SPEED_M_S = 60;

function CrescentMesh({
  projectile,
  onExpire,
}: {
  projectile: Projectile;
  onExpire: (id: number) => void;
}) {
  const groupRef = useRef<Group>(null);
  const trailRef = useRef<Group>(null);

  // Forward axis in world space, derived once from the snapshotted camera
  // quaternion. Using a fresh Vector3 here avoids stomping a shared one
  // when multiple crescents are alive at the same time.
  const forward = useMemo(() => new Vector3(0, 0, -1).applyQuaternion(projectile.quaternion), [projectile.quaternion]);

  useFrame(() => {
    const elapsed = performance.now() - projectile.spawnedAt;
    if (elapsed >= PROJECTILE_LIFETIME_MS) {
      onExpire(projectile.id);
      return;
    }
    const ratio = elapsed / PROJECTILE_LIFETIME_MS;
    const distance = (elapsed / 1000) * PROJECTILE_SPEED_M_S;
    if (groupRef.current) {
      groupRef.current.position
        .copy(projectile.origin)
        .addScaledVector(forward, distance + 1.6);
    }
    // Quick fade-out near the end so the crescent doesn't pop out mid-flight.
    const fade = ratio < 0.7 ? 1 : 1 - (ratio - 0.7) / 0.3;
    if (trailRef.current) {
      trailRef.current.children.forEach((child) => {
        const m = (child as { material?: { opacity?: number } }).material;
        if (m && m.opacity !== undefined) {
          m.opacity = fade;
        }
      });
    }
  });

  // Crescent is built in a sub-group so we can rotate it 90° to a vertical
  // arc (matches how a thrown wind-slash naturally reads on screen).
  const haloColor = projectile.hit ? (projectile.critical ? "#ffe27a" : "#ffd24a") : "#bff7ff";
  return (
    <group ref={groupRef} quaternion={projectile.quaternion}>
      {/* Rotate so the crescent arcs vertically (top-to-bottom) along the
          flight axis. Without this the plane lies flat and reads as a
          horizontal beam, not a slash. */}
      <group ref={trailRef} rotation={[0, 0, Math.PI / 2]}>
        {/* Bright white core — the cutting edge. Long axis (first arg) is
            vertical after the Z-rotation above, so it controls the
            crescent's apparent *height*. */}
        <mesh>
          <planeGeometry args={[3.8, 0.10]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={1}
            toneMapped={false}
            blending={AdditiveBlending}
            side={DoubleSide}
            depthWrite={false}
          />
        </mesh>
        {/* Coloured halo — gold on hit, cyan on miss */}
        <mesh position={[0, 0, -0.005]}>
          <planeGeometry args={[4.4, 0.36]} />
          <meshBasicMaterial
            color={haloColor}
            transparent
            opacity={0.6}
            toneMapped={false}
            blending={AdditiveBlending}
            side={DoubleSide}
            depthWrite={false}
          />
        </mesh>
        {/* Trailing wisp behind the cutting edge — gives the crescent a
            sense of direction. Offset opposite to flight (positive local Z
            after the crescent rotation maps to "behind"). */}
        <mesh position={[0, 0, 0.6]}>
          <planeGeometry args={[2.8, 0.20]} />
          <meshBasicMaterial
            color={haloColor}
            transparent
            opacity={0.32}
            toneMapped={false}
            blending={AdditiveBlending}
            side={DoubleSide}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  );
}

export function SlashProjectiles() {
  const { camera } = useThree();
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const counter = useRef(0);

  useEffect(() => {
    return useBattleStore.subscribe((state, prev) => {
      if (state.lastSlashProjectileAt === prev.lastSlashProjectileAt || state.lastSlashProjectileAt === 0) {
        return;
      }
      counter.current += 1;
      setProjectiles((current) => [
        ...current,
        {
          id: counter.current,
          spawnedAt: performance.now(),
          origin: camera.position.clone(),
          quaternion: camera.quaternion.clone(),
          hit: state.lastSlashProjectileHit,
          critical: state.lastSlashProjectileCritical,
        },
      ]);
    });
  }, [camera]);

  function expire(id: number) {
    setProjectiles((current) => current.filter((p) => p.id !== id));
  }

  return (
    <>
      {projectiles.map((projectile) => (
        <CrescentMesh key={projectile.id} projectile={projectile} onExpire={expire} />
      ))}
    </>
  );
}
