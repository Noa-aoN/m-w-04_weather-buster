import { create } from "zustand";
import {
  bossMinionConfig,
  difficultyModifiers,
  findCharacter,
  findStage,
  findWeapon,
  findMinionType,
  items,
  stages,
  weapons,
  weatherEnemies,
} from "./data";
import {
  COMBAT_CONSTANTS,
  applyShot,
  computeIncomingDamage,
  computeReloadMs,
  enemyMaxHpFor,
  shieldAfterBlock,
} from "./combatRules";
import type {
  BattleStatus,
  BattleCameraMode,
  CharacterId,
  DifficultyLevel,
  ItemId,
  Minion,
  StageId,
  Weapon,
  WeaponId,
  WeatherEnemyId,
} from "./types";

const {
  PLAYER_MAX_HP,
  HEAL_AMOUNT,
  STABILIZER_GAUGE_GAIN,
  DECOY_DURATION_MS,
  ENEMY_TICK_DAMAGE_BASE,
  SHIELD_REGEN_PER_SECOND,
} = COMBAT_CONSTANTS;
// Default loadout: ノア / ウェザーガン / 天候研究所 / 豪雨 / 難易度3
const DEFAULT_ENEMY_INDEX = 1;        // weatherEnemies[1] = heavyRain
const DEFAULT_WEAPON_INDEX = 0;       // weapons[0] = weatherGun
const DEFAULT_CHARACTER_ID: CharacterId = "noa";
const DEFAULT_DIFFICULTY: DifficultyLevel = 3;

const initialStocks = (multiplier: number): Record<ItemId, number> => {
  const stocks = {} as Record<ItemId, number>;
  for (const item of items) {
    stocks[item.id] = Math.max(0, Math.floor(item.initialStock * multiplier + 0.001));
  }
  return stocks;
};

type AttackKind = "arc" | "linear" | "falling";

type LightningMarker = {
  id: number;
  x: number;
  z: number;
  triggersAt: number;
  spawnAt: number;
  fromX: number;
  fromY: number;
  fromZ: number;
  radius: number;
  damage: number;
  color: string;
  trailGlow: number;
  kind: AttackKind;
  enemyId: WeatherEnemyId;
};

/**
 * In-flight weapon-skill animation that the visual layer renders one step
 * at a time. Damage is applied per step (synced with the visible burst /
 * slash) so the HP bar drops in time with what the player sees.
 *
 * - `kind: "ranged"` → spawn N tracers from gun → enemy
 * - `kind: "slash"` → spawn N slash arcs at the player's facing
 *
 * Per-step damage is the total skill burst divided across the steps.
 * `id` distinguishes one cast from the next so React keys stay stable
 * even if two casts fire back-to-back.
 */
export type SkillAnimationKind = "ranged" | "slash";
export type SkillAnimation = {
  id: number;
  kind: SkillAnimationKind;
  weaponId: WeaponId;
  startedAt: number;
  stepIntervalMs: number;
  totalSteps: number;
  completedSteps: number;
  damagePerStep: number;
  /** Total burst damage. Stored so the last step can absorb rounding. */
  totalDamage: number;
  /** Latched targets on cast: animation only updates the boss's HP. */
  enemyMaxHpAtCast: number;
};

type BattleState = {
  status: BattleStatus;
  selectedEnemyId: WeatherEnemyId;
  selectedWeaponId: WeaponId;
  selectedCharacterId: CharacterId;
  selectedStageId: StageId;
  selectedDifficulty: DifficultyLevel;
  enemyHp: number;
  enemyMaxHp: number;
  playerHp: number;
  playerMaxHp: number;
  ammo: number;
  pressureGauge: number;
  shieldEnergy: number;
  shieldActive: boolean;
  shotsFired: number;
  shotsHit: number;
  damageTaken: number;
  elapsedSeconds: number;
  isPointerLocked: boolean;
  itemStocks: Record<ItemId, number>;
  lightningMarkers: LightningMarker[];
  decoyUntil: number;
  mouseSensitivity: number;
  fov: number;
  cameraMode: BattleCameraMode;
  crosshairColor: string;
  locationEnabled: boolean;
  currentWeatherEnemyId: WeatherEnemyId | null;
  currentWeatherCode: number | null;
  lastShotAt: number;
  lastShotHit: boolean;
  /** Bumped when a shot was occluded by a static prop (vs missing the
   *  enemy entirely). Drives the impact-spark VFX so the player sees
   *  WHY the shot didn't connect. */
  lastShotBlockedAt: number;
  lastShotBlockedX: number;
  lastShotBlockedY: number;
  lastShotBlockedZ: number;
  /** 敵に命中したショットの座標。EnemyHitSparks が subscribe して
   *  そのフレームに hit spark を立てるためのチャネル。critical 時は
   *  サイズと色が変わる。 */
  lastShotHitAt: number;
  lastShotHitCritical: boolean;
  lastShotHitX: number;
  lastShotHitY: number;
  lastShotHitZ: number;
  /** 敵攻撃の着弾イベント。EnemyImpactBursts が subscribe して
   *  marker 位置に sprite burst を立てる。status は "hit"=直撃、
   *  "blocked"=遮蔽で防がれた、"dodged"=範囲外で空振り。 */
  lastEnemyImpactAt: number;
  lastEnemyImpactX: number;
  lastEnemyImpactY: number;
  lastEnemyImpactZ: number;
  lastEnemyImpactColor: string;
  lastEnemyImpactEnemyId: WeatherEnemyId | null;
  lastEnemyImpactStatus: "hit" | "blocked" | "dodged" | "none";
  lastEnemyImpactRadius: number;
  /** Timestamp of the last windBlade ranged-slash projectile (right click).
   *  Kept separate from lastShotAt so close-range slash visuals (PlayerView
   *  blade swing, SlashTrails carve line) don't fire on a ranged cast. */
  lastSlashProjectileAt: number;
  lastSlashProjectileHit: boolean;
  lastSlashProjectileCritical: boolean;
  lastItemAt: number;
  lastItemId: ItemId | null;
  lastSkillAt: number;
  lastDefeatAt: number;
  lastShotCritical: boolean;
  lastShotDamage: number;
  lastShieldBlockAt: number;
  combo: number;
  comboBest: number;
  lastComboAt: number;
  enemyBarrierUntil: number;
  lastEnemyBarrierAt: number;
  lastBlockedAt: number;
  knockbackVx: number;
  knockbackVz: number;
  lastKnockbackAt: number;
  reloadingUntil: number;
  reloadingStartedAt: number;
  /** リロード完了を一回だけ HUD に伝える signal。HUD 側 ReloadFlash が
   *  subscribe して短い ring 演出を出す。 */
  lastReloadCompleteAt: number;
  lastEmptyClickAt: number;
  enemyChargeStartedAt: number;
  enemyChargeFiresAt: number;
  lastSpecialFiredAt: number;
  staggerUntil: number;
  staggerThresholdsHit: number[];
  lastStaggerAt: number;
  minions: Minion[];
  minionThresholdsSpawned: number[];
  lastMinionDefeatAt: number;
  lastMinionSpawnAt: number;
  slowUntil: number;
  /** Body-contact reaction state — drives the contact toast on the HUD. */
  lastContactAt: number;
  contactEnemyId: WeatherEnemyId | null;
  contactToastUntil: number;
  isDashing: boolean;
  /**
   * In-flight weapon skill animation. `null` when no skill is currently
   * playing. The store kicks this off in `triggerSkill` and the player
   * controller advances it step-by-step from useFrame so each visible hit
   * (gun burst / blade slash) lines up with one HP-bar tick.
   *
   * `kind` lets the visual layer pick the right component (ranged tracer
   * vs slash arc) without needing to know the weapon directly.
   */
  skillAnimation: SkillAnimation | null;
  seedCount: number;
  seedHistory: Array<{ enemyId: WeatherEnemyId; difficulty: DifficultyLevel; rank: string; at: number }>;
  selectEnemy: (id: WeatherEnemyId) => void;
  selectWeapon: (id: WeaponId) => void;
  selectCharacter: (id: CharacterId) => void;
  selectStage: (id: StageId) => void;
  setDifficulty: (value: DifficultyLevel) => void;
  sfxEnabled: boolean;
  bgmEnabled: boolean;
  masterVolume: number;
  setMouseSensitivity: (value: number) => void;
  setFov: (value: number) => void;
  setCameraMode: (value: BattleCameraMode) => void;
  setCrosshairColor: (value: string) => void;
  setSfxEnabled: (value: boolean) => void;
  setBgmEnabled: (value: boolean) => void;
  setMasterVolume: (value: number) => void;
  setLocationEnabled: (value: boolean) => void;
  setCurrentWeather: (enemyId: WeatherEnemyId | null, code: number | null) => void;
  start: () => void;
  reset: () => void;
  shoot: (didHit: boolean, critical?: boolean) => void;
  /** windBlade-only ranged crescent. Same damage/gauge math as `shoot`, but
   *  records to `lastSlashProjectile*` so the visual layer can show a
   *  flying slash instead of the close-range carve. */
  fireSlashProjectile: (didHit: boolean, critical?: boolean) => void;
  reload: () => void;
  takeDamageTick: () => void;
  takeMarkerDamage: (amount: number) => void;
  tick: () => void;
  triggerSkill: () => void;
  /**
   * Advance the in-flight skill animation: applies the next step's damage,
   * increments completedSteps, and clears `skillAnimation` when finished.
   * Called from PlayerController's useFrame when the next step's `firesAt`
   * is reached. No-op if no animation is in flight.
   */
  advanceSkillStep: () => void;
  useItem: (id: ItemId) => void;
  spawnLightning: (marker: LightningMarker) => void;
  removeLightning: (id: number) => void;
  shiftMarkerTimes: (deltaMs: number) => void;
  setPointerLocked: (locked: boolean) => void;
  setShieldActive: (active: boolean) => void;
  raiseEnemyBarrier: (durationMs: number) => void;
  applyKnockback: (vx: number, vz: number) => void;
  consumeKnockback: () => { vx: number; vz: number };
  beginEnemyCharge: (firesAt: number) => void;
  damageMinion: (id: number, amount: number) => boolean;
  shootMinion: (minionId: number) => void;
  recordMinionAttack: (id: number, now: number) => void;
  recordClear: (entry: { enemyId: WeatherEnemyId; difficulty: DifficultyLevel; rank: string }) => void;
};

const baseLoadout = (weapon: Weapon, difficulty: DifficultyLevel) => ({
  playerHp: PLAYER_MAX_HP,
  ammo: weapon.maxAmmo,
  pressureGauge: 0,
  shieldEnergy: 100,
  shieldActive: false,
  shotsFired: 0,
  shotsHit: 0,
  damageTaken: 0,
  elapsedSeconds: 0,
  itemStocks: initialStocks(difficultyModifiers[difficulty].itemMultiplier),
  lightningMarkers: [] as LightningMarker[],
  decoyUntil: 0,
  lastShotAt: 0,
  lastShotHit: false,
  lastShotBlockedAt: 0,
  lastShotBlockedX: 0,
  lastShotBlockedY: 0,
  lastShotBlockedZ: 0,
  lastShotHitAt: 0,
  lastShotHitCritical: false,
  lastShotHitX: 0,
  lastShotHitY: 0,
  lastShotHitZ: 0,
  lastEnemyImpactAt: 0,
  lastEnemyImpactX: 0,
  lastEnemyImpactY: 0,
  lastEnemyImpactZ: 0,
  lastEnemyImpactColor: "#ffffff",
  lastEnemyImpactEnemyId: null,
  lastEnemyImpactStatus: "none" as const,
  lastEnemyImpactRadius: 0,
  lastShotCritical: false,
  lastShotDamage: 0,
  lastSlashProjectileAt: 0,
  lastSlashProjectileHit: false,
  lastSlashProjectileCritical: false,
  lastItemAt: 0,
  lastItemId: null,
  lastSkillAt: 0,
  lastDefeatAt: 0,
  lastShieldBlockAt: 0,
  combo: 0,
  comboBest: 0,
  lastComboAt: 0,
  enemyBarrierUntil: 0,
  lastEnemyBarrierAt: 0,
  lastBlockedAt: 0,
  knockbackVx: 0,
  knockbackVz: 0,
  lastKnockbackAt: 0,
  reloadingUntil: 0,
  reloadingStartedAt: 0,
  lastReloadCompleteAt: 0,
  lastEmptyClickAt: 0,
  enemyChargeStartedAt: 0,
  enemyChargeFiresAt: 0,
  lastSpecialFiredAt: 0,
  staggerUntil: 0,
  staggerThresholdsHit: [] as number[],
  lastStaggerAt: 0,
  minions: [] as Minion[],
  minionThresholdsSpawned: [] as number[],
  lastMinionDefeatAt: 0,
  lastMinionSpawnAt: 0,
  slowUntil: 0,
  lastContactAt: 0,
  contactEnemyId: null as WeatherEnemyId | null,
  contactToastUntil: 0,
  isDashing: false,
  skillAnimation: null as SkillAnimation | null,
});

let minionIdCounter = 1;

function spawnMinionsForRatio(
  enemyId: WeatherEnemyId,
  prevRatio: number,
  nextRatio: number,
  alreadySpawned: number[],
  liveMinions: Minion[],
  difficulty: DifficultyLevel,
  now: number,
): { minions: Minion[]; thresholds: number[]; additionsCount: number } | null {
  const config = bossMinionConfig[enemyId];
  if (!config) return null;
  const cap = config.maxByDifficulty[difficulty];
  if (cap <= 0) return null;
  // `alreadySpawned.length` counts events that have *consumed* a threshold —
  // either a real spawn or a hit-the-cap skip. Either way, it represents the
  // number of summon events we've fired for this battle. Stop once we hit
  // the difficulty's total event budget.
  const totalCap = config.maxTotalSpawnsByDifficulty[difficulty];
  if (alreadySpawned.length >= totalCap) return null;
  const type = findMinionType(config.type);
  const additions: Minion[] = [];
  const thresholds = [...alreadySpawned];
  for (const ratio of config.spawnAtRatios) {
    if (thresholds.includes(ratio)) continue;
    if (thresholds.length >= totalCap) break;
    if (prevRatio > ratio && nextRatio <= ratio) {
      thresholds.push(ratio);
      if (liveMinions.length + additions.length >= cap) continue;
      const usedSlots = new Set([...liveMinions, ...additions].map((m) => m.slot));
      let slot = 0;
      while (usedSlots.has(slot) && slot < cap + 4) slot += 1;
      additions.push({
        id: minionIdCounter++,
        typeId: type.id,
        hp: type.maxHp,
        maxHp: type.maxHp,
        spawnedAt: now,
        slot,
        lastAttackAt: now,
      });
    }
  }
  if (additions.length === 0 && thresholds.length === alreadySpawned.length) {
    return null;
  }
  return { minions: [...liveMinions, ...additions], thresholds, additionsCount: additions.length };
}

// HP ratios that trigger the boss stagger phase. First the boss flinches at
// 75% (early warning), then again at 40% (panic). Each threshold fires once.
const STAGGER_THRESHOLDS = [0.75, 0.4] as const;
const STAGGER_DURATION_MS = 3000;

function nextStaggerPatch(
  prevHp: number,
  nextHp: number,
  enemyMaxHp: number,
  alreadyHit: number[],
  now: number,
): { staggerUntil: number; staggerThresholdsHit: number[]; lastStaggerAt: number } | null {
  if (nextHp <= 0 || enemyMaxHp <= 0) return null;
  const prevRatio = prevHp / enemyMaxHp;
  const nextRatio = nextHp / enemyMaxHp;
  for (const threshold of STAGGER_THRESHOLDS) {
    if (alreadyHit.includes(threshold)) continue;
    if (prevRatio > threshold && nextRatio <= threshold) {
      return {
        staggerUntil: now + STAGGER_DURATION_MS,
        staggerThresholdsHit: [...alreadyHit, threshold],
        lastStaggerAt: now,
      };
    }
  }
  return null;
}

const seedFields = (snapshot: SeedSnapshot) => ({
  seedCount: snapshot.count,
  seedHistory: snapshot.history,
});

const findEnemy = (id: WeatherEnemyId) =>
  weatherEnemies.find((enemy) => enemy.id === id) ??
  weatherEnemies[DEFAULT_ENEMY_INDEX];

const SEED_STORAGE_KEY = "weatherbuster-seeds-v1";

type SeedSnapshot = {
  count: number;
  history: BattleState["seedHistory"];
};

function loadSeedSnapshot(): SeedSnapshot {
  if (typeof window === "undefined") {
    return { count: 0, history: [] };
  }
  try {
    const raw = window.localStorage.getItem(SEED_STORAGE_KEY);
    if (!raw) return { count: 0, history: [] };
    const parsed = JSON.parse(raw) as Partial<SeedSnapshot>;
    const count = typeof parsed.count === "number" ? parsed.count : 0;
    const history = Array.isArray(parsed.history) ? parsed.history.slice(0, 32) : [];
    return { count, history };
  } catch {
    return { count: 0, history: [] };
  }
}

function persistSeedSnapshot(snapshot: SeedSnapshot) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SEED_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore quota / private mode failures
  }
}

function buildBattleStore() {
  return create<BattleState>((set, get) => {
  const defaultEnemy = weatherEnemies[DEFAULT_ENEMY_INDEX];
  const defaultWeapon = weapons[DEFAULT_WEAPON_INDEX];
  const seedSnapshot = loadSeedSnapshot();

  return {
    status: "ready",
    selectedEnemyId: defaultEnemy.id,
    selectedWeaponId: defaultWeapon.id,
    selectedCharacterId: DEFAULT_CHARACTER_ID,
    selectedStageId: stages[0].id,
    selectedDifficulty: DEFAULT_DIFFICULTY,
    playerMaxHp: PLAYER_MAX_HP,
    isPointerLocked: false,
    mouseSensitivity: 1,
    fov: 58,
    cameraMode: "fps",
    crosshairColor: "#ffffff",
    locationEnabled: false,
    currentWeatherEnemyId: null,
    currentWeatherCode: null,
    enemyHp: enemyMaxHpFor(defaultEnemy, defaultEnemy.difficulty),
    enemyMaxHp: enemyMaxHpFor(defaultEnemy, defaultEnemy.difficulty),
    ...baseLoadout(defaultWeapon, defaultEnemy.difficulty),
    ...seedFields(seedSnapshot),
    selectEnemy: (id) => {
      const target = findEnemy(id);
      const weapon = findWeapon(get().selectedWeaponId);
      const difficulty = get().selectedDifficulty;
      const maxHp = enemyMaxHpFor(target, difficulty);
      set({
        selectedEnemyId: id,
        status: "ready",
        ...baseLoadout(weapon, difficulty),
        enemyHp: maxHp,
        enemyMaxHp: maxHp,
      });
    },
    selectWeapon: (id) => {
      const weapon = findWeapon(id);
      const target = findEnemy(get().selectedEnemyId);
      const difficulty = get().selectedDifficulty;
      const maxHp = enemyMaxHpFor(target, difficulty);
      set({
        selectedWeaponId: id,
        status: "ready",
        ...baseLoadout(weapon, difficulty),
        enemyHp: maxHp,
        enemyMaxHp: maxHp,
      });
    },
    selectCharacter: (id) => {
      set({ selectedCharacterId: id });
    },
    selectStage: (id) => {
      set({ selectedStageId: id });
    },
    setDifficulty: (value) => {
      const weapon = findWeapon(get().selectedWeaponId);
      const target = findEnemy(get().selectedEnemyId);
      const maxHp = enemyMaxHpFor(target, value);
      set({
        selectedDifficulty: value,
        status: "ready",
        ...baseLoadout(weapon, value),
        enemyHp: maxHp,
        enemyMaxHp: maxHp,
      });
    },
    sfxEnabled: true,
    bgmEnabled: false,
    masterVolume: 0.55,
    setMouseSensitivity: (value) => set({ mouseSensitivity: value }),
    setFov: (value) => set({ fov: value }),
    setCameraMode: (value) => set({ cameraMode: value }),
    setCrosshairColor: (value) => set({ crosshairColor: value }),
    setSfxEnabled: (value) => set({ sfxEnabled: value }),
    setBgmEnabled: (value) => set({ bgmEnabled: value }),
    setMasterVolume: (value) => set({ masterVolume: Math.max(0, Math.min(1, value)) }),
    setLocationEnabled: (value) => set({ locationEnabled: value }),
    setCurrentWeather: (enemyId, code) => set({ currentWeatherEnemyId: enemyId, currentWeatherCode: code }),
    start: () => {
      const weapon = findWeapon(get().selectedWeaponId);
      const target = findEnemy(get().selectedEnemyId);
      const difficulty = get().selectedDifficulty;
      const maxHp = enemyMaxHpFor(target, difficulty);
      set({
        status: "battle",
        ...baseLoadout(weapon, difficulty),
        enemyHp: maxHp,
        enemyMaxHp: maxHp,
      });
    },
    reset: () => {
      const weapon = findWeapon(get().selectedWeaponId);
      const target = findEnemy(get().selectedEnemyId);
      const difficulty = get().selectedDifficulty;
      const maxHp = enemyMaxHpFor(target, difficulty);
      set({
        status: "ready",
        ...baseLoadout(weapon, difficulty),
        enemyHp: maxHp,
        enemyMaxHp: maxHp,
        // 戦闘間で持ち越すと VFX や警告リングが新バトル冒頭に残ってしまう。
        // 視覚 state はすべて 0 に戻す。
        lightningMarkers: [],
        enemyChargeStartedAt: 0,
        enemyChargeFiresAt: 0,
        lastShotAt: 0,
        lastShotHit: false,
        lastShotHitAt: 0,
        lastShotBlockedAt: 0,
        lastEnemyImpactAt: 0,
        lastEnemyImpactStatus: "none" as const,
        lastSkillAt: 0,
        lastDefeatAt: 0,
        lastReloadCompleteAt: 0,
        lastStaggerAt: 0,
        staggerUntil: 0,
        staggerThresholdsHit: [] as number[],
      });
    },
    shoot: (didHit, critical = false) => {
      const state = get();
      const now = performance.now();
      const weapon = findWeapon(state.selectedWeaponId);
      const isMelee = weapon.id === "windBlade";
      if (state.status !== "battle" || (!isMelee && state.ammo <= 0) || now < state.reloadingUntil) {
        return;
      }
      const character = findCharacter(state.selectedCharacterId);
      const patch = applyShot({
        didHit,
        critical,
        weapon,
        character,
        enemyId: state.selectedEnemyId,
        state: {
          enemyHp: state.enemyHp,
          pressureGauge: state.pressureGauge,
          enemyBarrierUntil: state.enemyBarrierUntil,
          combo: state.combo,
          comboBest: state.comboBest,
          lastComboAt: state.lastComboAt,
        },
        now,
      });
      // Boss takes reduced damage while minions are alive. Stacks
      // multiplicatively so 3 minions ≈ 22% damage reduction at 0.92.
      const minionDmgMul = state.minions.length > 0
        ? Math.pow(findMinionType(state.minions[0].typeId).bossDamageReceivedMul, state.minions.length)
        : 1;
      const adjustedDamage = patch.damage * minionDmgMul;
      const adjustedEnemyHp = Math.max(state.enemyHp - adjustedDamage, 0);
      const becomesClear = adjustedEnemyHp === 0 && state.enemyHp > 0;
      const staggerPatch = nextStaggerPatch(
        state.enemyHp,
        adjustedEnemyHp,
        state.enemyMaxHp,
        state.staggerThresholdsHit,
        now,
      );
      const prevRatio = state.enemyHp / Math.max(state.enemyMaxHp, 1);
      const nextRatio = adjustedEnemyHp / Math.max(state.enemyMaxHp, 1);
      const minionPatch = spawnMinionsForRatio(
        state.selectedEnemyId,
        prevRatio,
        nextRatio,
        state.minionThresholdsSpawned,
        state.minions,
        state.selectedDifficulty,
        now,
      );
      set({
        ammo: isMelee ? state.ammo : state.ammo - 1,
        shotsFired: state.shotsFired + 1,
        shotsHit: state.shotsHit + (didHit ? 1 : 0),
        enemyHp: adjustedEnemyHp,
        pressureGauge: patch.pressureGauge,
        status: adjustedEnemyHp === 0 ? "clear" : state.status,
        lastShotAt: now,
        lastShotHit: didHit,
        lastShotCritical: patch.effectiveCritical,
        lastShotDamage: adjustedDamage,
        lastBlockedAt: patch.blocked ? now : state.lastBlockedAt,
        lastDefeatAt: becomesClear ? Date.now() : state.lastDefeatAt,
        combo: patch.combo,
        comboBest: patch.comboBest,
        lastComboAt: patch.lastComboAt,
        // 撃破時、PlayerController の useFrame は早期 return するので
        // marker / チャージは消化されない。撃破タイミングで明示的に空に。
        ...(becomesClear
          ? { lightningMarkers: [], enemyChargeStartedAt: 0, enemyChargeFiresAt: 0 }
          : {}),
        ...(staggerPatch ?? {}),
        ...(minionPatch
          ? {
              minions: minionPatch.minions,
              minionThresholdsSpawned: minionPatch.thresholds,
              ...(minionPatch.additionsCount > 0 ? { lastMinionSpawnAt: now } : {}),
            }
          : {}),
      });
      // Reload is now mandatory — the player must explicitly press R or
      // right-click. Empty mag → bumps lastEmptyClickAt elsewhere to fire
      // the warning HUD instead.
    },
    fireSlashProjectile: (didHit, critical = false) => {
      // Mid-range crescent for windBlade right click. Same applyShot math
      // as `shoot` (so damage / gauge / combo / minion patch all behave
      // consistently), but writes to lastSlashProjectile* fields so:
      //   - PlayerView's blade swing doesn't fire (it watches lastShotAt)
      //   - SlashTrails (close-range carve line) doesn't fire either
      //   - SlashProjectiles can spawn the flying blade independently
      const state = get();
      const now = performance.now();
      const weapon = findWeapon(state.selectedWeaponId);
      if (state.status !== "battle" || weapon.id !== "windBlade") {
        return;
      }
      const character = findCharacter(state.selectedCharacterId);
      const patch = applyShot({
        didHit,
        critical,
        weapon,
        character,
        enemyId: state.selectedEnemyId,
        state: {
          enemyHp: state.enemyHp,
          pressureGauge: state.pressureGauge,
          enemyBarrierUntil: state.enemyBarrierUntil,
          combo: state.combo,
          comboBest: state.comboBest,
          lastComboAt: state.lastComboAt,
        },
        now,
      });
      const minionDmgMul = state.minions.length > 0
        ? Math.pow(findMinionType(state.minions[0].typeId).bossDamageReceivedMul, state.minions.length)
        : 1;
      // Ranged crescent trades safety (no need to close to melee) for raw
      // output — quarter damage of a close-range slash.
      const adjustedDamage = patch.damage * 0.25 * minionDmgMul;
      const adjustedEnemyHp = Math.max(state.enemyHp - adjustedDamage, 0);
      const becomesClear = adjustedEnemyHp === 0 && state.enemyHp > 0;
      const staggerPatch = nextStaggerPatch(
        state.enemyHp,
        adjustedEnemyHp,
        state.enemyMaxHp,
        state.staggerThresholdsHit,
        now,
      );
      const prevRatio = state.enemyHp / Math.max(state.enemyMaxHp, 1);
      const nextRatio = adjustedEnemyHp / Math.max(state.enemyMaxHp, 1);
      const minionPatch = spawnMinionsForRatio(
        state.selectedEnemyId,
        prevRatio,
        nextRatio,
        state.minionThresholdsSpawned,
        state.minions,
        state.selectedDifficulty,
        now,
      );
      set({
        shotsFired: state.shotsFired + 1,
        shotsHit: state.shotsHit + (didHit ? 1 : 0),
        enemyHp: adjustedEnemyHp,
        pressureGauge: patch.pressureGauge,
        status: adjustedEnemyHp === 0 ? "clear" : state.status,
        lastSlashProjectileAt: now,
        lastSlashProjectileHit: didHit,
        lastSlashProjectileCritical: patch.effectiveCritical,
        lastShotDamage: adjustedDamage,
        lastBlockedAt: patch.blocked ? now : state.lastBlockedAt,
        lastDefeatAt: becomesClear ? Date.now() : state.lastDefeatAt,
        combo: patch.combo,
        comboBest: patch.comboBest,
        lastComboAt: patch.lastComboAt,
        // 撃破時に marker / チャージを明示クリア（コメントは shoot path 同じ理由）。
        ...(becomesClear
          ? { lightningMarkers: [], enemyChargeStartedAt: 0, enemyChargeFiresAt: 0 }
          : {}),
        ...(staggerPatch ?? {}),
        ...(minionPatch
          ? {
              minions: minionPatch.minions,
              minionThresholdsSpawned: minionPatch.thresholds,
              ...(minionPatch.additionsCount > 0 ? { lastMinionSpawnAt: now } : {}),
            }
          : {}),
      });
    },
    reload: () => {
      const state = get();
      const now = performance.now();
      if (state.status !== "battle" || now < state.reloadingUntil) {
        return;
      }
      const weapon = findWeapon(state.selectedWeaponId);
      if (weapon.id === "windBlade") {
        return;
      }
      if (state.ammo >= weapon.maxAmmo) {
        return;
      }
      const reloadMs = computeReloadMs(weapon);
      set({ reloadingStartedAt: now, reloadingUntil: now + reloadMs });
      window.setTimeout(() => {
        const s = useBattleStore.getState();
        if (s.status !== "battle") {
          return;
        }
        const w = findWeapon(s.selectedWeaponId);
        useBattleStore.setState({
          ammo: w.maxAmmo,
          reloadingUntil: 0,
          reloadingStartedAt: 0,
          lastReloadCompleteAt: performance.now(),
        });
      }, reloadMs);
    },
    takeDamageTick: () => {
      const state = get();
      if (state.status !== "battle" || !state.isPointerLocked) {
        return;
      }
      const enemy = findEnemy(state.selectedEnemyId);
      const character = findCharacter(state.selectedCharacterId);
      const diffMod = difficultyModifiers[state.selectedDifficulty];
      const damage = computeIncomingDamage(
        enemy.threat * ENEMY_TICK_DAMAGE_BASE * diffMod.attackDamage,
        state.decoyUntil,
        character.damageTakenMultiplier,
        state.shieldActive,
        state.shieldEnergy,
      );
      const nextShieldEnergy = shieldAfterBlock(state.shieldActive, state.shieldEnergy);
      const nextHp = Math.max(state.playerHp - damage, 0);
      set({
        playerHp: nextHp,
        shieldEnergy: nextShieldEnergy,
        shieldActive: nextShieldEnergy > 0 ? state.shieldActive : false,
        damageTaken: state.damageTaken + damage,
        lastShieldBlockAt: nextShieldEnergy !== state.shieldEnergy ? performance.now() : state.lastShieldBlockAt,
        status: nextHp === 0 ? "defeat" : state.status,
      });
    },
    takeMarkerDamage: (amount) => {
      const state = get();
      if (state.status !== "battle") {
        return;
      }
      const character = findCharacter(state.selectedCharacterId);
      const damage = computeIncomingDamage(amount, state.decoyUntil, character.damageTakenMultiplier, state.shieldActive, state.shieldEnergy);
      const nextShieldEnergy = shieldAfterBlock(state.shieldActive, state.shieldEnergy);
      const nextHp = Math.max(state.playerHp - damage, 0);
      set({
        playerHp: nextHp,
        shieldEnergy: nextShieldEnergy,
        shieldActive: nextShieldEnergy > 0 ? state.shieldActive : false,
        damageTaken: state.damageTaken + damage,
        lastShieldBlockAt: nextShieldEnergy !== state.shieldEnergy ? performance.now() : state.lastShieldBlockAt,
        status: nextHp === 0 ? "defeat" : state.status,
      });
    },
    tick: () => {
      const state = get();
      if (state.status !== "battle" || !state.isPointerLocked) {
        return;
      }
      const nextShieldEnergy = state.shieldActive
        ? state.shieldEnergy
        : Math.min(100, state.shieldEnergy + SHIELD_REGEN_PER_SECOND);
      // While minions are screening for it, the boss recovers ~0.5% maxHp per
      // minion per second. Pressures the player to clear minions instead of
      // ignoring them. Cap at maxHp.
      const minionRegen = state.minions.length * state.enemyMaxHp * 0.005;
      const nextEnemyHp = state.minions.length > 0 && state.enemyHp > 0
        ? Math.min(state.enemyMaxHp, state.enemyHp + minionRegen)
        : state.enemyHp;
      set({
        elapsedSeconds: state.elapsedSeconds + 1,
        shieldEnergy: nextShieldEnergy,
        enemyHp: nextEnemyHp,
      });
    },
    triggerSkill: () => {
      const state = get();
      if (state.status !== "battle" || state.pressureGauge < 100) {
        return;
      }
      // Skip-rule: do not chain a new skill on top of an in-flight one.
      // Stops the rare double-press that would queue overlapping bursts.
      if (state.skillAnimation !== null) {
        return;
      }
      const weapon = findWeapon(state.selectedWeaponId);
      const character = findCharacter(state.selectedCharacterId);
      const specialty = weapon.specialtyAgainst.includes(state.selectedEnemyId)
        ? weapon.specialtyMultiplier
        : 1;
      const minionDmgMul = state.minions.length > 0
        ? Math.pow(findMinionType(state.minions[0].typeId).bossDamageReceivedMul, state.minions.length)
        : 1;
      const burst = Math.floor(
        state.enemyMaxHp * weapon.skillBurstRatio * specialty * character.damageMultiplier * minionDmgMul,
      );
      const totalSteps = Math.max(1, weapon.skillBurstShots);
      const damagePerStep = Math.floor(burst / totalSteps);
      const now = performance.now();
      // Per-weapon pacing: keep the whole burst around 600–900ms so the
      // player gets a snappy "watch it land" beat rather than a long wait.
      // windBlade is the slowest because each slash has follow-through;
      // light rapid-fire guns (clearSkyGun, stormwallRifle) tighten up.
      const stepIntervalMs = weapon.id === "windBlade"
        ? 130
        : weapon.id === "weatherGun"
          ? 70
          : weapon.id === "clearSkyGun" || weapon.id === "stormwallRifle"
            ? 90
            : 110;
      // Pressure gauge consumed and shots banked up front. HP is still
      // intact at this point — the per-step damage applies in
      // `advanceSkillStep` so the HP bar drops in time with the visuals.
      set({
        pressureGauge: 0,
        shotsFired: state.shotsFired + weapon.skillBurstShots,
        shotsHit: state.shotsHit + weapon.skillBurstShots,
        // FovController と PlayerController の contact-block 判定は
        // performance.now() を基準に減衰させるので、ここも performance.now()
        // で揃える（Date.now() を入れると差分が桁違いになり FOV が破綻する）。
        lastSkillAt: now,
        skillAnimation: {
          id: now,
          kind: weapon.id === "windBlade" ? "slash" : "ranged",
          weaponId: weapon.id,
          startedAt: now,
          stepIntervalMs,
          totalSteps,
          completedSteps: 0,
          damagePerStep,
          totalDamage: burst,
          enemyMaxHpAtCast: state.enemyMaxHp,
        },
      });
    },
    advanceSkillStep: () => {
      const state = get();
      const anim = state.skillAnimation;
      if (anim === null || state.status !== "battle") {
        return;
      }
      const stepIndex = anim.completedSteps;
      // Final step absorbs the integer-rounding remainder so the total
      // matches what triggerSkill computed.
      const isFinal = stepIndex >= anim.totalSteps - 1;
      const stepDamage = isFinal
        ? anim.totalDamage - anim.damagePerStep * (anim.totalSteps - 1)
        : anim.damagePerStep;
      const nextEnemyHp = Math.max(0, state.enemyHp - stepDamage);
      const becomesClear = nextEnemyHp === 0 && state.enemyHp > 0;
      const now = performance.now();
      const staggerPatch = nextStaggerPatch(
        state.enemyHp,
        nextEnemyHp,
        state.enemyMaxHp,
        state.staggerThresholdsHit,
        now,
      );
      const prevRatio = state.enemyHp / Math.max(state.enemyMaxHp, 1);
      const nextRatio = nextEnemyHp / Math.max(state.enemyMaxHp, 1);
      const minionPatch = spawnMinionsForRatio(
        state.selectedEnemyId,
        prevRatio,
        nextRatio,
        state.minionThresholdsSpawned,
        state.minions,
        state.selectedDifficulty,
        now,
      );
      const completedSteps = stepIndex + 1;
      const finished = completedSteps >= anim.totalSteps;
      set({
        enemyHp: nextEnemyHp,
        status: nextEnemyHp === 0 ? "clear" : state.status,
        lastDefeatAt: becomesClear ? Date.now() : state.lastDefeatAt,
        // Drive existing per-shot reactions (muzzle flash, recoil, blade
        // slash variant cycle, BulletTrails tracer) by bumping lastShotAt
        // on every step. BulletTrails and PlayerWeapon already branch on
        // selectedWeaponId so slash uses the swing animation and ranged
        // uses the tracer + flash without further changes here.
        lastShotAt: now,
        lastShotHit: true,
        lastShotCritical: false,
        lastShotDamage: stepDamage,
        skillAnimation: finished
          ? null
          : { ...anim, completedSteps },
        // 撃破時に marker / チャージを明示クリア（同上）。
        ...(becomesClear
          ? { lightningMarkers: [], enemyChargeStartedAt: 0, enemyChargeFiresAt: 0 }
          : {}),
        ...(staggerPatch ?? {}),
        ...(minionPatch
          ? {
              minions: minionPatch.minions,
              minionThresholdsSpawned: minionPatch.thresholds,
              ...(minionPatch.additionsCount > 0 ? { lastMinionSpawnAt: now } : {}),
            }
          : {}),
      });
    },
    useItem: (id) => {
      const state = get();
      if (state.status !== "battle") {
        return;
      }
      const stock = state.itemStocks[id];
      if (stock <= 0) {
        return;
      }
      const updated = { ...state.itemStocks, [id]: stock - 1 };
      const baseUpdate = {
        itemStocks: updated,
        lastItemAt: Date.now(),
        lastItemId: id,
      };
      if (id === "clearTonic") {
        set({
          ...baseUpdate,
          playerHp: Math.min(state.playerHp + HEAL_AMOUNT, state.playerMaxHp),
        });
      } else if (id === "lightningRod") {
        set({ ...baseUpdate, lightningMarkers: [] });
      } else if (id === "decoyUmbrella") {
        set({ ...baseUpdate, decoyUntil: Date.now() + DECOY_DURATION_MS });
      } else if (id === "pressureStabilizer") {
        set({
          ...baseUpdate,
          pressureGauge: Math.min(state.pressureGauge + STABILIZER_GAUGE_GAIN, 100),
        });
      }
    },
    spawnLightning: (marker) => {
      const state = get();
      if (state.status !== "battle") {
        return;
      }
      set({ lightningMarkers: [...state.lightningMarkers, marker] });
    },
    removeLightning: (id) => {
      const state = get();
      set({ lightningMarkers: state.lightningMarkers.filter((m) => m.id !== id) });
    },
    shiftMarkerTimes: (deltaMs) => {
      const state = get();
      set({
        lightningMarkers: state.lightningMarkers.map((marker) => ({
          ...marker,
          spawnAt: marker.spawnAt + deltaMs,
          triggersAt: marker.triggersAt + deltaMs,
        })),
      });
    },
    setPointerLocked: (locked) => set({ isPointerLocked: locked }),
    setShieldActive: (active) => {
      const state = get();
      set({ shieldActive: active && state.status === "battle" && state.shieldEnergy > 0 });
    },
    raiseEnemyBarrier: (durationMs) => {
      const state = get();
      if (state.status !== "battle") {
        return;
      }
      const now = performance.now();
      set({ enemyBarrierUntil: now + durationMs, lastEnemyBarrierAt: now });
    },
    applyKnockback: (vx, vz) => {
      const state = get();
      set({
        knockbackVx: state.knockbackVx + vx,
        knockbackVz: state.knockbackVz + vz,
        lastKnockbackAt: performance.now(),
      });
    },
    consumeKnockback: () => {
      const state = get();
      const result = { vx: state.knockbackVx, vz: state.knockbackVz };
      // Decay 92% per call (caller is per-frame)
      set({ knockbackVx: state.knockbackVx * 0.86, knockbackVz: state.knockbackVz * 0.86 });
      return result;
    },
    beginEnemyCharge: (firesAt) => {
      const state = get();
      if (state.status !== "battle") {
        return;
      }
      set({ enemyChargeStartedAt: performance.now(), enemyChargeFiresAt: firesAt });
    },
    damageMinion: (id, amount) => {
      const state = get();
      const minion = state.minions.find((m) => m.id === id);
      if (!minion) return false;
      const nextHp = Math.max(0, minion.hp - amount);
      const dead = nextHp === 0;
      const minions = dead
        ? state.minions.filter((m) => m.id !== id)
        : state.minions.map((m) => (m.id === id ? { ...m, hp: nextHp } : m));
      set({
        minions,
        lastMinionDefeatAt: dead ? performance.now() : state.lastMinionDefeatAt,
      });
      return dead;
    },
    shootMinion: (minionId) => {
      // Mirrors the bookkeeping side of `shoot` — ammo, accuracy stats, audio
      // cue — but routes damage to a minion instead of the boss. Keeps the
      // raycast-side code simple ("who got hit?") and lets shoot() stay
      // boss-only.
      const state = get();
      if (state.status !== "battle") return;
      const now = performance.now();
      const weapon = findWeapon(state.selectedWeaponId);
      const isMelee = weapon.id === "windBlade";
      if ((!isMelee && state.ammo <= 0) || now < state.reloadingUntil) return;
      const character = findCharacter(state.selectedCharacterId);
      const damage = weapon.damage * character.damageMultiplier;
      const minion = state.minions.find((m) => m.id === minionId);
      if (!minion) return;
      const nextHp = Math.max(0, minion.hp - damage);
      const dead = nextHp === 0;
      const minions = dead
        ? state.minions.filter((m) => m.id !== minionId)
        : state.minions.map((m) => (m.id === minionId ? { ...m, hp: nextHp } : m));
      set({
        ammo: isMelee ? state.ammo : state.ammo - 1,
        shotsFired: state.shotsFired + 1,
        shotsHit: state.shotsHit + 1,
        minions,
        lastMinionDefeatAt: dead ? now : state.lastMinionDefeatAt,
        lastShotAt: now,
        lastShotHit: true,
        lastShotCritical: false,
        lastShotDamage: damage,
      });
    },
    recordMinionAttack: (id, now) => {
      const state = get();
      const minions = state.minions.map((m) =>
        m.id === id ? { ...m, lastAttackAt: now } : m,
      );
      set({ minions });
    },
    recordClear: ({ enemyId, difficulty, rank }) => {
      const state = get();
      const nextCount = state.seedCount + Math.max(1, difficulty);
      const nextHistory = [
        { enemyId, difficulty, rank, at: Date.now() },
        ...state.seedHistory,
      ].slice(0, 32);
      set({ seedCount: nextCount, seedHistory: nextHistory });
      persistSeedSnapshot({ count: nextCount, history: nextHistory });
    },
  };
  });
}

// Vite HMR cascades whenever this module changes, which would otherwise
// invalidate the store identity — components that called `subscribe()` on
// the previous store keep listening to a dead reference, so SFX, bullet
// trails, and other reactive features go silent until a hard reload.
// Stash the store on `import.meta.hot.data` so it survives module
// re-evaluation. Action / shape changes still require a hard reload.
type BattleStore = ReturnType<typeof buildBattleStore>;
let store: BattleStore;
if (import.meta.hot) {
  const hotData = import.meta.hot.data as { battleStore?: BattleStore };
  store = hotData.battleStore ?? buildBattleStore();
  hotData.battleStore = store;
  import.meta.hot.accept();
} else {
  store = buildBattleStore();
}
export const useBattleStore = store;

export { findStage };
