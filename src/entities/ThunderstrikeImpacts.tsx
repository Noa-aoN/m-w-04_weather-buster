import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import type { Mesh } from "three";
import { AdditiveBlending } from "three";
import { useBattleStore } from "../game/battleStore";

// Thunderstorm 攻撃の着弾時に天頂から地面まで鋭い縦の bolt を描画。
// EnemyImpactBursts と同じイベントを subscribe するが、enemyId が
// thunderstorm のときだけ追加で発火し、200ms 程度の短いフラッシュで
// 「落雷した」を視覚化する。
//
// EnemyImpactBursts は地面の burst（ground spark）を担当、こちらは
// 縦方向の bolt。重ねて見ると "bolt が落ちて地面で爆ぜる" 連続演出になる。

const BOLT_LIFETIME_MS = 240;
const BOLT_TOP_Y = 8.5;

type Bolt = {
  id: number;
  spawnedAt: number;
  x: number;
  z: number;
  color: string;
};

function BoltMesh({ bolt, onExpire }: { bolt: Bolt; onExpire: (id: number) => void }) {
  const coreRef = useRef<Mesh>(null);
  const haloRef = useRef<Mesh>(null);
  useFrame(() => {
    const elapsed = performance.now() - bolt.spawnedAt;
    if (elapsed >= BOLT_LIFETIME_MS) {
      onExpire(bolt.id);
      return;
    }
    const t = elapsed / BOLT_LIFETIME_MS;
    // 高速 flicker: 早い周波数の sin で明滅、t が進むとともに減衰
    const flicker = (1 - t) * (0.55 + Math.abs(Math.sin(elapsed * 0.08)) * 0.45);
    if (coreRef.current) {
      const m = coreRef.current.material as { opacity: number };
      m.opacity = flicker;
      const sx = 0.95 + Math.sin(elapsed * 0.11) * 0.12;
      const sz = 0.95 + Math.cos(elapsed * 0.09) * 0.12;
      coreRef.current.scale.set(sx, 1, sz);
    }
    if (haloRef.current) {
      const m = haloRef.current.material as { opacity: number };
      m.opacity = flicker * 0.55;
      const sx = 1 + Math.sin(elapsed * 0.13) * 0.18;
      const sz = 1 + Math.cos(elapsed * 0.1) * 0.18;
      haloRef.current.scale.set(sx, 1, sz);
    }
  });
  // y 中央 = BOLT_TOP_Y / 2、高さ = BOLT_TOP_Y。bolt が地面まで届く。
  const midY = BOLT_TOP_Y / 2;
  return (
    <group position={[bolt.x, midY, bolt.z]}>
      {/* core: 細い白の柱、超 additive で目を奪う */}
      <mesh ref={coreRef}>
        <boxGeometry args={[0.12, BOLT_TOP_Y, 0.12]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* halo: 周囲ににじむ色付きの柱 */}
      <mesh ref={haloRef}>
        <boxGeometry args={[0.36, BOLT_TOP_Y, 0.36]} />
        <meshBasicMaterial color={bolt.color} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function ThunderstrikeImpacts() {
  const [bolts, setBolts] = useState<Bolt[]>([]);
  const counter = useRef(0);
  const seenAt = useRef(0);

  useEffect(() => {
    return useBattleStore.subscribe((state) => {
      if (state.lastEnemyImpactAt === seenAt.current || state.lastEnemyImpactAt === 0) return;
      if (state.lastEnemyImpactEnemyId !== "thunderstorm") return;
      // dodged は地面に弾は落ちないので bolt も出さない（演出整合）。
      // 直撃 / 遮蔽 はどちらも bolt が落ちる演出にする。
      if (state.lastEnemyImpactStatus === "dodged" || state.lastEnemyImpactStatus === "none") return;
      seenAt.current = state.lastEnemyImpactAt;
      counter.current += 1;
      const id = counter.current;
      const spawnedAt = performance.now();
      const x = state.lastEnemyImpactX;
      const z = state.lastEnemyImpactZ;
      const color = state.lastEnemyImpactColor;
      setBolts((current) => [...current, { id, spawnedAt, x, z, color }]);
    });
  }, []);

  function expire(id: number) {
    setBolts((c) => c.filter((b) => b.id !== id));
  }

  return (
    <>
      {bolts.map((b) => (
        <BoltMesh key={b.id} bolt={b} onExpire={expire} />
      ))}
    </>
  );
}
