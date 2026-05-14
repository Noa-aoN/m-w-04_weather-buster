import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { useMemo, useRef } from "react";
import type { RefObject } from "react";
import type { Group, Mesh, Sprite } from "three";
import { AdditiveBlending, Vector3 } from "three";
import { useBattleStore } from "../game/battleStore";
import type { WeatherEnemy } from "../game/types";
import { assetUrl } from "../shared/assets";
import { WeatherEnemyModel } from "./WeatherEnemyModel";

const CHARGE_STAR_TEX_URL = assetUrl("/textures/particles/star.png");
const CHARGE_RING_TEX_URL = assetUrl("/textures/particles/flare.png");

// 敵グループ内に置く装飾 sprite は raycast を no-op にする。
// PlayerController が raycaster.intersectObject(enemyRef, true) で
// recursive に敵ツリーを当てるが、Sprite.raycast は raycaster.camera
// を要求するため、デフォルト raycast のままだとクラッシュする。
// 装飾用 sprite はそもそも当たり判定対象外なので no-op で問題なし。
const NOOP_RAYCAST: import("three").Object3D["raycast"] = () => {};

const DEFEAT_GROW_MS = 360;
const DEFEAT_FADE_MS = 900;

const DEFEAT_FX_DURATION = 1.8;
const DEFEAT_PARTICLE_COUNT = 80;

function DefeatBurst({ color }: { color: string }) {
  const groupRef = useRef<Group>(null);
  const flashRef = useRef<Mesh>(null);
  const ringRef = useRef<Mesh>(null);
  const ring2Ref = useRef<Mesh>(null);
  const lastDefeatAt = useBattleStore((state) => state.lastDefeatAt);
  const startedAt = useRef<number | null>(null);
  const lastSeenDefeatAt = useRef(0);

  const particles = useMemo(() => {
    return Array.from({ length: DEFEAT_PARTICLE_COUNT }, () => {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const direction = new Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.sin(phi) * Math.sin(theta),
        Math.cos(phi),
      );
      // Bias slightly upward so the burst forms a debris dome rather than a
      // pure sphere — reads more dramatic with gravity-like fallout.
      direction.y += 0.3;
      direction.normalize();
      return {
        direction,
        speed: 5.5 + Math.random() * 7.5,
        size: 0.06 + Math.random() * 0.12,
        spinAxis: new Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
        spinSpeed: 6 + Math.random() * 8,
        // Mix of accent-coloured shards and bright white flash chips
        useWhite: Math.random() < 0.35,
        gravity: 0.6 + Math.random() * 0.8,
      };
    });
  }, []);

  useFrame(() => {
    const node = groupRef.current;
    if (!node) {
      return;
    }
    if (lastDefeatAt !== lastSeenDefeatAt.current) {
      lastSeenDefeatAt.current = lastDefeatAt;
      startedAt.current = lastDefeatAt > 0 ? performance.now() : null;
      // Reset particle positions
      for (let i = 0; i < node.children.length && i < particles.length; i += 1) {
        const child = node.children[i];
        child.position.set(0, 0, 0);
        child.rotation.set(0, 0, 0);
        const mat = (child as { material?: { opacity?: number; emissiveIntensity?: number } }).material;
        if (mat) {
          mat.opacity = 1;
          if (mat.emissiveIntensity !== undefined) {
            mat.emissiveIntensity = 3.0;
          }
        }
      }
    }
    if (startedAt.current === null) {
      node.visible = false;
      if (flashRef.current) flashRef.current.visible = false;
      if (ringRef.current) ringRef.current.visible = false;
      if (ring2Ref.current) ring2Ref.current.visible = false;
      return;
    }
    node.visible = true;
    const elapsed = (performance.now() - startedAt.current) / 1000;
    if (elapsed > DEFEAT_FX_DURATION) {
      node.visible = false;
      if (flashRef.current) flashRef.current.visible = false;
      if (ringRef.current) ringRef.current.visible = false;
      if (ring2Ref.current) ring2Ref.current.visible = false;
      return;
    }

    // Shards with gravity-like Y-decay
    for (let i = 0; i < particles.length; i += 1) {
      const child = node.children[i];
      if (!child) break;
      const data = particles[i];
      child.position.x = data.direction.x * data.speed * elapsed;
      child.position.y = data.direction.y * data.speed * elapsed - data.gravity * elapsed * elapsed * 4.5;
      child.position.z = data.direction.z * data.speed * elapsed;
      child.rotation.x += data.spinSpeed * 0.016 * data.spinAxis.x;
      child.rotation.y += data.spinSpeed * 0.016 * data.spinAxis.y;
      child.rotation.z += data.spinSpeed * 0.016 * data.spinAxis.z;
      const mat = (child as { material?: { opacity?: number; emissiveIntensity?: number } }).material;
      if (mat) {
        mat.opacity = Math.max(0, 1 - elapsed * 0.7);
        if (mat.emissiveIntensity !== undefined) {
          mat.emissiveIntensity = Math.max(0, 3.0 - elapsed * 1.7);
        }
      }
    }

    // Central white flash (very brief)
    if (flashRef.current) {
      const flashK = Math.max(0, 1 - elapsed / 0.35);
      flashRef.current.visible = flashK > 0;
      flashRef.current.scale.setScalar(0.5 + (1 - flashK) * 4);
      const mat = flashRef.current.material as { opacity?: number };
      if (mat.opacity !== undefined) mat.opacity = flashK * 0.95;
    }

    // Two expanding shockwave rings, offset in time
    const setRing = (ref: RefObject<Mesh | null>, delay: number) => {
      if (!ref.current) return;
      const local = elapsed - delay;
      ref.current.visible = local > 0 && local < 1.0;
      if (!ref.current.visible) return;
      const k = local / 1.0;
      const radius = 0.5 + k * 9;
      ref.current.scale.set(radius, radius, radius);
      const mat = ref.current.material as { opacity?: number };
      if (mat.opacity !== undefined) mat.opacity = (1 - k) * 0.85;
    };
    setRing(ringRef, 0);
    setRing(ring2Ref, 0.18);
  });

  return (
    <>
      {/* Central pop-in white flash */}
      <mesh ref={flashRef} visible={false}>
        <sphereGeometry args={[1, 18, 14]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0} toneMapped={false} depthWrite={false} />
      </mesh>
      {/* Expanding shockwave rings (XZ plane) */}
      <mesh ref={ringRef} visible={false} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.92, 1.0, 64]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0} toneMapped={false} depthWrite={false} />
      </mesh>
      <mesh ref={ring2Ref} visible={false} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.92, 1.0, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0} toneMapped={false} depthWrite={false} />
      </mesh>
      {/* Shards */}
      <group ref={groupRef}>
        {particles.map((particle, index) => (
          <mesh key={index}>
            <boxGeometry args={[particle.size, particle.size * 0.5, particle.size * 0.4]} />
            <meshStandardMaterial
              color={particle.useWhite ? "#ffffff" : color}
              emissive={particle.useWhite ? "#ffffff" : color}
              emissiveIntensity={3.0}
              transparent
              opacity={1}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
    </>
  );
}

function HitFlashShell() {
  const meshRef = useRef<Mesh>(null);
  const lastShotAt = useBattleStore((state) => state.lastShotAt);
  const lastShotHit = useBattleStore((state) => state.lastShotHit);
  const lastShotCritical = useBattleStore((state) => state.lastShotCritical);
  useFrame(() => {
    const node = meshRef.current;
    if (!node) return;
    const elapsed = performance.now() - lastShotAt;
    const visible = lastShotHit && elapsed < 130;
    node.visible = visible;
    if (!visible) return;
    const ratio = Math.max(0, 1 - elapsed / 130);
    const peak = lastShotCritical ? 0.55 : 0.32;
    const mat = node.material as { opacity?: number };
    if (mat.opacity !== undefined) mat.opacity = ratio * peak;
    node.scale.setScalar(1.05 + (1 - ratio) * 0.18);
  });
  return (
    <mesh ref={meshRef} visible={false}>
      <sphereGeometry args={[1.05, 18, 14]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0} toneMapped={false} depthWrite={false} />
    </mesh>
  );
}

function HitCracks({ color }: { color: string }) {
  const groupRef = useRef<Group>(null);
  const lastShotAt = useBattleStore((state) => state.lastShotAt);
  const lastShotHit = useBattleStore((state) => state.lastShotHit);

  useFrame(() => {
    const node = groupRef.current;
    if (!node) {
      return;
    }
    const elapsed = performance.now() - lastShotAt;
    const visible = lastShotHit && elapsed < 260;
    node.visible = visible;
    if (!visible) {
      return;
    }
    const ratio = Math.max(0, 1 - elapsed / 260);
    node.scale.setScalar(1 + (1 - ratio) * 0.16);
    node.rotation.z += 0.035;
    node.traverse((child) => {
      const mat = (child as { material?: { opacity?: number; emissiveIntensity?: number } }).material;
      if (mat) {
        if (mat.opacity !== undefined) mat.opacity = ratio;
        if (mat.emissiveIntensity !== undefined) mat.emissiveIntensity = 1.2 + ratio * 2.8;
      }
    });
  });

  const cracks = [
    { x: -0.42, y: 0.24, z: 0.7, rot: -0.55, len: 0.72 },
    { x: 0.28, y: 0.4, z: 0.72, rot: 0.7, len: 0.58 },
    { x: 0.06, y: -0.1, z: 0.74, rot: 0.12, len: 0.84 },
    { x: -0.12, y: 0.08, z: 0.76, rot: 1.2, len: 0.52 },
  ];

  return (
    <group ref={groupRef}>
      {cracks.map((crack, index) => (
        <mesh key={index} position={[crack.x, crack.y, crack.z]} rotation={[0, 0, crack.rot]}>
          <boxGeometry args={[0.035, crack.len, 0.035]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.4} transparent opacity={0} toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[0, 0.05, 0.68]}>
        <ringGeometry args={[0.52, 0.58, 48]} />
        <meshBasicMaterial color="#fff7a8" transparent opacity={0} toneMapped={false} />
      </mesh>
    </group>
  );
}

function EnemyChargeFx({ color }: { color: string }) {
  const groupRef = useRef<Group>(null);
  const starRef = useRef<Sprite>(null);
  const ringRef = useRef<Sprite>(null);
  const starTex = useTexture(CHARGE_STAR_TEX_URL);
  const ringTex = useTexture(CHARGE_RING_TEX_URL);
  const enemyChargeStartedAt = useBattleStore((state) => state.enemyChargeStartedAt);
  const enemyChargeFiresAt = useBattleStore((state) => state.enemyChargeFiresAt);
  useFrame(({ clock }) => {
    const node = groupRef.current;
    if (!node) {
      return;
    }
    const now = performance.now();
    const active = enemyChargeFiresAt > 0 && now < enemyChargeFiresAt && now >= enemyChargeStartedAt;
    node.visible = active;
    if (!active) {
      return;
    }
    const total = Math.max(enemyChargeFiresAt - enemyChargeStartedAt, 1);
    const k = Math.min(1, (now - enemyChargeStartedAt) / total);
    const flicker = (Math.sin(clock.getElapsedTime() * 24) + 1) * 0.5;
    const expand = 1 + k * 0.6;
    node.scale.setScalar(expand);
    node.rotation.y = clock.getElapsedTime() * 2.2;
    // mesh layer (sphere + 2 torus): 既存ロジック
    node.children.forEach((child, idx) => {
      const mat = (child as { material?: { opacity?: number; emissiveIntensity?: number } }).material;
      if (mat) {
        if (mat.opacity !== undefined) mat.opacity = 0.18 + k * 0.4 + flicker * 0.18 * (idx + 1);
        if (mat.emissiveIntensity !== undefined) mat.emissiveIntensity = 1.5 + k * 1.6 + flicker * 1.4;
      }
    });
    // 中心の輝き sprite (star) — 回転しながら拡大、k で強度上げ
    if (starRef.current) {
      const s = 1.6 + k * 1.6 + flicker * 0.3;
      starRef.current.scale.set(s, s, 1);
      const m = starRef.current.material as { opacity: number; rotation: number };
      m.opacity = 0.65 + k * 0.3 + flicker * 0.05;
      m.rotation = clock.getElapsedTime() * 1.4;
    }
    // 拡張リング sprite — k と共にゆっくり脈動するリング
    if (ringRef.current) {
      const pulse = (Math.sin(clock.getElapsedTime() * 6) + 1) * 0.5;
      const s = 2.4 + k * 1.0 + pulse * 0.4;
      ringRef.current.scale.set(s, s, 1);
      const m = ringRef.current.material as { opacity: number };
      m.opacity = 0.35 + k * 0.4;
    }
  });
  return (
    <group ref={groupRef} visible={false}>
      <mesh>
        <sphereGeometry args={[1.1, 22, 18]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.6} transparent opacity={0.32} toneMapped={false} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 4]}>
        <torusGeometry args={[1.45, 0.04, 12, 64]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.2} transparent opacity={0.55} toneMapped={false} />
      </mesh>
      <mesh rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[1.65, 0.035, 12, 64]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.0} transparent opacity={0.4} toneMapped={false} />
      </mesh>
      {/* sprite 拡張: 中央の輝き星 + 拡張リング。チャージが進むほど明るく
          脈動して「来るぞ」を伝える。raycast=noop で敵 ray から除外。 */}
      <sprite ref={ringRef} raycast={NOOP_RAYCAST}>
        <spriteMaterial map={ringTex} color={color} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      <sprite ref={starRef} raycast={NOOP_RAYCAST}>
        <spriteMaterial map={starTex} color="#ffffff" transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
    </group>
  );
}

function EnemyBarrier({ color }: { color: string }) {
  const meshRef = useRef<Group>(null);
  const enemyBarrierUntil = useBattleStore((state) => state.enemyBarrierUntil);
  const lastEnemyBarrierAt = useBattleStore((state) => state.lastEnemyBarrierAt);
  useFrame(({ clock }) => {
    const node = meshRef.current;
    if (!node) {
      return;
    }
    const now = performance.now();
    const active = now < enemyBarrierUntil;
    node.visible = active;
    if (!active) {
      return;
    }
    const total = Math.max(enemyBarrierUntil - lastEnemyBarrierAt, 1);
    const elapsed = now - lastEnemyBarrierAt;
    const k = Math.min(1, elapsed / 220);
    const fadeOut = Math.max(0, Math.min(1, (enemyBarrierUntil - now) / 360));
    const ease = k * Math.min(1, fadeOut + 0.5);
    node.scale.setScalar(0.85 + ease * 0.7 + Math.sin(clock.getElapsedTime() * 8) * 0.04);
    node.rotation.y = clock.getElapsedTime() * 1.4;
    node.rotation.x = clock.getElapsedTime() * 0.7;
    node.children.forEach((child, idx) => {
      const mat = (child as { material?: { opacity?: number; emissiveIntensity?: number } }).material;
      if (mat) {
        if (mat.opacity !== undefined) mat.opacity = (idx === 0 ? 0.32 : 0.42) * fadeOut;
        if (mat.emissiveIntensity !== undefined) mat.emissiveIntensity = 1.1 + Math.sin(clock.getElapsedTime() * 6 + idx) * 0.6;
      }
    });
    void total;
  });
  return (
    <group ref={meshRef} visible={false}>
      <mesh>
        <icosahedronGeometry args={[1.55, 1]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.4} transparent opacity={0.32} wireframe toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.4, 24, 18]} />
        <meshBasicMaterial color={color} transparent opacity={0.22} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function EnemyFigure({ enemy, clear }: { enemy: WeatherEnemy; clear: boolean }) {
  const groupRef = useRef<Group>(null);
  const lastDefeatAt = useBattleStore((state) => state.lastDefeatAt);
  const startedAt = useRef<number | null>(null);
  const lastSeenDefeatAt = useRef(0);

  useFrame(() => {
    const node = groupRef.current;
    if (!node) {
      return;
    }

    if (lastDefeatAt !== lastSeenDefeatAt.current) {
      lastSeenDefeatAt.current = lastDefeatAt;
      startedAt.current = lastDefeatAt > 0 ? performance.now() : null;
      if (startedAt.current === null) {
        node.scale.setScalar(1);
        node.visible = true;
      }
    }

    if (!clear && startedAt.current !== null) {
      startedAt.current = null;
      node.scale.setScalar(1);
      node.visible = true;
    }

    if (startedAt.current === null) {
      node.scale.setScalar(1);
      node.visible = clear ? node.visible : true;
      return;
    }

    const elapsed = performance.now() - startedAt.current;
    if (elapsed < DEFEAT_GROW_MS) {
      const ratio = elapsed / DEFEAT_GROW_MS;
      node.scale.setScalar(1 + ratio * 0.5);
      node.visible = true;
    } else if (elapsed < DEFEAT_GROW_MS + DEFEAT_FADE_MS) {
      const ratio = (elapsed - DEFEAT_GROW_MS) / DEFEAT_FADE_MS;
      const k = Math.max(0, 1.5 - ratio * 1.6);
      node.scale.setScalar(k);
      node.visible = true;
    } else {
      node.scale.setScalar(0);
      node.visible = false;
    }
  });

  return (
    <>
      <group ref={groupRef}>
        <WeatherEnemyModel enemy={enemy} clear={clear} />
        <HitFlashShell />
        <HitCracks color={enemy.coreColor} />
        <mesh visible>
          <sphereGeometry args={[1.45, 16, 16]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        <EnemyBarrier color={enemy.accentColor} />
        <EnemyChargeFx color={enemy.accentColor} />
      </group>
      <DefeatBurst color={enemy.coreColor} />
    </>
  );
}
