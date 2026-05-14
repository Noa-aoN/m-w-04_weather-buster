import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import { AdditiveBlending, BackSide, type Camera, DoubleSide, Mesh, Vector3 as Vec3 } from "three";
import type { Sprite } from "three";
import { useBattleStore } from "../game/battleStore";
import { assetUrl } from "../shared/assets";
import type { Vector3 } from "three";

const STAR_TEX_URL = assetUrl("/textures/particles/star.png");
const RING_TEX_URL = assetUrl("/textures/particles/flare.png");

// Visual layer for the per-step weapon-skill animation. Reads
// `skillAnimation` + `lastShotAt` from the store and spawns short-lived
// meshes per step. Designed to be replaced with a fancier VFX pass later
// without touching the state machine.
//
// - kind === "ranged" → hit spark at the boss's current world position
// - kind === "slash"  → spherical "reach radius" wave centered on the
//   player. Reads as "the buster's effective melee zone just lit up".

type Spark = {
  id: number;
  spawnedAt: number;
  origin: { x: number; y: number; z: number };
  color: string;
};

type SlashWave = {
  id: number;
  spawnedAt: number;
  color: string;
};

type ActivationBurst = {
  id: number;
  spawnedAt: number;
  origin: { x: number; y: number; z: number };
  color: string;
};

const ACTIVATION_LIFETIME_MS = 480;

const SPARK_LIFETIME_MS = 380;
// Slightly longer than the per-step interval (130ms for windBlade) so two
// adjacent waves overlap into a continuous expanding pulse.
const SLASH_WAVE_LIFETIME_MS = 240;
// Mirrors `WIND_BLADE_REACH` in PlayerController: the in-game melee
// distance. Hard-coded here to avoid a circular import; if the gameplay
// reach is ever rebalanced, update both spots.
const SLASH_WAVE_RADIUS = 4.8;

function HitSpark({ spark, onExpire }: { spark: Spark; onExpire: (id: number) => void }) {
  const coreRef = useRef<Mesh>(null);
  const haloRef = useRef<Mesh>(null);
  useFrame(() => {
    const elapsed = performance.now() - spark.spawnedAt;
    if (elapsed >= SPARK_LIFETIME_MS) {
      onExpire(spark.id);
      return;
    }
    const k = elapsed / SPARK_LIFETIME_MS;
    const fade = 1 - k;
    if (coreRef.current) {
      const s = 0.32 + k * 0.55;
      coreRef.current.scale.setScalar(s);
      const m = coreRef.current.material as { opacity?: number };
      if (m.opacity !== undefined) m.opacity = fade;
    }
    if (haloRef.current) {
      const s = 0.55 + k * 1.5;
      haloRef.current.scale.setScalar(s);
      const m = haloRef.current.material as { opacity?: number };
      if (m.opacity !== undefined) m.opacity = fade * 0.45;
    }
  });
  return (
    <group position={[spark.origin.x, spark.origin.y, spark.origin.z]}>
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.32, 16, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={1} toneMapped={false} depthWrite={false} />
      </mesh>
      <mesh ref={haloRef}>
        <sphereGeometry args={[0.55, 16, 16]} />
        <meshBasicMaterial color={spark.color} transparent opacity={0.45} toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

/**
 * Spherical wave centered on the player (camera). Visualises the blade
 * skill's reach: starts as a tight bubble, swells to `SLASH_WAVE_RADIUS`,
 * fades out. Two layered shells — a translucent inner fill and a brighter
 * wireframe outer rim — make the boundary readable in any lighting.
 *
 * Tracks the camera's position every frame (rather than latching at fire
 * time) so the wave stays anchored to the moving player throughout its
 * lifetime.
 */
function SlashWaveMesh({
  wave,
  camera,
  onExpire,
}: {
  wave: SlashWave;
  camera: Camera;
  onExpire: (id: number) => void;
}) {
  const fillRef = useRef<Mesh>(null);
  const rimRef = useRef<Mesh>(null);
  useFrame(() => {
    const elapsed = performance.now() - wave.spawnedAt;
    if (elapsed >= SLASH_WAVE_LIFETIME_MS) {
      onExpire(wave.id);
      return;
    }
    const k = elapsed / SLASH_WAVE_LIFETIME_MS;
    // Fast expand to the reach radius, then hold the outer edge briefly.
    const radius = 0.4 + (1 - Math.pow(1 - k, 2)) * (SLASH_WAVE_RADIUS - 0.4);
    // Sharp punch in over the first 12%, fade out over the remainder.
    const fade = k < 0.12 ? k / 0.12 : 1 - (k - 0.12) / 0.88;
    if (fillRef.current) {
      fillRef.current.position.copy(camera.position);
      fillRef.current.scale.setScalar(radius);
      const m = fillRef.current.material as { opacity?: number };
      if (m.opacity !== undefined) m.opacity = Math.max(0, fade) * 0.32;
    }
    if (rimRef.current) {
      rimRef.current.position.copy(camera.position);
      rimRef.current.scale.setScalar(radius * 1.005);
      const m = rimRef.current.material as { opacity?: number };
      if (m.opacity !== undefined) m.opacity = Math.max(0, fade);
    }
  });
  return (
    <>
      {/* Inner translucent fill — `BackSide` shows the *inside* of the
          sphere from the player's POV (player stands at center). Without
          this we'd render only the outward-facing front, which is culled
          when the camera is inside the geometry. */}
      <mesh ref={fillRef}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshBasicMaterial
          color={wave.color}
          transparent
          opacity={0.32}
          toneMapped={false}
          blending={AdditiveBlending}
          side={BackSide}
          depthWrite={false}
        />
      </mesh>
      {/* Wireframe rim — `DoubleSide` so the lines stay visible regardless
          of which side of the sphere the camera is on. (At t=0 the radius
          is 0.4m which is briefly close to the camera; FrontSide alone
          would flicker as the camera entered/left the shell.) */}
      <mesh ref={rimRef}>
        <sphereGeometry args={[1, 28, 18]} />
        <meshBasicMaterial
          color={wave.color}
          wireframe
          transparent
          opacity={1}
          toneMapped={false}
          blending={AdditiveBlending}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

function ActivationBurstMesh({ burst, onExpire }: { burst: ActivationBurst; onExpire: (id: number) => void }) {
  const starTex = useTexture(STAR_TEX_URL);
  const ringTex = useTexture(RING_TEX_URL);
  const starRef = useRef<Sprite>(null);
  const ringRef = useRef<Sprite>(null);
  const rotRef = useRef(Math.random() * Math.PI * 2);
  useFrame(() => {
    const elapsed = performance.now() - burst.spawnedAt;
    if (elapsed >= ACTIVATION_LIFETIME_MS) {
      onExpire(burst.id);
      return;
    }
    const t = elapsed / ACTIVATION_LIFETIME_MS;
    // 星: ピーク→fade、ゆっくり回転して輝き感を出す
    const starK = (1 - t) ** 1.4;
    if (starRef.current) {
      const s = 1.2 + t * 1.8;
      starRef.current.scale.set(s, s, 1);
      const mat = starRef.current.material as { opacity: number; rotation: number };
      mat.opacity = starK;
      mat.rotation = rotRef.current + t * 0.6;
    }
    // リング: 大きく拡張、二段目のショックウェーブ
    const ringK = (1 - t) ** 1.2;
    if (ringRef.current) {
      const s = 0.8 + t * 4.5;
      ringRef.current.scale.set(s, s, 1);
      const mat = ringRef.current.material as { opacity: number };
      mat.opacity = ringK * 0.7;
    }
  });
  return (
    <group position={[burst.origin.x, burst.origin.y, burst.origin.z]}>
      <sprite ref={ringRef}>
        <spriteMaterial map={ringTex} color={burst.color} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
      <sprite ref={starRef}>
        <spriteMaterial map={starTex} color="#ffffff" transparent opacity={0} blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
    </group>
  );
}

export function SkillBurstVFX({
  enemyPositionRef,
}: {
  enemyPositionRef: React.RefObject<Vector3>;
}) {
  const { camera } = useThree();
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [waves, setWaves] = useState<SlashWave[]>([]);
  const [activations, setActivations] = useState<ActivationBurst[]>([]);
  const counter = useRef(0);

  useEffect(() => {
    return useBattleStore.subscribe((state, prev) => {
      // スキル発動の単発バースト（lastSkillAt が変わった瞬間）
      if (state.lastSkillAt !== prev.lastSkillAt && state.lastSkillAt !== 0) {
        counter.current += 1;
        const id = counter.current;
        const spawnedAt = performance.now();
        // カメラの少し前に置く: 視界中央で派手に光らせる。Vector3 を新規
        // 生成して取得（camera を直接 reference せず、現在位置の snapshot）。
        const fwd = camera.getWorldDirection(new Vec3());
        const origin = camera.position.clone().add(fwd.multiplyScalar(2.4));
        const originSnap = { x: origin.x, y: origin.y, z: origin.z };
        setActivations((current) => [
          ...current,
          { id, spawnedAt, origin: originSnap, color: "#ffd24a" },
        ]);
      }

      if (state.lastShotAt === prev.lastShotAt || state.lastShotAt === 0) {
        return;
      }
      const anim = state.skillAnimation;
      if (anim === null) {
        return;
      }
      counter.current += 1;
      const id = counter.current;
      const now = performance.now();
      if (anim.kind === "ranged") {
        const ePos = enemyPositionRef.current;
        const originSnap = { x: ePos.x, y: ePos.y + 0.2, z: ePos.z };
        setSparks((current) => [
          ...current,
          { id, spawnedAt: now, origin: originSnap, color: "#ffd24a" },
        ]);
      } else if (anim.kind === "slash") {
        // Warm gold matches the bullet trail's hit color so the slash zone
        // and a normal hit read as the same energy.
        setWaves((current) => [
          ...current,
          {
            id,
            spawnedAt: now,
            color: "#ffd24a",
          },
        ]);
      }
    });
  }, [enemyPositionRef, camera]);

  function expireSpark(id: number) {
    setSparks((current) => current.filter((entry) => entry.id !== id));
  }
  function expireWave(id: number) {
    setWaves((current) => current.filter((entry) => entry.id !== id));
  }
  function expireActivation(id: number) {
    setActivations((current) => current.filter((entry) => entry.id !== id));
  }

  return (
    <>
      {sparks.map((spark) => (
        <HitSpark key={spark.id} spark={spark} onExpire={expireSpark} />
      ))}
      {waves.map((wave) => (
        <SlashWaveMesh key={wave.id} wave={wave} camera={camera} onExpire={expireWave} />
      ))}
      {activations.map((burst) => (
        <ActivationBurstMesh key={burst.id} burst={burst} onExpire={expireActivation} />
      ))}
    </>
  );
}
