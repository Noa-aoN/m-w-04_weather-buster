import { useState } from "react";
import { BattleScene } from "../scenes/BattleScene";
import { EnemyGridScene } from "../scenes/EnemyGridScene";
import { HomeScene } from "../scenes/HomeScene";
import { mvpEnemies } from "../game/data";
import type { AppView, WeatherEnemyId } from "../game/types";

export function App() {
  const [view, setView] = useState<AppView>("home");
  const [selectedEnemyId, setSelectedEnemyId] = useState<WeatherEnemyId>(mvpEnemies[2].id);

  if (view === "enemyGrid") {
    return (
      <EnemyGridScene
        selectedEnemyId={selectedEnemyId}
        onBack={() => setView("home")}
        onSelectEnemy={(enemyId) => {
          setSelectedEnemyId(enemyId);
          setView("battle");
        }}
      />
    );
  }

  if (view === "battle") {
    return (
      <BattleScene
        selectedEnemyId={selectedEnemyId}
        onBack={() => setView("home")}
        onOpenEnemyGrid={() => setView("enemyGrid")}
      />
    );
  }

  return (
    <HomeScene
      selectedEnemyId={selectedEnemyId}
      onStart={() => setView("battle")}
      onOpenEnemyGrid={() => setView("enemyGrid")}
    />
  );
}
