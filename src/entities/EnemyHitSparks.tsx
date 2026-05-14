import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import type { Sprite } from "three";
import { AdditiveBlending } from "three";
import { useBattleStore } from "../game/battleStore";
import { assetUrl } from "../shared/assets";

// 敵命中時の hit spark。MuzzleFlash と同じ Kenney circle 系 sprite を流用し、
// 命中地点で「core 一瞬 → 鋭いリング拡張」の二段で発光させる。critical 時は
// サイズと色を強調して "コア当て" を視覚的に伝える。

const CORE_TEX_URL = assetUrl("/textures/particles/muzzle.png");
const RING_TEX_URL = assetUrl("/textures/particles/flare.png");

type Burst = {
  id: number;
  spawnedAt: number;
  x: number;
  y: number;
  z: number;
  critical: boolean;
};

const BURST_LIFETIME_MS = 280;

function HitSpark({ burst, onExpire }: { burst: Burst; onExpire: (id: number) => void }) {
  const coreTex = useTexture(CORE_TEX_URL);
  const ringTex = useTexture(RING_TEX_URL);
  const coreRef = useRef<Sprite>(null);
  const ringRef = useRef<Sprite>(null);

  const baseScale = burst.critical ? 1.55 : 1.0;
  const coreColor = burst.critical ? "#ffffff" : "#fff7d0";
  const ringColor = burst.critical ? "#ffe88a" : "#ffd24a";

  useFrame(() => {
    const elapsed = performance.now() - burst.spawnedAt;
    if (elapsed >= BURST_LIFETIME_MS) {
      onExpire(burst.id);
      return;
    }
    // core: 0ms ピーク → 80ms で 0、ほぼ拡張せず瞬間光
    const coreK = Math.max(0, 1 - elapsed / 80);
    if (coreRef.current) {
      const s = baseScale * (0.45 + coreK * 0.25);
      coreRef.current.scale.set(s, s, 1);
      const mat = coreRef.current.material as { opacity: number };
      mat.opacity = coreK;
      coreRef.current.visible = coreK > 0.01;
    }
    // ring: BURST_LIFETIME を使ってゆるやかに拡張・fade
    const ringT = elapsed / BURST_LIFETIME_MS;
    const ringK = (1 - ringT) ** 1.3;
    if (ringRef.current) {
      const s = baseScale * (0.6 + ringT * 1.4);
      ringRef.current.scale.set(s, s, 1);
      const mat = ringRef.current.material as { opacity: number };
      mat.opacity = ringK * 0.85;
      ringRef.current.visible = ringK > 0.01;
    }
  });

  return (
    <group position={[burst.x, burst.y, burst.z]}>
      <sprite ref={coreRef}>
        <spriteMaterial map={coreTex} color={coreColor} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      <sprite ref={ringRef}>
        <spriteMaterial map={ringTex} color={ringColor} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
    </group>
  );
}

export function EnemyHitSparks() {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const counter = useRef(0);

  useEffect(() => {
    return useBattleStore.subscribe((state, prev) => {
      if (state.lastShotHitAt === prev.lastShotHitAt || state.lastShotHitAt === 0) {
        return;
      }
      counter.current += 1;
      setBursts((current) => [
        ...current,
        {
          id: counter.current,
          spawnedAt: performance.now(),
          x: state.lastShotHitX,
          y: state.lastShotHitY,
          z: state.lastShotHitZ,
          critical: state.lastShotHitCritical,
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
        <HitSpark key={burst.id} burst={burst} onExpire={expire} />
      ))}
    </>
  );
}
