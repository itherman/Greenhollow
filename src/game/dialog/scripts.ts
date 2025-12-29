import type { DialogScript } from "../../core/dialog";

export const elderIntro: DialogScript = {
  id: "elderIntro",
  start: "n1",
  nodes: {
    n1: { id: "n1", kind: "line", text: "Hail, wanderer.", next: "n2" },
    n2: {
      id: "n2",
      kind: "choice",
      text: "What do you want to know?",
      choices: [
        { id: "where", text: "Where am I?", next: "n3" },
        { id: "woods", text: "Is it safe outside town?", next: "n4" },
        { id: "bye", text: "That's all.", next: "end" },
      ],
    },
    n3: { id: "n3", kind: "line", text: "Greenhollow. Small, stubborn, still standing.", next: "n2" },
    n4: {
      id: "n4",
      kind: "line",
      text: "The woods have teeth. Stay on the path, and keep your eyes open.",
      next: "n2",
    },
    end: { id: "end", kind: "end", text: "Good hunting." },
  },
};

export const villagerGossip: DialogScript = {
  id: "villagerGossip",
  start: "a",
  nodes: {
    a: { id: "a", kind: "line", text: "Oh—hey. You look new here.", next: "b" },
    b: {
      id: "b",
      kind: "choice",
      text: "What are you after?",
      choices: [
        { id: "beasts", text: "Any trouble around here?", next: "c" },
        { id: "cave", text: "Heard anything about a cave?", next: "d" },
        { id: "bye", text: "Nothing. Take care.", next: "end" },
      ],
    },
    c: { id: "c", kind: "line", text: "Slimes after rain. Goblins if you wander too far.", next: "b" },
    d: { id: "d", kind: "line", text: "Yeah. Past the trees. Cold air, bad sounds.", next: "b" },
    end: { id: "end", kind: "end", text: "Don't get yourself bitten." },
  },
};

export const chestMessage: DialogScript = {
  id: "chestMessage",
  start: "a",
  nodes: {
    a: { id: "a", kind: "line", text: "Inside: a pouch of coins.", next: "end" },
    end: { id: "end", kind: "end", text: "Score." },
  },
};

export const chestEmpty: DialogScript = {
  id: "chestEmpty",
  start: "a",
  nodes: {
    a: { id: "a", kind: "end", text: "Nothing left but dust." },
  },
};

export const keyFound: DialogScript = {
  id: "keyFound",
  start: "a",
  nodes: {
    a: { id: "a", kind: "end", text: "Rusty Key acquired." },
  },
};

export const doorLocked: DialogScript = {
  id: "doorLocked",
  start: "a",
  nodes: {
    a: { id: "a", kind: "end", text: "Locked. Needs a key." },
  },
};

export const swordFound: DialogScript = {
  id: "swordFound",
  start: "a",
  nodes: {
    a: { id: "a", kind: "end", text: "You take the sword." },
  },
};

export const swordTaken: DialogScript = {
  id: "swordTaken",
  start: "a",
  nodes: {
    a: { id: "a", kind: "end", text: "Nothing here now." },
  },
};

export const arrowsChest: DialogScript = {
  id: "arrowsChest",
  start: "a",
  nodes: {
    a: { id: "a", kind: "line", text: "You bundle up 25 arrows.", next: "end" },
    end: { id: "end", kind: "end", text: "Plenty of shots to practice." },
  },
};

export const bowFound: DialogScript = {
  id: "bowFound",
  start: "a",
  nodes: {
    a: { id: "a", kind: "line", text: "The goblin carried a bow. It's yours now.", next: "end" },
    end: { id: "end", kind: "end", text: "Aim true." },
  },
};

export function getDialogScript(scriptId: string): DialogScript | null {
  switch (scriptId) {
    case "elderIntro":
      return elderIntro;
    case "villagerGossip":
      return villagerGossip;
    case "chestMessage":
      return chestMessage;
    case "chestEmpty":
      return chestEmpty;
    case "arrowsChest":
      return arrowsChest;
    case "keyFound":
      return keyFound;
    case "doorLocked":
      return doorLocked;
    case "swordFound":
      return swordFound;
    case "swordTaken":
      return swordTaken;
    case "bowFound":
      return bowFound;
    default:
      return null;
  }
}


