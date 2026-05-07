import { useEffect, useRef, useState } from "react";
import { findItem } from "../../../game/data";
import { useBattleStore } from "../../../game/battleStore";
import type { ItemId } from "../../../game/types";

const ITEM_ICONS: Record<ItemId, string> = {
  clearTonic: "☀",
  lightningRod: "⚡",
  decoyUmbrella: "☂",
  pressureStabilizer: "◎",
};

const ITEM_ACCENT_COLOR: Record<ItemId, string> = {
  clearTonic: "#ffd76a",
  lightningRod: "#a3c8ff",
  decoyUmbrella: "#9af0d8",
  pressureStabilizer: "#ff9eb6",
};

export function SkillReadyToast({ pressureGauge, weaponSkillName }: { pressureGauge: number; weaponSkillName: string }) {
  const lastSkillAt = useBattleStore((state) => state.lastSkillAt);
  const wasReady = useRef(false);
  const [show, setShow] = useState<{ at: number } | null>(null);
  useEffect(() => {
    const ready = pressureGauge >= 100;
    if (ready && !wasReady.current) {
      setShow({ at: Date.now() });
    }
    wasReady.current = ready;
  }, [pressureGauge]);
  useEffect(() => {
    if (lastSkillAt > 0) {
      setShow(null);
    }
  }, [lastSkillAt]);
  useEffect(() => {
    if (!show) return;
    const t = window.setTimeout(() => setShow(null), 2200);
    return () => window.clearTimeout(t);
  }, [show]);
  if (!show) {
    return null;
  }
  return (
    <div className="skillReadyToast" key={show.at} aria-hidden="true">
      <span className="skillReadyKey">Q</span>
      <div className="skillReadyBody">
        <small>武器スキル 発動可能</small>
        <strong>{weaponSkillName}</strong>
      </div>
    </div>
  );
}

export function ItemToast() {
  const lastItemAt = useBattleStore((state) => state.lastItemAt);
  const lastItemId = useBattleStore((state) => state.lastItemId);
  const [active, setActive] = useState(false);
  useEffect(() => {
    if (lastItemAt === 0 || !lastItemId) {
      return;
    }
    setActive(true);
    const id = window.setTimeout(() => setActive(false), 1800);
    return () => window.clearTimeout(id);
  }, [lastItemAt, lastItemId]);
  if (!active || !lastItemId) {
    return null;
  }
  const item = findItem(lastItemId);
  if (!item) {
    return null;
  }
  const accent = ITEM_ACCENT_COLOR[lastItemId];
  const icon = ITEM_ICONS[lastItemId];
  return (
    <div
      className="itemToast"
      key={lastItemAt}
      style={{ ["--toast-accent" as string]: accent }}
      aria-hidden="true"
    >
      <span className="itemToastIcon">{icon}</span>
      <div className="itemToastBody">
        <strong>{item.name}</strong>
        <span>{item.effect}</span>
      </div>
    </div>
  );
}
