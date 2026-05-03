import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useMemo, useRef } from "react";
import { Box3, Vector3 } from "three";
import type { Group, Object3D } from "three";
import type { WeaponId } from "../game/types";

export const WEAPON_MODEL_URL: Record<WeaponId, string> = {
  weatherGun: "/models/blaster-kit/blaster-c.glb",
  clearSkyGun: "/models/blaster-kit/blaster-h.glb",
  rainySeasonKiller: "/models/blaster-kit/blaster-m.glb",
  stormwallRifle: "/models/blaster-kit/blaster-q.glb",
  frostlance: "/models/blaster-kit/blaster-l.glb",
};

function fitObjectToSize(object: Object3D, targetSize: number) {
  object.updateMatrixWorld(true);
  const box = new Box3().setFromObject(object);
  const size = new Vector3();
  box.getSize(size);
  const longest = Math.max(size.x, size.y, size.z, 0.001);
  const factor = targetSize / longest;
  object.scale.setScalar(factor);
  const center = new Vector3();
  box.getCenter(center);
  object.position.x = -center.x * factor;
  object.position.y = -center.y * factor;
  object.position.z = -center.z * factor;
}

export function WeaponModel({ id, accent }: { id: WeaponId; accent: string }) {
  const groupRef = useRef<Group>(null);
  const { scene } = useGLTF(WEAPON_MODEL_URL[id]);
  const fitted = useMemo(() => {
    const c = scene.clone(true);
    fitObjectToSize(c, 1.6);
    return c;
  }, [scene]);

  useFrame(({ clock }) => {
    if (!groupRef.current) {
      return;
    }
    const t = clock.getElapsedTime();
    groupRef.current.rotation.y = t * 0.55;
    groupRef.current.position.y = Math.sin(t * 1.4) * 0.06;
  });

  return (
    <group>
      <group ref={groupRef}>
        <primitive object={fitted} />
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.55, 0]}>
        <ringGeometry args={[0.7, 0.86, 64]} />
        <meshStandardMaterial
          color={accent}
          emissive={accent}
          emissiveIntensity={0.6}
          toneMapped={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.55, 0]}>
        <ringGeometry args={[1.05, 1.1, 64]} />
        <meshBasicMaterial color={accent} transparent opacity={0.28} toneMapped={false} />
      </mesh>
    </group>
  );
}

Object.values(WEAPON_MODEL_URL).forEach((url) => {
  useGLTF.preload(url);
});
