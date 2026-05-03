import { useState } from "react";
import { BattleScene } from "../scenes/BattleScene";
import { EnemyGridScene } from "../scenes/EnemyGridScene";
import { HomeScene } from "../scenes/HomeScene";
import { PilotScene, StageScene, WeaponScene } from "../scenes/LoadoutScene";
import { ResultScene } from "../scenes/ResultScene";
import { SettingsScene } from "../scenes/SettingsScene";
import { useBattleStore } from "../game/battleStore";
import type { AppView, LoadoutTab, WeatherEnemyId } from "../game/types";

export function App() {
  const [view, setView] = useState<AppView>("home");

  function selectEnemyAndBattle(enemyId: WeatherEnemyId) {
    useBattleStore.getState().selectEnemy(enemyId);
    setView("battle");
  }

  function returnToHome() {
    useBattleStore.getState().reset();
    setView("home");
  }

  function retryBattle() {
    useBattleStore.getState().reset();
    setView("battle");
  }

  function openLoadout(tab: LoadoutTab = "weapon") {
    setView(tab === "character" ? "pilot" : tab);
  }

  if (view === "enemyGrid") {
    return (
      <EnemyGridScene
        onBack={() => setView("home")}
        onSelectEnemy={selectEnemyAndBattle}
      />
    );
  }

  if (view === "battle") {
    return (
      <BattleScene
        onBack={() => setView("home")}
        onOpenEnemyGrid={() => setView("enemyGrid")}
        onShowResult={() => setView("result")}
      />
    );
  }

  if (view === "weapon") {
    return <WeaponScene onBack={() => setView("home")} />;
  }

  if (view === "pilot") {
    return <PilotScene onBack={() => setView("home")} />;
  }

  if (view === "stage") {
    return <StageScene onBack={() => setView("home")} />;
  }

  if (view === "settings") {
    return <SettingsScene onBack={() => setView("home")} />;
  }

  if (view === "result") {
    return <ResultScene onRetry={retryBattle} onHome={returnToHome} />;
  }

  return (
    <HomeScene
      onStart={() => setView("battle")}
      onOpenEnemyGrid={() => setView("enemyGrid")}
      onOpenLoadout={openLoadout}
      onOpenSettings={() => setView("settings")}
    />
  );
}
