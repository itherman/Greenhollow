import { shouldShowMobileControls } from "./mobileControlsVisibility";

export function shouldShowAttackButton(params: {
  screenW: number;
  screenH: number;
  hasTouch: boolean;
  enemyNearby: boolean;
  hasSword: boolean;
}): boolean {
  const { screenW, screenH, hasTouch, enemyNearby, hasSword } = params;
  if (!hasSword) return false;
  if (!enemyNearby) return false;
  return shouldShowMobileControls({ screenW, screenH, hasTouch });
}


