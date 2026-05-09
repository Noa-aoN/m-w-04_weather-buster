import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { AdditiveBlending, DoubleSide, Mesh, Quaternion } from "three";
import { useBattleStore } from "../game/battleStore";

// Per-attack slash streak for windBlade. Mirrors BulletTrails: subscribe to
// `lastShotAt`, snapshot camera position+orientation at fire time, spawn a
// short-lived plane that lives in front of the camera. 4 variants (vertical
// / down-left diag / down-right diag / horizontal) cycle in lockstep with
// PlayerView's blade swing so the streak's angle matches the blade's path.

type Slash = {
  id: number;
  spawnedAt: number;
  variant: number;
  origin: { x: number; y: number; z: number };
  quaternion: { x: number; y: number; z: number; w: number };
  hit: boolean;
};

const SLASH_LIFETIME_MS = 200;
// Local-Z offset: place the streak ~1.6m in front of the camera so it lives
// where the blade tip lands. Closer than this and it clips into the camera
// near plane; further and the streak feels detached from the swing.
const FORWARD_OFFSET = 1.6;
// Roll angle (around the camera-forward axis) per variant. Matches the
// "down-then-X" direction PlayerView's blade lands on for that variant:
//   0 = straight-down chop      → vertical
//   1 = down + slight left      → \ diagonal (top-right → bottom-left)
//   2 = down + slight right     → / diagonal (top-left → bottom-right)
//   3 = overhead slam → forward → horizontal sweep
const VARIANT_ROLL_RAD = [0, Math.PI / 4, -Math.PI / 4, Math.PI / 2];

function SlashLine({ slash, onExpire }: { slash: Slash; onExpire: (id: number) => void }) {
  const coreRef = useRef<Mesh>(null);
  const haloRef = useRef<Mesh>(null);

  const baseQuat = useMemo(
    () => new Quaternion(slash.quaternion.x, slash.quaternion.y, slash.quaternion.z, slash.quaternion.w),
    [slash.quaternion],
  );

  useFrame(() => {
    const elapsed = performance.now() - slash.spawnedAt;
    if (elapsed >= SLASH_LIFETIME_MS) {
      onExpire(slash.id);
      return;
    }
    const ratio = elapsed / SLASH_LIFETIME_MS;
    // Fast carve-in over the first 25%, then linear fade-out. The initial
    // X-scale (along the streak's length) sweeps from 0 → 1 so the line
    // visibly draws across the screen rather than popping in fully formed.
    const reveal = Math.min(1, ratio * 4);
    const fade = ratio < 0.25 ? 1 : 1 - (ratio - 0.25) / 0.75;
    if (coreRef.current) {
      coreRef.current.scale.set(reveal, 1, 1);
      const m = coreRef.current.material as { opacity?: number };
      if (m.opacity !== undefined) m.opacity = fade;
    }
    if (haloRef.current) {
      haloRef.current.scale.set(reveal, 1 + ratio * 0.7, 1);
      const m = haloRef.current.material as { opacity?: number };
      if (m.opacity !== undefined) m.opacity = fade * 0.6;
    }
  });

  return (
    <group quaternion={baseQuat} position={[slash.origin.x, slash.origin.y, slash.origin.z]}>
      <group position={[0, 0, -FORWARD_OFFSET]} rotation={[0, 0, VARIANT_ROLL_RAD[slash.variant] ?? 0]}>
        {/* Bright white core — the cut line itself. */}
        <mesh ref={coreRef}>
          <planeGeometry args={[3.6, 0.05]} />
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
        {/* Coloured halo — gold on hit, cool cyan on miss, matching the
            BulletTrails palette so blade and gun reads consistently. */}
        <mesh ref={haloRef} position={[0, 0, -0.005]}>
          <planeGeometry args={[4.0, 0.20]} />
          <meshBasicMaterial
            color={slash.hit ? "#ffd24a" : "#bff7ff"}
            transparent
            opacity={0.6}
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

export function SlashTrails() {
  const { camera } = useThree();
  const [slashes, setSlashes] = useState<Slash[]>([]);
  const counter = useRef(0);
  // Variant cursor cycles 0→1→2→3→0… on each fire so the streak's angle
  // visually rotates between strikes — matches PlayerView's
  // `slashVariantRef` cadence.
  const variantRef = useRef(0);

  useEffect(() => {
    return useBattleStore.subscribe((state, prev) => {
      if (state.lastShotAt === prev.lastShotAt || state.lastShotAt === 0) {
        return;
      }
      if (state.selectedWeaponId !== "windBlade") {
        return;
      }
      const variant = variantRef.current;
      variantRef.current = (variant + 1) % VARIANT_ROLL_RAD.length;
      counter.current += 1;
      setSlashes((current) => [
        ...current,
        {
          id: counter.current,
          spawnedAt: performance.now(),
          variant,
          origin: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
          quaternion: {
            x: camera.quaternion.x,
            y: camera.quaternion.y,
            z: camera.quaternion.z,
            w: camera.quaternion.w,
          },
          hit: state.lastShotHit,
        },
      ]);
    });
  }, [camera]);

  function expire(id: number) {
    setSlashes((current) => current.filter((s) => s.id !== id));
  }

  return (
    <>
      {slashes.map((slash) => (
        <SlashLine key={slash.id} slash={slash} onExpire={expire} />
      ))}
    </>
  );
}
