import type { Stage, StageId } from "../game/types";
import { getMeasuredFootprint, getMeasuredTop } from "./footprintCache";

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
  /** Placement-time disc reservation radius (model-local units, scaled at
   *  runtime). Falls back to inferFootprint(url, scale). Set to 0 to opt
   *  out of overlap reservation entirely — used for intentional layering
   *  with another prop (a flat pallet under barrels, a cargo cluster,
   *  building modules grouped against a hangar). Does NOT affect runtime
   *  collision; that's controlled by `solid`. */
  footprint?: number;
  /** Whether the prop blocks runtime player / enemy movement and occludes
   *  ranged shots. Default true. Set false for wall-mounted, ceiling-hung,
   *  flat-on-the-floor, or truly minor decorative props (screens, hanging
   *  signs, pallets, landing pads, roof modules, marker lights, bushes). */
  solid?: boolean;
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
  /** Override the URL-inferred footprint for every piece in this cluster
   *  (model-local units, scaled at runtime). */
  footprint?: number;
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
      // cargo_A_stacked sits next to cargo_B_packed as a "supplies pile" —
      // overlap is intentional, opt out of disc reservation.
      { url: "/models/space-base-bits/cargo_A_stacked.gltf", x: 8.5, z: 5, scale: 1.6, rotY: -0.2, footprint: 0 },
      { url: "/models/space-kit/structure.glb", x: -8.5, z: 3, scale: 1.5, rotY: 0.3 },
      // structure_detailed is intentionally next to structure / containers as
      // a back-wall machinery cluster.
      { url: "/models/space-kit/structure_detailed.glb", x: -8, z: 6, scale: 1.4, rotY: -0.4, footprint: 0 },
      // Center backdrop: self-contained GLB consoles. The wall-mounted
      // screens are visually behind the desk and don't actually occupy
      // floor space — footprint:0 skips placement reservation, solid:false
      // skips runtime collision (player can pass under).
      { url: "/models/space-kit/desk_computer.glb", x: 0, z: -8.5, scale: 1.6, rotY: 0 },
      { url: "/models/factory-kit/screen-panel-wide.glb", x: -3, z: -8.6, scale: 1.5, rotY: 0.3, footprint: 0, solid: false },
      { url: "/models/factory-kit/screen-panel-wide.glb", x: 3, z: -8.6, scale: 1.5, rotY: -0.3, footprint: 0, solid: false },
      // Side props — decorative cogs, opt out so they can sit beside cargo.
      { url: "/models/factory-kit/cog-a.glb", x: -10, z: 0, scale: 1.4, rotY: 0, footprint: 0 },
      { url: "/models/factory-kit/cog-b.glb", x: 10, z: -1, scale: 1.4, rotY: 0.5, footprint: 0 },
      // Containers / crates (KayKit modular cargo for stronger silhouette).
      // Authored as a clustered cargo pile — secondary containers opt out
      // of disc reservation so they can stack against the primary.
      { url: "/models/space-base-bits/containers_A.gltf", x: -5, z: 7, scale: 2.4, rotY: 0.6 },
      { url: "/models/space-base-bits/containers_B.gltf", x: -3.5, z: 7.4, scale: 2.4, rotY: -0.2, footprint: 0 },
      { url: "/models/space-base-bits/containers_C.gltf", x: 4.6, z: 7.6, scale: 2.4, rotY: 0.4 },
      // Floor lamps + small detail props (KayKit lights mark walking lanes)
      // Lab lane-marker lights have a visible post + base — keep solid
      // so players bump into them rather than walking through.
      { url: "/models/space-base-bits/lights.gltf", x: -2.4, z: 4.5, scale: 1.0, rotY: 0 },
      { url: "/models/space-base-bits/lights.gltf", x: 2.4, z: 4.5, scale: 1.0, rotY: 0 },
      // Hanging from the ceiling, no floor footprint, no collision.
      { url: "/models/factory-kit/screen-hanging-small.glb", x: 0, z: 6.0, scale: 0.9, rotY: 0, footprint: 0, solid: false },
      // Wall-mounted, no floor footprint, no collision.
      { url: "/models/factory-kit/machine-window.glb", x: 6.5, z: 4.5, scale: 1.1, rotY: -0.4, footprint: 0, solid: false },
      { url: "/models/space-kit/machine_wirelessCable.glb", x: -7, z: -1.5, scale: 1.0, rotY: 0.2 },
      // KayKit ResourceBits: industrial pallets / fuel barrels / parts piles
      // line the side aisles. Pallets sit flat (no height) so they don't
      // block the player line of sight; barrels add silhouette.
      // Pallets get solid:true (default) so the player bumps into the
      // pallet edge instead of sliding through it. footprint:0 still
      // applies — the barrel on top owns the placement disc.
      { url: "/models/resource-bits/Pallet_Wood_Covered_A.gltf", x: -5.5, z: -2.5, scale: 1.2, rotY: 0.3, footprint: 0 },
      { url: "/models/resource-bits/Fuel_A_Barrels.gltf", x: -5.5, z: -2.5, scale: 1.0, rotY: 0.3 },
      { url: "/models/resource-bits/Pallet_Wood.gltf", x: 5.5, z: -2.5, scale: 1.2, rotY: -0.4, footprint: 0 },
      { url: "/models/resource-bits/Fuel_C_Barrels.gltf", x: 5.5, z: -2.5, scale: 1.0, rotY: -0.4 },
      { url: "/models/resource-bits/Iron_Bars_Stack_Large.gltf", x: -3, z: 0, scale: 1.0, rotY: 0.5 },
      { url: "/models/resource-bits/Copper_Bars_Stack_Medium.gltf", x: 3, z: 0, scale: 1.0, rotY: -0.4 },
      { url: "/models/resource-bits/Parts_Pile_Large.gltf", x: -1.6, z: -3.2, scale: 1.0, rotY: 0.2 },
      { url: "/models/resource-bits/Parts_Pile_Medium.gltf", x: 1.6, z: -3.2, scale: 1.0, rotY: -0.5 },
      { url: "/models/resource-bits/Fuel_A_Jerrycan.gltf", x: -7, z: 4, scale: 1.2, rotY: 0.7 },
      // Sits beside cargo_B_packed as set-dressing — opt out so the cargo
      // owns the disc.
      { url: "/models/resource-bits/Fuel_A_Barrel_Dirty.gltf", x: 7.5, z: 1, scale: 1.0, rotY: 0.4, footprint: 0 },
    ],
    scattered: [],
  },
  ruins: {
    floor: { size: 52, metalness: 0.18, roughness: 0.78, clearColor: "#dccdb8", texture: "ruins", textureRepeat: 9 },
    fixed: [
      { url: "/models/tower-defense-kit/tower-square-bottom-a.glb", x: -7, z: -3, scale: 1.4, rotY: 0.4 },
      { url: "/models/tower-defense-kit/tower-square-middle-b.glb", x: 6, z: -1, scale: 1.5, rotY: -0.6 },
      // Was at (-2, 8) — directly inside the player spawn keep-out at
      // (0, 7.1). Was then briefly (-2, 12) but that put it inside the
      // back hangar. Final spot (-4, 4) is a clean visible-from-spawn
      // mid-arena anchor that doesn't interfere with anything.
      { url: "/models/tower-defense-kit/tower-square-roof-c.glb", x: -4, z: 4, scale: 1.3, rotY: 1.2 },
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
      // Bushes hugging cargo wreckage. Solid (player blocked by foliage
      // mass) but footprint:0 where they sit on top of another prop's
      // disc — placement uses the host wreckage's reservation.
      { url: "/models/forest-nature/Bush_1_C_Color1.gltf", x: -6, z: 11, scale: 1.4, rotY: 0.2, footprint: 0 },
      { url: "/models/forest-nature/Bush_2_A_Color1.gltf", x: 5, z: 10, scale: 1.6, rotY: -0.3 },
      { url: "/models/forest-nature/Bush_3_A_Color1.gltf", x: 9.5, z: 13, scale: 1.4, rotY: 0.5, footprint: 0 },
      { url: "/models/forest-nature/Bush_1_A_Color1.gltf", x: -3, z: -10.5, scale: 2.0, rotY: -0.4, footprint: 0 },
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
      // satelliteDish_large used to share coords (6, -14) with platform 9.
      // Moved off the platform; the dish silhouette reads against the back
      // hangar instead. Also opt out of disc reservation since the dish
      // overhang would still falsely intersect the platform footprint.
      { url: "/models/space-kit/satelliteDish_large.glb", x: 7, z: -12, scale: 1.6, rotY: 0.4, footprint: 0 },
      { url: "/models/space-kit/satelliteDish.glb", x: -6, z: -14, scale: 1.6, rotY: -0.6, footprint: 0 },
      // KayKit weather observation gear: turbines + solar arrays = "we measure the wind"
      // Wind turbines moved outward to clear the snow platforms (was at
      // -14,-8 / 15,-10 — overlapping plat#7 and plat#8 footprints).
      { url: "/models/space-base-bits/windturbine_tall.gltf", x: -16, z: -8, scale: 2.2, rotY: 0.4 },
      { url: "/models/space-base-bits/windturbine_tall.gltf", x: 18, z: -7, scale: 2.0, rotY: -0.3 },
      { url: "/models/space-base-bits/windturbine_low.gltf", x: 18, z: 10, scale: 1.8, rotY: 0.8 },
      // Landing pads are flat raised platforms (~0.4m). Solid so the
      // player can hop on with the new step-up logic and use them as
      // elevated firing positions. footprint:0 keeps placement clean
      // around their large XZ extent.
      { url: "/models/space-base-bits/landingpad_large.gltf", x: -10, z: 14, scale: 2.0, rotY: 0, footprint: 0 },
      { url: "/models/space-base-bits/landingpad_small.gltf", x: 6, z: 18, scale: 1.6, rotY: 0.5, footprint: 0 },
      // Roof solar panels — tall structure with supporting legs. Keep
      // solid so the legs block movement (2D collision can't model
      // walking-under-the-canopy anyway).
      { url: "/models/space-base-bits/roofmodule_solarpanels.gltf", x: -2, z: -8, scale: 2.0, rotY: 0, footprint: 0 },
      { url: "/models/space-base-bits/solarpanel.gltf", x: 3, z: -8, scale: 1.6, rotY: -0.2 },
      // Anchor base: drum-shaped basemodules behind the central hangar so the
      // turbines/solar field reads as a connected research outpost. They are
      // intentionally clustered against the hangar — the hangar owns the disc,
      // basemodules opt out.
      { url: "/models/space-base-bits/basemodule_E.gltf", x: -8, z: -19, scale: 2.4, rotY: 0.2, footprint: 0 },
      { url: "/models/space-base-bits/basemodule_garage.gltf", x: 9, z: -19, scale: 2.4, rotY: -0.2, footprint: 0 },
      { url: "/models/space-base-bits/basemodule_C.gltf", x: -16, z: -16, scale: 2.0, rotY: 0.6, footprint: 0 },
      // Marker lights flanking the landing pads. Solid (visible posts
      // you bump into), footprint:0 because they sit on the pad's disc.
      { url: "/models/space-base-bits/lights.gltf", x: -12.5, z: 14, scale: 1.4, rotY: 0, footprint: 0 },
      { url: "/models/space-base-bits/lights.gltf", x: -7.5, z: 14, scale: 1.4, rotY: 0, footprint: 0 },
      { url: "/models/space-base-bits/lights.gltf", x: 4, z: 18, scale: 1.2, rotY: 0, footprint: 0 },
      { url: "/models/space-base-bits/lights.gltf", x: 8, z: 18, scale: 1.2, rotY: 0, footprint: 0 },
      // Tall pines for vertical silhouette against the horizon
      { url: "/models/forest-nature/Tree_4_B_Color1.gltf", x: 19, z: 4, scale: 0.55, rotY: 0.5 },
      { url: "/models/forest-nature/Tree_4_B_Color1.gltf", x: -20, z: 0, scale: 0.5, rotY: -0.7 },
      { url: "/models/forest-nature/Tree_2_C_Color1.gltf", x: 17, z: 17, scale: 0.45, rotY: 1.0 },
      // Mid-altitude evergreens around the observatory
      { url: "/models/stylized-nature/CommonTree_4.gltf", x: 14, z: 6, scale: 0.5, rotY: 0.3 },
      { url: "/models/stylized-nature/CommonTree_4.gltf", x: -16, z: 4, scale: 0.6, rotY: -0.6 },
      { url: "/models/stylized-nature/CommonTree_4.gltf", x: 11, z: 16, scale: 0.45, rotY: 1.2 },
      // Outcrops between the snow rocks. Rock_Medium_1 sits next to platform
      // (-12, 8) as decorative dressing — opt out of disc reservation.
      { url: "/models/stylized-nature/Rock_Medium_1.gltf", x: -13.5, z: 9.2, scale: 0.6, rotY: 0.4, footprint: 0 },
      { url: "/models/stylized-nature/Rock_Medium_2.gltf", x: 13, z: -2, scale: 0.7, rotY: -0.5 },
      // Decorative outcrop near platform (0, 13). Opt out so they coexist.
      { url: "/models/stylized-nature/Rock_Medium_3.gltf", x: -3, z: 14, scale: 0.65, rotY: 0.9, footprint: 0 },
    ],
    scattered: [
      // Outer crystal peaks. Capped at radius 20 so they stay inside
      // arena.x = 21 (with footprint + arena inset margin).
      {
        count: 10,
        pool: [
          "/models/space-kit/rock_crystalsLargeA.glb",
          "/models/space-kit/rock_crystalsLargeB.glb",
          "/models/space-kit/rock_crystals.glb",
          "/models/tower-defense-kit/snow-detail-crystal-large.glb",
        ],
        radius: [17, 20],
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
      // Was at (0, 11) — large platform (w=6) sat too close to PLAYER_SPAWN
      // (margin -0.6). Pushed back to (0, 13) for clearance.
      { x: 0, z: 13, height: 1.2, w: 6, d: 4.5 },
      // Snow-covered rocky outcrops at varied altitudes
      { x: -12, z: 8, height: 1.6, w: 3.8, d: 3.2, rotY: 0.4, tilt: 0.08 },
      { x: 13, z: 10, height: 1.1, w: 4.2, d: 3.0, rotY: -0.3, tilt: 0.05 },
      { x: -4, z: -2, height: 0.4, w: 3.0, d: 2.4, rotY: 0.2 },
      { x: 4, z: 6, height: 0.5, w: 2.6, d: 2.2, rotY: -0.5, tilt: 0.06 },
      { x: -10, z: -4, height: 1.9, w: 3.4, d: 3.0, rotY: 0.7, tilt: 0.1 },
      { x: 11, z: -8, height: 0.8, w: 3.0, d: 2.8, rotY: -0.6, tilt: 0.04 },
      // Was at (6, -14) — overlapped hangar_roundGlass at (0, -16).
      // Moved to (8, -11) to escape the hangar's footprint.
      { x: 8, z: -11, height: 1.4, w: 4.0, d: 3.4, rotY: 0.3, tilt: 0.07 },
    ],
  },
};

export function pseudoRandom(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

// 2D disc collider used for placement-time overlap checks. r is in world
// units (already scaled). Same struct will be reused by the future static-
// asset collision PR.
export type Disc = { x: number; z: number; r: number };

export type ArenaBounds = { x: number; zFront: number; zBack: number };

// Player camera spawns at (0, 2.15, 7.1) on every stage (BattleScene.tsx).
// Reserve a 1.5m disc so no scatter lands directly under the spawn point.
export const PLAYER_SPAWN_DISC: Disc = { x: 0, z: 7.1, r: 1.5 };
const MIN_MARGIN = 0.25;
const ARENA_INSET = 0.6;
const MAX_TRIES_PER_PIECE = 12;

// URL keyword → base footprint radius in model-local units. Multiplied by
// the placement's scale at runtime. Keep entries short — the matcher walks
// the table top-down and stops at the first substring hit, so order
// matters: longer / more specific keywords go first within a tier.
const FOOTPRINT_KEYWORDS: Array<[string, number]> = [
  ["windturbine_tall", 2.4],
  ["hangar_", 2.4],
  ["landingpad_large", 2.4],
  ["basemodule_", 2.4],
  ["tower-", 1.6],
  ["craft_", 1.6],
  ["cargodepot", 1.6],
  ["landingpad_small", 1.6],
  ["satelliteDish_large", 1.6],
  ["roofmodule_solar", 1.6],
  ["machine_generatorLarge", 1.1],
  ["windturbine_low", 1.1],
  ["cargo_", 1.1],
  ["containers_", 1.1],
  ["solarpanel", 1.1],
  ["satelliteDish", 1.1],
  ["desk_computer", 1.1],
  ["screen-panel", 1.1],
  ["rock_crystalsLarge", 0.8],
  ["rock_largeA", 0.8],
  ["rock_largeB", 0.8],
  ["Rock_Medium", 0.8],
  ["Parts_Pile", 0.8],
  ["Tree_4", 0.8],
  ["CommonTree", 0.8],
  ["machine_", 0.8],
  ["structure", 0.8],
  ["cog-", 0.8],
  ["snow-detail-rocks", 0.5],
  ["snow-detail-tree", 0.5],
  ["snow-detail-crystal", 0.5],
  ["rocks_smallA", 0.5],
  ["rocks_smallB", 0.5],
  ["Rock_1", 0.5],
  ["Rock_3", 0.5],
  ["Bush_", 0.5],
  ["Iron_Bars", 0.5],
  ["Copper_Bars", 0.5],
  ["Pallet", 0.5],
  ["Fuel_", 0.5],
  ["lights", 0.3],
  ["Tree_Bare", 0.5],
  ["Tree_2", 0.5],
  ["Tree_3", 0.5],
];

export function inferFootprint(url: string, scale: number): number {
  // Box3-measured footprint (footprintCache) wins when the GLTF has been
  // loaded at least once. Otherwise fall back to the URL-keyword table —
  // good enough for the very first placement pass before scenes load.
  const measured = getMeasuredFootprint(url);
  if (measured !== undefined) {
    return measured * scale;
  }
  for (const [needle, base] of FOOTPRINT_KEYWORDS) {
    if (url.includes(needle)) {
      return base * scale;
    }
  }
  // Fallback for unknown assets — small enough not to choke the algorithm
  // but big enough that genuinely solid props still reserve space.
  return 0.6 * scale;
}

function discsOverlap(a: Disc, b: Disc): boolean {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz < (a.r + b.r + MIN_MARGIN) * (a.r + b.r + MIN_MARGIN);
}

function withinArena(disc: Disc, arena: ArenaBounds): boolean {
  const inset = ARENA_INSET + disc.r;
  return (
    disc.x >= -arena.x + inset
    && disc.x <= arena.x - inset
    && disc.z >= arena.zFront + inset
    && disc.z <= arena.zBack - inset
  );
}

export function expandCluster(
  cluster: ProceduralCluster,
  ctx: { existing: Disc[]; arena: ArenaBounds },
): GltfPlacement[] {
  const out: GltfPlacement[] = [];
  for (let index = 0; index < cluster.count; index += 1) {
    for (let attempt = 0; attempt < MAX_TRIES_PER_PIECE; attempt += 1) {
      // seed * piece index * try — every retry walks a fresh slot in the
      // pseudo-random series, so the layout stays deterministic across
      // runs but a bad initial position can be recovered from.
      const idx = cluster.seed + index * 32 + attempt;
      const radius = cluster.radius[0] + pseudoRandom(idx + 1) * (cluster.radius[1] - cluster.radius[0]);
      const angle = pseudoRandom(idx + 7) * Math.PI * 2;
      const scale = cluster.scale[0] + pseudoRandom(idx + 17) * (cluster.scale[1] - cluster.scale[0]);
      const rotY = pseudoRandom(idx + 29) * Math.PI;
      const url = cluster.pool[index % cluster.pool.length];
      const tilt = cluster.tilt ? (pseudoRandom(idx + 81) - 0.5) * cluster.tilt : 0;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const r = cluster.footprint !== undefined ? cluster.footprint * scale : inferFootprint(url, scale);
      const candidate: Disc = { x, z, r };
      if (!withinArena(candidate, ctx.arena)) continue;
      let collides = false;
      for (const other of ctx.existing) {
        if (other.r === 0) continue;
        if (discsOverlap(candidate, other)) {
          collides = true;
          break;
        }
      }
      if (collides) continue;
      ctx.existing.push(candidate);
      out.push({ url, x, z, scale, rotY, tilt });
      break;
    }
    // If all attempts failed the piece is silently dropped; the seed
    // sequence advanced for `try` slots so subsequent pieces still land
    // deterministically.
  }
  return out;
}

function fixedToDisc(piece: GltfPlacement): Disc {
  const r = piece.footprint !== undefined ? piece.footprint * piece.scale : inferFootprint(piece.url, piece.scale);
  return { x: piece.x, z: piece.z, r };
}

function platformToDisc(p: RaisedPlatform): Disc {
  return { x: p.x, z: p.z, r: Math.max(p.w, p.d) / 2 };
}

/** Disc collider tagged with its source layer — drives debug visualization
 *  and lets push-out / occlusion code apply per-layer rules later.
 *
 *  `top` is the world-Y of the collider's upper surface, scaled by the
 *  placement's scale. Player can step on / over colliders whose top
 *  is below their current feet height. Falls back to a generous default
 *  for measured-but-unknown props so they keep blocking. */
export type StageCollider = Disc & {
  kind: "platform" | "fixed" | "scattered";
  top: number;
};

// Default top used when a GLTF hasn't been measured yet (cache cold) or
// the top can't be inferred. Tall enough that the player's jump won't
// clear it, so the prop keeps blocking until proper data arrives.
const DEFAULT_COLLIDER_TOP = 3.0;

function fixedColliderTop(piece: GltfPlacement): number {
  const measured = getMeasuredTop(piece.url);
  if (measured !== undefined) {
    return measured * piece.scale;
  }
  return DEFAULT_COLLIDER_TOP;
}

function scatteredColliderTop(url: string, scale: number): number {
  const measured = getMeasuredTop(url);
  if (measured !== undefined) {
    return measured * scale;
  }
  return DEFAULT_COLLIDER_TOP;
}

/** Build the final placement set for a stage: returns fixed + scattered
 *  prop arrays after running the cluster pieces through the overlap-aware
 *  placer. `platforms` is returned untouched — they're authored by hand
 *  and reserve their own discs so scatter avoids them. `colliders` is the
 *  union of every disc that should block player / enemy / projectiles
 *  (footprint:0 entries are excluded). */
export function buildPlacements(stage: Stage, placement: StagePlacement): {
  fixed: GltfPlacement[];
  scattered: GltfPlacement[];
  platforms: RaisedPlatform[];
  colliders: StageCollider[];
} {
  const platforms = placement.platforms ?? [];
  // Order matters: platforms first (largest immovable footprints), then
  // hand-placed fixed props (designer intent), then the player spawn
  // keep-out, then each scatter cluster in declaration order.
  const existing: Disc[] = [
    ...platforms.map(platformToDisc),
    ...placement.fixed.map(fixedToDisc),
    PLAYER_SPAWN_DISC,
  ];
  const scattered: GltfPlacement[] = [];
  for (const cluster of placement.scattered) {
    scattered.push(...expandCluster(cluster, { existing, arena: stage.arena }));
  }
  // Build the public collider list from the resolved data. `solid: false`
  // opts a prop out of runtime collision (independent of `footprint`,
  // which only controls placement-time disc reservation). Collider radius
  // always comes from inferFootprint so cluster items that opted out of
  // placement reservation (footprint:0) still occupy real space at runtime.
  const colliders: StageCollider[] = [
    ...platforms.map((p) => ({
      ...platformToDisc(p),
      kind: "platform" as const,
      top: p.height,
    })),
    ...placement.fixed
      .filter((f) => f.solid !== false)
      .map((f) => ({
        x: f.x,
        z: f.z,
        r: inferFootprint(f.url, f.scale),
        kind: "fixed" as const,
        top: fixedColliderTop(f),
      }))
      .filter((d) => d.r > 0),
    ...scattered.map((s) => ({
      x: s.x,
      z: s.z,
      r: inferFootprint(s.url, s.scale),
      kind: "scattered" as const,
      top: scatteredColliderTop(s.url, s.scale),
    })),
  ];
  return { fixed: placement.fixed, scattered, platforms, colliders };
}
