import { useFrame } from "@react-three/fiber";
import { useFBX } from "@react-three/drei";
import { useMemo, useRef } from "react";
import type { Group } from "three";
import type { WeaponId } from "../game/types";
import { fitObjectToSize } from "./fitObject";

export const WEAPON_MODEL_URL: Record<WeaponId, string> = {
  weatherGun: "/models/quaternius-guns/AssaultRifle_2.fbx",
  clearSkyGun: "/models/quaternius-guns/Bullpup_2.fbx",
  rainySeasonKiller: "/models/quaternius-guns/Shotgun_2.fbx",
  stormwallRifle: "/models/quaternius-guns/SniperRifle_3.fbx",
  frostlance: "/models/quaternius-guns/AssaultRifle2_3.fbx",
};

export function WeaponModel({ id, accent }: { id: WeaponId; accent: string }) {
  const groupRef = useRef<Group>(null);
  const fbx = useFBX(WEAPON_MODEL_URL[id]);
  const fitted = useMemo(() => {
    const c = fbx.clone(true) as Group;
    fitObjectToSize(c, 1.6);
    return c;
  }, [fbx]);

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
  useFBX.preload(url);
});
