export function isTapOnPlayer(params: {
  tapX: number;
  tapY: number;
  playerX: number;
  playerY: number;
  radiusPx: number;
}): boolean {
  const { tapX, tapY, playerX, playerY, radiusPx } = params;
  const dx = tapX - playerX;
  const dy = tapY - playerY;
  return dx * dx + dy * dy <= radiusPx * radiusPx;
}


