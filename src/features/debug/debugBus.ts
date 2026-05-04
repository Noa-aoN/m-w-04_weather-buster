// Tiny dev-time bus for surfacing AI / motion internals to the debug overlay.
// Lives outside the store so per-frame writes don't trigger React re-renders
// in the rest of the tree. The overlay polls this at low frequency.

export type DebugSnapshot = {
  aiPhase: string;
  aiPhaseT: number;
  enemyDistance: number;
  enemyPosY: number;
  knockbackVel: number;
  hitFlinch: number;
  reloadingFor: number;
  barrierFor: number;
  comboCount: number;
};

let current: DebugSnapshot = {
  aiPhase: "—",
  aiPhaseT: 0,
  enemyDistance: 0,
  enemyPosY: 0,
  knockbackVel: 0,
  hitFlinch: 0,
  reloadingFor: 0,
  barrierFor: 0,
  comboCount: 0,
};

export function writeDebug(patch: Partial<DebugSnapshot>) {
  current = { ...current, ...patch };
}

export function readDebug(): DebugSnapshot {
  return current;
}

let debugEnabled: boolean | null = null;

export function isDebugEnabled(): boolean {
  if (debugEnabled !== null) {
    return debugEnabled;
  }
  if (typeof window === "undefined") {
    debugEnabled = false;
    return false;
  }
  const params = new URLSearchParams(window.location.search);
  const value = params.get("debug");
  debugEnabled = value === "motion" || value === "1" || value === "true";
  return debugEnabled;
}
