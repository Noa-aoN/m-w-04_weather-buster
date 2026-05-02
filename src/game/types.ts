export type WeatherEnemyId =
  | "cloudy"
  | "heavyRain"
  | "thunderstorm"
  | "tornado"
  | "rainySeason"
  | "blizzard"
  | "typhoon";

export type AppView = "home" | "battle" | "enemyGrid";

export type BattleStatus = "ready" | "battle" | "clear";

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
  name: string;
  damage: number;
  maxAmmo: number;
  skillName: string;
};
