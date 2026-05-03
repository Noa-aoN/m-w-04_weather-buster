import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import type { CharacterId } from "../game/types";

function IrisRig({ accent }: { accent: string }) {
  return (
    <>
      <mesh position={[0, 0.92, 0]}>
        <boxGeometry args={[0.32, 0.32, 0.32]} />
        <meshStandardMaterial color="#1c2a35" metalness={0.65} roughness={0.32} />
      </mesh>
      <mesh position={[0.04, 0.95, 0.16]}>
        <boxGeometry args={[0.16, 0.06, 0.04]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[0.7, 0.6, 0.5]} />
        <meshStandardMaterial color="#3a5563" metalness={0.55} roughness={0.36} />
      </mesh>
      <mesh position={[0, 0.42, 0.26]}>
        <boxGeometry args={[0.55, 0.4, 0.05]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.45} />
      </mesh>
      <mesh position={[-0.45, 0.4, 0]}>
        <boxGeometry args={[0.18, 0.45, 0.36]} />
        <meshStandardMaterial color="#243845" metalness={0.55} roughness={0.34} />
      </mesh>
      <mesh position={[0.45, 0.4, 0]}>
        <boxGeometry args={[0.18, 0.45, 0.36]} />
        <meshStandardMaterial color="#243845" metalness={0.55} roughness={0.34} />
      </mesh>
      <mesh position={[0.6, 0.34, 0.18]} rotation={[Math.PI / 2, 0, 0.2]}>
        <cylinderGeometry args={[0.05, 0.05, 0.55, 12]} />
        <meshStandardMaterial color="#0c151c" metalness={0.85} roughness={0.18} />
      </mesh>
      <mesh position={[-0.18, -0.18, 0]}>
        <boxGeometry args={[0.22, 0.6, 0.3]} />
        <meshStandardMaterial color="#1c2c38" metalness={0.55} roughness={0.34} />
      </mesh>
      <mesh position={[0.18, -0.18, 0]}>
        <boxGeometry args={[0.22, 0.6, 0.3]} />
        <meshStandardMaterial color="#1c2c38" metalness={0.55} roughness={0.34} />
      </mesh>
    </>
  );
}

function HaloRig({ accent }: { accent: string }) {
  return (
    <>
      <mesh position={[0, 0.94, 0]}>
        <boxGeometry args={[0.4, 0.36, 0.4]} />
        <meshStandardMaterial color="#1c2a35" metalness={0.7} roughness={0.34} />
      </mesh>
      <mesh position={[0.04, 0.96, 0.2]}>
        <boxGeometry args={[0.2, 0.06, 0.04]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.5} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.34, 0]}>
        <boxGeometry args={[0.96, 0.7, 0.62]} />
        <meshStandardMaterial color="#3a5563" metalness={0.6} roughness={0.34} />
      </mesh>
      <mesh position={[0, 0.34, 0.32]}>
        <boxGeometry args={[0.78, 0.5, 0.06]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[-0.6, 0.5, 0.05]}>
        <boxGeometry args={[0.32, 0.6, 0.5]} />
        <meshStandardMaterial color="#243845" metalness={0.6} roughness={0.36} />
      </mesh>
      <mesh position={[0.6, 0.5, 0.05]}>
        <boxGeometry args={[0.32, 0.6, 0.5]} />
        <meshStandardMaterial color="#243845" metalness={0.6} roughness={0.36} />
      </mesh>
      <mesh position={[-0.6, 0.84, 0.05]}>
        <boxGeometry args={[0.42, 0.18, 0.62]} />
        <meshStandardMaterial color="#1d2c38" metalness={0.7} roughness={0.32} />
      </mesh>
      <mesh position={[0.6, 0.84, 0.05]}>
        <boxGeometry args={[0.42, 0.18, 0.62]} />
        <meshStandardMaterial color="#1d2c38" metalness={0.7} roughness={0.32} />
      </mesh>
      <mesh position={[-0.22, -0.22, 0]}>
        <boxGeometry args={[0.3, 0.66, 0.36]} />
        <meshStandardMaterial color="#1c2c38" metalness={0.55} roughness={0.34} />
      </mesh>
      <mesh position={[0.22, -0.22, 0]}>
        <boxGeometry args={[0.3, 0.66, 0.36]} />
        <meshStandardMaterial color="#1c2c38" metalness={0.55} roughness={0.34} />
      </mesh>
      <mesh position={[0, -0.05, 0.32]}>
        <boxGeometry args={[0.55, 0.18, 0.06]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.5} />
      </mesh>
    </>
  );
}

function RaikaRig({ accent }: { accent: string }) {
  return (
    <>
      <mesh position={[0, 0.96, 0]} rotation={[0, 0, 0]}>
        <coneGeometry args={[0.22, 0.42, 6]} />
        <meshStandardMaterial color="#1c2a35" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0.0, 0.94, 0.18]}>
        <boxGeometry args={[0.18, 0.05, 0.04]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.7} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.46, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.6, 0.62, 0.46]} />
        <meshStandardMaterial color="#3a5563" metalness={0.55} roughness={0.32} />
      </mesh>
      <mesh position={[0, 0.46, 0.25]}>
        <boxGeometry args={[0.46, 0.42, 0.04]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.55} />
      </mesh>
      <mesh position={[-0.42, 0.36, 0.04]} rotation={[0, 0, -0.18]}>
        <boxGeometry args={[0.18, 0.6, 0.32]} />
        <meshStandardMaterial color="#243845" metalness={0.55} roughness={0.32} />
      </mesh>
      <mesh position={[0.42, 0.36, 0.04]} rotation={[0, 0, 0.18]}>
        <boxGeometry args={[0.18, 0.6, 0.32]} />
        <meshStandardMaterial color="#243845" metalness={0.55} roughness={0.32} />
      </mesh>
      <mesh position={[0.6, 0.18, 0.18]} rotation={[Math.PI / 2, 0, 0.32]}>
        <coneGeometry args={[0.05, 0.7, 8]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      <mesh position={[-0.18, -0.16, 0]} rotation={[0, 0, -0.06]}>
        <boxGeometry args={[0.2, 0.62, 0.28]} />
        <meshStandardMaterial color="#1c2c38" metalness={0.55} roughness={0.34} />
      </mesh>
      <mesh position={[0.18, -0.16, 0]} rotation={[0, 0, 0.06]}>
        <boxGeometry args={[0.2, 0.62, 0.28]} />
        <meshStandardMaterial color="#1c2c38" metalness={0.55} roughness={0.34} />
      </mesh>
      <mesh position={[0, 0.74, -0.34]} rotation={[0.4, 0, 0]}>
        <boxGeometry args={[0.42, 0.06, 0.4]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.7} toneMapped={false} />
      </mesh>
    </>
  );
}

export function CharacterModel({
  id,
  accent,
}: {
  id: CharacterId;
  accent: string;
}) {
  const groupRef = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) {
      return;
    }
    const t = clock.getElapsedTime();
    groupRef.current.rotation.y = Math.sin(t * 0.4) * 0.22 + t * 0.12;
    groupRef.current.position.y = Math.sin(t * 0.9) * 0.05;
  });

  return (
    <group ref={groupRef}>
      {id === "iris" ? <IrisRig accent={accent} /> : null}
      {id === "halo" ? <HaloRig accent={accent} /> : null}
      {id === "raika" ? <RaikaRig accent={accent} /> : null}
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
