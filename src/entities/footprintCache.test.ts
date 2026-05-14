import { describe, it, expect, beforeEach } from "vitest";
import { Box3, BoxGeometry, Mesh, MeshBasicMaterial, Object3D } from "three";
import {
  _resetFootprintCache,
  getMeasuredFootprint,
  getMeasuredTop,
  isFootprintCacheWarm,
  recordMeasuredFootprint,
} from "./footprintCache";

beforeEach(() => {
  _resetFootprintCache();
});

function makeBox(extentX: number, extentZ: number): Object3D {
  const geom = new BoxGeometry(extentX, 1, extentZ);
  return new Mesh(geom, new MeshBasicMaterial());
}

describe("footprintCache", () => {
  it("records max horizontal half-extent on first measure", () => {
    const obj = makeBox(2, 4);
    const r = recordMeasuredFootprint("/models/a.glb", obj);
    expect(r).toBeCloseTo(2);
    expect(getMeasuredFootprint("/models/a.glb")).toBeCloseTo(2);
  });

  it("returns the cached value on subsequent measures", () => {
    const obj = makeBox(2, 4);
    recordMeasuredFootprint("/models/a.glb", obj);
    // Replacing the object shouldn't matter — cache is keyed by URL.
    const next = makeBox(10, 10);
    const r = recordMeasuredFootprint("/models/a.glb", next);
    expect(r).toBeCloseTo(2);
  });

  it("isFootprintCacheWarm requires every URL", () => {
    recordMeasuredFootprint("/models/a.glb", makeBox(1, 1));
    expect(isFootprintCacheWarm(["/models/a.glb"])).toBe(true);
    expect(isFootprintCacheWarm(["/models/a.glb", "/models/b.glb"])).toBe(false);
    recordMeasuredFootprint("/models/b.glb", makeBox(1, 1));
    expect(isFootprintCacheWarm(["/models/a.glb", "/models/b.glb"])).toBe(true);
  });

  it("ignores Y extent when computing horizontal footprint", () => {
    // Tall thin tower: tiny X/Z, big Y — footprint should still be small.
    const tall = new Mesh(new BoxGeometry(0.6, 8, 0.6), new MeshBasicMaterial());
    const r = recordMeasuredFootprint("/models/tower.glb", tall);
    expect(r).toBeCloseTo(0.3);
  });

  it("records the box's max Y as the top", () => {
    // Default BoxGeometry centers at origin; max.y = height / 2.
    const obj = new Mesh(new BoxGeometry(1, 4, 1), new MeshBasicMaterial());
    recordMeasuredFootprint("/models/with-top.glb", obj);
    expect(getMeasuredTop("/models/with-top.glb")).toBeCloseTo(2);
  });

  it("returns undefined for unmeasured top", () => {
    expect(getMeasuredTop("/models/unknown.glb")).toBeUndefined();
  });

  it("uses world-space bounds via Box3.setFromObject (smoke test)", () => {
    // Sanity: Box3 reports the actual mesh half-size, not an ill-shaped value.
    const obj = makeBox(6, 2);
    const box = new Box3().setFromObject(obj);
    expect(box.max.x - box.min.x).toBeCloseTo(6);
    expect(box.max.z - box.min.z).toBeCloseTo(2);
    const r = recordMeasuredFootprint("/models/wide.glb", obj);
    expect(r).toBeCloseTo(3);
  });
});
