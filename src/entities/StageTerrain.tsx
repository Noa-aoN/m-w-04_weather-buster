import { Suspense, useEffect, useMemo, useState } from "react";
import { useGLTF, useTexture } from "@react-three/drei";
import { RepeatWrapping, SRGBColorSpace } from "three";
import type { Stage } from "../game/types";
import { assetUrl } from "../shared/assets";
import {
  STAGE_PLACEMENTS,
  buildPlacements,
  type GltfPlacement,
  type RaisedPlatform,
  type StagePlacement,
} from "./stagePlacements";
import { isFootprintCacheWarm, recordMeasuredFootprint } from "./footprintCache";

// StageTerrain renders the floor + arena rings + placement-driven props.
// All "what / where" decisions live in stagePlacements.ts so a designer-
// style edit is a one-line data change.

function GLTFInstance({ url, ...props }: { url: string } & Record<string, unknown>) {
  const { scene } = useGLTF(assetUrl(url));
  const cloned = useMemo(() => {
    const clone = scene.clone(true);
    // Enable shadow casting on every mesh in the prop. Cloned scenes
    // start with castShadow=false; toggle on the duplicate so the source
    // scene used for measurement / preload stays untouched.
    clone.traverse((child) => {
      const mesh = child as { isMesh?: boolean; castShadow?: boolean; receiveShadow?: boolean };
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);
  // Side-effect: record the model-local footprint the first time this URL
  // is seen so subsequent buildPlacements calls get accurate disc radii.
  recordMeasuredFootprint(url, scene);
  return <primitive object={cloned} {...props} />;
}

/** Touches each placement URL via useGLTF (suspending until loaded) so the
 *  footprint cache is warm before any placements are computed. Renders
 *  nothing visible. Calls onWarm after the suspense boundary completes. */
function FootprintWarmup({ urls, onWarm }: { urls: string[]; onWarm: () => void }) {
  useEffect(() => {
    onWarm();
  }, [onWarm]);
  return (
    <>
      {urls.map((url) => (
        <MeasureCell key={url} url={url} />
      ))}
    </>
  );
}

function MeasureCell({ url }: { url: string }) {
  const { scene } = useGLTF(assetUrl(url));
  recordMeasuredFootprint(url, scene);
  return null;
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
  const variant = p.variant ?? "snow";
  const sideColor = variant === "ruin"
    ? (isClear ? "#7d4f3a" : "#3a2620")
    : variant === "metal"
    ? (isClear ? "#9aaab4" : "#2a3a47")
    : (isClear ? "#cdd9e3" : "#33495b");
  const topColor = variant === "ruin"
    ? (isClear ? "#a8765c" : "#6b4636")
    : variant === "metal"
    ? (isClear ? "#bccbd4" : "#52677a")
    : (isClear ? "#f5fbff" : "#dfeff7");
  const roughness = variant === "metal" ? 0.4 : 0.78;
  const metalness = variant === "metal" ? 0.45 : 0.2;
  return (
    <group position={[p.x, 0, p.z]} rotation={[p.tilt ?? 0, p.rotY ?? 0, (p.tilt ?? 0) * 0.5]}>
      <mesh position={[0, p.height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[p.w, p.height, p.d]} />
        <meshStandardMaterial color={sideColor} roughness={roughness} metalness={metalness} />
      </mesh>
      <mesh position={[0, p.height + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[p.w * 0.94, p.d * 0.94]} />
        <meshStandardMaterial color={topColor} roughness={roughness} />
      </mesh>
    </group>
  );
}

function PbrFloor({
  isClear,
  placement,
}: {
  isClear: boolean;
  placement: StagePlacement;
}) {
  const floor = placement.floor;
  const textureKey = floor.texture as string;
  const repeat = floor.textureRepeat ?? 6;
  const [colorMap, normalMap, roughMap, aoMap] = useTexture([
    assetUrl(`/textures/field/${textureKey}/color.jpg`),
    assetUrl(`/textures/field/${textureKey}/normal.jpg`),
    assetUrl(`/textures/field/${textureKey}/roughness.jpg`),
    assetUrl(`/textures/field/${textureKey}/ao.jpg`),
  ]);
  // sRGB for the color map only (normal / roughness / AO live in linear).
  // Wrap + repeat so a single 1024 tile spans the full floor.
  useMemo(() => {
    [colorMap, normalMap, roughMap, aoMap].forEach((m) => {
      m.wrapS = m.wrapT = RepeatWrapping;
      m.repeat.set(repeat, repeat);
      m.needsUpdate = true;
    });
    colorMap.colorSpace = SRGBColorSpace;
  }, [colorMap, normalMap, roughMap, aoMap, repeat]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow>
      <planeGeometry args={[floor.size, floor.size, 32, 32]} />
      <meshStandardMaterial
        // tint the texture toward the stage's clear color so the PBR map
        // doesn't fight the clear-sky atmosphere
        color={isClear ? floor.clearColor : "#ffffff"}
        map={colorMap}
        normalMap={normalMap}
        roughnessMap={roughMap}
        aoMap={aoMap}
        metalness={floor.metalness}
        roughness={floor.roughness}
      />
    </mesh>
  );
}

function PlainFloor({
  stage,
  isClear,
  placement,
}: {
  stage: Stage;
  isClear: boolean;
  placement: StagePlacement;
}) {
  const floor = placement.floor;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow>
      <planeGeometry args={[floor.size, floor.size, 32, 32]} />
      <meshStandardMaterial
        color={isClear ? floor.clearColor : stage.groundColor}
        metalness={floor.metalness}
        roughness={floor.roughness}
      />
    </mesh>
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
  // Collect every URL the placement could spawn so we can warm the Box3
  // footprint cache before running buildPlacements. Without this pass,
  // the procedural placer falls back to URL-keyword footprints which
  // mis-size several space-kit families (hangar 5.28 vs structure 1.60
  // for what are actually similar-sized assets).
  const allUrls = useMemo(() => {
    const set = new Set<string>();
    placement.fixed.forEach((f) => set.add(f.url));
    placement.scattered.forEach((c) => c.pool.forEach((u) => set.add(u)));
    return Array.from(set);
  }, [placement]);

  const [warmTick, setWarmTick] = useState(() => (isFootprintCacheWarm(allUrls) ? 1 : 0));
  const built = useMemo(
    () => (warmTick > 0 ? buildPlacements(stage, placement) : null),
    [stage, placement, warmTick],
  );

  return (
    <>
      {placement.floor.texture
        ? <PbrFloor isClear={isClear} placement={placement} />
        : <PlainFloor stage={stage} isClear={isClear} placement={placement} />}
      <ArenaRings stage={stage} scale={1} />
      {warmTick === 0 ? (
        <Suspense fallback={null}>
          <FootprintWarmup urls={allUrls} onWarm={() => setWarmTick((t) => t + 1)} />
        </Suspense>
      ) : null}
      {built ? (
        <>
          {built.platforms.map((p, idx) => (
            <HighlandPlatform key={idx} p={p} isClear={isClear} />
          ))}
          {built.fixed.map((piece, idx) => (
            <PlacedProp key={`fixed-${idx}`} piece={piece} />
          ))}
          {built.scattered.map((piece, idx) => (
            <PlacedProp key={`scattered-${idx}`} piece={piece} />
          ))}
        </>
      ) : null}
    </>
  );
}

export function StageTerrain({ stage, isClear }: { stage: Stage; isClear: boolean }) {
  const placement = STAGE_PLACEMENTS[stage.id];
  return <StageContent stage={stage} isClear={isClear} placement={placement} />;
}
