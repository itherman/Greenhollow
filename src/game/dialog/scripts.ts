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

export const homeowner1Advice: DialogScript = {
  id: "homeowner1Advice",
  start: "a",
  nodes: {
    a: { id: "a", kind: "line", text: "Mind the flowers. I planted those.", next: "b" },
    b: {
      id: "b",
      kind: "choice",
      text: "Need advice?",
      choices: [
        { id: "combat", text: "How do I survive out there?", next: "c" },
        { id: "loot", text: "Anything worth collecting?", next: "d" },
        { id: "bye", text: "Thanks.", next: "end" },
      ],
    },
    c: { id: "c", kind: "line", text: "Keep moving. Strike, step back, strike again.", next: "b" },
    d: { id: "d", kind: "line", text: "Hearts mend you. Coins buy you better tools.", next: "b" },
    end: { id: "end", kind: "end", text: "Stay sharp." },
  },
};

export const homeowner2Advice: DialogScript = {
  id: "homeowner2Advice",
  start: "a",
  nodes: {
    a: { id: "a", kind: "line", text: "The woods whisper at night.", next: "b" },
    b: {
      id: "b",
      kind: "choice",
      text: "What do you want to know?",
      choices: [
        { id: "path", text: "Where should I go?", next: "c" },
        { id: "bow", text: "Any ranged tips?", next: "d" },
        { id: "bye", text: "I'll be going.", next: "end" },
      ],
    },
    c: { id: "c", kind: "line", text: "Follow the dirt path. It keeps you out of trouble.", next: "b" },
    d: { id: "d", kind: "line", text: "If you find a bow, count your arrows. Shots vanish fast.", next: "b" },
    end: { id: "end", kind: "end", text: "Good luck." },
  },
};

export const homeowner3Advice: DialogScript = {
  id: "homeowner3Advice",
  start: "a",
  nodes: {
    a: { id: "a", kind: "line", text: "Careful—slimes take a few hits to put down.", next: "b" },
    b: {
      id: "b",
      kind: "choice",
      text: "Want a tip?",
      choices: [
        { id: "spacing", text: "How do I fight safely?", next: "c" },
        { id: "gear", text: "What gear should I get?", next: "d" },
        { id: "bye", text: "That's enough.", next: "end" },
      ],
    },
    c: { id: "c", kind: "line", text: "Don't get surrounded. Pull one foe at a time.", next: "b" },
    d: { id: "d", kind: "line", text: "A sturdier blade helps. Food helps too, if you can spare coins.", next: "b" },
    end: { id: "end", kind: "end", text: "Stay alive." },
  },
};

export const homeowner4Advice: DialogScript = {
  id: "homeowner4Advice",
  start: "a",
  nodes: {
    a: { id: "a", kind: "line", text: "You look like you could use a rest.", next: "b" },
    b: {
      id: "b",
      kind: "choice",
      text: "Need guidance?",
      choices: [
        { id: "hearts", text: "How do hearts work?", next: "c" },
        { id: "coins", text: "What about coins?", next: "d" },
        { id: "bye", text: "I'll be off.", next: "end" },
      ],
    },
    c: { id: "c", kind: "line", text: "Hearts heal you when you pick them up. Don't ignore them.", next: "b" },
    d: { id: "d", kind: "line", text: "Coins pile up. Spend them on weapons, armor, and food when you find a shop.", next: "b" },
    end: { id: "end", kind: "end", text: "Take care." },
  },
};

export const shopkeeper: DialogScript = {
  id: "shopkeeper",
  start: "menu",
  nodes: {
    menu: {
      id: "menu",
      kind: "choice",
      text: "Welcome. What are you buying?",
      choices: [
        { id: "buy_dagger", text: "Dagger (40c)", next: "confirm" },
        { id: "buy_sword", text: "Sword (60c)", next: "confirm" },
        { id: "buy_longsword", text: "Longsword (120c)", next: "confirm" },
        { id: "buy_spear", text: "Spear (90c)", next: "confirm" },
        { id: "buy_arrows", text: "Arrows x25 (15c)", next: "confirm" },
        { id: "buy_bread", text: "Bread (12c)", next: "confirm" },
        { id: "buy_stew", text: "Stew (30c)", next: "confirm" },
        { id: "buy_leather_armor", text: "Leather Armor (80c)", next: "confirm" },
        { id: "buy_iron_armor", text: "Iron Armor (160c)", next: "confirm" },
        { id: "bye", text: "Nothing. Bye.", next: "end" },
      ],
    },
    confirm: {
      id: "confirm",
      kind: "choice",
      text: "Confirm purchase?",
      choices: [
        { id: "confirm_yes", text: "Yes, buy it.", next: "menu" },
        { id: "confirm_no", text: "No, back to the list.", next: "menu" },
      ],
    },
    buyOk: { id: "buyOk", kind: "line", text: "A fine choice.", next: "menu" },
    buyNoCoins: { id: "buyNoCoins", kind: "line", text: "You don't have enough coins.", next: "menu" },
    buyNoSpace: { id: "buyNoSpace", kind: "line", text: "Your pouch is full.", next: "menu" },
    end: { id: "end", kind: "end", text: "Come back anytime." },
  },
};

export const buyerNpc: DialogScript = {
  id: "buyerNpc",
  start: "menu",
  nodes: {
    menu: {
      id: "menu",
      kind: "choice",
      text: "Selling something?",
      choices: [
        { id: "sell", text: "Sell an item", next: "waitPick" },
        { id: "bye", text: "Nothing right now.", next: "end" },
      ],
    },
    waitPick: { id: "waitPick", kind: "line", text: "Open your pouch and pick an item to sell.", next: "menu" },
    offer: {
      id: "offer",
      kind: "choice",
      text: "I can make you an offer.",
      choices: [
        { id: "offer_accept", text: "Take the coins", next: "sold" },
        { id: "offer_pick", text: "Show me another item", next: "waitPick" },
        { id: "bye", text: "Maybe later.", next: "end" },
      ],
    },
    noValue: { id: "noValue", kind: "line", text: "I can't offer anything for that.", next: "menu" },
    sold: { id: "sold", kind: "line", text: "Pleasure doing business.", next: "menu" },
    end: { id: "end", kind: "end", text: "I'll be here." },
  },
};

export const rareShopkeeper: DialogScript = {
  id: "rareShopkeeper",
  start: "menu",
  nodes: {
    menu: {
      id: "menu",
      kind: "choice",
      text: "Only the finest wares. What calls to you?",
      choices: [
        { id: "buy_mythril_helm", text: "Mythril Helm (260c)", next: "confirm" },
        { id: "buy_mythril_leggings", text: "Mythril Leggings (320c)", next: "confirm" },
        { id: "buy_mythril_armor", text: "Mythril Armor (420c)", next: "confirm" },
        { id: "bye", text: "Nothing right now.", next: "end" },
      ],
    },
    confirm: {
      id: "confirm",
      kind: "choice",
      text: "Commit to the purchase?",
      choices: [
        { id: "confirm_yes", text: "Yes, make it mine.", next: "menu" },
        { id: "confirm_no", text: "No, back to the list.", next: "menu" },
      ],
    },
    buyOk: { id: "buyOk", kind: "line", text: "Spend well. These are rare.", next: "menu" },
    buyNoCoins: { id: "buyNoCoins", kind: "line", text: "Save up—quality costs coin.", next: "menu" },
    buyNoSpace: { id: "buyNoSpace", kind: "line", text: "You have no room to stow that.", next: "menu" },
    end: { id: "end", kind: "end", text: "I'll keep them safe." },
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

export const trollDoorLocked: DialogScript = {
  id: "trollDoorLocked",
  start: "a",
  nodes: {
    a: { id: "a", kind: "end", text: "Locked tight. The troll's key should open it." },
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

export const trollWarning: DialogScript = {
  id: "trollWarning",
  start: "a",
  nodes: {
    a: {
      id: "a",
      kind: "line",
      text: "The bridge trembles... a powerful troll is close!",
      next: "b",
    },
    b: { id: "b", kind: "end", text: "Find cover and be ready." },
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

export const riverSailor: DialogScript = {
  id: "riverSailor",
  start: "menu",
  nodes: {
    menu: {
      id: "menu",
      kind: "choice",
      text: "Hop aboard. Where are we headed?",
      choices: [
        { id: "sail_river_village", text: "River Village (rare market)", next: "end" },
        { id: "sail_shadow_forest", text: "Shadowed Wilds (dangerous)", next: "end" },
        { id: "sail_troll_bridge", text: "Back to the troll bridge", next: "end" },
        { id: "stay", text: "I'll stay here.", next: "end" },
      ],
    },
    end: { id: "end", kind: "end", text: "The boat rocks softly." },
  },
};

export function getDialogScript(scriptId: string): DialogScript | null {
  switch (scriptId) {
    case "elderIntro":
      return elderIntro;
    case "villagerGossip":
      return villagerGossip;
    case "homeowner1Advice":
      return homeowner1Advice;
    case "homeowner2Advice":
      return homeowner2Advice;
    case "homeowner3Advice":
      return homeowner3Advice;
    case "homeowner4Advice":
      return homeowner4Advice;
    case "shopkeeper":
      return shopkeeper;
    case "rareShopkeeper":
      return rareShopkeeper;
    case "buyerNpc":
      return buyerNpc;
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
    case "trollDoorLocked":
      return trollDoorLocked;
    case "swordFound":
      return swordFound;
    case "swordTaken":
      return swordTaken;
    case "bowFound":
      return bowFound;
    case "riverSailor":
      return riverSailor;
    default:
      return null;
  }
}
