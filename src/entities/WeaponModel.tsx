import { useFrame } from "@react-three/fiber";
import { useFBX, useGLTF } from "@react-three/drei";
import { useMemo, useRef } from "react";
import type { Group } from "three";
import type { WeaponId } from "../game/types";
import { fitObjectToSize } from "./fitObject";

type WeaponModelType = "fbx" | "gltf";

// Quaternius FBX guns are modeled with their barrel along +X (verified by
// FBXLoader bounding-box inspection: longest axis is X for every gun in this
// pack). Rotating 90 degrees around Y maps +X to -Z, which is the camera-
// forward direction in Three.js. The earlier value [0, PI, 0] only flipped
// +X to -X and left the barrel pointing sideways across the screen.
export const WEAPON_MODEL: Record<WeaponId, { url: string; type: WeaponModelType; rotation: [number, number, number] }> = {
  weatherGun: { url: "/models/quaternius-guns/AssaultRifle_2.fbx", type: "fbx", rotation: [0, Math.PI / 2, 0] },
  clearSkyGun: { url: "/models/quaternius-guns/Bullpup_2.fbx", type: "fbx", rotation: [0, Math.PI / 2, 0] },
  rainySeasonKiller: { url: "/models/quaternius-guns/Shotgun_2.fbx", type: "fbx", rotation: [0, Math.PI / 2, 0] },
  stormwallRifle: { url: "/models/quaternius-guns/SniperRifle_3.fbx", type: "fbx", rotation: [0, Math.PI / 2, 0] },
  frostlance: { url: "/models/quaternius-guns/AssaultRifle2_3.fbx", type: "fbx", rotation: [0, Math.PI / 2, 0] },
  windBlade: { url: "/models/prototype-kit/weapon-sword.glb", type: "gltf", rotation: [0, Math.PI / 2, -Math.PI / 7] },
};

export const WEAPON_MODEL_URL = Object.fromEntries(
  Object.entries(WEAPON_MODEL).map(([id, model]) => [id, model.url]),
) as Record<WeaponId, string>;

export const weaponModelRotation = (id: WeaponId) => WEAPON_MODEL[id].rotation;

function FbxWeaponObject({ url, targetSize }: { url: string; targetSize: number }) {
  const fbx = useFBX(url);
  const fitted = useMemo(() => {
    const c = fbx.clone(true) as Group;
    fitObjectToSize(c, targetSize);
    return c;
  }, [fbx, targetSize]);
  return <primitive object={fitted} />;
}

function GltfWeaponObject({ url, targetSize }: { url: string; targetSize: number }) {
  const { scene } = useGLTF(url);
  const fitted = useMemo(() => {
    const c = scene.clone(true) as Group;
    fitObjectToSize(c, targetSize);
    return c;
  }, [scene, targetSize]);
  return <primitive object={fitted} />;
}

export function WeaponObject({ id, targetSize }: { id: WeaponId; targetSize: number }) {
  const model = WEAPON_MODEL[id];
  return model.type === "gltf"
    ? <GltfWeaponObject url={model.url} targetSize={targetSize} />
    : <FbxWeaponObject url={model.url} targetSize={targetSize} />;
}

export function WeaponModel({ id, accent }: { id: WeaponId; accent: string }) {
  const groupRef = useRef<Group>(null);

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
      <group ref={groupRef} rotation={weaponModelRotation(id)}>
        <WeaponObject id={id} targetSize={1.6} />
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

Object.values(WEAPON_MODEL).forEach((model) => {
  if (model.type === "gltf") {
    useGLTF.preload(model.url);
  } else {
    useFBX.preload(model.url);
  }
});
