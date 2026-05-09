import { Box3, Vector3 } from "three";
import type { Object3D } from "three";

// Per-URL cache of "horizontal footprint radius" measured from the GLTF
// scene's model-local bounding box. Filled lazily as scenes load via
// recordMeasuredFootprint() and consulted by stagePlacements.inferFootprint
// before falling back to URL-keyword inference.
//
// Values are in model-local units at scene.scale = 1; multiply by the
// placement's scale at use time.

const cache = new Map<string, number>();

export function getMeasuredFootprint(url: string): number | undefined {
  return cache.get(url);
}

/** Measure the horizontal (X / Z) extents of `scene` and store half of the
 *  larger one as the URL's footprint radius. Idempotent — re-calls return
 *  the cached value. */
export function recordMeasuredFootprint(url: string, scene: Object3D): number {
  const cached = cache.get(url);
  if (cached !== undefined) {
    return cached;
  }
  const box = new Box3().setFromObject(scene);
  const size = new Vector3();
  box.getSize(size);
  const r = Math.max(size.x, size.z) / 2;
  cache.set(url, r);
  return r;
}

export function isFootprintCacheWarm(urls: readonly string[]): boolean {
  for (const u of urls) {
    if (!cache.has(u)) {
      return false;
    }
  }
  return true;
}

/** Test-only helper to drop all cached values. */
export function _resetFootprintCache(): void {
  cache.clear();
}
