import { useState } from "react";
import { BattleScene } from "../scenes/BattleScene";
import { CharacterGridScene } from "../scenes/CharacterGridScene";
import { EnemyGridScene } from "../scenes/EnemyGridScene";
import { HomeScene } from "../scenes/HomeScene";
import { PilotScene, StageScene, WeaponScene } from "../scenes/LoadoutScene";
import { ResultScene } from "../scenes/ResultScene";
import { SettingsScene } from "../scenes/SettingsScene";
import { StoryScene } from "../scenes/StoryScene";
import { WeaponPreviewScene } from "../scenes/WeaponPreviewScene";
import { AudioBridge } from "../features/audio/AudioBridge";
import { DebugOverlay } from "../features/debug/DebugOverlay";
import { useBattleStore } from "../game/battleStore";
import type { AppView, LoadoutTab, WeatherEnemyId } from "../game/types";

function readPreviewFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return params.get("preview");
}

export function App() {
  const [view, setView] = useState<AppView>("home");
  const previewMode = readPreviewFromUrl();
  if (previewMode === "weapon") {
    return (
      <>
        <WeaponPreviewScene />
        <AudioBridge />
        <DebugOverlay />
      </>
    );
  }

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
        onBack={returnToHome}
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
  } else if (view === "characterGrid") {
    scene = <CharacterGridScene onBack={() => setView("home")} />;
  } else if (view === "story") {
    scene = <StoryScene onBack={() => setView("home")} />;
  } else {
    scene = (
      <HomeScene
        onStart={() => setView("battle")}
        onOpenEnemyGrid={() => setView("enemyGrid")}
        onOpenLoadout={openLoadout}
        onOpenSettings={() => setView("settings")}
        onOpenCharacterGrid={() => setView("characterGrid")}
        onOpenStory={() => setView("story")}
      />
    );
  }

  return (
    <>
      {scene}
      <AudioBridge />
      <DebugOverlay />
    </>
  );
}
