import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { AdditiveBlending, BackSide, type Camera, DoubleSide, Mesh } from "three";
import { useBattleStore } from "../game/battleStore";
import type { Vector3 } from "three";

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

export function SkillBurstVFX({
  enemyPositionRef,
}: {
  enemyPositionRef: React.RefObject<Vector3>;
}) {
  const { camera } = useThree();
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [waves, setWaves] = useState<SlashWave[]>([]);
  const counter = useRef(0);

  useEffect(() => {
    return useBattleStore.subscribe((state, prev) => {
      if (state.lastShotAt === prev.lastShotAt || state.lastShotAt === 0) {
        return;
      }
      const anim = state.skillAnimation;
      if (anim === null) {
        return;
      }
      counter.current += 1;
      const now = performance.now();
      if (anim.kind === "ranged") {
        const ePos = enemyPositionRef.current;
        setSparks((current) => [
          ...current,
          {
            id: counter.current,
            spawnedAt: now,
            origin: { x: ePos.x, y: ePos.y + 0.2, z: ePos.z },
            color: "#ffd24a",
          },
        ]);
      } else if (anim.kind === "slash") {
        // Warm gold matches the bullet trail's hit color so the slash zone
        // and a normal hit read as the same energy.
        setWaves((current) => [
          ...current,
          {
            id: counter.current,
            spawnedAt: now,
            color: "#ffd24a",
          },
        ]);
      }
    });
  }, [enemyPositionRef]);

  function expireSpark(id: number) {
    setSparks((current) => current.filter((entry) => entry.id !== id));
  }
  function expireWave(id: number) {
    setWaves((current) => current.filter((entry) => entry.id !== id));
  }

  return (
    <>
      {sparks.map((spark) => (
        <HitSpark key={spark.id} spark={spark} onExpire={expireSpark} />
      ))}
      {waves.map((wave) => (
        <SlashWaveMesh key={wave.id} wave={wave} camera={camera} onExpire={expireWave} />
      ))}
    </>
  );
}
