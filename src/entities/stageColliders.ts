import type { Disc, StageCollider } from "./stagePlacements";

// Lightweight 2D collision helpers used by Player and Enemy controllers.
// Inputs are 2D points / 2D circle colliders — we never run a real physics
// engine; movement is updated each frame, then resolved against the static
// disc list in a single pass.
//
// Convention:
//   - All positions are in world-space XZ (Y is altitude, ignored here)
//   - radius / r are in world units
//   - Solidity is binary (collider has r > 0 OR not in the array)

const RESOLVE_ITERATIONS = 4;

/** Push `(x, z)` (radius `r`) out of any overlapping `colliders`. Returns
 *  the corrected position. Stable across multiple overlaps via several
 *  iterations — each iteration pushes against the deepest violator first
 *  so chains of colliders converge in O(N * iterations).
 *
 *  Invariant: if no overlaps exist the input is returned untouched. */
export function resolveCircleVsCircles(
  x: number,
  z: number,
  r: number,
  colliders: readonly Disc[],
): { x: number; z: number } {
  if (colliders.length === 0) {
    return { x, z };
  }
  let cx = x;
  let cz = z;
  for (let iter = 0; iter < RESOLVE_ITERATIONS; iter += 1) {
    let deepest = 0;
    let deepestDx = 0;
    let deepestDz = 0;
    let deepestPush = 0;
    for (const c of colliders) {
      if (c.r <= 0) continue;
      const dx = cx - c.x;
      const dz = cz - c.z;
      const distSq = dx * dx + dz * dz;
      const minDist = r + c.r;
      if (distSq >= minDist * minDist) continue;
      const dist = Math.sqrt(distSq);
      const push = minDist - dist;
      if (push > deepest) {
        deepest = push;
        deepestDx = dx;
        deepestDz = dz;
        deepestPush = push;
      }
    }
    if (deepest === 0) break;
    // Push along the contact normal. If the input position is exactly at
    // the collider center (dist = 0) pick an arbitrary direction so we
    // don't divide by zero.
    const dist = Math.hypot(deepestDx, deepestDz);
    if (dist === 0) {
      cx += deepestPush;
    } else {
      const nx = deepestDx / dist;
      const nz = deepestDz / dist;
      cx += nx * deepestPush;
      cz += nz * deepestPush;
    }
  }
  return { x: cx, z: cz };
}

/** Tightest entry distance along ray `(ox, oz) + t * (dx, dz)` to any
 *  collider in `colliders`. Returns `+Infinity` if nothing is hit. Used
 *  to occlude shots / projectiles by static props.
 *
 *  Direction `(dx, dz)` must be normalized. */
export function rayToFirstCollider(
  ox: number,
  oz: number,
  dx: number,
  dz: number,
  colliders: readonly Disc[],
): number {
  let nearest = Infinity;
  for (const c of colliders) {
    if (c.r <= 0) continue;
    // Translate so collider is at origin
    const fx = ox - c.x;
    const fz = oz - c.z;
    // Quadratic for ray-circle intersection: |f + t * d|^2 = r^2
    // → (d.d) t^2 + 2(f.d) t + (f.f - r^2) = 0
    const a = dx * dx + dz * dz; // == 1 if d is normalized
    const b = 2 * (fx * dx + fz * dz);
    const cc = fx * fx + fz * fz - c.r * c.r;
    const disc = b * b - 4 * a * cc;
    if (disc < 0) continue;
    const sq = Math.sqrt(disc);
    const t1 = (-b - sq) / (2 * a);
    const t2 = (-b + sq) / (2 * a);
    // Earliest non-negative entry
    const t = t1 >= 0 ? t1 : t2 >= 0 ? t2 : -1;
    if (t >= 0 && t < nearest) {
      nearest = t;
    }
  }
  return nearest;
}

export type { StageCollider };
