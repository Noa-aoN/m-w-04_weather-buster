export type WeatherEnemyId = "cloudy" | "heavyRain" | "thunderstorm";

export type BattleStatus = "ready" | "battle" | "clear";

export type WeatherEnemy = {
  id: WeatherEnemyId;
  name: string;
  maxHp: number;
  color: string;
  accentColor: string;
  description: string;
};

export type Weapon = {
  name: string;
  damage: number;
  skillName: string;
};
