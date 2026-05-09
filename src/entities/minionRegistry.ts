import { Vector3 } from "three";
import type { Group } from "three";

// Module-level registry shared by `MinionField` (which writes) and
// `PlayerController` (which reads). Kept in its own file so that
// `MinionField.tsx` only exports React components — that lets Vite's React
// Fast Refresh hot-swap minion changes without a full reload.

export const minionGroupsByMinionId = new Map<number, Group>();

let rootRef: Group | null = null;

export function setMinionRoot(group: Group | null) {
  rootRef = group;
}

export function getMinionRoot(): Group | null {
  return rootRef;
}

const MINION_TMP = new Vector3();

export function getMinionWorldPosition(minionId: number): Vector3 | null {
  const group = minionGroupsByMinionId.get(minionId);
  if (!group) return null;
  group.getWorldPosition(MINION_TMP);
  return MINION_TMP;
}

export function findMinionByObject(node: { userData?: { minionId?: number } }): number | null {
  let cursor: { userData?: { minionId?: number }; parent?: { userData?: { minionId?: number }; parent?: unknown } | null } | null = node;
  while (cursor) {
    if (cursor.userData && typeof cursor.userData.minionId === "number") {
      return cursor.userData.minionId;
    }
    cursor = (cursor as { parent?: typeof cursor | null }).parent ?? null;
  }
  return null;
}
