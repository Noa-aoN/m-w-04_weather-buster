import { useEffect, useRef, useState } from "react";
import { findCharacter, findItem, findStage, findWeapon, weatherEnemies } from "../../game/data";
import { useBattleStore } from "../../game/battleStore";
import { calculateSunnyScore } from "../../game/score";
import { requestPointerLock } from "../player/lockControls";
import { playCountdownGo, playCountdownTick } from "../audio/audio";
import type { ItemId } from "../../game/types";

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

const controlHints: Array<[string, string]> = [
  ["W A S D", "移動"],
  ["MOUSE", "視点"],
  ["L-CLICK", "攻撃"],
  ["R-CLICK", "リロード"],
  ["B", "気象シールド"],
  ["SPACE", "ジャンプ"],
  ["SHIFT", "ダッシュ"],
  ["R", "リロード"],
  ["Q", "武器スキル"],
  ["ESC", "ポーズ"],
];

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function ControlsHelp() {
  return (
    <dl className="controlsHelp">
      {controlHints.map(([key, label]) => (
        <div key={key}>
          <kbd>{key}</kbd>
          <span>{label}</span>
        </div>
      ))}
    </dl>
  );
}

function WeaponIcon() {
  return (
    <svg className="weaponIcon" viewBox="0 0 60 28" aria-hidden="true">
      <path
        d="M2 14 L40 14 L40 8 L52 8 L52 14 L58 14 L58 18 L52 18 L52 22 L42 22 L42 18 L18 18 L18 22 L8 22 L8 18 L2 18 Z"
        fill="none"
        stroke="#28d9ff"
        strokeWidth="1.4"
      />
      <path d="M22 14 L26 14" stroke="#ffd84d" strokeWidth="1.6" />
    </svg>
  );
}

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
        <span className="skillNameLabel">SKILL</span>
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

function SkillReadyToast({ pressureGauge, weaponSkillName }: { pressureGauge: number; weaponSkillName: string }) {
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
  // hide on skill activation or after timer
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
        <small>武器スキル READY</small>
        <strong>{weaponSkillName}</strong>
      </div>
    </div>
  );
}

function ItemToast() {
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

// Big white-to-blue burst the moment the boss explodes — pairs with the 3D
// DefeatBurst (shockwave + shards) to sell "雲が割れて青空が戻る".
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
      <span className="bossIntroLabel">CONFIRMED THREAT</span>
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
      <span>SPECIAL INCOMING</span>
      <div className="enemyChargeBar"><i style={{ width: `${progress * 100}%` }} /></div>
    </div>
  );
}

function ReloadPromptOverlay() {
  // Shows "RELOAD!" when the player has 0 ammo OR when they tried to fire
  // empty (lastEmptyClickAt) within the last 1.4s. Manual reload (R / right
  // click) clears it implicitly when ammo refills.
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
      <span className="reloadPromptKick">RELOAD!</span>
      <span className="reloadPromptHint">右クリック / R で装填</span>
    </div>
  );
}

function ReloadIndicator() {
  const reloadingUntil = useBattleStore((state) => state.reloadingUntil);
  const reloadingStartedAt = useBattleStore((state) => state.reloadingStartedAt);
  const selectedWeaponId = useBattleStore((state) => state.selectedWeaponId);
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
  if (selectedWeaponId === "windBlade" || reloadingUntil === 0 || performance.now() >= reloadingUntil) {
    return null;
  }
  return (
    <div className="reloadIndicator" aria-hidden="true">
      <span>RELOADING</span>
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
      <span>BLOCKED</span>
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
      <span>BARRIER UP</span>
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

export function BattleHud({
  onBack,
  onOpenEnemyGrid,
  onShowResult,
}: {
  onBack: () => void;
  onOpenEnemyGrid: () => void;
  onShowResult: () => void;
}) {
  const status = useBattleStore((state) => state.status);
  const isPointerLocked = useBattleStore((state) => state.isPointerLocked);
  const selectedEnemyId = useBattleStore((state) => state.selectedEnemyId);
  const selectedWeaponId = useBattleStore((state) => state.selectedWeaponId);
  const selectedCharacterId = useBattleStore((state) => state.selectedCharacterId);
  const selectedStageId = useBattleStore((state) => state.selectedStageId);
  const enemyHp = useBattleStore((state) => state.enemyHp);
  const enemyMaxHp = useBattleStore((state) => state.enemyMaxHp);
  const playerHp = useBattleStore((state) => state.playerHp);
  const playerMaxHp = useBattleStore((state) => state.playerMaxHp);
  const ammo = useBattleStore((state) => state.ammo);
  const pressureGauge = useBattleStore((state) => state.pressureGauge);
  const shieldEnergy = useBattleStore((state) => state.shieldEnergy);
  const shieldActive = useBattleStore((state) => state.shieldActive);
  const shotsFired = useBattleStore((state) => state.shotsFired);
  const shotsHit = useBattleStore((state) => state.shotsHit);
  const elapsedSeconds = useBattleStore((state) => state.elapsedSeconds);
  const crosshairColor = useBattleStore((state) => state.crosshairColor);
  const decoyUntil = useBattleStore((state) => state.decoyUntil);
  const start = useBattleStore((state) => state.start);

  const enemy = weatherEnemies.find((candidate) => candidate.id === selectedEnemyId) ?? weatherEnemies[0];
  const weapon = findWeapon(selectedWeaponId);
  const isMelee = selectedWeaponId === "windBlade";
  const character = findCharacter(selectedCharacterId);
  const stage = findStage(selectedStageId);
  const accuracy = shotsFired === 0 ? 0 : Math.round((shotsHit / shotsFired) * 100);
  const enemyHpRatio = Math.max(enemyHp / Math.max(enemyMaxHp, 1), 0);
  const playerHpRatio = Math.max(playerHp / Math.max(playerMaxHp, 1), 0);
  const decoyActive = Date.now() < decoyUntil;
  const score = calculateSunnyScore({
    enemyMaxHp,
    remainingEnemyHp: enemyHp,
    shotsFired,
    shotsHit,
  });

  const [countdown, setCountdown] = useState<null | "3" | "2" | "1" | "GO">(null);
  const countdownTimers = useRef<number[]>([]);

  function clearCountdownTimers() {
    countdownTimers.current.forEach((id) => window.clearTimeout(id));
    countdownTimers.current = [];
  }

  function handleStart() {
    if (countdown !== null) {
      return;
    }
    clearCountdownTimers();
    setCountdown("3");
    playCountdownTick();
    countdownTimers.current.push(
      window.setTimeout(() => {
        setCountdown("2");
        playCountdownTick();
      }, 700),
      window.setTimeout(() => {
        setCountdown("1");
        playCountdownTick();
      }, 1400),
      window.setTimeout(() => {
        setCountdown("GO");
        playCountdownGo();
      }, 2100),
      window.setTimeout(() => {
        setCountdown(null);
        start();
        requestPointerLock();
      }, 2700),
    );
  }

  useEffect(() => {
    return () => clearCountdownTimers();
  }, []);

  function handleResume() {
    requestPointerLock();
  }

  // Self-heal: while a battle is in-progress but the pointer is unlocked
  // (typical cause: a Suspense unmount during character/weapon FBX loading,
  // or the post-Esc cooldown swallowing the lock request that the countdown
  // fired), retry the lock on the next click anywhere. A real "click again
  // to play" is far less confusing than a silent stuck pause.
  useEffect(() => {
    if (status !== "battle" || isPointerLocked) {
      return;
    }
    const onClick = (event: MouseEvent) => {
      // Don't steal clicks from existing UI buttons (Resume / Quit etc.)
      if (event.target instanceof HTMLElement && event.target.closest("button, a")) {
        return;
      }
      requestPointerLock();
    };
    // small delay so we don't race the click that opened the pause state
    const timer = window.setTimeout(() => {
      window.addEventListener("click", onClick);
    }, 200);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("click", onClick);
    };
  }, [status, isPointerLocked]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement && (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA")) {
        return;
      }
      const key = event.key.toLowerCase();
      if (status === "ready") {
        if (key === "enter" || event.key === "Enter") {
          event.preventDefault();
          handleStart();
        } else if (key === "h") {
          event.preventDefault();
          onBack();
        }
      } else if (status === "battle" && !isPointerLocked) {
        if (key === "enter" || event.key === "Enter") {
          event.preventDefault();
          handleResume();
        } else if (key === "h") {
          event.preventDefault();
          onBack();
        }
      } else if (status === "clear" || status === "defeat") {
        if (key === "enter" || event.key === "Enter") {
          event.preventDefault();
          onShowResult();
        } else if (key === "h") {
          event.preventDefault();
          onBack();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, isPointerLocked, onBack, onShowResult]);

  return (
    <div className={`battleHud ${status === "battle" && isPointerLocked ? "battleHud--engaged" : ""}`}>
      <header className="battleBrand">
        <button type="button" onClick={onBack}>WEATHER BUSTER</button>
      </header>

      <div className="playerStatus tacticalPanel">
        <span>耐候値 / {character.codename}</span>
        <strong>{Math.round(playerHp).toLocaleString()} / {playerMaxHp.toLocaleString()}</strong>
        <div className="segmentedMeter cyan"><i style={{ width: `${playerHpRatio * 100}%` }} /></div>
        <span>気圧ゲージ{decoyActive ? " / DECOY" : ""}</span>
        <div className="segmentedMeter yellow"><i style={{ width: `${pressureGauge}%` }} /></div>
        <span>気象シールド{shieldActive ? " / DEPLOYED" : ""}</span>
        <div className="segmentedMeter shield"><i style={{ width: `${shieldEnergy}%` }} /></div>
      </div>

      <div className="bossBar">
        <strong>{enemy.name}</strong>
        <div><i style={{ width: `${enemyHpRatio * 100}%` }} /></div>
      </div>

      <aside className="scorePanel tacticalPanel">
        <span>晴天化スコア</span>
        <strong>{score.toLocaleString()}</strong>
        <span>経過時間</span>
        <b>{formatTime(elapsedSeconds)}</b>
      </aside>

      <aside className="missionPanel tacticalPanel">
        <span>MISSION</span>
        <p>{stage.name} / {character.passiveName}</p>
        <label>
          <input type="checkbox" checked={status === "clear"} readOnly /> {enemy.name}を撃破する
        </label>
      </aside>

      <button className="enemyBookButton" type="button" onClick={onOpenEnemyGrid}>天候性侵害体図鑑</button>

      <div className="radarPanel tacticalPanel">
        <div className="radarCircle"><i /><b /></div>
        <p>戦域: {stage.name}</p>
        <p>敵性質: {enemy.trait}</p>
      </div>

      <div className={`weaponStatus tacticalPanel ${!isMelee && ammo === 0 ? "weaponStatus--empty" : !isMelee && ammo <= 5 ? "weaponStatus--low" : ""}`}>
        <WeaponIcon />
        <span>{weapon.name}</span>
        <strong>{isMelee ? "近接 / 無制限" : `${ammo} / ${weapon.maxAmmo}`}</strong>
        <small>{isMelee ? "直接攻撃のみ" : `命中率 ${accuracy}%`}</small>
      </div>

      <div className={`skillStatus tacticalPanel ${pressureGauge >= 100 ? "skillStatus--ready" : ""}`}>
        <span>武器スキル</span>
        <strong>{weapon.skillName}</strong>
        <div className={`segmentedMeter yellow ${pressureGauge >= 100 ? "segmentedMeter--ready" : ""}`}>
          <i style={{ width: `${pressureGauge}%` }} />
        </div>
        <small>{pressureGauge >= 100 ? "Q で発動可能" : weapon.skillDescription}</small>
      </div>
      <SkillReadyToast pressureGauge={pressureGauge} weaponSkillName={weapon.skillName} />

      <div
        className="reticle"
        style={{ borderColor: crosshairColor, ["--crosshair" as string]: crosshairColor }}
        aria-hidden="true"
      />
      <HitMarker color={enemy.accentColor} />
      <SkillFlash />
      <DamagePopups />
      <ComboCounter />
      <ScreenShake />
      <LowHpVignette />
      <BattleStartFlash />
      <ClearSkyBurst />
      <BossIntro enemyName={enemy.name} enemyTrait={enemy.trait} threat={enemy.threat} />
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

      {countdown !== null ? (
        <div className={`countdownOverlay ${countdown === "GO" ? "go" : ""}`} aria-hidden="true">
          <div key={countdown} className="countdownNumber">{countdown}</div>
          <div className="countdownRing" />
        </div>
      ) : null}

      {status === "battle" ? (
        <div className="escHint" aria-live="polite">
          <kbd>ESC</kbd>
          <span>マウス操作に戻す（ポーズ）</span>
        </div>
      ) : null}

      {status === "ready" ? (
        <div className="centerBanner">
          <p>{stage.name} / {character.codename}</p>
          <h1>{enemy.name}を撃破する</h1>
          <ControlsHelp />
          <p className="bannerHint">※ 右クリック長押しで気象シールド / ESC でマウス操作に戻せます</p>
          <div className="readyActions">
            <button type="button" onClick={onBack}>ホームへ (H)</button>
            <button type="button" className="primaryMenuButton" onClick={handleStart}>戦闘開始 (Enter)</button>
          </div>
        </div>
      ) : null}

      {status === "battle" && !isPointerLocked ? (
        <div className="centerBanner pauseBanner">
          <p>POINTER UNLOCKED</p>
          <h1>一時停止中</h1>
          <ControlsHelp />
          <p className="bannerHint">※ 右クリック長押しで気象シールド</p>
          <div className="pauseActions">
            <button type="button" className="primaryMenuButton" onClick={handleResume}>プレイ続行 (Enter)</button>
            <button type="button" onClick={onBack}>撤退してタイトルへ (H)</button>
          </div>
        </div>
      ) : null}

      {status === "clear" ? (
        <div className="centerBanner clearBanner">
          <span className="clearBannerSun" aria-hidden="true" />
          <span className="clearBannerCloud clearBannerCloud--a" aria-hidden="true" />
          <span className="clearBannerCloud clearBannerCloud--b" aria-hidden="true" />
          <span className="clearBannerCloud clearBannerCloud--c" aria-hidden="true" />
          <p>雲が割れ、空が戻った</p>
          <h1>CLEAR SKY!</h1>
          <p className="bannerHint">
            <kbd>ESC</kbd>
            <span>マウス操作に戻る（カーソルを表示）</span>
          </p>
          <div className="readyActions">
            <button type="button" className="primaryMenuButton" onClick={onShowResult}>結果を見る (Enter)</button>
            <button type="button" onClick={onBack}>ホームへ (H)</button>
          </div>
        </div>
      ) : null}

      {status === "defeat" ? (
        <div className="centerBanner defeatBanner">
          <p>計測機を失った</p>
          <h1>WEATHER OVER</h1>
          <div className="readyActions">
            <button type="button" className="primaryMenuButton" onClick={onShowResult}>結果を見る (Enter)</button>
            <button type="button" onClick={onBack}>ホームへ (H)</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
