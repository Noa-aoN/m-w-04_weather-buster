import { describe, it, expect } from "vitest";
import { stages } from "../game/data";
import {
  PLAYER_SPAWN_DISC,
  STAGE_PLACEMENTS,
  buildPlacements,
  expandCluster,
  inferFootprint,
  type ArenaBounds,
  type Disc,
  type ProceduralCluster,
} from "./stagePlacements";

const findStage = (id: "lab" | "ruins" | "highland") => {
  const stage = stages.find((s) => s.id === id);
  if (!stage) throw new Error(`stage ${id} missing from data`);
  return stage;
};

describe("inferFootprint", () => {
  it("scales the URL-keyword base radius by the placement scale", () => {
    expect(inferFootprint("/models/space-base-bits/windturbine_tall.gltf", 2)).toBeCloseTo(4.8);
    expect(inferFootprint("/models/space-kit/rocks_smallA.glb", 1)).toBeCloseTo(0.5);
  });

  it("falls back to a small radius for unknown URLs", () => {
    expect(inferFootprint("/models/unknown/mystery.gltf", 1)).toBeCloseTo(0.6);
  });
});

describe("expandCluster", () => {
  const arena: ArenaBounds = { x: 21, zFront: -7, zBack: 18 };

  it("returns a deterministic layout for the same input", () => {
    const cluster: ProceduralCluster = {
      count: 8,
      pool: ["/models/space-kit/rock_largeA.glb", "/models/space-kit/rock_largeB.glb"],
      radius: [4, 12],
      scale: [1, 1.5],
      seed: 7,
    };
    const a = expandCluster(cluster, { existing: [], arena });
    const b = expandCluster(cluster, { existing: [], arena });
    expect(a).toEqual(b);
  });

  it("never produces overlapping discs", () => {
    const cluster: ProceduralCluster = {
      count: 12,
      pool: ["/models/space-kit/rock_largeA.glb"],
      radius: [3, 12],
      scale: [1, 1.6],
      seed: 11,
    };
    const placed = expandCluster(cluster, { existing: [], arena });
    for (let i = 0; i < placed.length; i += 1) {
      for (let j = i + 1; j < placed.length; j += 1) {
        const a = placed[i];
        const b = placed[j];
        const ra = inferFootprint(a.url, a.scale);
        const rb = inferFootprint(b.url, b.scale);
        const dx = a.x - b.x;
        const dz = a.z - b.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        expect(dist).toBeGreaterThanOrEqual(ra + rb - 1e-6);
      }
    }
  });

  it("keeps every piece inside the arena bounds (with footprint margin)", () => {
    const cluster: ProceduralCluster = {
      count: 14,
      pool: ["/models/space-kit/rock_largeA.glb"],
      radius: [10, 25], // intentionally over-shoots arena.x
      scale: [1, 2.0],
      seed: 23,
    };
    const placed = expandCluster(cluster, { existing: [], arena });
    for (const p of placed) {
      const r = inferFootprint(p.url, p.scale);
      expect(p.x - r).toBeGreaterThanOrEqual(-arena.x);
      expect(p.x + r).toBeLessThanOrEqual(arena.x);
      expect(p.z - r).toBeGreaterThanOrEqual(arena.zFront);
      expect(p.z + r).toBeLessThanOrEqual(arena.zBack);
    }
  });

  it("avoids the player spawn keep-out disc", () => {
    const cluster: ProceduralCluster = {
      count: 16,
      pool: ["/models/space-kit/rock_largeA.glb"],
      radius: [3, 9], // ring runs straight through (0, 7.1)
      scale: [1, 1.5],
      seed: 137,
    };
    const placed = expandCluster(cluster, {
      existing: [PLAYER_SPAWN_DISC],
      arena,
    });
    for (const p of placed) {
      const r = inferFootprint(p.url, p.scale);
      const dx = p.x - PLAYER_SPAWN_DISC.x;
      const dz = p.z - PLAYER_SPAWN_DISC.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      expect(dist).toBeGreaterThanOrEqual(PLAYER_SPAWN_DISC.r + r - 1e-6);
    }
  });

  it("silently drops pieces when no placement is feasible", () => {
    // A blocker covering the entire procedural ring forces every attempt
    // to fail. The cluster should return zero placements and not throw.
    const wall: Disc = { x: 0, z: 0, r: 50 };
    const cluster: ProceduralCluster = {
      count: 6,
      pool: ["/models/space-kit/rock_largeA.glb"],
      radius: [3, 6],
      scale: [1, 1],
      seed: 42,
    };
    const placed = expandCluster(cluster, { existing: [wall], arena });
    expect(placed).toHaveLength(0);
  });
});

describe("buildPlacements (live stages)", () => {
  for (const stageId of ["lab", "ruins", "highland"] as const) {
    it(`${stageId}: scattered pieces respect arena bounds and prior props`, () => {
      const stage = findStage(stageId);
      const built = buildPlacements(stage, STAGE_PLACEMENTS[stageId]);

      // Build the prior-disc set the placer saw (platforms + fixed + spawn).
      const priorDiscs: Disc[] = [
        ...built.platforms.map((p) => ({ x: p.x, z: p.z, r: Math.max(p.w, p.d) / 2 })),
        ...built.fixed
          .filter((f) => f.footprint !== 0)
          .map((f) => ({
            x: f.x,
            z: f.z,
            r: f.footprint !== undefined ? f.footprint * f.scale : inferFootprint(f.url, f.scale),
          })),
        PLAYER_SPAWN_DISC,
      ];

      for (const piece of built.scattered) {
        const r = inferFootprint(piece.url, piece.scale);
        // arena bounds with footprint
        expect(Math.abs(piece.x) + r).toBeLessThanOrEqual(stage.arena.x);
        expect(piece.z - r).toBeGreaterThanOrEqual(stage.arena.zFront);
        expect(piece.z + r).toBeLessThanOrEqual(stage.arena.zBack);
        // no overlap with prior props
        for (const d of priorDiscs) {
          if (d.r === 0) continue;
          const dx = piece.x - d.x;
          const dz = piece.z - d.z;
          const dist = Math.sqrt(dx * dx + dz * dz);
          expect(dist).toBeGreaterThanOrEqual(d.r + r - 1e-6);
        }
      }
    });
  }
});
