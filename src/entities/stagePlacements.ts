import type { StageId } from "../game/types";

// Placement data for stage-specific decorations. Splitting out from
// StageTerrain.tsx so adding "+1 satellite dish" or "move that tower" only
// touches a data row, not the rendering logic.
//
// `tilt` lets ruins lean their props slightly. `customRotZ` is similar.
// Keep parts coarse — bundle small props together (article guidance:
// "粒度を細かくしすぎない").

export type GltfPlacement = {
  url: string;
  x: number;
  z: number;
  scale: number;
  rotY: number;
  tilt?: number;
};

export type ProceduralCluster = {
  count: number;
  pool: string[];
  // [minRadius, maxRadius]
  radius: [number, number];
  // [minScale, maxScale]
  scale: [number, number];
  // RNG seed offsets so different clusters don't collide
  seed: number;
  // Optional small tilt / lean per piece (radians)
  tilt?: number;
};

export type RaisedPlatform = {
  x: number;
  z: number;
  height: number;
  w: number;
  d: number;
};

export type StagePlacement = {
  // Floor
  floor: {
    size: number;
    metalness: number;
    roughness: number;
    clearColor: string;
  };
  // Hand-placed GLTF props
  fixed: GltfPlacement[];
  // Procedurally scattered GLTF props
  scattered: ProceduralCluster[];
  // Pure-mesh raised platforms (highland)
  platforms?: RaisedPlatform[];
};

export const STAGE_PLACEMENTS: Record<StageId, StagePlacement> = {
  lab: {
    floor: { size: 30, metalness: 0.32, roughness: 0.5, clearColor: "#d9f6ff" },
    fixed: [
      // Heavy machinery clustered in back
      { url: "/models/space-kit/machine_generatorLarge.glb", x: -8, z: -5, scale: 1.3, rotY: 0.2 },
      { url: "/models/space-kit/machine_generator.glb", x: -3, z: -7, scale: 1.4, rotY: -0.3 },
      { url: "/models/space-kit/machine_barrelLarge.glb", x: 4, z: -6, scale: 1.4, rotY: 0 },
      { url: "/models/space-kit/machine_wireless.glb", x: 8, z: -4, scale: 1.4, rotY: -0.5 },
      // Side structures
      { url: "/models/space-kit/machine_barrel.glb", x: 9, z: 2, scale: 1.5, rotY: 0.4 },
      { url: "/models/space-kit/machine_barrel.glb", x: 8.5, z: 5, scale: 1.4, rotY: -0.2 },
      { url: "/models/space-kit/structure.glb", x: -8.5, z: 3, scale: 1.5, rotY: 0.3 },
      { url: "/models/space-kit/structure_detailed.glb", x: -8, z: 6, scale: 1.4, rotY: -0.4 },
      // Center backdrop
      { url: "/models/space-station-kit/computer-wide.glb", x: 0, z: -8.5, scale: 1.6, rotY: 0 },
      { url: "/models/space-station-kit/computer-system.glb", x: -3, z: -8.6, scale: 1.4, rotY: 0.3 },
      { url: "/models/space-station-kit/computer.glb", x: 3, z: -8.6, scale: 1.4, rotY: -0.3 },
      // Side props
      { url: "/models/factory-kit/cog-a.glb", x: -10, z: 0, scale: 1.4, rotY: 0 },
      { url: "/models/factory-kit/cog-b.glb", x: 10, z: -1, scale: 1.4, rotY: 0.5 },
      // Containers
      { url: "/models/space-station-kit/container.glb", x: -5, z: 7, scale: 1.0, rotY: 0.6 },
      { url: "/models/space-station-kit/container-tall.glb", x: -3.5, z: 7.4, scale: 1.0, rotY: -0.2 },
      { url: "/models/space-station-kit/container-wide.glb", x: 4.6, z: 7.6, scale: 1.0, rotY: 0.4 },
    ],
    scattered: [],
  },
  ruins: {
    floor: { size: 52, metalness: 0.18, roughness: 0.78, clearColor: "#dccdb8" },
    fixed: [
      { url: "/models/tower-defense-kit/tower-square-bottom-a.glb", x: -7, z: -3, scale: 1.4, rotY: 0.4 },
      { url: "/models/tower-defense-kit/tower-square-middle-b.glb", x: 6, z: -1, scale: 1.5, rotY: -0.6 },
      { url: "/models/tower-defense-kit/tower-square-roof-c.glb", x: -2, z: 8, scale: 1.3, rotY: 1.2 },
      { url: "/models/space-kit/hangar_largeB.glb", x: 0, z: 14, scale: 1.4, rotY: 0.6, tilt: 0.05 },
      { url: "/models/space-kit/craft_cargoB.glb", x: -9, z: 12, scale: 1.6, rotY: -0.3 },
    ],
    scattered: [
      // Small rubble scattered across the field
      {
        count: 18,
        pool: [
          "/models/space-kit/rocks_smallA.glb",
          "/models/space-kit/rocks_smallB.glb",
          "/models/space-kit/rock.glb",
        ],
        radius: [5, 17],
        scale: [1.2, 3.0],
        seed: 1,
      },
      // Toppled tanks / structures
      {
        count: 5,
        pool: [
          "/models/space-kit/machine_barrelLarge.glb",
          "/models/space-kit/machine_generator.glb",
          "/models/space-kit/structure.glb",
        ],
        radius: [13, 16],
        scale: [1.4, 2.0],
        seed: 41,
        tilt: 0.18,
      },
    ],
  },
  highland: {
    floor: { size: 58, metalness: 0.24, roughness: 0.62, clearColor: "#e6f4ff" },
    fixed: [
      { url: "/models/space-kit/hangar_roundGlass.glb", x: 0, z: -16, scale: 2.4, rotY: 0 },
      { url: "/models/space-kit/satelliteDish_large.glb", x: 6, z: -14, scale: 1.6, rotY: 0.4 },
      { url: "/models/space-kit/satelliteDish.glb", x: -6, z: -14, scale: 1.6, rotY: -0.6 },
    ],
    scattered: [
      // Outer crystal peaks
      {
        count: 10,
        pool: [
          "/models/space-kit/rock_crystalsLargeA.glb",
          "/models/space-kit/rock_crystalsLargeB.glb",
          "/models/space-kit/rock_crystals.glb",
          "/models/tower-defense-kit/snow-detail-crystal-large.glb",
        ],
        radius: [17, 23],
        scale: [2.4, 4.0],
        seed: 3,
      },
      // Rocks closer in
      {
        count: 16,
        pool: [
          "/models/space-kit/rock_largeA.glb",
          "/models/space-kit/rock_largeB.glb",
          "/models/space-kit/rocks_smallA.glb",
          "/models/tower-defense-kit/snow-detail-rocks-large.glb",
        ],
        radius: [3, 15],
        scale: [0.7, 1.7],
        seed: 31,
      },
      // Snow trees on the mid ring
      {
        count: 6,
        pool: [
          "/models/tower-defense-kit/snow-detail-tree.glb",
          "/models/tower-defense-kit/snow-detail-tree-large.glb",
        ],
        radius: [11, 15],
        scale: [1.2, 1.8],
        seed: 71,
      },
    ],
    platforms: [
      { x: -7, z: 4, height: 0.6, w: 4.5, d: 3.6 },
      { x: 8, z: -2, height: 0.9, w: 5, d: 4 },
      { x: 0, z: 11, height: 1.2, w: 6, d: 4.5 },
    ],
  },
};

export function pseudoRandom(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function expandCluster(cluster: ProceduralCluster): GltfPlacement[] {
  return Array.from({ length: cluster.count }, (_, index) => {
    const idx = cluster.seed + index;
    const radius = cluster.radius[0] + pseudoRandom(idx + 1) * (cluster.radius[1] - cluster.radius[0]);
    const angle = pseudoRandom(idx + 7) * Math.PI * 2;
    const scale = cluster.scale[0] + pseudoRandom(idx + 17) * (cluster.scale[1] - cluster.scale[0]);
    const rotY = pseudoRandom(idx + 29) * Math.PI;
    const url = cluster.pool[index % cluster.pool.length];
    const tilt = cluster.tilt ? (pseudoRandom(idx + 81) - 0.5) * cluster.tilt : 0;
    return {
      url,
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      scale,
      rotY,
      tilt,
    };
  });
}
