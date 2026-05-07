import { useEffect, useRef } from "react";
import { useBattleStore } from "../../game/battleStore";
import {
  loadSamples,
  playClear,
  playDefeat,
  playEnemyStagger,
  playHit,
  playItem,
  playMarkerImpact,
  playMarkerSpawn,
  playBlocked,
  playEnemyChargeFire,
  playEnemyChargeStart,
  playLowAmmoBeep,
  playMiss,
  playReload,
  playSlash,
  playMinionSummon,
  playShoot,
  playShieldBlock,
  playSkill,
  playStaggerBreak,
  playUiClick,
  playUiPico,
  setBgmEnabled,
  setBgmScene,
  setMasterVolume,
  setSfxEnabled,
  startBgm,
  stopBgm,
} from "./audio";

export function AudioBridge() {
  const sfxEnabled = useBattleStore((state) => state.sfxEnabled);
  const bgmEnabled = useBattleStore((state) => state.bgmEnabled);
  const masterVolume = useBattleStore((state) => state.masterVolume);
  const startedBgmRef = useRef(false);

  useEffect(() => {
    setSfxEnabled(sfxEnabled);
  }, [sfxEnabled]);

  useEffect(() => {
    setMasterVolume(masterVolume);
  }, [masterVolume]);

  useEffect(() => {
    if (!startedBgmRef.current) {
      return;
    }
    if (bgmEnabled) {
      setBgmEnabled(true);
      startBgm();
    } else {
      stopBgm();
      setBgmEnabled(false);
    }
  }, [bgmEnabled]);

  useEffect(() => {
    function onUiClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const interactive = target.closest("button, [role='radio'], [role='switch']");
      if (!interactive) {
        return;
      }
      if (interactive instanceof HTMLButtonElement && interactive.disabled) {
        return;
      }
      if (interactive.getAttribute("aria-disabled") === "true") {
        return;
      }
      if (interactive.closest("[data-no-ui-sound]")) {
        return;
      }
      // Two-class mapping (current setup):
      //   pico  : primary CTAs (`.primaryMenuButton`, dialog confirms)
      //   click : everything else
      if (interactive.classList.contains("primaryMenuButton")) {
        playUiPico();
        return;
      }
      playUiClick();
    }
    window.addEventListener("click", onUiClick, true);
    return () => window.removeEventListener("click", onUiClick, true);
  }, []);

  useEffect(() => {
    const onInteract = () => {
      if (startedBgmRef.current) {
        return;
      }
      startedBgmRef.current = true;
      const state = useBattleStore.getState();
      setSfxEnabled(state.sfxEnabled);
      setMasterVolume(state.masterVolume);
      setBgmEnabled(state.bgmEnabled);
      void loadSamples();
      if (state.bgmEnabled) {
        startBgm();
      }
    };
    window.addEventListener("pointerdown", onInteract, { once: true });
    window.addEventListener("keydown", onInteract, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onInteract);
      window.removeEventListener("keydown", onInteract);
    };
  }, []);

  useEffect(() => {
    let prev = useBattleStore.getState();
    return useBattleStore.subscribe((state) => {
      if (state.lastShotAt !== prev.lastShotAt && state.lastShotAt !== 0) {
        if (state.selectedWeaponId === "windBlade") {
          playSlash();
        } else {
          playShoot();
        }
        if (state.lastShotHit) {
          playHit(state.lastShotCritical);
          playEnemyStagger(state.lastShotCritical);
        } else {
          playMiss();
        }
        if (state.ammo === 5 && prev.ammo > 5) {
          playLowAmmoBeep();
        }
      }
      if (state.reloadingStartedAt !== prev.reloadingStartedAt && state.reloadingStartedAt !== 0) {
        playReload();
      }
      if (state.lastBlockedAt !== prev.lastBlockedAt && state.lastBlockedAt !== 0) {
        playBlocked();
      }
      if (state.enemyChargeStartedAt !== prev.enemyChargeStartedAt && state.enemyChargeStartedAt !== 0) {
        playEnemyChargeStart();
      }
      if (state.lastSpecialFiredAt !== prev.lastSpecialFiredAt && state.lastSpecialFiredAt !== 0) {
        playEnemyChargeFire();
      }
      if (state.lastShieldBlockAt !== prev.lastShieldBlockAt && state.lastShieldBlockAt !== 0) {
        playShieldBlock();
      }
      if (state.lastSkillAt !== prev.lastSkillAt && state.lastSkillAt !== 0) {
        playSkill();
      }
      if (state.lastStaggerAt !== prev.lastStaggerAt && state.lastStaggerAt !== 0) {
        playStaggerBreak();
      }
      if (state.lastMinionDefeatAt !== prev.lastMinionDefeatAt && state.lastMinionDefeatAt !== 0) {
        playEnemyStagger(true);
      }
      if (state.lastMinionSpawnAt !== prev.lastMinionSpawnAt && state.lastMinionSpawnAt !== 0) {
        playMinionSummon();
      }
      if (state.lastItemAt !== prev.lastItemAt && state.lastItemAt !== 0) {
        playItem();
      }
      const prevIds = new Set(prev.lightningMarkers.map((marker) => marker.id));
      const currIds = new Set(state.lightningMarkers.map((marker) => marker.id));
      let added = 0;
      let removed = 0;
      for (const id of currIds) {
        if (!prevIds.has(id)) added += 1;
      }
      for (const id of prevIds) {
        if (!currIds.has(id)) removed += 1;
      }
      // Marker SFX only while a battle is actually running. Without this guard
      // the bulk-clear of markers triggered by reset() (clear / defeat /
      // home-return) would fire playMarkerImpact and play a loud explosion
      // sound on the way back to the title.
      if (state.status === "battle") {
        if (added > 0) playMarkerSpawn();
        if (removed > 0) playMarkerImpact();
      }
      if (state.status !== prev.status) {
        if (state.status === "battle") {
          setBgmScene("battle");
        } else if (state.status === "clear") {
          playClear();
          setBgmScene("victory");
        } else if (state.status === "defeat") {
          playDefeat();
          setBgmScene("defeat");
        } else if (state.status === "ready") {
          setBgmScene("title");
        }
      }
      prev = state;
    });
  }, []);

  return null;
}
