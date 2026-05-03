export type WeatherEnemyId =
  | "cloudy"
  | "heavyRain"
  | "thunderstorm"
  | "tornado"
  | "rainySeason"
  | "blizzard"
  | "typhoon";

export type AppView = "home" | "battle" | "enemyGrid" | "weapon" | "pilot" | "stage" | "settings" | "result";

export type LoadoutTab = "weapon" | "character" | "stage";

export type BattleCameraMode = "fps" | "tps";

export type BattleStatus = "ready" | "battle" | "clear" | "defeat";

export type WeaponId =
  | "weatherGun"
  | "clearSkyGun"
  | "rainySeasonKiller"
  | "stormwallRifle"
  | "frostlance";

export type ItemId = "clearTonic" | "decoyUmbrella" | "lightningRod" | "pressureStabilizer";

export type CharacterId = "iris" | "halo" | "raika";

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
  accentColor: string;
  description: string;
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
