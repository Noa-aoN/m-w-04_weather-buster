import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { AdditiveBlending, Mesh } from "three";
import { useBattleStore } from "../game/battleStore";

// Tiny, brief spark rendered at the contact point when a shot or crescent
// is occluded by a static prop. Subscribes to lastShotBlockedAt so it
// triggers exactly once per blocked attempt — gives the player visual
// feedback that the hit was eaten by terrain rather than missed.

type Burst = {
  id: number;
  spawnedAt: number;
  x: number;
  y: number;
  z: number;
};

const BURST_LIFETIME_MS = 260;

function ImpactBurst({ burst, onExpire }: { burst: Burst; onExpire: (id: number) => void }) {
  const coreRef = useRef<Mesh>(null);
  const haloRef = useRef<Mesh>(null);
  useFrame(() => {
    const elapsed = performance.now() - burst.spawnedAt;
    if (elapsed >= BURST_LIFETIME_MS) {
      onExpire(burst.id);
      return;
    }
    const k = elapsed / BURST_LIFETIME_MS;
    const fade = 1 - k;
    if (coreRef.current) {
      const m = coreRef.current.material as { opacity?: number };
      if (m.opacity !== undefined) m.opacity = fade;
      coreRef.current.scale.setScalar(0.6 + k * 0.6);
    }
    if (haloRef.current) {
      const m = haloRef.current.material as { opacity?: number };
      if (m.opacity !== undefined) m.opacity = fade * 0.5;
      haloRef.current.scale.setScalar(1 + k * 1.4);
    }
  });
  return (
    <group position={[burst.x, burst.y, burst.z]}>
      {/* Bright white-hot core — pin-prick that fades out fast */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.08, 10, 10]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={1}
          toneMapped={false}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* Coloured halo expanding outward — gives the burst a quick "puff" */}
      <mesh ref={haloRef}>
        <sphereGeometry args={[0.18, 10, 10]} />
        <meshBasicMaterial
          color="#ffd24a"
          transparent
          opacity={0.5}
          toneMapped={false}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export function StaticImpactBursts() {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const counter = useRef(0);

  useEffect(() => {
    return useBattleStore.subscribe((state, prev) => {
      if (state.lastShotBlockedAt === prev.lastShotBlockedAt || state.lastShotBlockedAt === 0) {
        return;
      }
      counter.current += 1;
      setBursts((current) => [
        ...current,
        {
          id: counter.current,
          spawnedAt: performance.now(),
          x: state.lastShotBlockedX,
          y: state.lastShotBlockedY,
          z: state.lastShotBlockedZ,
        },
      ]);
    });
  }, []);

  function expire(id: number) {
    setBursts((current) => current.filter((b) => b.id !== id));
  }

  return (
    <>
      {bursts.map((burst) => (
        <ImpactBurst key={burst.id} burst={burst} onExpire={expire} />
      ))}
    </>
  );
}
