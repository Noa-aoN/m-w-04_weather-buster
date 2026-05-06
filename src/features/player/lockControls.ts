let lockTarget: HTMLCanvasElement | null = null;

export function setLockTarget(canvas: HTMLCanvasElement | null) {
  lockTarget = canvas;
}

export function requestPointerLock() {
  if (!lockTarget || !lockTarget.isConnected) {
    return;
  }
  lockTarget.requestPointerLock()?.catch(() => {
    // Pointer lock can be rejected if the battle canvas was replaced during
    // Suspense/loading or the call was not triggered by a fresh user gesture.
  });
}
