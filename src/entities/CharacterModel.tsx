import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useMemo, useRef } from "react";
import { Box3, Vector3 } from "three";
import type { Group, Object3D } from "three";
import type { CharacterId } from "../game/types";

const MODEL_URL: Record<CharacterId, string> = {
  iris: "/models/space-kit/astronautA.glb",
  halo: "/models/space-kit/astronautB.glb",
  raika: "/models/space-kit/alien.glb",
};

function fitObjectToHeight(object: Object3D, targetHeight: number) {
  object.updateMatrixWorld(true);
  const box = new Box3().setFromObject(object);
  const size = new Vector3();
  box.getSize(size);
  const factor = targetHeight / Math.max(size.y, 0.001);
  object.scale.setScalar(factor);
  const center = new Vector3();
  box.getCenter(center);
  object.position.x = -center.x * factor;
  object.position.z = -center.z * factor;
  object.position.y = -box.min.y * factor;
}

export function CharacterModel({
  id,
  accent,
}: {
  id: CharacterId;
  accent: string;
}) {
  const groupRef = useRef<Group>(null);
  const { scene } = useGLTF(MODEL_URL[id]);
  const fitted = useMemo(() => {
    const c = scene.clone(true);
    fitObjectToHeight(c, 1.5);
    return c;
  }, [scene]);

  useFrame(({ clock }) => {
    if (!groupRef.current) {
      return;
    }
    const t = clock.getElapsedTime();
    groupRef.current.rotation.y = Math.sin(t * 0.4) * 0.22 + t * 0.12;
    groupRef.current.position.y = -0.6 + Math.sin(t * 0.9) * 0.06;
  });

  return (
    <group>
      <group ref={groupRef}>
        <primitive object={fitted} />
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.65, 0]}>
        <ringGeometry args={[0.78, 1, 64]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.55} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.65, 0]}>
        <ringGeometry args={[1.3, 1.36, 64]} />
        <meshBasicMaterial color={accent} transparent opacity={0.32} toneMapped={false} />
      </mesh>
    </group>
  );
}

useGLTF.preload(MODEL_URL.iris);
useGLTF.preload(MODEL_URL.halo);
useGLTF.preload(MODEL_URL.raika);
