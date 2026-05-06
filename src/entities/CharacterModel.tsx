import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import type { AnimationClip, Group } from "three";
import { SkeletonUtils } from "three-stdlib";
import type { CharacterId } from "../game/types";
import { assetUrl } from "../shared/assets";
import { fitObjectToHeight, tintCharacterMaterials } from "./fitObject";

// Each pilot is a static Meshy AI mesh — no skeleton, no animations. The
// existing `useAnimations` flow stays in place but no-ops when the GLB has
// zero clips. `tintCharacterMaterials` no longer recolours (the new models
// have no `accent`-named slot); each character is visually distinct by
// virtue of being a different mesh.
export const CHARACTER_MODEL_URL: Record<CharacterId, string> = {
  noa: assetUrl("/models/custom-characters/noa.glb"),
  saka: assetUrl("/models/custom-characters/saka.glb"),
};

const TARGET_HEIGHT = 1.6;

function pickActionName(names: string[], preferred: string[]) {
  for (const want of preferred) {
    const match = names.find((n) => n.toLowerCase().includes(want));
    if (match) {
      return match;
    }
  }
  return names[0] ?? null;
}

export function CharacterModel({
  id,
  accent,
  preferredAction = "idle",
}: {
  id: CharacterId;
  accent: string;
  preferredAction?: "idle" | "walk" | "run" | "punch" | "jump";
}) {
  const groupRef = useRef<Group>(null);
  const innerRef = useRef<Group>(null);
  const gltf = useGLTF(CHARACTER_MODEL_URL[id]);
  const { fitted, animations } = useMemo(() => {
    const cloned = SkeletonUtils.clone(gltf.scene) as Group;
    fitObjectToHeight(cloned, TARGET_HEIGHT);
    tintCharacterMaterials(cloned, accent);
    return { fitted: cloned, animations: gltf.animations as AnimationClip[] };
  }, [gltf, accent]);

  const { actions, names } = useAnimations(animations, innerRef);

  useEffect(() => {
    if (!actions || names.length === 0) {
      return;
    }
    const preferenceMap: Record<string, string[]> = {
      idle: ["idle_gun_pointing", "idle_gun", "idle"],
      walk: ["walk"],
      run: ["run"],
      punch: ["punch", "gun_shoot", "attack"],
      jump: ["jump", "roll"],
    };
    const preferred = preferenceMap[preferredAction] ?? ["idle"];
    const matched = pickActionName(names, preferred);
    if (!matched) {
      return;
    }
    const action = actions[matched];
    if (action) {
      action.reset().fadeIn(0.25).play();
      return () => {
        action.fadeOut(0.25);
      };
    }
  }, [actions, names, preferredAction]);

  useFrame(({ clock }) => {
    if (!groupRef.current) {
      return;
    }
    const t = clock.getElapsedTime();
    groupRef.current.rotation.y = Math.sin(t * 0.4) * 0.22 + t * 0.12;
    // Subtle idle breathing for static-mesh characters (Meshy AI has no
    // skeleton) — small Y bob + chest scale pulse so the figure doesn't
    // read as a frozen statue.
    groupRef.current.position.y = Math.sin(t * 1.4) * 0.04;
    const breath = 1 + Math.sin(t * 1.4) * 0.012;
    groupRef.current.scale.set(breath, breath, breath);
  });

  return (
    <group>
      <group ref={groupRef}>
        <group ref={innerRef}>
          <primitive object={fitted} />
        </group>
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <ringGeometry args={[0.78, 1, 64]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.55} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <ringGeometry args={[1.3, 1.36, 64]} />
        <meshBasicMaterial color={accent} transparent opacity={0.32} toneMapped={false} />
      </mesh>
    </group>
  );
}

useGLTF.preload(CHARACTER_MODEL_URL.noa);
useGLTF.preload(CHARACTER_MODEL_URL.saka);
