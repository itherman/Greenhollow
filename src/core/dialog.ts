export type DialogChoice = {
  id: string;
  text: string;
  next: string;
};

export type DialogNode =
  | { id: string; kind: "line"; text: string; next?: string }
  | { id: string; kind: "choice"; text: string; choices: DialogChoice[] }
  | { id: string; kind: "end"; text?: string };

export type DialogScript = {
  id: string;
  start: string;
  nodes: Record<string, DialogNode>;
};

export type DialogState =
  | { open: false }
  | { open: true; scriptId: string; nodeId: string };

export function validateScript(script: DialogScript): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const startNode = script.nodes[script.start];
  if (!startNode) errors.push("missing_start_node");

  for (const [id, node] of Object.entries(script.nodes)) {
    if (id !== node.id) errors.push(`node_key_mismatch_${id}`);
    if (node.kind === "line" && node.next && !script.nodes[node.next]) errors.push(`missing_next_${id}`);
    if (node.kind === "choice") {
      if (!node.choices.length) errors.push(`empty_choices_${id}`);
      for (const ch of node.choices) {
        if (!script.nodes[ch.next]) errors.push(`missing_choice_next_${id}_${ch.id}`);
      }
    }
  }

  return errors.length ? { ok: false, errors } : { ok: true };
}

export function openDialog(script: DialogScript): DialogState {
  return { open: true, scriptId: script.id, nodeId: script.start };
}

export function closeDialog(): DialogState {
  return { open: false };
}

export function getNode(script: DialogScript, state: DialogState): DialogNode | null {
  if (!state.open) return null;
  if (state.scriptId !== script.id) return null;
  return script.nodes[state.nodeId] ?? null;
}

export function advanceLine(script: DialogScript, state: DialogState): DialogState {
  const node = getNode(script, state);
  if (!node || node.kind !== "line") return state;
  if (!node.next) return { open: false };
  return { open: true, scriptId: script.id, nodeId: node.next };
}

export function choose(script: DialogScript, state: DialogState, choiceId: string): DialogState {
  const node = getNode(script, state);
  if (!node || node.kind !== "choice") return state;
  const choice = node.choices.find((c) => c.id === choiceId);
  if (!choice) return state;
  return { open: true, scriptId: script.id, nodeId: choice.next };
}


