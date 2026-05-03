import { useMemo } from "react";
import type { Stage } from "../game/types";

function pseudoRandom(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function ArenaRings({ stage, scale }: { stage: Stage; scale: number }) {
  const rings = [0.34, 0.65, 0.95].map((ratio) => ratio * stage.arena.x * scale);
  return (
    <>
      {rings.map((radius, index) => (
        <mesh
          key={radius}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.03, 0]}
        >
          <ringGeometry args={[radius, radius + 0.16, 96]} />
          <meshBasicMaterial
            color={stage.ringColor}
            transparent
            opacity={0.55 - index * 0.14}
            toneMapped={false}
          />
        </mesh>
      ))}
    </>
  );
}

function LabTerrain({ stage, isClear }: { stage: Stage; isClear: boolean }) {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <planeGeometry args={[30, 30, 32, 32]} />
        <meshStandardMaterial color={isClear ? "#d9f6ff" : stage.groundColor} metalness={0.32} roughness={0.5} />
      </mesh>
      <ArenaRings stage={stage} scale={1} />
      {[-9, -6, -2.5, 3, 6, 9].map((x, index) => (
        <mesh
          key={x}
          position={[x, 0.6 + Math.abs(index - 2) * 0.2, -3 - Math.abs(index - 2) * 1.6]}
        >
          <boxGeometry args={[1.4, 1.1 + Math.abs(index - 2) * 0.4, 1.4]} />
          <meshStandardMaterial
            color={isClear ? "#a4c2cd" : stage.buildingColor}
            emissive={stage.buildingEmissive}
            emissiveIntensity={isClear ? 0.05 : 0.18}
            metalness={0.4}
            roughness={0.42}
          />
        </mesh>
      ))}
    </>
  );
}

function RuinsTerrain({ stage, isClear }: { stage: Stage; isClear: boolean }) {
  const rubble = useMemo(
    () =>
      Array.from({ length: 28 }, (_, index) => {
        const radius = 4 + pseudoRandom(index + 1) * 13;
        const angle = pseudoRandom(index + 7) * Math.PI * 2;
        return {
          x: Math.cos(angle) * radius,
          z: Math.sin(angle) * radius,
          height: 0.4 + pseudoRandom(index + 11) * 1.4,
          width: 0.7 + pseudoRandom(index + 17) * 0.9,
          tilt: (pseudoRandom(index + 23) - 0.5) * 0.4,
          rotY: pseudoRandom(index + 29) * Math.PI,
        };
      }),
    [],
  );
  const towers = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => {
        const angle = (index / 6) * Math.PI * 2 + 0.4;
        const radius = 13 + pseudoRandom(index + 41) * 3;
        return {
          x: Math.cos(angle) * radius,
          z: Math.sin(angle) * radius,
          height: 4 + pseudoRandom(index + 53) * 3,
          tilt: (pseudoRandom(index + 67) - 0.5) * 0.3,
        };
      }),
    [],
  );
  const pillars = useMemo(
    () => [
      { x: -6, z: -2, height: 3.4 },
      { x: 5, z: -1, height: 2.8 },
      { x: 0, z: 6, height: 3.0 },
      { x: -3, z: 9, height: 2.2 },
    ],
    [],
  );

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <planeGeometry args={[52, 52, 48, 48]} />
        <meshStandardMaterial color={isClear ? "#dccdb8" : stage.groundColor} metalness={0.18} roughness={0.78} />
      </mesh>
      <ArenaRings stage={stage} scale={1} />
      {rubble.map((piece, index) => (
        <mesh
          key={index}
          position={[piece.x, piece.height / 2, piece.z]}
          rotation={[piece.tilt, piece.rotY, piece.tilt * 0.6]}
        >
          <boxGeometry args={[piece.width, piece.height, piece.width * 0.9]} />
          <meshStandardMaterial
            color={isClear ? "#a08a76" : stage.buildingColor}
            emissive={stage.buildingEmissive}
            emissiveIntensity={isClear ? 0.04 : 0.12}
            roughness={0.84}
            metalness={0.16}
          />
        </mesh>
      ))}
      {towers.map((tower, index) => (
        <group key={index} position={[tower.x, 0, tower.z]} rotation={[0, 0, tower.tilt]}>
          <mesh position={[0, tower.height / 2, 0]}>
            <boxGeometry args={[1.4, tower.height, 1.4]} />
            <meshStandardMaterial
              color={isClear ? "#a8907a" : stage.buildingColor}
              emissive={stage.buildingEmissive}
              emissiveIntensity={isClear ? 0.04 : 0.18}
              roughness={0.78}
              metalness={0.22}
            />
          </mesh>
          <mesh position={[0.6, tower.height + 0.2, 0]} rotation={[0, 0, -0.4]}>
            <boxGeometry args={[0.9, 0.4, 1.5]} />
            <meshStandardMaterial color={isClear ? "#988673" : stage.buildingColor} roughness={0.9} />
          </mesh>
        </group>
      ))}
      {pillars.map((pillar, index) => (
        <mesh key={index} position={[pillar.x, pillar.height / 2, pillar.z]}>
          <cylinderGeometry args={[0.36, 0.42, pillar.height, 12]} />
          <meshStandardMaterial color={isClear ? "#bda893" : "#3a2a26"} roughness={0.82} />
        </mesh>
      ))}
    </>
  );
}

function HighlandTerrain({ stage, isClear }: { stage: Stage; isClear: boolean }) {
  const peaks = useMemo(
    () =>
      Array.from({ length: 10 }, (_, index) => {
        const angle = (index / 10) * Math.PI * 2 + 0.2;
        const radius = 17 + pseudoRandom(index + 3) * 6;
        return {
          x: Math.cos(angle) * radius,
          z: Math.sin(angle) * radius,
          height: 5 + pseudoRandom(index + 9) * 4.5,
          base: 3.4 + pseudoRandom(index + 13) * 1.4,
        };
      }),
    [],
  );
  const rocks = useMemo(
    () =>
      Array.from({ length: 18 }, (_, index) => {
        const radius = 3 + pseudoRandom(index + 31) * 12;
        const angle = pseudoRandom(index + 37) * Math.PI * 2;
        return {
          x: Math.cos(angle) * radius,
          z: Math.sin(angle) * radius,
          size: 0.5 + pseudoRandom(index + 41) * 0.8,
        };
      }),
    [],
  );
  const platforms = useMemo(
    () => [
      { x: -7, z: 4, height: 0.6, w: 4.5, d: 3.6 },
      { x: 8, z: -2, height: 0.9, w: 5, d: 4 },
      { x: 0, z: 11, height: 1.2, w: 6, d: 4.5 },
    ],
    [],
  );

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <planeGeometry args={[58, 58, 56, 56]} />
        <meshStandardMaterial color={isClear ? "#e6f4ff" : stage.groundColor} metalness={0.24} roughness={0.62} />
      </mesh>
      <ArenaRings stage={stage} scale={1} />
      {platforms.map((p, index) => (
        <group key={index} position={[p.x, 0, p.z]}>
          <mesh position={[0, p.height / 2, 0]}>
            <boxGeometry args={[p.w, p.height, p.d]} />
            <meshStandardMaterial color={isClear ? "#cdd9e3" : "#33495b"} roughness={0.74} metalness={0.2} />
          </mesh>
          <mesh position={[0, p.height + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[p.w * 0.94, p.d * 0.94]} />
            <meshStandardMaterial color={isClear ? "#f5fbff" : "#dfeff7"} roughness={0.7} />
          </mesh>
        </group>
      ))}
      {rocks.map((rock, index) => (
        <mesh key={index} position={[rock.x, rock.size / 2, rock.z]}>
          <boxGeometry args={[rock.size * 1.4, rock.size, rock.size * 1.2]} />
          <meshStandardMaterial color={isClear ? "#a7b8c4" : "#27384a"} roughness={0.88} />
        </mesh>
      ))}
      {peaks.map((peak, index) => (
        <group key={index} position={[peak.x, 0, peak.z]}>
          <mesh position={[0, peak.height / 2, 0]}>
            <coneGeometry args={[peak.base, peak.height, 8]} />
            <meshStandardMaterial
              color={isClear ? "#9bb1c2" : stage.buildingColor}
              emissive={stage.buildingEmissive}
              emissiveIntensity={isClear ? 0.03 : 0.1}
              roughness={0.82}
            />
          </mesh>
          <mesh position={[0, peak.height - 0.6, 0]}>
            <coneGeometry args={[peak.base * 0.45, 1.4, 8]} />
            <meshStandardMaterial color={isClear ? "#ffffff" : "#dff1ff"} emissive="#dff1ff" emissiveIntensity={0.18} roughness={0.5} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 1.5, -16]}>
        <cylinderGeometry args={[0.6, 0.9, 3, 12]} />
        <meshStandardMaterial color={isClear ? "#c8d8e0" : stage.buildingColor} emissive={stage.buildingEmissive} emissiveIntensity={0.18} metalness={0.4} roughness={0.45} />
      </mesh>
      <mesh position={[0, 3.4, -16]}>
        <sphereGeometry args={[1.1, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={isClear ? "#d8e8f2" : "#345168"} emissive={stage.buildingEmissive} emissiveIntensity={0.16} metalness={0.5} roughness={0.4} />
      </mesh>
    </>
  );
}

export function StageTerrain({ stage, isClear }: { stage: Stage; isClear: boolean }) {
  if (stage.id === "ruins") {
    return <RuinsTerrain stage={stage} isClear={isClear} />;
  }
  if (stage.id === "highland") {
    return <HighlandTerrain stage={stage} isClear={isClear} />;
  }
  return <LabTerrain stage={stage} isClear={isClear} />;
}
