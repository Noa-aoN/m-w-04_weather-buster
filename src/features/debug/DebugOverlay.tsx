import { useEffect, useState } from "react";
import { useBattleStore } from "../../game/battleStore";
import { isDebugEnabled, readDebug, writeDebug, type DebugSnapshot } from "./debugBus";

// Renders only when ?debug=motion is in the URL. Pulls per-frame data from the
// debug bus on a 10Hz timer (so the overlay itself doesn't drag the frame
// rate) plus reads selected fields directly from the battle store.
export function DebugOverlay() {
  const [snapshot, setSnapshot] = useState<DebugSnapshot>(() => readDebug());
  const reloadingUntil = useBattleStore((s) => s.reloadingUntil);
  const enemyBarrierUntil = useBattleStore((s) => s.enemyBarrierUntil);
  const knockbackVx = useBattleStore((s) => s.knockbackVx);
  const knockbackVz = useBattleStore((s) => s.knockbackVz);
  const combo = useBattleStore((s) => s.combo);
  const status = useBattleStore((s) => s.status);
  const isPointerLocked = useBattleStore((s) => s.isPointerLocked);
  const ammo = useBattleStore((s) => s.ammo);
  const playerHp = useBattleStore((s) => s.playerHp);
  const enemyHp = useBattleStore((s) => s.enemyHp);

  useEffect(() => {
    if (!isDebugEnabled()) {
      return;
    }
    const id = window.setInterval(() => {
      const now = performance.now();
      const reloadingFor = reloadingUntil > now ? (reloadingUntil - now) / 1000 : 0;
      const barrierFor = enemyBarrierUntil > now ? (enemyBarrierUntil - now) / 1000 : 0;
      const knockbackVel = Math.sqrt(knockbackVx * knockbackVx + knockbackVz * knockbackVz);
      writeDebug({ knockbackVel, reloadingFor, barrierFor, comboCount: combo });
      setSnapshot(readDebug());
    }, 100);
    return () => window.clearInterval(id);
  }, [reloadingUntil, enemyBarrierUntil, knockbackVx, knockbackVz, combo]);

  if (!isDebugEnabled()) {
    return null;
  }
  return (
    <div className="debugOverlay" aria-hidden="true">
      <header>
        <span className="debugLabel">DEBUG</span>
        <span>?debug=motion</span>
      </header>
      <table>
        <tbody>
          <tr><th>status</th><td>{status}</td></tr>
          <tr><th>locked</th><td>{isPointerLocked ? "true" : "false"}</td></tr>
          <tr><th>ai.phase</th><td>{snapshot.aiPhase}</td></tr>
          <tr><th>ai.phaseT</th><td>{snapshot.aiPhaseT.toFixed(2)}s</td></tr>
          <tr><th>enemy.dist</th><td>{snapshot.enemyDistance.toFixed(2)}</td></tr>
          <tr><th>enemy.posY</th><td>{snapshot.enemyPosY.toFixed(2)}</td></tr>
          <tr><th>flinch</th><td>{snapshot.hitFlinch.toFixed(2)}</td></tr>
          <tr><th>knockback</th><td>{snapshot.knockbackVel.toFixed(2)}</td></tr>
          <tr><th>reload</th><td>{snapshot.reloadingFor > 0 ? `${snapshot.reloadingFor.toFixed(2)}s` : "—"}</td></tr>
          <tr><th>barrier</th><td>{snapshot.barrierFor > 0 ? `${snapshot.barrierFor.toFixed(2)}s` : "—"}</td></tr>
          <tr><th>combo</th><td>{snapshot.comboCount}</td></tr>
          <tr><th>ammo</th><td>{ammo}</td></tr>
          <tr><th>player.hp</th><td>{Math.round(playerHp)}</td></tr>
          <tr><th>enemy.hp</th><td>{Math.round(enemyHp)}</td></tr>
          <tr><th>cam.fov</th><td>{snapshot.cameraFov.toFixed(2)}°</td></tr>
          <tr><th>shotPunch</th><td>{snapshot.shotPunch.toFixed(2)}</td></tr>
          <tr><th>skillPunch</th><td>{snapshot.skillPunch.toFixed(2)}</td></tr>
          <tr><th>lastSkillAt</th><td>{snapshot.lastSkillAt.toFixed(0)}</td></tr>
          <tr><th>sinceSkill</th><td>{snapshot.sinceSkill.toFixed(0)}ms</td></tr>
        </tbody>
      </table>
    </div>
  );
}
