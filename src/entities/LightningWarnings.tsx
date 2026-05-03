import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh } from "three";
import { useBattleStore } from "../game/battleStore";

function MarkerVisual({ x, z, triggersAt }: { x: number; z: number; triggersAt: number }) {
  const ringRef = useRef<Mesh>(null);
  const innerRef = useRef<Mesh>(null);

  useFrame(() => {
    const now = performance.now();
    const remaining = Math.max((triggersAt - now) / 1000, 0);
    const ratio = Math.max(0, Math.min(1, 1.6 - remaining));
    const pulse = 0.6 + Math.sin(now * 0.02) * 0.4;

    if (ringRef.current) {
      const material = ringRef.current.material as { emissiveIntensity?: number };
      material.emissiveIntensity = 1.2 + ratio * 2.2 + pulse;
      ringRef.current.scale.setScalar(1 + Math.sin(now * 0.012) * 0.05);
    }
    if (innerRef.current) {
      const material = innerRef.current.material as { opacity?: number };
      material.opacity = 0.18 + ratio * 0.5;
    }
  });

  return (
    <group position={[x, 0.02, z]}>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.4, 1.62, 64]} />
        <meshStandardMaterial
          color="#ff315b"
          emissive="#ff315b"
          emissiveIntensity={1.4}
          toneMapped={false}
          transparent
          opacity={0.92}
        />
      </mesh>
      <mesh ref={innerRef} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.38, 64]} />
        <meshBasicMaterial color="#ff5e7d" transparent opacity={0.22} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function LightningWarnings() {
  const markers = useBattleStore((state) => state.lightningMarkers);
  return (
    <>
      {markers.map((marker) => (
        <MarkerVisual key={marker.id} x={marker.x} z={marker.z} triggersAt={marker.triggersAt} />
      ))}
    </>
  );
}
