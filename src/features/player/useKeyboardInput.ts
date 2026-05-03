import { useEffect, useRef } from "react";

export function useKeyboardInput(onKeyPress?: (key: string) => void) {
  const heldKeys = useRef(new Set<string>());
  const onKeyPressRef = useRef(onKeyPress);
  onKeyPressRef.current = onKeyPress;

  useEffect(() => {
    const onDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (event.repeat) {
        return;
      }
      heldKeys.current.add(key);
      onKeyPressRef.current?.(key);
    };
    const onUp = (event: KeyboardEvent) => {
      heldKeys.current.delete(event.key.toLowerCase());
    };
    const clearAll = () => {
      heldKeys.current.clear();
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", clearAll);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", clearAll);
    };
  }, []);

  return heldKeys;
}
