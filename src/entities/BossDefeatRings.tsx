import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Sprite, Vector3 } from "three";
import { AdditiveBlending } from "three";
import { useBattleStore } from "../game/battleStore";
import { weatherEnemies } from "../game/data";
import { assetUrl } from "../shared/assets";

// CLEAR SKY ボス撃破時の追加 VFX。既存 BossShatterBurst のシャード散布に
// 重ねて、bright core + 多重リング + 放射 spark を sprite で出して爆発感を
// 強める。リング/spark は敵のアクセントカラーで tint し、シャードと色味を
// 揃える。

const STAR_TEX_URL = assetUrl("/textures/particles/star.png");
const RING_TEX_URL = assetUrl("/textures/particles/flare.png");
const CORE_TEX_URL = assetUrl("/textures/particles/muzzle.png");

const LIFETIME_MS = 1200;
const SPARK_COUNT = 10;

type Burst = {
  id: number;
  spawnedAt: number;
  x: number;
  y: number;
  z: number;
  color: string;
};

function DefeatBurstMesh({ burst, onExpire }: { burst: Burst; onExpire: (id: number) => void }) {
  const coreTex = useTexture(CORE_TEX_URL);
  const ringTex = useTexture(RING_TEX_URL);
  const starTex = useTexture(STAR_TEX_URL);
  const coreRef = useRef<Sprite>(null);
  const ringARef = useRef<Sprite>(null);
  const ringBRef = useRef<Sprite>(null);
  const starRef = useRef<Sprite>(null);
  const sparkRefs = useRef<Array<Sprite | null>>([]);

  // 放射 spark の方向と速度を mount 時に固定。Math.random で円周上に散らす。
  const sparkDirs = useMemo(
    () =>
      Array.from({ length: SPARK_COUNT }, (_, i) => {
        const baseAngle = (i / SPARK_COUNT) * Math.PI * 2;
        const angle = baseAngle + (Math.random() - 0.5) * 0.4;
        const speed = 5.5 + Math.random() * 2.5;
        return {
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed * 0.85 + 0.8,
          vz: (Math.random() - 0.5) * 1.5,
        };
      }),
    [],
  );

  useFrame(() => {
    const elapsed = performance.now() - burst.spawnedAt;
    if (elapsed >= LIFETIME_MS) {
      onExpire(burst.id);
      return;
    }
    const t = elapsed / LIFETIME_MS;

    // 中央 core: 0ms ピーク → 220ms で 0
    const coreK = Math.max(0, 1 - elapsed / 220);
    if (coreRef.current) {
      const s = 1.6 + coreK * 0.8;
      coreRef.current.scale.set(s, s, 1);
      const m = coreRef.current.material as { opacity: number };
      m.opacity = coreK;
    }

    // ring A: 速い拡張（600ms で 5x）
    const rAT = Math.min(1, elapsed / 600);
    const rAK = (1 - rAT) ** 1.2;
    if (ringARef.current) {
      const s = 1.2 + rAT * 5.5;
      ringARef.current.scale.set(s, s, 1);
      const m = ringARef.current.material as { opacity: number };
      m.opacity = rAK * 0.85;
    }

    // ring B: 100ms 遅れて始まる、ゆっくり大きく（1000ms で 7x）
    const rBT = Math.max(0, Math.min(1, (elapsed - 100) / 1000));
    const rBK = (1 - rBT) ** 1.4;
    if (ringBRef.current) {
      const s = 0.9 + rBT * 7.5;
      ringBRef.current.scale.set(s, s, 1);
      const m = ringBRef.current.material as { opacity: number };
      m.opacity = rBK * 0.55;
    }

    // 星: 全体に広がる輝き、ゆっくり回転
    const starK = (1 - t) ** 1.2;
    if (starRef.current) {
      const s = 2.0 + t * 2.4;
      starRef.current.scale.set(s, s, 1);
      const m = starRef.current.material as { opacity: number; rotation: number };
      m.opacity = starK * 0.85;
      m.rotation = t * 1.0;
    }

    // 放射 spark: 外向きに飛びつつ重力で下降、fade
    const sparkFade = (1 - t) ** 1.1;
    sparkRefs.current.forEach((sp, i) => {
      if (!sp) return;
      const dir = sparkDirs[i];
      const elapsedSec = elapsed / 1000;
      sp.position.x = dir.vx * elapsedSec;
      sp.position.y = dir.vy * elapsedSec - 1.8 * elapsedSec * elapsedSec;
      sp.position.z = dir.vz * elapsedSec;
      const s = 0.55 + sparkFade * 0.3;
      sp.scale.set(s, s, 1);
      const m = sp.material as { opacity: number };
      m.opacity = sparkFade;
    });
  });

  return (
    <group position={[burst.x, burst.y, burst.z]}>
      <sprite ref={ringBRef}>
        <spriteMaterial map={ringTex} color={burst.color} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      <sprite ref={ringARef}>
        <spriteMaterial map={ringTex} color={burst.color} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      <sprite ref={starRef}>
        <spriteMaterial map={starTex} color="#ffffff" transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      <sprite ref={coreRef}>
        <spriteMaterial map={coreTex} color="#ffffff" transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      {sparkDirs.map((_, i) => (
        <sprite
          key={i}
          ref={(el) => {
            sparkRefs.current[i] = el as Sprite | null;
          }}
        >
          <spriteMaterial map={starTex} color={burst.color} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
    </group>
  );
}

export function BossDefeatRings({ enemyPositionRef }: { enemyPositionRef: { current: Vector3 } }) {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const counter = useRef(0);
  const seenAt = useRef(0);

  useEffect(() => {
    return useBattleStore.subscribe((state) => {
      if (state.lastDefeatAt === seenAt.current || state.lastDefeatAt === 0) return;
      seenAt.current = state.lastDefeatAt;
      const enemy = weatherEnemies.find((e) => e.id === state.selectedEnemyId) ?? weatherEnemies[0];
      counter.current += 1;
      const pos = enemyPositionRef.current;
      setBursts((current) => [
        ...current,
        {
          id: counter.current,
          spawnedAt: performance.now(),
          x: pos.x,
          y: pos.y,
          z: pos.z,
          color: enemy.accentColor,
        },
      ]);
    });
  }, [enemyPositionRef]);

  function expire(id: number) {
    setBursts((c) => c.filter((b) => b.id !== id));
  }

  return (
    <>
      {bursts.map((b) => (
        <DefeatBurstMesh key={b.id} burst={b} onExpire={expire} />
      ))}
    </>
  );
}
