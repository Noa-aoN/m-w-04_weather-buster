import { useEffect } from "react";
import { useBattleStore } from "../../game/battleStore";

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 10v4h3l4 3V7L6 10H3z" fill="currentColor" />
      {muted ? (
        <path d="M14 9l5 6M14 15l5-6" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      ) : (
        <>
          <path d="M14 8.5c1.6 1 1.6 6 0 7" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <path d="M16.5 7c2.6 1.6 2.6 8.4 0 10" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

function NoteIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M9 6v9.2A3.2 3.2 0 1 0 11 18V8h6V5L9 6z"
        fill="currentColor"
      />
      {muted ? (
        <path d="M3 4l18 16" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      ) : null}
    </svg>
  );
}

export function AudioToggle() {
  const sfxEnabled = useBattleStore((state) => state.sfxEnabled);
  const bgmEnabled = useBattleStore((state) => state.bgmEnabled);
  const masterVolume = useBattleStore((state) => state.masterVolume);
  const setSfxEnabled = useBattleStore((state) => state.setSfxEnabled);
  const setBgmEnabled = useBattleStore((state) => state.setBgmEnabled);
  const setMasterVolume = useBattleStore((state) => state.setMasterVolume);

  useEffect(() => {
    function handler(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement && event.target.tagName === "INPUT") {
        return;
      }
      if (event.key === "m" || event.key === "M") {
        const next = !(useBattleStore.getState().sfxEnabled || useBattleStore.getState().bgmEnabled);
        useBattleStore.getState().setSfxEnabled(next);
        useBattleStore.getState().setBgmEnabled(next);
      } else if (event.key === ",") {
        useBattleStore.getState().setMasterVolume(useBattleStore.getState().masterVolume - 0.1);
      } else if (event.key === ".") {
        useBattleStore.getState().setMasterVolume(useBattleStore.getState().masterVolume + 0.1);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="audioToggle" role="group" aria-label="音響設定">
      <button
        type="button"
        className={`audioChip ${sfxEnabled ? "on" : ""}`}
        aria-pressed={sfxEnabled}
        title="効果音 (M でまとめてミュート)"
        onClick={() => setSfxEnabled(!sfxEnabled)}
      >
        <SpeakerIcon muted={!sfxEnabled} />
        <span>SFX</span>
      </button>
      <button
        type="button"
        className={`audioChip ${bgmEnabled ? "on" : ""}`}
        aria-pressed={bgmEnabled}
        title="BGM"
        onClick={() => setBgmEnabled(!bgmEnabled)}
      >
        <NoteIcon muted={!bgmEnabled} />
        <span>BGM</span>
      </button>
      <input
        type="range"
        className="audioVolume"
        min={0}
        max={1}
        step={0.05}
        value={masterVolume}
        aria-label="マスターボリューム"
        title="マスターボリューム ( . で +0.1 / , で -0.1 )"
        onChange={(event) => setMasterVolume(Number.parseFloat(event.target.value))}
      />
    </div>
  );
}
