import { useEffect, useRef, useState } from "react";
import { findWeapon } from "../../../game/data";
import { useBattleStore } from "../../../game/battleStore";
import { BattleEffectsLayer } from "./BattleHudLayers";
import { ContactToast, ItemToast, SkillReadyToast } from "./BattleToasts";
import type { BattleStatus } from "../../../game/types";

function SkillFlash() {
  const lastSkillAt = useBattleStore((state) => state.lastSkillAt);
  const selectedWeaponId = useBattleStore((state) => state.selectedWeaponId);
  const [active, setActive] = useState(false);
  const weapon = findWeapon(selectedWeaponId);

  useEffect(() => {
    if (lastSkillAt === 0) {
      return;
    }
    setActive(true);
    const id = window.setTimeout(() => setActive(false), 1200);
    return () => window.clearTimeout(id);
  }, [lastSkillAt]);

  if (!active) {
    return null;
  }
  return (
    <>
      <div className="skillFlash" key={`flash-${lastSkillAt}`} aria-hidden="true" />
      <div className="skillBurst" key={`burst-${lastSkillAt}`} aria-hidden="true">
        <span className="skillBurstRing" />
        <span className="skillBurstRing skillBurstRing--two" />
        <span className="skillBurstRing skillBurstRing--three" />
      </div>
      <div className="skillNameBanner" key={`name-${lastSkillAt}`} aria-hidden="true">
        <span className="skillNameLabel">スキル</span>
        <strong>{weapon.skillName}</strong>
        <span className="skillNameWeapon">{weapon.name}</span>
      </div>
    </>
  );
}

function HitMarker({ color }: { color: string }) {
  const lastShotAt = useBattleStore((state) => state.lastShotAt);
  const lastShotHit = useBattleStore((state) => state.lastShotHit);
  if (lastShotAt === 0) {
    return null;
  }
  return (
    <div
      key={lastShotAt}
      className={`hitMarker ${lastShotHit ? "hit" : "miss"}`}
      style={{ ["--hit-color" as string]: lastShotHit ? color : "rgba(255, 255, 255, 0.55)" }}
      aria-hidden="true"
    />
  );
}

type DamagePopup = { id: number; value: number; critical: boolean; x: number; y: number };

function DamagePopups() {
  const lastShotAt = useBattleStore((state) => state.lastShotAt);
  const lastShotHit = useBattleStore((state) => state.lastShotHit);
  const lastShotCritical = useBattleStore((state) => state.lastShotCritical);
  const lastShotDamage = useBattleStore((state) => state.lastShotDamage);
  const [popups, setPopups] = useState<DamagePopup[]>([]);

  useEffect(() => {
    if (lastShotAt === 0 || !lastShotHit) {
      return;
    }
    const id = lastShotAt;
    const popup: DamagePopup = {
      id,
      value: Math.round(lastShotDamage),
      critical: lastShotCritical,
      x: 50 + (Math.random() - 0.5) * 8,
      y: 48 + (Math.random() - 0.5) * 5,
    };
    setPopups((prev) => [...prev.slice(-7), popup]);
    const timer = window.setTimeout(() => {
      setPopups((prev) => prev.filter((p) => p.id !== id));
    }, 900);
    return () => window.clearTimeout(timer);
  }, [lastShotAt, lastShotHit, lastShotCritical, lastShotDamage]);

  if (popups.length === 0) {
    return null;
  }
  return (
    <div className="damagePopups" aria-hidden="true">
      {popups.map((p) => (
        <span
          key={p.id}
          className={`damagePopup ${p.critical ? "critical" : ""}`}
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
        >
          {p.critical ? `${p.value} CRIT!` : p.value}
        </span>
      ))}
    </div>
  );
}

function comboTier(combo: number): { label: string; tier: string } {
  if (combo >= 30) return { label: "INSANE", tier: "insane" };
  if (combo >= 20) return { label: "PERFECT", tier: "perfect" };
  if (combo >= 12) return { label: "AMAZING", tier: "amazing" };
  if (combo >= 6) return { label: "GREAT", tier: "great" };
  return { label: "GOOD", tier: "good" };
}

function ComboCounter() {
  const combo = useBattleStore((state) => state.combo);
  const lastComboAt = useBattleStore((state) => state.lastComboAt);
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (combo < 2) {
      setShow(false);
      return;
    }
    setShow(true);
    const timer = window.setTimeout(() => setShow(false), 2400);
    return () => window.clearTimeout(timer);
  }, [combo, lastComboAt]);
  if (!show || combo < 2) {
    return null;
  }
  const tier = comboTier(combo);
  return (
    <div className={`comboCounter comboCounter--${tier.tier}`} key={lastComboAt} aria-hidden="true">
      <span className="comboLabel">{tier.label}</span>
      <strong>{combo}</strong>
      <span className="comboHit">HIT</span>
    </div>
  );
}

function ScreenShake() {
  const lastShotCritical = useBattleStore((state) => state.lastShotCritical);
  const lastShotAt = useBattleStore((state) => state.lastShotAt);
  const lastShieldBlockAt = useBattleStore((state) => state.lastShieldBlockAt);
  const lastSkillAt = useBattleStore((state) => state.lastSkillAt);
  const status = useBattleStore((state) => state.status);
  const [shake, setShake] = useState<{ key: number; intensity: "light" | "heavy" } | null>(null);

  useEffect(() => {
    if (!lastShotCritical || lastShotAt === 0) return;
    setShake({ key: lastShotAt, intensity: "light" });
  }, [lastShotCritical, lastShotAt]);

  useEffect(() => {
    if (lastShieldBlockAt === 0) return;
    setShake({ key: lastShieldBlockAt, intensity: "heavy" });
  }, [lastShieldBlockAt]);

  useEffect(() => {
    if (lastSkillAt === 0) return;
    setShake({ key: lastSkillAt, intensity: "heavy" });
  }, [lastSkillAt]);

  useEffect(() => {
    if (status === "clear" || status === "defeat") {
      setShake({ key: Date.now(), intensity: "heavy" });
    }
  }, [status]);

  if (!shake) {
    return null;
  }
  return <div className={`screenShake screenShake--${shake.intensity}`} key={shake.key} aria-hidden="true" />;
}

function LowHpVignette() {
  const playerHp = useBattleStore((state) => state.playerHp);
  const playerMaxHp = useBattleStore((state) => state.playerMaxHp);
  const status = useBattleStore((state) => state.status);
  const ratio = playerHp / Math.max(playerMaxHp, 1);
  const active = status === "battle" && ratio < 0.32 && ratio > 0;
  if (!active) {
    return null;
  }
  const intensity = ratio < 0.18 ? "critical" : "warn";
  return <div className={`lowHpVignette lowHpVignette--${intensity}`} aria-hidden="true" />;
}

function BattleStartFlash() {
  const status = useBattleStore((state) => state.status);
  const [flash, setFlash] = useState(0);
  useEffect(() => {
    if (status === "battle") {
      setFlash(Date.now());
    }
  }, [status]);
  if (flash === 0) {
    return null;
  }
  return <div className="battleStartFlash" key={flash} aria-hidden="true" />;
}

function ClearSkyBurst() {
  const status = useBattleStore((state) => state.status);
  const [flash, setFlash] = useState(0);
  useEffect(() => {
    if (status === "clear") {
      setFlash(Date.now());
    }
  }, [status]);
  if (flash === 0) {
    return null;
  }
  return (
    <>
      <div className="clearSkyFlash" key={`flash-${flash}`} aria-hidden="true" />
      <div className="clearSkyShockwave" key={`wave-${flash}`} aria-hidden="true" />
      <div className="clearSkyRays" key={`rays-${flash}`} aria-hidden="true" />
    </>
  );
}

function MinionSummonOverlay() {
  const lastMinionSpawnAt = useBattleStore((state) => state.lastMinionSpawnAt);
  const [show, setShow] = useState(0);
  useEffect(() => {
    if (lastMinionSpawnAt === 0) return;
    setShow(lastMinionSpawnAt);
    const t = window.setTimeout(() => setShow(0), 1700);
    return () => window.clearTimeout(t);
  }, [lastMinionSpawnAt]);
  if (show === 0) return null;
  return (
    <>
      <div className="minionSummonVignette" key={`v-${show}`} aria-hidden="true" />
      <div className="minionSummonBanner" key={`b-${show}`} aria-hidden="true">
        <span>暗雲が眷属を呼ぶ</span>
        <small>子分が召喚された</small>
      </div>
    </>
  );
}

function StaggerBurst() {
  const lastStaggerAt = useBattleStore((state) => state.lastStaggerAt);
  const staggerUntil = useBattleStore((state) => state.staggerUntil);
  const status = useBattleStore((state) => state.status);
  const [activeKey, setActiveKey] = useState(0);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (lastStaggerAt === 0) return;
    setActiveKey(lastStaggerAt);
  }, [lastStaggerAt]);
  useEffect(() => {
    if (activeKey === 0) return;
    const id = window.setInterval(() => setTick((value) => value + 1), 120);
    return () => window.clearInterval(id);
  }, [activeKey]);
  const now = performance.now();
  // Cancel as soon as the player finishes the boss off — leaving a
  // "core exposed" banner up after the kill reads as a stale popup.
  const isActive = activeKey !== 0 && now < staggerUntil && status === "battle";
  if (!isActive) {
    return null;
  }
  return (
    <>
      <div className="staggerFlash" key={`flash-${activeKey}`} aria-hidden="true" />
      <div className={`staggerBanner ${tick % 2 === 0 ? "on" : ""}`} aria-hidden="true">
        <span>天侵体 硬直反応</span>
        <small>核を狙え</small>
      </div>
    </>
  );
}

function DamageFlash() {
  const playerHp = useBattleStore((state) => state.playerHp);
  const prev = useRef(playerHp);
  const [flash, setFlash] = useState<{ key: number; intensity: number } | null>(null);
  useEffect(() => {
    if (playerHp < prev.current) {
      const drop = prev.current - playerHp;
      const intensity = Math.min(1, drop / 120);
      setFlash({ key: Date.now(), intensity });
      const t = window.setTimeout(() => setFlash(null), 480);
      prev.current = playerHp;
      return () => window.clearTimeout(t);
    }
    prev.current = playerHp;
  }, [playerHp]);
  if (!flash) {
    return null;
  }
  return (
    <div
      className="damageFlash"
      key={flash.key}
      style={{ ["--flash-strength" as string]: flash.intensity.toString() }}
      aria-hidden="true"
    />
  );
}

function BossIntro({ enemyName, enemyTrait, threat }: { enemyName: string; enemyTrait: string; threat: number }) {
  const status = useBattleStore((state) => state.status);
  const [introAt, setIntroAt] = useState(0);
  useEffect(() => {
    if (status === "battle") {
      setIntroAt(Date.now());
      const t = window.setTimeout(() => setIntroAt(0), 2000);
      return () => window.clearTimeout(t);
    }
  }, [status]);
  if (introAt === 0) {
    return null;
  }
  return (
    <div className="bossIntro" key={introAt} aria-hidden="true">
      <span className="bossIntroLabel">敵性体 出現確認</span>
      <strong className="bossIntroName">{enemyName}</strong>
      <span className="bossIntroTrait">{enemyTrait}</span>
      <span className="bossIntroThreat">
        {Array.from({ length: 9 }, (_, i) => (
          <b key={i} className={i < threat ? "filled" : ""}>{i < threat ? "▲" : "△"}</b>
        ))}
      </span>
    </div>
  );
}

function DashOverlay() {
  const isDashing = useBattleStore((state) => state.isDashing);
  if (!isDashing) return null;
  return <div className="dashOverlay" aria-hidden="true" />;
}

function SlowIndicator() {
  const slowUntil = useBattleStore((state) => state.slowUntil);
  const [active, setActive] = useState(false);
  useEffect(() => {
    if (slowUntil === 0) {
      setActive(false);
      return;
    }
    const id = window.setInterval(() => {
      setActive(performance.now() < slowUntil);
    }, 80);
    return () => window.clearInterval(id);
  }, [slowUntil]);
  if (!active) return null;
  return <div className="slowVignette" aria-hidden="true" />;
}

function EnemyChargeWarning() {
  const enemyChargeStartedAt = useBattleStore((state) => state.enemyChargeStartedAt);
  const enemyChargeFiresAt = useBattleStore((state) => state.enemyChargeFiresAt);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (enemyChargeFiresAt === 0) {
      setProgress(0);
      return;
    }
    const id = window.setInterval(() => {
      const total = Math.max(enemyChargeFiresAt - enemyChargeStartedAt, 1);
      const elapsed = performance.now() - enemyChargeStartedAt;
      const p = Math.min(1, Math.max(0, elapsed / total));
      setProgress(p);
      if (p >= 1) window.clearInterval(id);
    }, 30);
    return () => window.clearInterval(id);
  }, [enemyChargeStartedAt, enemyChargeFiresAt]);
  if (enemyChargeFiresAt === 0 || performance.now() >= enemyChargeFiresAt) {
    return null;
  }
  return (
    <div className="enemyChargeWarning" aria-hidden="true">
      <span>必殺技 接近中</span>
      <div className="enemyChargeBar"><i style={{ width: `${progress * 100}%` }} /></div>
    </div>
  );
}

function ReloadPromptOverlay() {
  const ammo = useBattleStore((s) => s.ammo);
  const selectedWeaponId = useBattleStore((s) => s.selectedWeaponId);
  const status = useBattleStore((s) => s.status);
  const reloadingUntil = useBattleStore((s) => s.reloadingUntil);
  const lastEmptyClickAt = useBattleStore((s) => s.lastEmptyClickAt);
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    if (lastEmptyClickAt === 0) return;
    setPulse(lastEmptyClickAt);
  }, [lastEmptyClickAt]);
  if (status !== "battle") return null;
  if (selectedWeaponId === "windBlade") return null;
  if (ammo > 0) return null;
  if (performance.now() < reloadingUntil) return null;
  return (
    <div className="reloadPrompt" key={pulse} aria-hidden="true">
      <span className="reloadPromptKick">リロード</span>
      <span className="reloadPromptHint">右クリック / R キーで再装填</span>
    </div>
  );
}

function ReloadIndicator() {
  const reloadingUntil = useBattleStore((state) => state.reloadingUntil);
  const reloadingStartedAt = useBattleStore((state) => state.reloadingStartedAt);
  const selectedWeaponId = useBattleStore((state) => state.selectedWeaponId);
  const status = useBattleStore((state) => state.status);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (reloadingUntil === 0) {
      setProgress(0);
      return;
    }
    const id = window.setInterval(() => {
      const total = Math.max(reloadingUntil - reloadingStartedAt, 1);
      const elapsed = performance.now() - reloadingStartedAt;
      const p = Math.min(1, Math.max(0, elapsed / total));
      setProgress(p);
      if (p >= 1) {
        window.clearInterval(id);
      }
    }, 30);
    return () => window.clearInterval(id);
  }, [reloadingUntil, reloadingStartedAt]);
  if (
    selectedWeaponId === "windBlade"
    || reloadingUntil === 0
    || performance.now() >= reloadingUntil
    || status !== "battle"  // hide once the boss is down
  ) {
    return null;
  }
  return (
    <div className="reloadIndicator" aria-hidden="true">
      <span>リロード中</span>
      <div className="reloadBar"><i style={{ width: `${progress * 100}%` }} /></div>
    </div>
  );
}

function BlockedIndicator() {
  const lastBlockedAt = useBattleStore((state) => state.lastBlockedAt);
  const [show, setShow] = useState(0);
  useEffect(() => {
    if (lastBlockedAt === 0) return;
    setShow(lastBlockedAt);
    const t = window.setTimeout(() => setShow(0), 600);
    return () => window.clearTimeout(t);
  }, [lastBlockedAt]);
  if (show === 0) {
    return null;
  }
  return (
    <div className="blockedIndicator" key={show} aria-hidden="true">
      <span>防御</span>
    </div>
  );
}

function BarrierWarning() {
  const enemyBarrierUntil = useBattleStore((state) => state.enemyBarrierUntil);
  const [active, setActive] = useState(false);
  useEffect(() => {
    const id = window.setInterval(() => {
      setActive(performance.now() < enemyBarrierUntil);
    }, 100);
    return () => window.clearInterval(id);
  }, [enemyBarrierUntil]);
  if (!active) {
    return null;
  }
  return (
    <div className="barrierWarning" aria-hidden="true">
      <span>バリア展開中</span>
    </div>
  );
}

function CriticalFlash() {
  const lastShotAt = useBattleStore((state) => state.lastShotAt);
  const lastShotCritical = useBattleStore((state) => state.lastShotCritical);
  const [flashAt, setFlashAt] = useState(0);
  useEffect(() => {
    if (lastShotAt === 0 || !lastShotCritical) {
      return;
    }
    setFlashAt(lastShotAt);
    const t = window.setTimeout(() => setFlashAt(0), 300);
    return () => window.clearTimeout(t);
  }, [lastShotAt, lastShotCritical]);
  if (flashAt === 0) {
    return null;
  }
  return <div className="criticalFlash" key={flashAt} aria-hidden="true" />;
}

function HealFlash() {
  const lastItemAt = useBattleStore((state) => state.lastItemAt);
  const lastItemId = useBattleStore((state) => state.lastItemId);
  const [flashAt, setFlashAt] = useState(0);
  useEffect(() => {
    if (lastItemAt === 0 || lastItemId !== "clearTonic") {
      return;
    }
    setFlashAt(lastItemAt);
    const t = window.setTimeout(() => setFlashAt(0), 700);
    return () => window.clearTimeout(t);
  }, [lastItemAt, lastItemId]);
  if (flashAt === 0) {
    return null;
  }
  return <div className="healFlash" key={flashAt} aria-hidden="true" />;
}

export function BattleEffectsOverlay({
  crosshairColor,
  enemyAccentColor,
  enemyName,
  enemyThreat,
  enemyTrait,
  status,
  weaponSkillName,
  pressureGauge,
}: {
  crosshairColor: string;
  enemyAccentColor: string;
  enemyName: string;
  enemyThreat: number;
  enemyTrait: string;
  status: BattleStatus;
  weaponSkillName: string;
  pressureGauge: number;
}) {
  return (
    <BattleEffectsLayer>
      <SkillReadyToast pressureGauge={pressureGauge} weaponSkillName={weaponSkillName} />

      <div
        className="reticle"
        style={{ borderColor: crosshairColor, ["--crosshair" as string]: crosshairColor }}
        aria-hidden="true"
      />
      <HitMarker color={enemyAccentColor} />
      <SkillFlash />
      <DamagePopups />
      <ComboCounter />
      <ScreenShake />
      <LowHpVignette />
      <BattleStartFlash />
      <ClearSkyBurst />
      <StaggerBurst />
      <MinionSummonOverlay />
      <BossIntro enemyName={enemyName} enemyTrait={enemyTrait} threat={enemyThreat} />
      <DamageFlash />
      <HealFlash />
      <CriticalFlash />
      <BlockedIndicator />
      <BarrierWarning />
      <ReloadIndicator />
      <ReloadPromptOverlay />
      <EnemyChargeWarning />
      <SlowIndicator />
      <DashOverlay />
      <ItemToast />
      <ContactToast />

      {status === "battle" ? (
        <div className="escHint" aria-live="polite">
          <kbd>ESC</kbd>
          <span>マウス操作に戻す（ポーズ）</span>
        </div>
      ) : null}
    </BattleEffectsLayer>
  );
}
