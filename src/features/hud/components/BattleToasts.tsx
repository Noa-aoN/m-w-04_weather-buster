import { useEffect, useRef, useState } from "react";
import { enemyContactReactions, findItem, weatherEnemies } from "../../../game/data";
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
        <small>ウェポンスキル 発動可能</small>
        <strong>{weaponSkillName}</strong>
      </div>
    </div>
  );
}

export function ContactToast() {
  const lastContactAt = useBattleStore((state) => state.lastContactAt);
  const contactEnemyId = useBattleStore((state) => state.contactEnemyId);
  const contactToastUntil = useBattleStore((state) => state.contactToastUntil);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (contactToastUntil === 0) return;
    const id = window.setInterval(() => setTick((value) => value + 1), 100);
    return () => window.clearInterval(id);
  }, [contactToastUntil]);
  // tick is consumed below via performance.now(); reading it here keeps the
  // effect dependency honest without a lint suppression.
  void tick;
  const now = performance.now();
  if (!contactEnemyId || contactToastUntil === 0 || now >= contactToastUntil || lastContactAt === 0) {
    return null;
  }
  const enemy = weatherEnemies.find((e) => e.id === contactEnemyId);
  const reaction = enemyContactReactions[contactEnemyId];
  if (!enemy || !reaction) return null;
  const remainingMs = Math.max(0, contactToastUntil - now);
  const remainingSec = (remainingMs / 1000).toFixed(1);
  const effects: string[] = [];
  effects.push(`接触ダメージ ${reaction.damage}`);
  if (reaction.knockback >= 4) effects.push("強ノックバック");
  else if (reaction.knockback >= 2) effects.push("ノックバック");
  if (reaction.slowMs) effects.push("移動鈍化");
  return (
    <div
      className="contactToast"
      style={{ ["--toast-accent" as string]: enemy.accentColor }}
      aria-hidden="true"
    >
      <span className="contactToastIcon">{enemy.icon}</span>
      <div className="contactToastBody">
        <small>{enemy.name} に接触</small>
        <strong>{effects.join(" / ")}</strong>
      </div>
      <span className="contactToastTimer">{remainingSec}s</span>
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
