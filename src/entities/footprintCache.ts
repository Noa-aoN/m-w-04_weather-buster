import { Box3, Vector3 } from "three";
import type { Object3D } from "three";

// Per-URL cache of "horizontal footprint radius" measured from the GLTF
// scene's model-local bounding box. Filled lazily as scenes load via
// recordMeasuredFootprint() and consulted by stagePlacements.inferFootprint
// before falling back to URL-keyword inference.
//
// Values are in model-local units at scene.scale = 1; multiply by the
// placement's scale at use time.

type Measurement = { radius: number; top: number; bottom: number };
const cache = new Map<string, Measurement>();
const subscribers = new Set<() => void>();

export function getMeasuredFootprint(url: string): number | undefined {
  return cache.get(url)?.radius;
}

export function getMeasuredTop(url: string): number | undefined {
  return cache.get(url)?.top;
}

export function getMeasuredBottom(url: string): number | undefined {
  return cache.get(url)?.bottom;
}

/** Measure the horizontal (X / Z) half-extents and the vertical Y range of
 *  `scene`, store all three. `radius = max(extentX, extentZ) / 2`,
 *  `top = box.max.y`, `bottom = box.min.y` in model-local units. Idempotent
 *  — re-calls return the cached values. Notifies subscribers on the first
 *  measurement so React consumers can recompute their derived placement /
 *  collider data. */
export function recordMeasuredFootprint(url: string, scene: Object3D): number {
  const cached = cache.get(url);
  if (cached !== undefined) {
    return cached.radius;
  }
  const box = new Box3().setFromObject(scene);
  const size = new Vector3();
  box.getSize(size);
  const radius = Math.max(size.x, size.z) / 2;
  const top = box.max.y;
  const bottom = box.min.y;
  cache.set(url, { radius, top, bottom });
  subscribers.forEach((fn) => fn());
  return radius;
}

export function isFootprintCacheWarm(urls: readonly string[]): boolean {
  for (const u of urls) {
    if (!cache.has(u)) {
      return false;
    }
  }
  return true;
}

/** Subscribe to cache mutations. Returns an unsubscribe function. */
export function subscribeFootprintCache(fn: () => void): () => void {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}

/** Test-only helper to drop all cached values + subscribers. */
export function _resetFootprintCache(): void {
  cache.clear();
  subscribers.clear();
}
