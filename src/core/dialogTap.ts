import type { DialogNode } from "./dialog";

export type DialogTapAction = "advance" | "close" | "none";

/**
 * Decide what a tap on the dialog panel should do.
 * Kept pure + unit-tested so UX changes don't accidentally regress.
 */
export function computeDialogTapAction(node: DialogNode): DialogTapAction {
  if (node.kind === "line") return "advance";
  if (node.kind === "end") return "close";
  // Choice nodes should be handled by tapping a specific choice line.
  return "close";
}


