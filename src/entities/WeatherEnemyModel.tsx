import type { WeatherEnemy } from "../game/types";

const cloudOffsets = [
  [-0.95, 0.08, 0],
  [-0.45, 0.32, 0.12],
  [0.08, 0.18, -0.04],
  [0.6, 0.28, 0.08],
  [1.05, 0.04, 0],
] as const;

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
  const isVortex = enemy.id === "tornado" || enemy.id === "blizzard" || enemy.id === "typhoon";
  const isWet = enemy.id === "heavyRain" || enemy.id === "rainySeason";
  const isElectric = enemy.id === "thunderstorm";

  return (
    <group scale={scale} position={[0, compact ? -0.15 : 0, 0]}>
      {isVortex ? (
        <group rotation={[0.12, 0.25, -0.2]}>
          {[0.55, 0.82, 1.08].map((radius, index) => (
            <mesh key={radius} position={[0, 0.18 + index * 0.18, 0]} rotation={[1.2, 0, index * 0.72]}>
              <torusGeometry args={[radius, 0.045, 16, 96]} />
              <meshStandardMaterial color={enemy.color} emissive={enemy.accentColor} emissiveIntensity={0.35} />
            </mesh>
          ))}
        </group>
      ) : (
        cloudOffsets.map(([x, y, z], index) => (
          <mesh key={`${enemy.id}-${index}`} position={[x, y, z]}>
            <sphereGeometry args={[0.48 + index * 0.04, 28, 28]} />
            <meshStandardMaterial
              color={clear ? "#f7fbff" : enemy.color}
              emissive={enemy.accentColor}
              emissiveIntensity={clear ? 0.18 : 0.1}
              roughness={0.56}
            />
          </mesh>
        ))
      )}

      <mesh position={[0, 0.05, 0.15]}>
        <sphereGeometry args={[0.34, 40, 40]} />
        <meshStandardMaterial
          color={clear ? "#fff9bf" : enemy.coreColor}
          emissive={clear ? "#fff3a0" : enemy.coreColor}
          emissiveIntensity={clear ? 1.15 : 0.85}
          roughness={0.2}
        />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.25, 0.018, 10, 96]} />
        <meshStandardMaterial color={enemy.accentColor} emissive={enemy.accentColor} emissiveIntensity={0.55} />
      </mesh>

      {isWet
        ? [-0.55, 0, 0.55].map((x) => (
            <mesh key={x} position={[x, -0.72, 0]}>
              <capsuleGeometry args={[0.035, 0.46, 8, 12]} />
              <meshStandardMaterial color={enemy.accentColor} emissive={enemy.accentColor} emissiveIntensity={0.55} />
            </mesh>
          ))
        : null}

      {isElectric
        ? [-0.75, 0.78].map((x) => (
            <mesh key={x} position={[x, -0.55, 0]} rotation={[0, 0, x > 0 ? 0.28 : -0.28]}>
              <boxGeometry args={[0.08, 1.55, 0.08]} />
              <meshStandardMaterial color={enemy.accentColor} emissive={enemy.accentColor} emissiveIntensity={1.1} />
            </mesh>
          ))
        : null}
    </group>
  );
}
