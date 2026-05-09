import { describe, it, expect } from "vitest";
import {
  blockingColliders,
  groundYAt,
  rayToFirstCollider,
  resolveCircleVsCircles,
} from "./stageColliders";
import type { Disc, StageCollider } from "./stagePlacements";

describe("resolveCircleVsCircles", () => {
  it("returns the input when no colliders are supplied", () => {
    expect(resolveCircleVsCircles(3, 4, 0.5, [])).toEqual({ x: 3, z: 4 });
  });

  it("leaves the position untouched when nothing overlaps", () => {
    const colliders: Disc[] = [{ x: 10, z: 10, r: 1 }];
    expect(resolveCircleVsCircles(0, 0, 1, colliders)).toEqual({ x: 0, z: 0 });
  });

  it("pushes out of a single overlap along the contact normal", () => {
    const colliders: Disc[] = [{ x: 0, z: 0, r: 1 }];
    // Player at (0.5, 0) with r=0.5 — overlap of 1 along +x axis.
    const out = resolveCircleVsCircles(0.5, 0, 0.5, colliders);
    expect(out.x).toBeCloseTo(1.5, 5);
    expect(out.z).toBeCloseTo(0, 5);
  });

  it("ignores colliders with r <= 0", () => {
    const colliders: Disc[] = [{ x: 0, z: 0, r: 0 }];
    expect(resolveCircleVsCircles(0, 0, 1, colliders)).toEqual({ x: 0, z: 0 });
  });

  it("resolves a single collider after passing through several", () => {
    // Three colliders, only the third is in actual contact range. The
    // algorithm should ignore the misses and push out of the third.
    const colliders: Disc[] = [
      { x: -10, z: 0, r: 1 },
      { x: 10, z: 0, r: 1 },
      { x: 0.5, z: 0, r: 0.6 },
    ];
    const out = resolveCircleVsCircles(0, 0, 0.5, colliders);
    // Distance to the third collider must be >= sum of radii.
    const dx = out.x - 0.5;
    const dz = out.z - 0;
    expect(Math.hypot(dx, dz)).toBeGreaterThanOrEqual(1.1 - 1e-6);
  });

  it("falls back to a default direction when at exact center", () => {
    const colliders: Disc[] = [{ x: 0, z: 0, r: 1 }];
    const out = resolveCircleVsCircles(0, 0, 0.5, colliders);
    // At center: dx/dz = 0, function picks +x. Position should be outside.
    expect(Math.hypot(out.x, out.z)).toBeGreaterThanOrEqual(1.5 - 1e-6);
  });
});

describe("rayToFirstCollider", () => {
  it("returns Infinity when no colliders are supplied", () => {
    expect(rayToFirstCollider(0, 0, 1, 0, [])).toBe(Infinity);
  });

  it("returns Infinity when the ray misses everything", () => {
    const colliders: Disc[] = [{ x: 0, z: 5, r: 1 }];
    expect(rayToFirstCollider(0, 0, 1, 0, colliders)).toBe(Infinity);
  });

  it("returns the nearest entry distance for a direct hit", () => {
    const colliders: Disc[] = [{ x: 5, z: 0, r: 1 }];
    // Ray from origin along +x: enters circle at x=4.
    expect(rayToFirstCollider(0, 0, 1, 0, colliders)).toBeCloseTo(4, 5);
  });

  it("picks the closest of multiple hits", () => {
    const colliders: Disc[] = [
      { x: 10, z: 0, r: 1 },
      { x: 5, z: 0, r: 1 },
    ];
    expect(rayToFirstCollider(0, 0, 1, 0, colliders)).toBeCloseTo(4, 5);
  });

  it("ignores r <= 0 colliders", () => {
    const colliders: Disc[] = [{ x: 5, z: 0, r: 0 }];
    expect(rayToFirstCollider(0, 0, 1, 0, colliders)).toBe(Infinity);
  });

  it("handles ray origin inside a collider (returns positive exit)", () => {
    const colliders: Disc[] = [{ x: 0, z: 0, r: 1 }];
    const t = rayToFirstCollider(0, 0, 1, 0, colliders);
    // Origin is inside; first non-negative entry is t = +1 (exit point).
    expect(t).toBeCloseTo(1, 5);
  });
});

describe("groundYAt", () => {
  it("returns 0 when no collider is under (x,z)", () => {
    const colliders: StageCollider[] = [
      { x: 5, z: 0, r: 1, top: 1.5, kind: "platform" },
    ];
    expect(groundYAt(0, 0, 0, colliders)).toBe(0);
  });

  it("snaps to the tallest collider feet can step onto", () => {
    const colliders: StageCollider[] = [
      { x: 0, z: 0, r: 2, top: 0.5, kind: "platform" },
      { x: 0, z: 0, r: 1.5, top: 1.2, kind: "platform" },
    ];
    // Feet at 1.5 → can step on both, picks 1.2
    expect(groundYAt(0, 0, 1.5, colliders)).toBeCloseTo(1.2);
  });

  it("ignores tops above feet + step tolerance", () => {
    const colliders: StageCollider[] = [
      { x: 0, z: 0, r: 2, top: 3.0, kind: "fixed" },
    ];
    // Feet at 0; 3.0 > 0.35 tolerance → ignored
    expect(groundYAt(0, 0, 0, colliders)).toBe(0);
  });

  it("only counts colliders whose disc contains (x, z)", () => {
    const colliders: StageCollider[] = [
      { x: 5, z: 0, r: 1, top: 0.6, kind: "platform" },
    ];
    expect(groundYAt(0, 0, 1.0, colliders)).toBe(0); // outside disc
    expect(groundYAt(5, 0, 1.0, colliders)).toBeCloseTo(0.6); // on disc
  });
});

describe("blockingColliders", () => {
  it("excludes colliders with top <= feet + tolerance (steppable)", () => {
    const colliders: StageCollider[] = [
      { x: 0, z: 0, r: 1, top: 0.3, kind: "platform" }, // low pad — steppable
      { x: 5, z: 0, r: 1, top: 3.0, kind: "fixed" },     // tall — blocks
    ];
    const blocking = blockingColliders(0, colliders);
    expect(blocking).toHaveLength(1);
    expect(blocking[0].x).toBe(5);
  });

  it("blocks tall colliders even when feet are high", () => {
    const colliders: StageCollider[] = [
      { x: 0, z: 0, r: 1, top: 5, kind: "fixed" },
    ];
    expect(blockingColliders(2, colliders)).toHaveLength(1); // top - feet = 3 > tolerance
  });

  it("ignores r <= 0 colliders", () => {
    const colliders: StageCollider[] = [{ x: 0, z: 0, r: 0, top: 99, kind: "fixed" }];
    expect(blockingColliders(0, colliders)).toHaveLength(0);
  });
});
