import { describe, it, expect } from "vitest";
import { rayToFirstCollider, resolveCircleVsCircles } from "./stageColliders";
import type { Disc } from "./stagePlacements";

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
