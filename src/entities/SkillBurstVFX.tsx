import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { AdditiveBlending, DoubleSide, Mesh, Quaternion, Vector3 } from "three";
import { useBattleStore } from "../game/battleStore";
import type { WeaponId } from "../game/types";

// Visual layer for the per-step weapon-skill animation. Reads
// `skillAnimation` + `lastShotAt` from the store and spawns short-lived
// meshes per step. Designed to be replaced with a fancier VFX pass later
// without touching the state machine: every visual entry is created from
// public store fields and a position/forward snapshot taken at fire time.
//
// - kind === "ranged" → hit spark at the boss's current world position
// - kind === "slash"  → slash arc at the player's facing, rotated by a
//   per-weapon angle pattern so the 3 hits read as a real combo, not a
//   single move repeated.

type Spark = {
  id: number;
  spawnedAt: number;
  origin: { x: number; y: number; z: number };
  color: string;
};

type Slash = {
  id: number;
  spawnedAt: number;
  origin: { x: number; y: number; z: number };
  quaternion: { x: number; y: number; z: number; w: number };
  /** Roll around the forward axis, radians. Tilts the arc per step. */
  rollAngle: number;
  /** Per-step horizontal scale on the streak length (1.0 = base). */
  lengthScale: number;
  /** Per-step thickness scale (1.0 = base). */
  thicknessScale: number;
  /** Forward push so each slash starts a touch in front of the camera. */
  forwardOffset: number;
  color: string;
};

const SPARK_LIFETIME_MS = 380;
// Tightened so each slash feels snappy and readable in a 3-hit combo at
// 220ms cadence — the arc finishes just before the next one starts.
const SLASH_LIFETIME_MS = 180;

type SlashPattern = { rollAngle: number; lengthScale: number; thicknessScale: number };

// 4-pose pattern loop the user requested: vertical, horizontal, diagonal,
// big horizontal. The visual layer keeps a running counter so successive
// casts pick up where the previous left off, producing a continuously
// varied combo across the fight rather than the same 3 swings each cast.
const SLASH_PATTERN_LOOP: SlashPattern[] = [
  { rollAngle: Math.PI / 2, lengthScale: 1.0, thicknessScale: 1.0 }, // vertical
  { rollAngle: 0,            lengthScale: 1.0, thicknessScale: 1.0 }, // horizontal
  { rollAngle: -Math.PI / 4, lengthScale: 1.05, thicknessScale: 1.0 }, // diagonal
  { rollAngle: 0,            lengthScale: 1.6, thicknessScale: 1.6 }, // big horizontal
];

// `WeaponId` → start offset into the pattern loop. Future blades can have
// their own opening pose without changing the visual code.
const SLASH_PATTERN_START: Partial<Record<WeaponId, number>> = {
  windBlade: 0,
};

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

function SlashArc({ slash, onExpire }: { slash: Slash; onExpire: (id: number) => void }) {
  const meshRef = useRef<Mesh>(null);
  const haloRef = useRef<Mesh>(null);
  // Build the orientation once: align local +Z with the camera's forward
  // captured at fire time, then roll around that axis by the per-step
  // angle so each slash points along a different diagonal.
  const baseQuat = useMemo(() => {
    return new Quaternion(slash.quaternion.x, slash.quaternion.y, slash.quaternion.z, slash.quaternion.w);
  }, [slash.quaternion]);
  useFrame(() => {
    const elapsed = performance.now() - slash.spawnedAt;
    if (elapsed >= SLASH_LIFETIME_MS) {
      onExpire(slash.id);
      return;
    }
    const k = elapsed / SLASH_LIFETIME_MS;
    // Sharp pop on hit, then quick fall-off (snappy combo readability).
    const fade = k < 0.1 ? k / 0.1 : 1 - (k - 0.1) / 0.9;
    if (meshRef.current) {
      // Slight outward stretch sells the swing's follow-through.
      const grow = 1 + k * 0.45;
      meshRef.current.scale.set(grow, grow, 1);
      const m = meshRef.current.material as { opacity?: number };
      if (m.opacity !== undefined) m.opacity = Math.max(0, fade);
    }
    if (haloRef.current) {
      // Halo grows further than the core for the soft outer glow.
      const grow = 1 + k * 0.7;
      haloRef.current.scale.set(grow, grow, 1);
      const m = haloRef.current.material as { opacity?: number };
      if (m.opacity !== undefined) m.opacity = Math.max(0, fade) * 0.55;
    }
  });
  // Push origin a bit forward so the arc renders in front of the player
  // rather than at the camera's lens.
  const forward = new Vector3(0, 0, -slash.forwardOffset).applyQuaternion(baseQuat);
  // Plane geometry has its normal at +Z by default. The group's quaternion
  // matches the camera (+Z = camera back), so the streak's front face
  // would face *away* from the player and render invisible with a
  // single-sided material. `DoubleSide` keeps it visible regardless.
  const baseLength = 4.2 * slash.lengthScale;
  const baseThickness = 0.22 * slash.thicknessScale;
  const haloLength = baseLength * 1.05;
  const haloThickness = baseThickness * 2.4;
  return (
    <group
      position={[
        slash.origin.x + forward.x,
        slash.origin.y + forward.y,
        slash.origin.z + forward.z,
      ]}
      quaternion={baseQuat}
    >
      <group rotation={[0, 0, slash.rollAngle]}>
        {/* Soft outer halo — additive, wider, lower opacity. Sits just
            behind the bright core in -Z so depth-sort favors core on top. */}
        <mesh ref={haloRef} position={[0, 0, -0.005]}>
          <planeGeometry args={[haloLength, haloThickness]} />
          <meshBasicMaterial
            color={slash.color}
            transparent
            opacity={0.55}
            toneMapped={false}
            blending={AdditiveBlending}
            side={DoubleSide}
            depthWrite={false}
          />
        </mesh>
        {/* Bright streak core — additive white-ish for the slice line. */}
        <mesh ref={meshRef}>
          <planeGeometry args={[baseLength, baseThickness]} />
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
      </group>
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
  const [slashes, setSlashes] = useState<Slash[]>([]);
  const counter = useRef(0);
  // Running pattern index across casts so the player keeps seeing fresh
  // poses (vertical → horizontal → diagonal → big horizontal → ...).
  const slashPatternIndex = useRef(0);

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
        const color = "#ffd24a";
        setSparks((current) => [
          ...current,
          {
            id: counter.current,
            spawnedAt: now,
            origin: { x: ePos.x, y: ePos.y + 0.2, z: ePos.z },
            color,
          },
        ]);
      } else if (anim.kind === "slash") {
        // First slash of a cast aligns to the weapon's start offset; later
        // slashes continue from the running index so the loop progresses
        // continuously across casts. completedSteps is already the index
        // of the just-fired step (advanceSkillStep incremented it before
        // bumping lastShotAt).
        if (anim.completedSteps === 1) {
          slashPatternIndex.current = SLASH_PATTERN_START[anim.weaponId] ?? 0;
        }
        const idx = ((slashPatternIndex.current % SLASH_PATTERN_LOOP.length) + SLASH_PATTERN_LOOP.length)
          % SLASH_PATTERN_LOOP.length;
        slashPatternIndex.current += 1;
        const pose = SLASH_PATTERN_LOOP[idx];
        const camQuat = camera.quaternion;
        setSlashes((current) => [
          ...current,
          {
            id: counter.current,
            spawnedAt: now,
            origin: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
            quaternion: { x: camQuat.x, y: camQuat.y, z: camQuat.z, w: camQuat.w },
            rollAngle: pose.rollAngle,
            lengthScale: pose.lengthScale,
            thicknessScale: pose.thicknessScale,
            forwardOffset: 1.7,
            color: "#bff7ff",
          },
        ]);
      }
    });
  }, [camera, enemyPositionRef]);

  function expireSpark(id: number) {
    setSparks((current) => current.filter((entry) => entry.id !== id));
  }
  function expireSlash(id: number) {
    setSlashes((current) => current.filter((entry) => entry.id !== id));
  }

  return (
    <>
      {sparks.map((spark) => (
        <HitSpark key={spark.id} spark={spark} onExpire={expireSpark} />
      ))}
      {slashes.map((slash) => (
        <SlashArc key={slash.id} slash={slash} onExpire={expireSlash} />
      ))}
    </>
  );
}
