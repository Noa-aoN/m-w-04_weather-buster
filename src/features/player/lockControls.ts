let lockTarget: HTMLCanvasElement | null = null;

export function setLockTarget(canvas: HTMLCanvasElement | null) {
  lockTarget = canvas;
}

export function requestPointerLock() {
  lockTarget?.requestPointerLock();
}
