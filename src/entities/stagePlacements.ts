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
  /** Optional Y rotation (radians). */
  rotY?: number;
  /** Optional X-axis tilt (radians); makes the block look fallen / uneven. */
  tilt?: number;
  /** Color preset; defaults to the original highland snow tone. */
  variant?: "snow" | "ruin" | "metal";
};

export type StagePlacement = {
  // Floor
  floor: {
    size: number;
    metalness: number;
    roughness: number;
    clearColor: string;
    /** Optional PBR texture set (4 maps) under public/textures/field/<key>/. */
    texture?: string;
    /** How many tile repeats across the floor span. */
    textureRepeat?: number;
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
    floor: { size: 30, metalness: 0.32, roughness: 0.5, clearColor: "#d9f6ff", texture: "lab", textureRepeat: 6 },
    fixed: [
      // Heavy machinery clustered in back
      { url: "/models/space-kit/machine_generatorLarge.glb", x: -8, z: -5, scale: 1.3, rotY: 0.2 },
      { url: "/models/space-kit/machine_generator.glb", x: -3, z: -7, scale: 1.4, rotY: -0.3 },
      { url: "/models/space-base-bits/cargo_A_packed.gltf", x: 4, z: -6, scale: 2.2, rotY: 0 },
      { url: "/models/space-kit/machine_wireless.glb", x: 8, z: -4, scale: 1.4, rotY: -0.5 },
      // Side structures
      { url: "/models/space-base-bits/cargo_B_packed.gltf", x: 9, z: 2, scale: 2.0, rotY: 0.4 },
      { url: "/models/space-base-bits/cargo_A_stacked.gltf", x: 8.5, z: 5, scale: 1.6, rotY: -0.2 },
      { url: "/models/space-kit/structure.glb", x: -8.5, z: 3, scale: 1.5, rotY: 0.3 },
      { url: "/models/space-kit/structure_detailed.glb", x: -8, z: 6, scale: 1.4, rotY: -0.4 },
      // Center backdrop: self-contained GLB consoles. Avoid external-texture
      // GLTFs here because their external trim textures are not included.
      { url: "/models/space-kit/desk_computer.glb", x: 0, z: -8.5, scale: 1.6, rotY: 0 },
      { url: "/models/factory-kit/screen-panel-wide.glb", x: -3, z: -8.6, scale: 1.5, rotY: 0.3 },
      { url: "/models/factory-kit/screen-panel-wide.glb", x: 3, z: -8.6, scale: 1.5, rotY: -0.3 },
      // Side props
      { url: "/models/factory-kit/cog-a.glb", x: -10, z: 0, scale: 1.4, rotY: 0 },
      { url: "/models/factory-kit/cog-b.glb", x: 10, z: -1, scale: 1.4, rotY: 0.5 },
      // Containers / crates (KayKit modular cargo for stronger silhouette)
      { url: "/models/space-base-bits/containers_A.gltf", x: -5, z: 7, scale: 2.4, rotY: 0.6 },
      { url: "/models/space-base-bits/containers_B.gltf", x: -3.5, z: 7.4, scale: 2.4, rotY: -0.2 },
      { url: "/models/space-base-bits/containers_C.gltf", x: 4.6, z: 7.6, scale: 2.4, rotY: 0.4 },
      // Floor lamps + small detail props (KayKit lights mark walking lanes)
      { url: "/models/space-base-bits/lights.gltf", x: -2.4, z: 4.5, scale: 1.0, rotY: 0 },
      { url: "/models/space-base-bits/lights.gltf", x: 2.4, z: 4.5, scale: 1.0, rotY: 0 },
      { url: "/models/factory-kit/screen-hanging-small.glb", x: 0, z: 6.0, scale: 0.9, rotY: 0 },
      { url: "/models/factory-kit/machine-window.glb", x: 6.5, z: 4.5, scale: 1.1, rotY: -0.4 },
      { url: "/models/space-kit/machine_wirelessCable.glb", x: -7, z: -1.5, scale: 1.0, rotY: 0.2 },
      // KayKit ResourceBits: industrial pallets / fuel barrels / parts piles
      // line the side aisles. Pallets sit flat (no height) so they don't
      // block the player line of sight; barrels add silhouette.
      { url: "/models/resource-bits/Pallet_Wood_Covered_A.gltf", x: -5.5, z: -2.5, scale: 1.2, rotY: 0.3 },
      { url: "/models/resource-bits/Fuel_A_Barrels.gltf", x: -5.5, z: -2.5, scale: 1.0, rotY: 0.3 },
      { url: "/models/resource-bits/Pallet_Wood.gltf", x: 5.5, z: -2.5, scale: 1.2, rotY: -0.4 },
      { url: "/models/resource-bits/Fuel_C_Barrels.gltf", x: 5.5, z: -2.5, scale: 1.0, rotY: -0.4 },
      { url: "/models/resource-bits/Iron_Bars_Stack_Large.gltf", x: -3, z: 0, scale: 1.0, rotY: 0.5 },
      { url: "/models/resource-bits/Copper_Bars_Stack_Medium.gltf", x: 3, z: 0, scale: 1.0, rotY: -0.4 },
      { url: "/models/resource-bits/Parts_Pile_Large.gltf", x: -1.6, z: -3.2, scale: 1.0, rotY: 0.2 },
      { url: "/models/resource-bits/Parts_Pile_Medium.gltf", x: 1.6, z: -3.2, scale: 1.0, rotY: -0.5 },
      { url: "/models/resource-bits/Fuel_A_Jerrycan.gltf", x: -7, z: 4, scale: 1.2, rotY: 0.7 },
      { url: "/models/resource-bits/Fuel_A_Barrel_Dirty.gltf", x: 7.5, z: 1, scale: 1.0, rotY: 0.4 },
    ],
    scattered: [],
  },
  ruins: {
    floor: { size: 52, metalness: 0.18, roughness: 0.78, clearColor: "#dccdb8", texture: "ruins", textureRepeat: 9 },
    fixed: [
      { url: "/models/tower-defense-kit/tower-square-bottom-a.glb", x: -7, z: -3, scale: 1.4, rotY: 0.4 },
      { url: "/models/tower-defense-kit/tower-square-middle-b.glb", x: 6, z: -1, scale: 1.5, rotY: -0.6 },
      { url: "/models/tower-defense-kit/tower-square-roof-c.glb", x: -2, z: 8, scale: 1.3, rotY: 1.2 },
      { url: "/models/space-kit/hangar_largeB.glb", x: 0, z: 14, scale: 1.4, rotY: 0.6, tilt: 0.05 },
      { url: "/models/space-kit/craft_cargoB.glb", x: -9, z: 12, scale: 1.6, rotY: -0.3 },
      // KayKit cargo wreckage: scattered base-module debris around the central crash
      { url: "/models/space-base-bits/cargodepot_C.gltf", x: 8, z: 12, scale: 1.6, rotY: -0.4, tilt: 0.08 },
      { url: "/models/space-base-bits/structure_low.gltf", x: -4, z: -10, scale: 1.8, rotY: 0.5, tilt: 0.1 },
      { url: "/models/space-base-bits/cargo_B_stacked.gltf", x: 11, z: -5, scale: 1.8, rotY: 0.7 },
      // Nature reclaiming the city: bare KayKit trees mixed with stylized dead trees
      { url: "/models/forest-nature/Tree_Bare_1_A_Color1.gltf", x: 12, z: 4, scale: 0.7, rotY: 0.6 },
      { url: "/models/forest-nature/Tree_Bare_1_B_Color1.gltf", x: -13, z: 6, scale: 0.65, rotY: -0.4 },
      { url: "/models/forest-nature/Tree_Bare_2_A_Color1.gltf", x: 9, z: -7, scale: 0.6, rotY: 1.1 },
      { url: "/models/forest-nature/Tree_Bare_1_A_Color1.gltf", x: -10, z: -8, scale: 0.85, rotY: -0.9, tilt: 0.06 },
      // A few young trees breaking through the rubble (color = recovery)
      { url: "/models/forest-nature/Tree_3_A_Color1.gltf", x: -2, z: -13, scale: 0.45, rotY: 0.3 },
      { url: "/models/forest-nature/Tree_2_A_Color1.gltf", x: 14, z: -2, scale: 0.4, rotY: -0.7 },
      // Bushes hugging cargo wreckage
      { url: "/models/forest-nature/Bush_1_C_Color1.gltf", x: -6, z: 11, scale: 1.4, rotY: 0.2 },
      { url: "/models/forest-nature/Bush_2_A_Color1.gltf", x: 5, z: 10, scale: 1.6, rotY: -0.3 },
      { url: "/models/forest-nature/Bush_3_A_Color1.gltf", x: 9.5, z: 13, scale: 1.4, rotY: 0.5 },
      { url: "/models/forest-nature/Bush_1_A_Color1.gltf", x: -3, z: -10.5, scale: 2.0, rotY: -0.4 },
    ],
    scattered: [
      // Small rubble scattered across the field
      {
        count: 14,
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
      // Mossy rocks + scattered bushes from the forest pack — vegetation
      // creeping out from the perimeter toward the city centre.
      {
        count: 9,
        pool: [
          "/models/forest-nature/Rock_1_A_Color1.gltf",
          "/models/forest-nature/Rock_1_F_Color1.gltf",
          "/models/forest-nature/Rock_3_A_Color1.gltf",
          "/models/forest-nature/Rock_3_F_Color1.gltf",
        ],
        radius: [9, 18],
        scale: [1.0, 2.0],
        seed: 91,
      },
      {
        count: 8,
        pool: [
          "/models/forest-nature/Bush_1_A_Color1.gltf",
          "/models/forest-nature/Bush_1_C_Color1.gltf",
          "/models/forest-nature/Bush_2_A_Color1.gltf",
        ],
        radius: [6, 17],
        scale: [1.2, 2.4],
        seed: 137,
      },
    ],
    // Crumbled concrete slabs scattered across the ruined city — uneven heights
    // and slight tilts make the terrain feel collapsed rather than flat-paved.
    platforms: [
      { x: -10, z: 2, height: 1.3, w: 4.4, d: 3.0, rotY: 0.35, tilt: 0.12, variant: "ruin" },
      { x: 8, z: 4, height: 0.7, w: 5.2, d: 4.0, rotY: -0.4, tilt: 0.08, variant: "ruin" },
      { x: -3, z: -4, height: 1.6, w: 3.6, d: 3.6, rotY: 0.2, tilt: 0.18, variant: "ruin" },
      { x: 5, z: -8, height: 0.9, w: 4.8, d: 3.2, rotY: -0.6, tilt: 0.1, variant: "ruin" },
      { x: -7, z: -12, height: 1.1, w: 3.2, d: 2.8, rotY: 0.6, tilt: 0.15, variant: "ruin" },
      { x: 12, z: -2, height: 0.5, w: 2.4, d: 2.4, rotY: 0.9, tilt: 0.22, variant: "ruin" },
      { x: 0, z: 4, height: 0.4, w: 3.0, d: 2.2, rotY: -0.2, tilt: 0.05, variant: "ruin" },
      { x: -14, z: 8, height: 0.8, w: 3.6, d: 2.6, rotY: -0.5, tilt: 0.14, variant: "ruin" },
    ],
  },
  highland: {
    floor: { size: 58, metalness: 0.24, roughness: 0.62, clearColor: "#e6f4ff", texture: "highland", textureRepeat: 10 },
    fixed: [
      { url: "/models/space-kit/hangar_roundGlass.glb", x: 0, z: -16, scale: 2.4, rotY: 0 },
      { url: "/models/space-kit/satelliteDish_large.glb", x: 6, z: -14, scale: 1.6, rotY: 0.4 },
      { url: "/models/space-kit/satelliteDish.glb", x: -6, z: -14, scale: 1.6, rotY: -0.6 },
      // KayKit weather observation gear: turbines + solar arrays = "we measure the wind"
      { url: "/models/space-base-bits/windturbine_tall.gltf", x: -14, z: -8, scale: 2.2, rotY: 0.4 },
      { url: "/models/space-base-bits/windturbine_tall.gltf", x: 15, z: -10, scale: 2.0, rotY: -0.3 },
      { url: "/models/space-base-bits/windturbine_low.gltf", x: 18, z: 10, scale: 1.8, rotY: 0.8 },
      { url: "/models/space-base-bits/landingpad_large.gltf", x: -10, z: 14, scale: 2.0, rotY: 0 },
      { url: "/models/space-base-bits/landingpad_small.gltf", x: 6, z: 18, scale: 1.6, rotY: 0.5 },
      { url: "/models/space-base-bits/roofmodule_solarpanels.gltf", x: -2, z: -8, scale: 2.0, rotY: 0 },
      { url: "/models/space-base-bits/solarpanel.gltf", x: 3, z: -8, scale: 1.6, rotY: -0.2 },
      // Anchor base: drum-shaped basemodules behind the central hangar so the
      // turbines/solar field reads as a connected research outpost.
      { url: "/models/space-base-bits/basemodule_E.gltf", x: -8, z: -19, scale: 2.4, rotY: 0.2 },
      { url: "/models/space-base-bits/basemodule_garage.gltf", x: 9, z: -19, scale: 2.4, rotY: -0.2 },
      { url: "/models/space-base-bits/basemodule_C.gltf", x: -16, z: -16, scale: 2.0, rotY: 0.6 },
      // Marker lights flanking the landing pads (visual lane cues at altitude)
      { url: "/models/space-base-bits/lights.gltf", x: -12.5, z: 14, scale: 1.4, rotY: 0 },
      { url: "/models/space-base-bits/lights.gltf", x: -7.5, z: 14, scale: 1.4, rotY: 0 },
      { url: "/models/space-base-bits/lights.gltf", x: 4, z: 18, scale: 1.2, rotY: 0 },
      { url: "/models/space-base-bits/lights.gltf", x: 8, z: 18, scale: 1.2, rotY: 0 },
      // Tall pines for vertical silhouette against the horizon
      { url: "/models/forest-nature/Tree_4_B_Color1.gltf", x: 19, z: 4, scale: 0.55, rotY: 0.5 },
      { url: "/models/forest-nature/Tree_4_B_Color1.gltf", x: -20, z: 0, scale: 0.5, rotY: -0.7 },
      { url: "/models/forest-nature/Tree_2_C_Color1.gltf", x: 17, z: 17, scale: 0.45, rotY: 1.0 },
      // Mid-altitude evergreens around the observatory
      { url: "/models/stylized-nature/CommonTree_4.gltf", x: 14, z: 6, scale: 0.5, rotY: 0.3 },
      { url: "/models/stylized-nature/CommonTree_4.gltf", x: -16, z: 4, scale: 0.6, rotY: -0.6 },
      { url: "/models/stylized-nature/CommonTree_4.gltf", x: 11, z: 16, scale: 0.45, rotY: 1.2 },
      // Outcrops between the snow rocks
      { url: "/models/stylized-nature/Rock_Medium_1.gltf", x: -12, z: 8, scale: 0.6, rotY: 0.4 },
      { url: "/models/stylized-nature/Rock_Medium_2.gltf", x: 13, z: -2, scale: 0.7, rotY: -0.5 },
      { url: "/models/stylized-nature/Rock_Medium_3.gltf", x: -3, z: 14, scale: 0.65, rotY: 0.9 },
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
      // Snow-covered rocky outcrops at varied altitudes
      { x: -12, z: 8, height: 1.6, w: 3.8, d: 3.2, rotY: 0.4, tilt: 0.08 },
      { x: 13, z: 10, height: 1.1, w: 4.2, d: 3.0, rotY: -0.3, tilt: 0.05 },
      { x: -4, z: -2, height: 0.4, w: 3.0, d: 2.4, rotY: 0.2 },
      { x: 4, z: 6, height: 0.5, w: 2.6, d: 2.2, rotY: -0.5, tilt: 0.06 },
      { x: -10, z: -4, height: 1.9, w: 3.4, d: 3.0, rotY: 0.7, tilt: 0.1 },
      { x: 11, z: -8, height: 0.8, w: 3.0, d: 2.8, rotY: -0.6, tilt: 0.04 },
      { x: 6, z: -14, height: 1.4, w: 4.0, d: 3.4, rotY: 0.3, tilt: 0.07 },
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
