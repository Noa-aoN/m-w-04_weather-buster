import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useMemo, useRef } from "react";
import type { Group } from "three";
import type { CharacterId } from "../game/types";

const MODEL_URL: Record<CharacterId, string> = {
  iris: "/models/space-kit/astronautA.glb",
  halo: "/models/space-kit/astronautB.glb",
  raika: "/models/space-kit/alien.glb",
};

export function CharacterModel({
  id,
  accent,
}: {
  id: CharacterId;
  accent: string;
}) {
  const groupRef = useRef<Group>(null);
  const { scene } = useGLTF(MODEL_URL[id]);
  const cloned = useMemo(() => scene.clone(true), [scene]);

  useFrame(({ clock }) => {
    if (!groupRef.current) {
      return;
    }
    const t = clock.getElapsedTime();
    groupRef.current.rotation.y = Math.sin(t * 0.4) * 0.22 + t * 0.12;
    groupRef.current.position.y = Math.sin(t * 0.9) * 0.05;
  });

  return (
    <group>
      <group ref={groupRef} scale={2.2}>
        <primitive object={cloned} />
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.55, 0]}>
        <ringGeometry args={[0.78, 1, 64]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.5} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.55, 0]}>
        <ringGeometry args={[1.3, 1.36, 64]} />
        <meshBasicMaterial color={accent} transparent opacity={0.32} toneMapped={false} />
      </mesh>
    </group>
  );
}

useGLTF.preload(MODEL_URL.iris);
useGLTF.preload(MODEL_URL.halo);
useGLTF.preload(MODEL_URL.raika);
