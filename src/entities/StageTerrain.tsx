import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import type { Stage } from "../game/types";

function pseudoRandom(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function GLTFInstance({ url, ...props }: { url: string } & Record<string, unknown>) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={cloned} {...props} />;
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
  const labProps = useMemo(
    () => [
      { url: "/models/space-kit/machine_generatorLarge.glb", x: -8, z: -5, scale: 1.3 },
      { url: "/models/space-kit/machine_generator.glb", x: -3, z: -7, scale: 1.4 },
      { url: "/models/space-kit/machine_barrelLarge.glb", x: 4, z: -6, scale: 1.4 },
      { url: "/models/space-kit/machine_wireless.glb", x: 8, z: -4, scale: 1.4 },
      { url: "/models/space-kit/machine_barrel.glb", x: 7, z: 2, scale: 1.5 },
      { url: "/models/space-kit/structure.glb", x: -7, z: 4, scale: 1.5 },
      { url: "/models/space-kit/structure_detailed.glb", x: 6, z: 6, scale: 1.5 },
      { url: "/models/space-station-kit/computer-wide.glb", x: 0, z: -8.5, scale: 1.6 },
    ],
    [],
  );

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <planeGeometry args={[30, 30, 32, 32]} />
        <meshStandardMaterial color={isClear ? "#d9f6ff" : stage.groundColor} metalness={0.32} roughness={0.5} />
      </mesh>
      <ArenaRings stage={stage} scale={1} />
      {labProps.map((prop) => (
        <group key={`${prop.url}-${prop.x}`} position={[prop.x, 0, prop.z]} scale={prop.scale}>
          <GLTFInstance url={prop.url} />
        </group>
      ))}
    </>
  );
}

function RuinsTerrain({ stage, isClear }: { stage: Stage; isClear: boolean }) {
  const rubblePool = [
    "/models/space-kit/rocks_smallA.glb",
    "/models/space-kit/rocks_smallB.glb",
    "/models/space-kit/rock.glb",
  ];
  const tankPool = [
    "/models/space-kit/machine_barrelLarge.glb",
    "/models/space-kit/machine_generator.glb",
    "/models/space-kit/structure.glb",
  ];
  const ruinTowers = [
    "/models/tower-defense-kit/tower-square-bottom-a.glb",
    "/models/tower-defense-kit/tower-square-middle-b.glb",
    "/models/tower-defense-kit/tower-square-roof-c.glb",
  ];

  const rubble = useMemo(
    () =>
      Array.from({ length: 18 }, (_, index) => {
        const radius = 5 + pseudoRandom(index + 1) * 12;
        const angle = pseudoRandom(index + 7) * Math.PI * 2;
        return {
          x: Math.cos(angle) * radius,
          z: Math.sin(angle) * radius,
          scale: 1.2 + pseudoRandom(index + 17) * 1.8,
          rotY: pseudoRandom(index + 29) * Math.PI,
          url: rubblePool[index % rubblePool.length],
        };
      }),
    [],
  );
  const broken = useMemo(
    () =>
      Array.from({ length: 5 }, (_, index) => {
        const angle = (index / 5) * Math.PI * 2 + 0.4;
        const radius = 13 + pseudoRandom(index + 41) * 3;
        return {
          x: Math.cos(angle) * radius,
          z: Math.sin(angle) * radius,
          rotY: pseudoRandom(index + 49) * Math.PI,
          url: tankPool[index % tankPool.length],
          scale: 1.4 + pseudoRandom(index + 67) * 0.6,
          tilt: (pseudoRandom(index + 81) - 0.5) * 0.18,
        };
      }),
    [],
  );
  const ruins = useMemo(
    () => [
      { x: -7, z: -3, url: ruinTowers[0], scale: 1.4, rotY: 0.4 },
      { x: 6, z: -1, url: ruinTowers[1], scale: 1.5, rotY: -0.6 },
      { x: -2, z: 8, url: ruinTowers[2], scale: 1.3, rotY: 1.2 },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <group key={index} position={[piece.x, 0, piece.z]} rotation={[0, piece.rotY, 0]} scale={piece.scale}>
          <GLTFInstance url={piece.url} />
        </group>
      ))}
      {broken.map((piece, index) => (
        <group
          key={`broken-${index}`}
          position={[piece.x, 0, piece.z]}
          rotation={[piece.tilt, piece.rotY, piece.tilt * 0.6]}
          scale={piece.scale}
        >
          <GLTFInstance url={piece.url} />
        </group>
      ))}
      {ruins.map((piece, index) => (
        <group key={`ruin-${index}`} position={[piece.x, 0, piece.z]} rotation={[0, piece.rotY, 0]} scale={piece.scale}>
          <GLTFInstance url={piece.url} />
        </group>
      ))}
    </>
  );
}

function HighlandTerrain({ stage, isClear }: { stage: Stage; isClear: boolean }) {
  const crystalPool = [
    "/models/space-kit/rock_crystalsLargeA.glb",
    "/models/space-kit/rock_crystalsLargeB.glb",
    "/models/space-kit/rock_crystals.glb",
  ];
  const rockPool = [
    "/models/space-kit/rock_largeA.glb",
    "/models/space-kit/rock_largeB.glb",
    "/models/space-kit/rocks_smallA.glb",
  ];

  const peaks = useMemo(
    () =>
      Array.from({ length: 10 }, (_, index) => {
        const angle = (index / 10) * Math.PI * 2 + 0.2;
        const radius = 17 + pseudoRandom(index + 3) * 6;
        return {
          x: Math.cos(angle) * radius,
          z: Math.sin(angle) * radius,
          scale: 2.4 + pseudoRandom(index + 9) * 1.6,
          rotY: pseudoRandom(index + 13) * Math.PI,
          url: crystalPool[index % crystalPool.length],
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const rocks = useMemo(
    () =>
      Array.from({ length: 16 }, (_, index) => {
        const radius = 3 + pseudoRandom(index + 31) * 12;
        const angle = pseudoRandom(index + 37) * Math.PI * 2;
        return {
          x: Math.cos(angle) * radius,
          z: Math.sin(angle) * radius,
          scale: 0.7 + pseudoRandom(index + 41) * 1.0,
          rotY: pseudoRandom(index + 47) * Math.PI,
          url: rockPool[index % rockPool.length],
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <group key={index} position={[rock.x, 0, rock.z]} rotation={[0, rock.rotY, 0]} scale={rock.scale}>
          <GLTFInstance url={rock.url} />
        </group>
      ))}
      {peaks.map((peak, index) => (
        <group key={index} position={[peak.x, 0, peak.z]} rotation={[0, peak.rotY, 0]} scale={peak.scale}>
          <GLTFInstance url={peak.url} />
        </group>
      ))}
      <group position={[0, 0, -16]} scale={2.4}>
        <GLTFInstance url="/models/space-kit/hangar_roundGlass.glb" />
      </group>
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
