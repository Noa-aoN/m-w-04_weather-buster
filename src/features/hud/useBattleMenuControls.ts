import { useEffect, useRef, useState } from "react";
import { playCountdownGo, playCountdownTick } from "../audio/audio";
import { requestPointerLock } from "../player/lockControls";
import type { BattleStatus } from "../../game/types";
import type { CountdownStep } from "./components/BattleMenuPanels";

type UseBattleMenuControlsParams = {
  isPointerLocked: boolean;
  onBack: () => void;
  onShowResult: () => void;
  start: () => void;
  status: BattleStatus;
};

export function useBattleMenuControls({
  isPointerLocked,
  onBack,
  onShowResult,
  start,
  status,
}: UseBattleMenuControlsParams) {
  const [countdown, setCountdown] = useState<CountdownStep | null>(null);
  const countdownTimers = useRef<number[]>([]);
  const primaryActionRef = useRef<HTMLButtonElement | null>(null);
  const isMenuOpen = status === "ready" || (status === "battle" && !isPointerLocked) || status === "clear" || status === "defeat";

  function clearCountdownTimers() {
    countdownTimers.current.forEach((id) => window.clearTimeout(id));
    countdownTimers.current = [];
  }

  function handleStart() {
    if (countdown !== null) {
      return;
    }
    clearCountdownTimers();
    setCountdown("3");
    playCountdownTick();
    countdownTimers.current.push(
      window.setTimeout(() => {
        setCountdown("2");
        playCountdownTick();
      }, 700),
      window.setTimeout(() => {
        setCountdown("1");
        playCountdownTick();
      }, 1400),
      window.setTimeout(() => {
        setCountdown("GO");
        playCountdownGo();
      }, 2100),
      window.setTimeout(() => {
        setCountdown(null);
        start();
        requestPointerLock();
      }, 2700),
    );
  }

  function handleResume() {
    requestPointerLock();
  }

  useEffect(() => {
    return () => clearCountdownTimers();
  }, []);

  useEffect(() => {
    if (!isMenuOpen || countdown !== null) {
      return;
    }
    const timer = window.setTimeout(() => primaryActionRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [isMenuOpen, countdown]);

  useEffect(() => {
    if (status !== "battle" || isPointerLocked) {
      return;
    }
    const onClick = (event: MouseEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest("button, a")) {
        return;
      }
      requestPointerLock();
    };
    const timer = window.setTimeout(() => {
      window.addEventListener("click", onClick);
    }, 200);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("click", onClick);
    };
  }, [status, isPointerLocked]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement && (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA")) {
        return;
      }
      const key = event.key.toLowerCase();
      if (status === "ready") {
        if (key === "enter" || event.key === "Enter") {
          event.preventDefault();
          handleStart();
        } else if (key === "h") {
          event.preventDefault();
          onBack();
        }
      } else if (status === "battle" && !isPointerLocked) {
        if (key === "enter" || event.key === "Enter") {
          event.preventDefault();
          handleResume();
        } else if (key === "h") {
          event.preventDefault();
          onBack();
        }
      } else if (status === "clear" || status === "defeat") {
        if (key === "enter" || event.key === "Enter") {
          event.preventDefault();
          onShowResult();
        } else if (key === "h") {
          event.preventDefault();
          onBack();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [status, isPointerLocked, countdown, onBack, onShowResult]);

  return {
    countdown,
    handleResume,
    handleStart,
    primaryActionRef,
  };
}
