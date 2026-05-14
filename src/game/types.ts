export type WeatherEnemyId =
  | "cloudy"
  | "heavyRain"
  | "thunderstorm"
  | "tornado"
  | "rainySeason"
  | "blizzard"
  | "typhoon";

export type AppView = "home" | "battle" | "enemyGrid" | "characterGrid" | "story" | "weapon" | "pilot" | "stage" | "settings" | "result";

export type LoadoutTab = "weapon" | "character" | "stage";

export type BattleCameraMode = "fps" | "tps";

export type BattleStatus = "ready" | "battle" | "clear" | "defeat";

export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

export type WeaponId =
  | "weatherGun"
  | "clearSkyGun"
  | "rainySeasonKiller"
  | "stormwallRifle"
  | "frostlance"
  | "windBlade";

export type ItemId = "clearTonic" | "decoyUmbrella" | "lightningRod" | "pressureStabilizer";

export type CharacterId = "noa" | "saka" | "metappi";

export type StageId = "lab" | "ruins" | "highland";

export type RankLetter = "S" | "A" | "B" | "C" | "D";

export type WeatherEnemy = {
  id: WeatherEnemyId;
  index: string;
  name: string;
  maxHp: number;
  color: string;
  accentColor: string;
  coreColor: string;
  icon: string;
  trait: string;
  threat: number;
  difficulty: DifficultyLevel;
  description: string;
  playableInMvp: boolean;
};

export type Weapon = {
  id: WeaponId;
  name: string;
  damage: number;
  maxAmmo: number;
  fireRateMs: number;
  skillName: string;
  skillDescription: string;
  skillBurstRatio: number;
  skillBurstShots: number;
  description: string;
  specialtyAgainst: WeatherEnemyId[];
  specialtyMultiplier: number;
};

export type Item = {
  id: ItemId;
  slotKey: string;
  name: string;
  effect: string;
  description: string;
  initialStock: number;
};

export type Character = {
  id: CharacterId;
  codename: string;
  callSign: string;
  role: string;
  passiveName: string;
  passiveDescription: string;
  damageMultiplier: number;
  damageTakenMultiplier: number;
  gaugeGainMultiplier: number;
  /** Walk / dash speed multiplier applied to the player's base move speed. */
  moveSpeedMultiplier: number;
  accentColor: string;
  description: string;
  flavor: string;
};

export type Stage = {
  id: StageId;
  name: string;
  description: string;
  ambientColor: string;
  groundColor: string;
  ringColor: string;
  fogColor: string;
  skyTurbidity: number;
  skyRayleigh: number;
  buildingColor: string;
  buildingEmissive: string;
  arena: {
    x: number;
    zFront: number;
    zBack: number;
  };
};

export type MinionTypeId = "stratus";

// Reusable minion shape: visuals are inherited from `baseEnemyId` so we can
// later swap the model just by changing one field, and stats/attack pattern
// live in MinionType so a new minion species (e.g. icyShard) only requires
// adding a config entry — no engine changes.
export type MinionType = {
  id: MinionTypeId;
  baseEnemyId: WeatherEnemyId;
  maxHp: number;
  attackIntervalMs: number;
  attackWarningMs: number;
  attackDamage: number;
  attackRadius: number;
  scale: number;
  // Vertical hover band relative to its assigned position.
  hoverY: number;
  hoverAmp: number;
  // Boss debuff while at least one minion is alive.
  bossDamageReceivedMul: number;
  bossAttackIntervalMul: number;
  bossStandoffBonus: number;
};

export type BossMinionConfig = {
  type: MinionTypeId;
  // HP ratios at which a fresh minion spawns. Each ratio fires once per battle.
  spawnAtRatios: number[];
  // Cap on simultaneous minions per difficulty level (1..5). Levels with cap 0
  // skip the system entirely.
  maxByDifficulty: Record<DifficultyLevel, number>;
  // Cap on total summon events per battle, also per-difficulty. Lets a low
  // difficulty fire only the first 1-2 of `spawnAtRatios` even if more
  // thresholds get crossed later.
  maxTotalSpawnsByDifficulty: Record<DifficultyLevel, number>;
};

export type Minion = {
  id: number;
  typeId: MinionTypeId;
  hp: number;
  maxHp: number;
  spawnedAt: number;
  // Slot offset around the boss. Used by the renderer to place the minion in
  // a stable triangle/arc rather than randomly each frame.
  slot: number;
  lastAttackAt: number;
};

export type BattleResult = {
  enemyId: WeatherEnemyId;
  weaponId: WeaponId;
  characterId: CharacterId;
  stageId: StageId;
  cleared: boolean;
  elapsedSeconds: number;
  shotsFired: number;
  shotsHit: number;
  damageTaken: number;
  playerMaxHp: number;
  score: number;
  rank: RankLetter;
};
