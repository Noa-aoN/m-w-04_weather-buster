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
  playMiss,
  playShoot,
  playShieldBlock,
  playSkill,
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
        playShoot();
        if (state.lastShotHit) {
          playHit(state.lastShotCritical);
          playEnemyStagger(state.lastShotCritical);
        } else {
          playMiss();
        }
      }
      if (state.lastShieldBlockAt !== prev.lastShieldBlockAt && state.lastShieldBlockAt !== 0) {
        playShieldBlock();
      }
      if (state.lastSkillAt !== prev.lastSkillAt && state.lastSkillAt !== 0) {
        playSkill();
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
      if (added > 0) playMarkerSpawn();
      if (removed > 0) playMarkerImpact();
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
