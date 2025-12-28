export type TilePos = { x: number; y: number };
export type TileRect = { x: number; y: number; w: number; h: number };

export type ExitGate = {
  blockedExitId: string | null;
  blockedRect: TileRect | null;
};

export function createExitGate(): ExitGate {
  return { blockedExitId: null, blockedRect: null };
}

export function isTileInsideRect(pos: TilePos, rect: TileRect): boolean {
  return pos.x >= rect.x && pos.x < rect.x + rect.w && pos.y >= rect.y && pos.y < rect.y + rect.h;
}

export function blockExit(exitId: string, rect: TileRect): ExitGate {
  return { blockedExitId: exitId, blockedRect: rect };
}

export function isExitBlocked(gate: ExitGate, exitId: string, playerTile: TilePos): boolean {
  if (!gate.blockedExitId || !gate.blockedRect) return false;
  if (gate.blockedExitId !== exitId) return false;
  return isTileInsideRect(playerTile, gate.blockedRect);
}

export function clearExitBlockIfLeft(gate: ExitGate, playerTile: TilePos): ExitGate {
  if (!gate.blockedRect) return gate;
  if (isTileInsideRect(playerTile, gate.blockedRect)) return gate;
  return createExitGate();
}


