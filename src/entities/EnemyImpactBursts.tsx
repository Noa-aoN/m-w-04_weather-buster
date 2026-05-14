import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Sprite } from "three";
import { AdditiveBlending } from "three";
import { useBattleStore } from "../game/battleStore";
import { assetUrl } from "../shared/assets";

// 敵攻撃 (lightningMarker) が地面に着弾した瞬間の sprite burst。
// status (hit / blocked / dodged) で派手さを変える:
//   hit     : 直撃 → 大きい core + リング + 放射 spark、白寄りに振って強調
//   blocked : 遮蔽 → 小さい灰寄り puff、「弾かれた」感
//   dodged  : 範囲外 → 控えめなリング、空振り感
//
// EnemyHitSparks と同じ Kenney sprite 系統を使い、語彙を揃える。

const CORE_TEX_URL = assetUrl("/textures/particles/muzzle.png");
const RING_TEX_URL = assetUrl("/textures/particles/flare.png");
const STAR_TEX_URL = assetUrl("/textures/particles/star.png");

type Status = "hit" | "blocked" | "dodged";

type Burst = {
  id: number;
  spawnedAt: number;
  x: number;
  y: number;
  z: number;
  color: string;
  status: Status;
  radius: number;
};

const LIFETIME_MS = 520;
const SPARK_COUNT = 8;

function ImpactBurstMesh({ burst, onExpire }: { burst: Burst; onExpire: (id: number) => void }) {
  const coreTex = useTexture(CORE_TEX_URL);
  const ringTex = useTexture(RING_TEX_URL);
  const starTex = useTexture(STAR_TEX_URL);
  const coreRef = useRef<Sprite>(null);
  const ringRef = useRef<Sprite>(null);
  const sparkRefs = useRef<Array<Sprite | null>>([]);

  // status ごとのスケール / 色 / spark 有無
  const config = useMemo(() => {
    if (burst.status === "blocked") {
      return {
        scale: 0.6,
        coreColor: "#dcdcdc",
        ringColor: "#888888",
        sparks: false,
      };
    }
    if (burst.status === "dodged") {
      return {
        scale: 0.45,
        coreColor: "#ffffff",
        ringColor: burst.color,
        sparks: false,
      };
    }
    // hit: 大きく派手に
    return {
      scale: Math.max(0.85, Math.min(1.4, burst.radius * 0.55)),
      coreColor: "#ffffff",
      ringColor: burst.color,
      sparks: true,
    };
  }, [burst.status, burst.color, burst.radius]);

  // 放射 spark の方向。XZ 平面上に円周配置 (地面着弾なので水平に飛ぶ)。
  const sparkDirs = useMemo(
    () =>
      Array.from({ length: SPARK_COUNT }, (_, i) => {
        const angle = (i / SPARK_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
        const speed = 3.0 + Math.random() * 1.5;
        return {
          vx: Math.cos(angle) * speed,
          vy: 0.6 + Math.random() * 0.4,
          vz: Math.sin(angle) * speed,
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

    // core: 0ms ピーク → 130ms で 0
    const coreK = Math.max(0, 1 - elapsed / 130);
    if (coreRef.current) {
      const s = config.scale * (0.6 + coreK * 0.4);
      coreRef.current.scale.set(s, s, 1);
      const m = coreRef.current.material as { opacity: number };
      m.opacity = coreK;
    }

    // ring: 全体ライフタイムで拡張 fade
    const ringK = (1 - t) ** 1.2;
    if (ringRef.current) {
      const s = config.scale * (0.7 + t * 2.4);
      ringRef.current.scale.set(s, s, 1);
      const m = ringRef.current.material as { opacity: number };
      m.opacity = ringK * 0.85;
    }

    // sparks (hit のみ): 外向きに飛ぶ + 重力で落下、fade
    if (config.sparks) {
      const sparkFade = (1 - t) ** 1.1;
      const elapsedSec = elapsed / 1000;
      sparkRefs.current.forEach((sp, i) => {
        if (!sp) return;
        const dir = sparkDirs[i];
        sp.position.x = dir.vx * elapsedSec;
        sp.position.y = dir.vy * elapsedSec - 1.5 * elapsedSec * elapsedSec;
        sp.position.z = dir.vz * elapsedSec;
        const s = 0.32 + sparkFade * 0.18;
        sp.scale.set(s, s, 1);
        const m = sp.material as { opacity: number };
        m.opacity = sparkFade * 0.85;
      });
    }
  });

  return (
    <group position={[burst.x, burst.y, burst.z]}>
      <sprite ref={ringRef}>
        <spriteMaterial map={ringTex} color={config.ringColor} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      <sprite ref={coreRef}>
        <spriteMaterial map={coreTex} color={config.coreColor} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      {config.sparks
        ? sparkDirs.map((_, i) => (
            <sprite
              key={i}
              ref={(el) => {
                sparkRefs.current[i] = el as Sprite | null;
              }}
            >
              <spriteMaterial map={starTex} color={burst.color} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
            </sprite>
          ))
        : null}
    </group>
  );
}

export function EnemyImpactBursts() {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const counter = useRef(0);
  const seenAt = useRef(0);

  useEffect(() => {
    return useBattleStore.subscribe((state) => {
      if (state.lastEnemyImpactAt === seenAt.current || state.lastEnemyImpactAt === 0) return;
      const status = state.lastEnemyImpactStatus;
      if (status === "none") return;
      seenAt.current = state.lastEnemyImpactAt;
      counter.current += 1;
      const id = counter.current;
      const spawnedAt = performance.now();
      const x = state.lastEnemyImpactX;
      const y = state.lastEnemyImpactY;
      const z = state.lastEnemyImpactZ;
      const color = state.lastEnemyImpactColor;
      const radius = state.lastEnemyImpactRadius;
      setBursts((current) => [...current, { id, spawnedAt, x, y, z, color, status, radius }]);
    });
  }, []);

  function expire(id: number) {
    setBursts((current) => current.filter((b) => b.id !== id));
  }

  return (
    <>
      {bursts.map((b) => (
        <ImpactBurstMesh key={b.id} burst={b} onExpire={expire} />
      ))}
    </>
  );
}
