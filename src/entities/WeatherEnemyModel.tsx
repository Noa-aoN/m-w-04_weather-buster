import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useMemo, useRef } from "react";
import type { Group, Mesh } from "three";
import type { WeatherEnemy } from "../game/types";
import { assetUrl } from "../shared/assets";
import { fitObjectToHeight } from "./fitObject";

const REX_BODY_URL: Partial<Record<WeatherEnemy["id"], string>> = {
  cloudy: assetUrl("/models/custom-enemies/tiny-rex.glb"),
  heavyRain: assetUrl("/models/custom-enemies/heavy-rain.glb"),
  thunderstorm: assetUrl("/models/custom-enemies/thunderstorm.glb"),
  rainySeason: assetUrl("/models/custom-enemies/rainy-season.glb"),
  tornado: assetUrl("/models/custom-enemies/tornado.glb"),
  blizzard: assetUrl("/models/custom-enemies/blizzard.glb"),
};

function RexBody({ url, accent }: { url: string; accent: string }) {
  const groupRef = useRef<Group>(null);
  const { scene } = useGLTF(url);
  const fitted = useMemo(() => {
    const cloned = scene.clone(true) as Group;
    fitObjectToHeight(cloned, 1.6);
    return cloned;
  }, [scene]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.position.y = Math.sin(t * 1.6) * 0.06;
    groupRef.current.rotation.y = Math.sin(t * 0.45) * 0.18;
  });

  return (
    <group ref={groupRef}>
      <primitive object={fitted} />
      <pointLight position={[0, 1.0, 0.6]} intensity={0.6} color={accent} distance={3.5} />
    </group>
  );
}

function Eye({
  side,
  scale = 1,
  z = 0.78,
  height = 0.18,
  spread = 0.28,
  angry = false,
  closed = false,
  cute = false,
}: {
  side: -1 | 1;
  scale?: number;
  z?: number;
  height?: number;
  spread?: number;
  angry?: boolean;
  closed?: boolean;
  cute?: boolean;
}) {
  return (
    <group position={[side * spread * scale, height, z * scale]}>
      <mesh>
        <sphereGeometry args={[0.13 * scale, 18, 18]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.45} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.08 * scale]}>
        <sphereGeometry args={[0.07 * scale, 14, 14]} />
        <meshStandardMaterial color={cute ? "#1a1a26" : "#0c0c14"} roughness={0.4} />
      </mesh>
      <mesh position={[0.025 * scale, 0.025 * scale, 0.13 * scale]}>
        <sphereGeometry args={[0.018 * scale, 8, 8]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
      {angry ? (
        <mesh position={[side * 0.05 * scale, 0.18 * scale, 0.05 * scale]} rotation={[0, 0, side * 0.7]}>
          <boxGeometry args={[0.22 * scale, 0.04 * scale, 0.04 * scale]} />
          <meshStandardMaterial color="#1c0d10" roughness={0.5} />
        </mesh>
      ) : null}
      {closed ? (
        <mesh position={[0, 0, 0.13 * scale]} rotation={[0, 0, side * 0.4]}>
          <boxGeometry args={[0.2 * scale, 0.025 * scale, 0.04 * scale]} />
          <meshStandardMaterial color="#1c0d10" roughness={0.6} />
        </mesh>
      ) : null}
    </group>
  );
}

function Mouth({
  variant,
  z = 0.84,
  y = -0.08,
  scale = 1,
}: {
  variant: "smile" | "small" | "open" | "frown" | "zigzag";
  z?: number;
  y?: number;
  scale?: number;
}) {
  if (variant === "open") {
    return (
      <group position={[0, y, z * scale]}>
        <mesh>
          <sphereGeometry args={[0.11 * scale, 16, 12]} />
          <meshStandardMaterial color="#28121c" roughness={0.6} />
        </mesh>
      </group>
    );
  }
  if (variant === "smile" || variant === "small") {
    const w = variant === "smile" ? 0.28 : 0.16;
    return (
      <mesh position={[0, y - 0.04 * scale, z * scale]} rotation={[Math.PI, 0, 0]}>
        <torusGeometry args={[w * scale, 0.022 * scale, 8, 24, Math.PI]} />
        <meshStandardMaterial color="#1c0d10" roughness={0.5} />
      </mesh>
    );
  }
  if (variant === "frown") {
    return (
      <mesh position={[0, y - 0.04 * scale, z * scale]}>
        <torusGeometry args={[0.18 * scale, 0.022 * scale, 8, 24, Math.PI]} />
        <meshStandardMaterial color="#1c0d10" roughness={0.5} />
      </mesh>
    );
  }
  // zigzag (jagged)
  return (
    <group position={[0, y, z * scale]}>
      {[-0.16, -0.05, 0.05, 0.16].map((x, i) => (
        <mesh key={x} position={[x * scale, (i % 2 === 0 ? 0.03 : -0.03) * scale, 0]} rotation={[0, 0, i % 2 === 0 ? 0.5 : -0.5]}>
          <boxGeometry args={[0.075 * scale, 0.025 * scale, 0.03 * scale]} />
          <meshStandardMaterial color="#1c0d10" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function RainDroplets({ color }: { color: string }) {
  const groupRef = useRef<Group>(null);
  useFrame((state) => {
    const node = groupRef.current;
    if (!node) return;
    const t = state.clock.getElapsedTime();
    for (let i = 0; i < node.children.length; i += 1) {
      const child = node.children[i];
      const phase = (t * 0.8 + i * 0.4) % 1.0;
      child.position.y = -0.55 - phase * 0.85;
      const scale = phase < 0.1 ? phase * 10 : 1 - Math.max(0, phase - 0.85) * 6;
      child.scale.setScalar(Math.max(0.001, scale));
    }
  });
  return (
    <group ref={groupRef}>
      {[-0.55, -0.18, 0.18, 0.55].map((x, i) => (
        <mesh key={x} position={[x, -0.7, 0.05 + (i % 2) * 0.12]}>
          <capsuleGeometry args={[0.05, 0.28, 6, 10]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.85} transparent opacity={0.95} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function HeavyRainModel({ enemy, clear }: { enemy: WeatherEnemy; clear: boolean }) {
  return (
    <>
      <RexBody url={REX_BODY_URL.heavyRain!} accent={enemy.accentColor} />
      {!clear ? <RainDroplets color={enemy.accentColor} /> : null}
    </>
  );
}

function ThunderboltSpark({ side, color }: { side: -1 | 1; color: string }) {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const flicker = (Math.sin(t * 14 + side * 1.7) + 1) * 0.5;
    const mat = ref.current.material as { emissiveIntensity?: number; opacity?: number };
    if (mat.emissiveIntensity !== undefined) mat.emissiveIntensity = 1.2 + flicker * 2.4;
    if (mat.opacity !== undefined) mat.opacity = 0.85 + flicker * 0.15;
    ref.current.scale.x = 0.85 + flicker * 0.4;
  });
  return (
    <mesh ref={ref} position={[side * 0.9, -0.5, 0.1]} rotation={[0, 0, side * 0.25]}>
      <coneGeometry args={[0.18, 1.3, 4]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.6} transparent opacity={0.95} toneMapped={false} />
    </mesh>
  );
}

function ThunderstormModel({ enemy, clear }: { enemy: WeatherEnemy; clear: boolean }) {
  return (
    <>
      <RexBody url={REX_BODY_URL.thunderstorm!} accent={enemy.accentColor} />
      {!clear ? (
        <>
          <ThunderboltSpark side={-1} color={enemy.accentColor} />
          <ThunderboltSpark side={1} color={enemy.accentColor} />
        </>
      ) : null}
    </>
  );
}

function Vortex({ enemy, clear, layers = 4 }: { enemy: WeatherEnemy; clear: boolean; layers?: number }) {
  return (
    <group>
      {Array.from({ length: layers }, (_, idx) => {
        const radius = 0.45 + idx * 0.16;
        const y = -0.45 + idx * 0.32;
        return (
          <mesh
            key={idx}
            position={[0, y, 0]}
            rotation={[Math.PI / 2 + Math.sin(idx) * 0.1, 0, idx * 0.6]}
          >
            <torusGeometry args={[radius, 0.07, 12, 64]} />
            <meshStandardMaterial
              color={clear ? "#dceefa" : enemy.color}
              emissive={enemy.accentColor}
              emissiveIntensity={clear ? 0.4 : 0.7}
              roughness={0.4}
              metalness={0.1}
            />
          </mesh>
        );
      })}
      <mesh position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.55, 24, 22]} />
        <meshStandardMaterial color={clear ? "#f4f9ff" : enemy.color} emissive={enemy.accentColor} emissiveIntensity={0.4} roughness={0.6} />
      </mesh>
    </group>
  );
}

function TornadoModel({ enemy, clear }: { enemy: WeatherEnemy; clear: boolean }) {
  return (
    <>
      <RexBody url={REX_BODY_URL.tornado!} accent={enemy.accentColor} />
      {/* Tornado's swirl is intentionally tighter and more transparent than
          the typhoon's, so the core (RexBody) reads first. */}
      {!clear ? (
        <group scale={[0.55, 0.55, 0.55]}>
          <Vortex enemy={enemy} clear={clear} layers={3} />
        </group>
      ) : null}
    </>
  );
}

function TyphoonModel({ enemy, clear }: { enemy: WeatherEnemy; clear: boolean }) {
  return (
    <>
      <Vortex enemy={enemy} clear={clear} layers={5} />
      <group position={[0, 0.65, 0]}>
        <mesh>
          <sphereGeometry args={[0.66, 28, 24]} />
          <meshStandardMaterial color={clear ? "#f6f9ff" : enemy.color} emissive={enemy.accentColor} emissiveIntensity={0.6} roughness={0.5} />
        </mesh>
        <Eye side={-1} scale={1.0} z={0.65} height={0.08} angry={!clear} cute />
        <Eye side={1} scale={1.0} z={0.65} height={0.08} angry={!clear} cute />
        <Mouth variant={clear ? "smile" : "zigzag"} y={-0.22} z={0.7} scale={1.05} />
      </group>
      <mesh position={[0, -0.65, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.05, 1.2, 64]} />
        <meshStandardMaterial color={enemy.accentColor} emissive={enemy.accentColor} emissiveIntensity={1.2} transparent opacity={0.6} toneMapped={false} />
      </mesh>
    </>
  );
}

function Snowflake({ side }: { side: -1 | 1 }) {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.z = clock.getElapsedTime() * (side === 1 ? 0.6 : -0.6);
  });
  return (
    <mesh ref={ref} position={[side * 1.0, 0.15, 0.18]}>
      <torusGeometry args={[0.18, 0.024, 8, 6]} />
      <meshStandardMaterial color="#dff8ff" emissive="#a8eeff" emissiveIntensity={1.4} toneMapped={false} />
    </mesh>
  );
}

function BlizzardModel({ enemy, clear }: { enemy: WeatherEnemy; clear: boolean }) {
  return (
    <>
      <RexBody url={REX_BODY_URL.blizzard!} accent={enemy.accentColor} />
      {!clear ? (
        <>
          <Snowflake side={-1} />
          <Snowflake side={1} />
        </>
      ) : null}
    </>
  );
}

function RainySeasonModel({ enemy, clear }: { enemy: WeatherEnemy; clear: boolean }) {
  return (
    <>
      <RexBody url={REX_BODY_URL.rainySeason!} accent={enemy.accentColor} />
      {!clear ? (
        <>
          <RainDroplets color={enemy.accentColor} />
          <mesh position={[0, -0.42, 0.55]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.32, 0.025, 8, 24]} />
            <meshStandardMaterial color={enemy.accentColor} emissive={enemy.accentColor} emissiveIntensity={1} transparent opacity={0.7} toneMapped={false} />
          </mesh>
        </>
      ) : null}
    </>
  );
}

function CloudyModel({ enemy }: { enemy: WeatherEnemy; clear: boolean }) {
  return <RexBody url={REX_BODY_URL.cloudy!} accent={enemy.accentColor} />;
}

Object.values(REX_BODY_URL).forEach((url) => {
  if (url) useGLTF.preload(url);
});

function Halo({ color }: { color: string }) {
  const ref = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.z = clock.getElapsedTime() * 0.6;
    const mat = ref.current.material as { emissiveIntensity?: number };
    if (mat.emissiveIntensity !== undefined) {
      mat.emissiveIntensity = 0.6 + (Math.sin(clock.getElapsedTime() * 1.4) + 1) * 0.4;
    }
  });
  return (
    <mesh ref={ref} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
      <torusGeometry args={[1.4, 0.028, 12, 96]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} toneMapped={false} />
    </mesh>
  );
}

// Per-enemy core tweaks. Rex-bodied enemies have their feet at y=0 (vs. the
// procedural cloud puffs centred around y=0), so the core is lifted to chest
// height. Tornado additionally shrinks its core because it's a small grounded
// rex.
const CORE_OVERRIDE: Partial<Record<WeatherEnemy["id"], { y: number; scale?: number }>> = {
  cloudy: { y: 0.9 },
  heavyRain: { y: 0.9 },
  thunderstorm: { y: 0.9 },
  rainySeason: { y: 0.9 },
  tornado: { y: 0.42, scale: 0.5 },
  blizzard: { y: 0.9 },
};

function CoreOrb({ enemy, clear, compact = false }: { enemy: WeatherEnemy; clear: boolean; compact?: boolean }) {
  const ref = useRef<Mesh>(null);
  const override = CORE_OVERRIDE[enemy.id];
  const scale = override?.scale ?? 1;
  const y = override?.y ?? 0.05;
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const mat = ref.current.material as { emissiveIntensity?: number };
    if (mat.emissiveIntensity !== undefined) {
      mat.emissiveIntensity = (clear ? 1.15 : 1.05) + Math.sin(t * 2.8) * 0.4;
    }
  });
  return (
    <>
      <mesh ref={ref} name="enemyCore" position={[0, y, 0.15]} userData={{ isCore: true }} scale={scale}>
        <sphereGeometry args={[0.22, 28, 28]} />
        <meshStandardMaterial
          color={clear ? "#fff9bf" : enemy.coreColor}
          emissive={clear ? "#fff3a0" : enemy.coreColor}
          emissiveIntensity={clear ? 1.6 : 1.5}
          roughness={0.18}
          toneMapped={false}
        />
      </mesh>
      {!compact && !clear ? (
        <mesh position={[0, y, 0.15]} scale={scale}>
          <sphereGeometry args={[0.32, 20, 20]} />
          <meshBasicMaterial color={enemy.coreColor} transparent opacity={0.24} toneMapped={false} />
        </mesh>
      ) : null}
    </>
  );
}

export function WeatherEnemyModel({
  enemy,
  clear = false,
  compact = false,
}: {
  enemy: WeatherEnemy;
  clear?: boolean;
  compact?: boolean;
}) {
  const scale = compact ? 0.66 : 1;

  let body;
  switch (enemy.id) {
    case "cloudy":
      body = <CloudyModel enemy={enemy} clear={clear} />;
      break;
    case "heavyRain":
      body = <HeavyRainModel enemy={enemy} clear={clear} />;
      break;
    case "thunderstorm":
      body = <ThunderstormModel enemy={enemy} clear={clear} />;
      break;
    case "tornado":
      body = <TornadoModel enemy={enemy} clear={clear} />;
      break;
    case "rainySeason":
      body = <RainySeasonModel enemy={enemy} clear={clear} />;
      break;
    case "blizzard":
      body = <BlizzardModel enemy={enemy} clear={clear} />;
      break;
    case "typhoon":
      body = <TyphoonModel enemy={enemy} clear={clear} />;
      break;
    default:
      body = <CloudyModel enemy={enemy} clear={clear} />;
  }

  return (
    <group scale={scale} position={[0, compact ? -0.15 : 0, 0]}>
      {body}
      <CoreOrb enemy={enemy} clear={clear} compact={compact} />
      <Halo color={enemy.accentColor} />
    </group>
  );
}
