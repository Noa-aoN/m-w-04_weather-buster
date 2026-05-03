import { useFrame } from "@react-three/fiber";
import { useFBX, useAnimations } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import type { AnimationClip, Group } from "three";
import { SkeletonUtils } from "three-stdlib";
import type { CharacterId } from "../game/types";
import { fitObjectToHeight, tintCharacterMaterials } from "./fitObject";

export const CHARACTER_MODEL_URL: Record<CharacterId, string> = {
  iris: "/models/quaternius-characters/BlueSoldier_Male.fbx",
  halo: "/models/quaternius-characters/BlueSoldier_Female.fbx",
  raika: "/models/quaternius-characters/Ninja_Female.fbx",
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
  const fbx = useFBX(CHARACTER_MODEL_URL[id]);
  const { fitted, animations } = useMemo(() => {
    const cloned = SkeletonUtils.clone(fbx) as Group;
    fitObjectToHeight(cloned, TARGET_HEIGHT);
    tintCharacterMaterials(cloned, accent);
    return { fitted: cloned, animations: fbx.animations as AnimationClip[] };
  }, [fbx, accent]);

  const { actions, names } = useAnimations(animations, innerRef);

  useEffect(() => {
    if (!actions || names.length === 0) {
      return;
    }
    const preferenceMap: Record<string, string[]> = {
      idle: ["idle", "stand"],
      walk: ["walk"],
      run: ["run"],
      punch: ["punch", "attack"],
      jump: ["jump"],
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
    // 上下振動を止め、足元を常にリング位置 (y=0) に揃える
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

useFBX.preload(CHARACTER_MODEL_URL.iris);
useFBX.preload(CHARACTER_MODEL_URL.halo);
useFBX.preload(CHARACTER_MODEL_URL.raika);
