import { useEffect, useState } from "react";
import { findCharacter, findStage, findWeapon, weatherEnemies } from "../../game/data";
import { useBattleStore } from "../../game/battleStore";
import { calculateSunnyScore } from "../../game/score";

function useIsStaggered(staggerUntil: number) {
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    if (now >= staggerUntil) return;
    const id = window.setInterval(() => setNow(performance.now()), 100);
    return () => window.clearInterval(id);
  }, [staggerUntil, now]);
  return now < staggerUntil;
}
import { BattleHudLayer, BattleMenuLayer } from "./components/BattleHudLayers";
import { BattleEffectsOverlay } from "./components/BattleEffectsOverlay";
import {
  ClearMenu,
  CountdownOverlay,
  DefeatMenu,
  PauseMenu,
  ReadyMenu,
} from "./components/BattleMenuPanels";
import {
  BossStatusBar,
  MissionPanel,
  PlayerStatusPanel,
  RadarPanel,
  ScorePanel,
  SkillStatusPanel,
  WeaponStatusPanel,
} from "./components/BattleStatusPanels";
import { useBattleMenuControls } from "./useBattleMenuControls";

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function BattleHud({
  onBack,
  onShowResult,
}: {
  onBack: () => void;
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
  const staggerUntil = useBattleStore((state) => state.staggerUntil);
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
  const isStaggered = useIsStaggered(staggerUntil);
  const score = calculateSunnyScore({
    enemyMaxHp,
    remainingEnemyHp: enemyHp,
    shotsFired,
    shotsHit,
  });

  const { countdown, handleResume, handleStart, primaryActionRef } = useBattleMenuControls({
    isPointerLocked,
    onBack,
    onShowResult,
    start,
    status,
  });

  return (
    <div className={`battleHud ${status === "battle" && isPointerLocked ? "battleHud--engaged" : ""}`}>
      <BattleHudLayer>
        <PlayerStatusPanel
          characterCodename={character.codename}
          decoyActive={decoyActive}
          playerHp={playerHp}
          playerHpRatio={playerHpRatio}
          playerMaxHp={playerMaxHp}
          pressureGauge={pressureGauge}
          shieldActive={shieldActive}
          shieldEnergy={shieldEnergy}
        />

        <BossStatusBar
          enemyName={enemy.name}
          hpRatio={enemyHpRatio}
          staggered={isStaggered && status === "battle"}
        />

        <ScorePanel elapsedLabel={formatTime(elapsedSeconds)} score={score} />

        <MissionPanel
          enemyName={enemy.name}
          isClear={status === "clear"}
          passiveName={character.passiveName}
          stageName={stage.name}
        />

        <RadarPanel enemyTrait={enemy.trait} stageName={stage.name} />

        <WeaponStatusPanel
          detail={isMelee ? "直接攻撃のみ" : `命中率 ${accuracy}%`}
          isEmpty={!isMelee && ammo === 0}
          isLow={!isMelee && ammo > 0 && ammo <= 5}
          value={isMelee ? "近接 / 無制限" : `${ammo} / ${weapon.maxAmmo}`}
          weaponName={weapon.name}
        />

        <SkillStatusPanel
          description={weapon.skillDescription}
          gauge={pressureGauge}
          ready={pressureGauge >= 100}
          skillName={weapon.skillName}
        />
      </BattleHudLayer>

      <BattleEffectsOverlay
        crosshairColor={crosshairColor}
        enemyAccentColor={enemy.accentColor}
        enemyName={enemy.name}
        enemyThreat={enemy.threat}
        enemyTrait={enemy.trait}
        pressureGauge={pressureGauge}
        status={status}
        weaponSkillName={weapon.skillName}
      />

      <BattleMenuLayer>
        {countdown !== null ? (
          <CountdownOverlay value={countdown} />
        ) : null}

        {status === "ready" && countdown === null ? (
          <ReadyMenu
            characterCodename={character.codename}
            enemyName={enemy.name}
            onBack={onBack}
            onStart={handleStart}
            primaryActionRef={primaryActionRef}
            stageName={stage.name}
          />
        ) : null}

        {status === "battle" && !isPointerLocked ? (
          <PauseMenu onBack={onBack} onResume={handleResume} primaryActionRef={primaryActionRef} />
        ) : null}

        {status === "clear" ? (
          <ClearMenu onBack={onBack} onShowResult={onShowResult} primaryActionRef={primaryActionRef} />
        ) : null}

        {status === "defeat" ? (
          <DefeatMenu onBack={onBack} onShowResult={onShowResult} primaryActionRef={primaryActionRef} />
        ) : null}
      </BattleMenuLayer>
    </div>
  );
}
