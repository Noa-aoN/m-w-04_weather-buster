import { useMemo } from "react";
import { DoubleSide } from "three";
import type { Stage } from "../game/types";
import {
  PLAYER_SPAWN_DISC,
  STAGE_PLACEMENTS,
  buildPlacements,
  type StageCollider,
} from "./stagePlacements";

// Wireframe overlay that renders every stage collider as a flat ring at
// floor level. Mounted by BattleScene only when ?debug=placement is
// present in the URL. Helps verify that the Box3-measured footprints
// match the actual prop silhouettes and that no overlaps remain after the
// audit pass.

const PLAYER_COLOR = "#ff3b6b";
const PLATFORM_COLOR = "#ff63d1";
const FIXED_COLOR = "#3bd6ff";
const SCATTERED_COLOR = "#ffd83b";
const ARENA_COLOR = "#ffffff";

const DEBUG_Y = 0.05;

function isDebugPlacementEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("debug") === "placement";
}

function ColliderRing({ disc, color }: { disc: StageCollider | (typeof PLAYER_SPAWN_DISC); color: string }) {
  // Two thin rings — bright outer + faded fill — keep the overlay readable
  // against any floor texture.
  return (
    <group position={[disc.x, DEBUG_Y, disc.z]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <ringGeometry args={[Math.max(disc.r - 0.05, 0.02), disc.r, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.95} side={DoubleSide} toneMapped={false} />
      </mesh>
      <mesh>
        <ringGeometry args={[0, Math.max(disc.r - 0.05, 0.02), 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.18} side={DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  );
}

function ArenaBoundary({ stage }: { stage: Stage }) {
  const { x, zFront, zBack } = stage.arena;
  const halfW = x;
  const w = halfW * 2;
  const d = zBack - zFront;
  const cz = (zFront + zBack) / 2;
  // Hollow rectangle: outer plane minus inner plane via two LineSegments
  // would be cleaner, but a ring-style frame using 4 thin planes is simpler.
  const frame = 0.08;
  return (
    <group position={[0, DEBUG_Y, cz]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* top edge */}
      <mesh position={[0, d / 2 - frame / 2, 0]}>
        <planeGeometry args={[w, frame]} />
        <meshBasicMaterial color={ARENA_COLOR} transparent opacity={0.85} side={DoubleSide} toneMapped={false} />
      </mesh>
      {/* bottom edge */}
      <mesh position={[0, -d / 2 + frame / 2, 0]}>
        <planeGeometry args={[w, frame]} />
        <meshBasicMaterial color={ARENA_COLOR} transparent opacity={0.85} side={DoubleSide} toneMapped={false} />
      </mesh>
      {/* left edge */}
      <mesh position={[-halfW + frame / 2, 0, 0]}>
        <planeGeometry args={[frame, d]} />
        <meshBasicMaterial color={ARENA_COLOR} transparent opacity={0.85} side={DoubleSide} toneMapped={false} />
      </mesh>
      {/* right edge */}
      <mesh position={[halfW - frame / 2, 0, 0]}>
        <planeGeometry args={[frame, d]} />
        <meshBasicMaterial color={ARENA_COLOR} transparent opacity={0.85} side={DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function StageColliderDebug({ stage }: { stage: Stage }) {
  const enabled = useMemo(() => isDebugPlacementEnabled(), []);
  const built = useMemo(
    () => (enabled ? buildPlacements(stage, STAGE_PLACEMENTS[stage.id]) : null),
    [enabled, stage],
  );
  if (!enabled || !built) return null;
  return (
    <>
      <ArenaBoundary stage={stage} />
      <ColliderRing disc={PLAYER_SPAWN_DISC} color={PLAYER_COLOR} />
      {built.colliders.map((c, i) => (
        <ColliderRing
          key={`${c.kind}-${i}`}
          disc={c}
          color={
            c.kind === "platform" ? PLATFORM_COLOR : c.kind === "fixed" ? FIXED_COLOR : SCATTERED_COLOR
          }
        />
      ))}
    </>
  );
}
