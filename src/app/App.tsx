import { useState } from "react";
import { BattleScene } from "../scenes/BattleScene";
import { EnemyGridScene } from "../scenes/EnemyGridScene";
import { HomeScene } from "../scenes/HomeScene";
import { PilotScene, StageScene, WeaponScene } from "../scenes/LoadoutScene";
import { ResultScene } from "../scenes/ResultScene";
import { SettingsScene } from "../scenes/SettingsScene";
import { AudioBridge } from "../features/audio/AudioBridge";
import { AudioToggle } from "../features/audio/AudioToggle";
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

  let scene;
  if (view === "enemyGrid") {
    scene = (
      <EnemyGridScene
        onBack={() => setView("home")}
        onSelectEnemy={selectEnemyAndBattle}
      />
    );
  } else if (view === "battle") {
    scene = (
      <BattleScene
        onBack={() => setView("home")}
        onOpenEnemyGrid={() => setView("enemyGrid")}
        onShowResult={() => setView("result")}
      />
    );
  } else if (view === "weapon") {
    scene = <WeaponScene onBack={() => setView("home")} />;
  } else if (view === "pilot") {
    scene = <PilotScene onBack={() => setView("home")} />;
  } else if (view === "stage") {
    scene = <StageScene onBack={() => setView("home")} />;
  } else if (view === "settings") {
    scene = <SettingsScene onBack={() => setView("home")} />;
  } else if (view === "result") {
    scene = <ResultScene onRetry={retryBattle} onHome={returnToHome} />;
  } else {
    scene = (
      <HomeScene
        onStart={() => setView("battle")}
        onOpenEnemyGrid={() => setView("enemyGrid")}
        onOpenLoadout={openLoadout}
        onOpenSettings={() => setView("settings")}
      />
    );
  }

  return (
    <>
      {scene}
      <AudioBridge />
      <AudioToggle />
    </>
  );
}
