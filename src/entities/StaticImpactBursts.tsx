import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import type { Sprite } from "three";
import { AdditiveBlending } from "three";
import { useBattleStore } from "../game/battleStore";
import { assetUrl } from "../shared/assets";

// 静的プロップに弾道が遮られたときの ricochet spark。Kenney circle 系
// sprite を 2 枚使い、命中地点で hot core + 拡張リングを瞬間表示する。
// 「敵に当たらなかったが地形に弾かれた」ことを視覚的に伝える。

const CORE_TEX_URL = assetUrl("/textures/particles/muzzle.png");
const RING_TEX_URL = assetUrl("/textures/particles/flare.png");
useTexture.preload(CORE_TEX_URL);
useTexture.preload(RING_TEX_URL);

type Burst = {
  id: number;
  spawnedAt: number;
  x: number;
  y: number;
  z: number;
};

const BURST_LIFETIME_MS = 260;

function ImpactBurst({ burst, onExpire }: { burst: Burst; onExpire: (id: number) => void }) {
  const coreTex = useTexture(CORE_TEX_URL);
  const ringTex = useTexture(RING_TEX_URL);
  const coreRef = useRef<Sprite>(null);
  const ringRef = useRef<Sprite>(null);
  useFrame(() => {
    const elapsed = performance.now() - burst.spawnedAt;
    if (elapsed >= BURST_LIFETIME_MS) {
      onExpire(burst.id);
      return;
    }
    const k = elapsed / BURST_LIFETIME_MS;
    const fade = 1 - k;
    if (coreRef.current) {
      const s = 0.45 + k * 0.18;
      coreRef.current.scale.set(s, s, 1);
      const m = coreRef.current.material as { opacity: number };
      m.opacity = fade;
    }
    if (ringRef.current) {
      const s = 0.55 + k * 1.3;
      ringRef.current.scale.set(s, s, 1);
      const m = ringRef.current.material as { opacity: number };
      m.opacity = fade * 0.65;
    }
  });
  return (
    <group position={[burst.x, burst.y, burst.z]}>
      <sprite ref={coreRef}>
        <spriteMaterial map={coreTex} color="#ffffff" transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      <sprite ref={ringRef}>
        <spriteMaterial map={ringTex} color="#ffd24a" transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
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
      const id = counter.current;
      const spawnedAt = performance.now();
      const { lastShotBlockedX: x, lastShotBlockedY: y, lastShotBlockedZ: z } = state;
      setBursts((current) => [...current, { id, spawnedAt, x, y, z }]);
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
