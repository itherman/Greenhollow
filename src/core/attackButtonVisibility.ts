import { shouldShowMobileControls } from "./mobileControlsVisibility";

export function shouldShowAttackButton(params: {
  screenW: number;
  screenH: number;
  hasTouch: boolean;
  enemyNearby: boolean;
  hasWeapon: boolean;
}): boolean {
  const { screenW, screenH, hasTouch, enemyNearby, hasWeapon } = params;
  if (!hasWeapon) return false;
  if (!enemyNearby) return false;
  return shouldShowMobileControls({ screenW, screenH, hasTouch });
}


