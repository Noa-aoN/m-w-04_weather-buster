import { useEffect, useMemo, useReducer } from "react";
import type { Stage } from "../game/types";
import { isFootprintCacheWarm, subscribeFootprintCache } from "./footprintCache";
import {
  STAGE_PLACEMENTS,
  buildPlacements,
  type StageCollider,
  type StagePlacement,
} from "./stagePlacements";

function collectUrls(placement: StagePlacement): string[] {
  const set = new Set<string>();
  placement.fixed.forEach((f) => set.add(f.url));
  placement.scattered.forEach((c) => c.pool.forEach((u) => set.add(u)));
  return Array.from(set);
}

/** Returns the resolved collider list for `stage`, recomputing whenever
 *  the footprint cache mutates. Empty array until at least one prop is
 *  measured (so consumers can no-op early without checking for null). */
export function useStageColliders(stage: Stage): StageCollider[] {
  const placement = STAGE_PLACEMENTS[stage.id];
  const allUrls = useMemo(() => collectUrls(placement), [placement]);
  const [tick, bump] = useReducer((n: number) => n + 1, 0);

  useEffect(() => subscribeFootprintCache(bump), []);

  return useMemo(() => {
    if (!isFootprintCacheWarm(allUrls)) return [];
    return buildPlacements(stage, placement).colliders;
    // tick re-runs the memo when the cache mutates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, placement, allUrls, tick]);
}
