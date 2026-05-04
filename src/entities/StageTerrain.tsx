import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import type { Stage } from "../game/types";
import {
  STAGE_PLACEMENTS,
  expandCluster,
  type GltfPlacement,
  type RaisedPlatform,
  type StagePlacement,
} from "./stagePlacements";

// StageTerrain renders the floor + arena rings + placement-driven props.
// All "what / where" decisions live in stagePlacements.ts so a designer-
// style edit is a one-line data change.

function GLTFInstance({ url, ...props }: { url: string } & Record<string, unknown>) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={cloned} {...props} />;
}

function ArenaRings({ stage, scale }: { stage: Stage; scale: number }) {
  const rings = [0.34, 0.65, 0.95].map((ratio) => ratio * stage.arena.x * scale);
  return (
    <>
      {rings.map((radius, index) => (
        <mesh
          key={radius}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.03, 0]}
        >
          <ringGeometry args={[radius, radius + 0.16, 96]} />
          <meshBasicMaterial
            color={stage.ringColor}
            transparent
            opacity={0.55 - index * 0.14}
            toneMapped={false}
          />
        </mesh>
      ))}
    </>
  );
}

function PlacedProp({ piece }: { piece: GltfPlacement }) {
  const tilt = piece.tilt ?? 0;
  return (
    <group
      position={[piece.x, 0, piece.z]}
      rotation={[tilt, piece.rotY, tilt * 0.6]}
      scale={piece.scale}
    >
      <GLTFInstance url={piece.url} />
    </group>
  );
}

function HighlandPlatform({ p, isClear }: { p: RaisedPlatform; isClear: boolean }) {
  return (
    <group position={[p.x, 0, p.z]}>
      <mesh position={[0, p.height / 2, 0]}>
        <boxGeometry args={[p.w, p.height, p.d]} />
        <meshStandardMaterial color={isClear ? "#cdd9e3" : "#33495b"} roughness={0.74} metalness={0.2} />
      </mesh>
      <mesh position={[0, p.height + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[p.w * 0.94, p.d * 0.94]} />
        <meshStandardMaterial color={isClear ? "#f5fbff" : "#dfeff7"} roughness={0.7} />
      </mesh>
    </group>
  );
}

function StageContent({
  stage,
  isClear,
  placement,
}: {
  stage: Stage;
  isClear: boolean;
  placement: StagePlacement;
}) {
  const fixedProps = placement.fixed;
  const scattered = useMemo(
    () => placement.scattered.flatMap((cluster) => expandCluster(cluster)),
    [placement],
  );
  const floor = placement.floor;

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <planeGeometry args={[floor.size, floor.size, 32, 32]} />
        <meshStandardMaterial
          color={isClear ? floor.clearColor : stage.groundColor}
          metalness={floor.metalness}
          roughness={floor.roughness}
        />
      </mesh>
      <ArenaRings stage={stage} scale={1} />
      {placement.platforms?.map((p, idx) => (
        <HighlandPlatform key={idx} p={p} isClear={isClear} />
      ))}
      {fixedProps.map((piece, idx) => (
        <PlacedProp key={`fixed-${idx}`} piece={piece} />
      ))}
      {scattered.map((piece, idx) => (
        <PlacedProp key={`scattered-${idx}`} piece={piece} />
      ))}
    </>
  );
}

export function StageTerrain({ stage, isClear }: { stage: Stage; isClear: boolean }) {
  const placement = STAGE_PLACEMENTS[stage.id];
  return <StageContent stage={stage} isClear={isClear} placement={placement} />;
}
