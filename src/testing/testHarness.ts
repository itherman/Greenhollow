import type Phaser from "phaser";
import type { AreaId, EntryId } from "../core/areas";
import { getNode, choose } from "../core/dialog";
import { ITEMS, addItem, addItemsIfFit, getItemCount, removeItem } from "../core/inventory";
import { getDialogScript } from "../game/dialog/scripts";
import { hasFlag, setFlag } from "../services/game/flags";
import { loadInventory, saveInventory } from "../services/game/inventoryStore";
import { loadEquipment, saveEquipment } from "../services/game/equipmentStore";
import type { EquipmentState } from "../core/equipment";
import { tryShootWithAmmo } from "../core/rangedAttack";
import type { ItemId } from "../core/inventory";

export type TestHarnessState = {
  areaId?: string;
  player?: { x: number; y: number };
  dialog?: { open: boolean; scriptId?: string; nodeId?: string };
  townPresence?: { active: boolean; peerCount: number; spriteCount: number };
};

export type TestHarness = {
  version: string;
  getState: () => TestHarnessState | null;
  getDialogChoiceTexts: () => string[];
  chooseDialogChoice: (matchText: string) => boolean;
  getDialogHeaderText: () => string | null;
  getSessionUid: () => string | null;
  getTownChatButtonRect: () => { x: number; y: number; w: number; h: number } | null;
  getBoatAndSailorTiles: () => { boat?: { x: number; y: number; tileIndex?: number }; sailor?: { x: number; y: number; tileIndex?: number } } | null;
  worldToScreen: (world: { x: number; y: number }) => { x: number; y: number } | null;
  tileCenterToScreen: (tile: { x: number; y: number }) => { x: number; y: number } | null;
  teleportToTileCenter: (tile: { x: number; y: number }) => boolean;
  restartInArea: (opts: { areaId: AreaId; entry?: EntryId }) => boolean;
  interactWithChest: (tile: { x: number; y: number }) => boolean;
  openDialog: (scriptId: string) => boolean;
  openShopConfirm: (itemId: ItemId) => boolean;
  adjustShopQuantity: (delta: number) => boolean;
  grantCoins: (qty: number) => boolean;
  prepareBow: (arrows: number) => boolean;
  countPlayerArrows: () => number;
  getEquipment: () => EquipmentState | null;
  getInventoryCount: (itemId: ItemId) => number;
  getInventoryStacks: (itemId: ItemId) => number[];
  shootBowOnce: () => boolean;
  setTownPresencePeers: (peers: Array<{
    uid: string;
    username: string;
    x: number;
    y: number;
    facing: "up" | "down" | "left" | "right";
    updatedAtMs: number;
    heldItemId?: ItemId | null;
    headArmorItemId?: ItemId | null;
    bodyArmorItemId?: ItemId | null;
    legArmorItemId?: ItemId | null;
  }>) => boolean;
  openTownPlayerDialog: (peer: { uid: string; username: string }) => boolean;
  setTownChatMessages: (messages: Array<{ id: string; uid: string; username: string; text: string; createdAtMs: number }>) => boolean;
  getDialogChatLog: () => string | null;
  setTownTradeRequests: (requests: Array<{
    id: string;
    senderUid: string;
    senderName: string;
    recipientUid: string;
    recipientName: string;
    itemId: ItemId;
    qty: number;
    price: number;
    status: "pending" | "accepted" | "declined" | "cancelled";
    createdAtMs: number;
  }>) => boolean;
};

declare global {
  interface Window {
    __GREENHOLLOW_TEST_HOOKS__?: TestHarness;
  }
}

function getWorldScene(game: Phaser.Game) {
  const scene = game.scene.getScene("WorldScene") as
    | (Phaser.Scene & {
        area?: { id?: string };
        player?: { x: number; y: number };
        dialog?: { open: boolean; scriptId?: string; nodeId?: string };
      })
    | undefined;
  if (!scene) return null;
  // IMPORTANT:
  // In current Phaser, `scene.scene.isActive()` expects a scene key argument and can return `false`
  // when called with no args. Prefer the SceneManager check.
  const isActive =
    typeof (game.scene as any)?.isActive === "function"
      ? (game.scene as any).isActive("WorldScene")
      : typeof (scene as any)?.sys?.isActive === "function"
        ? (scene as any).sys.isActive()
        : !!(scene as any)?.sys?.settings?.active;
  if (!isActive) return null;
  return scene;
}

export function installTestHarness(game: Phaser.Game): void {
  if (typeof window === "undefined") return;

  const canvasToScreenRect = (rect: { x: number; y: number; width: number; height: number }) => {
    const canvas = game.canvas as HTMLCanvasElement | undefined;
    if (!canvas) return null;
    const bounds = canvas.getBoundingClientRect();
    const cw = canvas.width || 1;
    const ch = canvas.height || 1;
    const scaleX = bounds.width / cw;
    const scaleY = bounds.height / ch;
    return {
      x: bounds.left + rect.x * scaleX,
      y: bounds.top + rect.y * scaleY,
      w: rect.width * scaleX,
      h: rect.height * scaleY,
    };
  };

  const harness: TestHarness = {
    version: "0.1",
    getState: () => {
      const scene = getWorldScene(game);
      if (!scene) return null;
      const townPresenceActive =
        typeof (scene as any).isTownPresenceActive === "function" ? (scene as any).isTownPresenceActive() : false;
      const townPresencePeers =
        typeof (scene as any).getTownPresencePeers === "function" ? (scene as any).getTownPresencePeers() : [];
      const townPresenceSprites =
        typeof (scene as any).getTownPresenceSpriteCount === "function" ? (scene as any).getTownPresenceSpriteCount() : 0;
      return {
        areaId: scene.area?.id,
        player: scene.player ? { x: scene.player.x, y: scene.player.y } : undefined,
        dialog: scene.dialog,
        townPresence: { active: townPresenceActive, peerCount: townPresencePeers.length, spriteCount: townPresenceSprites },
      } satisfies TestHarnessState;
    },
    getDialogChoiceTexts: () => {
      const scene = getWorldScene(game) as any;
      if (!scene?.dialogChoiceTexts) return [];
      return scene.dialogChoiceTexts.map((t: any) => t?.text ?? "").filter((t: string) => t.length > 0);
    },
    chooseDialogChoice: (matchText) => {
      const scene = getWorldScene(game) as any;
      if (!scene?.dialog?.open || !scene.dialog.scriptId) return false;
      const script = getDialogScript(scene.dialog.scriptId);
      if (!script) return false;
      const node = getNode(script, scene.dialog);
      if (!node || node.kind !== "choice") return false;
      const needle = matchText.trim().toLowerCase();
      const choice = node.choices.find((c) => {
        const text = (c.text ?? "").toLowerCase();
        const id = c.id.toLowerCase();
        return text.includes(needle) || id.includes(needle);
      });
      if (!choice) return false;
      scene.dialog = choose(script, scene.dialog, choice.id);
      if (typeof scene.renderDialog === "function") {
        scene.renderDialog(script);
      }
      return true;
    },
    getDialogHeaderText: () => {
      const scene = getWorldScene(game) as any;
      if (!scene?.dialogText) return null;
      return scene.dialogText.text ?? null;
    },
    getSessionUid: () => {
      const scene = getWorldScene(game) as any;
      if (!scene) return null;
      if (typeof scene.getSessionUidForTest !== "function") return null;
      return scene.getSessionUidForTest();
    },
    getTownChatButtonRect: () => {
      const scene = getWorldScene(game) as any;
      const hit = scene?.townChatButtonHit;
      if (!hit || typeof hit.getBounds !== "function") return null;
      const bounds = hit.getBounds();
      return canvasToScreenRect(bounds);
    },
    getDialogChatLog: () => {
      const scene = getWorldScene(game) as any;
      if (!scene) return null;
      const dialog = scene.dialog as { open?: boolean; scriptId?: string; nodeId?: string } | undefined;
      if (!dialog?.open || dialog.scriptId !== "townPlayer" || dialog.nodeId !== "chat") return null;
      if (scene.dialogChatText?.text) return scene.dialogChatText.text;
      const messages = Array.isArray(scene.townChatMessages) ? scene.townChatMessages : [];
      if (!messages.length) return null;
      return messages.map((m: { username?: string; text?: string }) => `${m.username ?? "?"}: ${m.text ?? ""}`).join("\n");
    },
    getBoatAndSailorTiles: () => {
      const scene = getWorldScene(game) as any;
      if (!scene?.area) return null;
      const tileSize = 32;
      const toTile = (sprite?: { x: number; y: number }) => {
        if (!sprite) return undefined;
        const tx = Math.floor(sprite.x / tileSize);
        const ty = Math.floor(sprite.y / tileSize);
        const tileIndex = scene.area?.tiles?.[ty]?.[tx];
        return { x: tx, y: ty, tileIndex };
      };
      const boat = scene.boatSprite ? toTile(scene.boatSprite) : undefined;
      let sailor;
      if (scene.npcsGroup?.getChildren) {
        const npcs = scene.npcsGroup.getChildren();
        const sailorSprite = npcs.find((n: any) => n?.npcDef?.id === "river_sailor");
        sailor = toTile(sailorSprite);
      }
      return { boat, sailor };
    },
    worldToScreen: (world) => {
      const scene = getWorldScene(game);
      if (!scene) return null;
      const cam = scene.cameras?.main;
      const canvas = scene.game.canvas as HTMLCanvasElement | undefined;
      if (!cam || !canvas) return null;

      const rect = canvas.getBoundingClientRect();
      // Phaser uses an internal canvas size that is often scaled via CSS (e.g. Scale.FIT).
      // Convert internal "camera pixels" into CSS pixels so automation clicks hit the right spot.
      const cw = canvas.width || 1;
      const ch = canvas.height || 1;
      const scaleX = rect.width / cw;
      const scaleY = rect.height / ch;
      const viewX = (world.x - cam.worldView.x) * cam.zoom + (cam.x ?? 0);
      const viewY = (world.y - cam.worldView.y) * cam.zoom + (cam.y ?? 0);
      return { x: rect.left + viewX * scaleX, y: rect.top + viewY * scaleY };
    },
    tileCenterToScreen: (tile) => {
      const tileSize = 32;
      return harness.worldToScreen({
        x: (tile.x + 0.5) * tileSize,
        y: (tile.y + 0.5) * tileSize,
      });
    },
    teleportToTileCenter: (tile) => {
      const scene = getWorldScene(game) as any;
      if (!scene?.player) return false;
      const tileSize = 32;
      const x = (tile.x + 0.5) * tileSize;
      const y = (tile.y + 0.5) * tileSize;
      // Keep Arcade body in sync. Prefer body.reset if available.
      const body = scene.player.body;
      if (body && typeof body.reset === "function") {
        body.reset(x, y);
      } else {
        scene.player.setPosition(x, y);
      }
      if (typeof scene.player.setVelocity === "function") scene.player.setVelocity(0, 0);
      return true;
    },
    restartInArea: ({ areaId, entry }) => {
      const scene = getWorldScene(game) as any;
      if (!scene) return false;
      if (typeof scene.scene?.restart !== "function") return false;
      scene.scene.restart({ areaId, entry });
      return true;
    },
    interactWithChest: (tile) => {
      const scene = getWorldScene(game) as any;
      if (!scene?.chests?.length) return false;
      const tileSize = 32;
      const targetX = (tile.x + 0.5) * tileSize;
      const targetY = (tile.y + 0.5) * tileSize;
      const chest = scene.chests.find(
        (c: any) => Math.abs(c.sprite?.x - targetX) < tileSize / 2 && Math.abs(c.sprite?.y - targetY) < tileSize / 2,
      );
      if (!chest) return false;

      const contents = chest.contents as {
        loot: Array<{ itemId: ItemId; qty: number }>;
        openedDialog: string;
        emptyDialog: string;
        flag?: string;
        resetOnAreaLoad?: boolean;
      };
      const opened = contents.resetOnAreaLoad
        ? !!chest.openedThisVisit
        : contents.flag
          ? hasFlag(contents.flag)
          : false;
      if (!opened) {
        if (contents.resetOnAreaLoad) {
          chest.openedThisVisit = true;
        } else if (contents.flag) {
          setFlag(contents.flag);
        }
        chest.sprite?.setTexture("chest_open");
        chest.sprite?.setDepth(chest.sprite.y);
        const inv = loadInventory();
        const added = addItemsIfFit(
          inv,
          contents.loot.map((loot) => ({ item: ITEMS[loot.itemId], qty: loot.qty })),
        );
        if (!added.ok) {
          if (typeof scene.openNpcDialog === "function") scene.openNpcDialog("pouchFull");
          return true;
        }
        saveInventory(inv);
        if (typeof scene.renderInventoryPanel === "function" && scene.inventoryOpen) scene.renderInventoryPanel();
        if (typeof scene.openNpcDialog === "function") scene.openNpcDialog(contents.openedDialog);
      } else {
        if (typeof scene.openNpcDialog === "function") scene.openNpcDialog(contents.emptyDialog);
      }
      return true;
    },
    openDialog: (scriptId) => {
      const scene = getWorldScene(game) as any;
      if (!scene?.openNpcDialog) return false;
      scene.openNpcDialog(scriptId);
      return true;
    },
    openShopConfirm: (itemId) => {
      const scene = getWorldScene(game) as any;
      const script = getDialogScript("shopkeeper");
      if (!scene || !script || typeof scene.renderDialog !== "function") return false;
      scene.pendingPurchaseItemId = itemId;
      scene.pendingPurchaseQty = 1;
      scene.shopDialogPage = 0;
      scene.dialog = { open: true, scriptId: script.id, nodeId: "confirm" };
      scene.renderDialog(script);
      return true;
    },
    adjustShopQuantity: (delta) => {
      const scene = getWorldScene(game) as any;
      const script = getDialogScript("shopkeeper");
      if (!scene || !script || typeof scene.adjustPurchaseQuantity !== "function") return false;
      const changed = scene.adjustPurchaseQuantity(delta);
      if (changed && typeof scene.renderDialog === "function") scene.renderDialog(script);
      return changed;
    },
    grantCoins: (qty) => {
      if (!Number.isFinite(qty) || qty <= 0) return false;
      const inv = loadInventory();
      addItem(inv, ITEMS.coins, Math.floor(qty));
      saveInventory(inv);
      return true;
    },
    prepareBow: (arrows) => {
      const scene = getWorldScene(game) as any;
      const inv = loadInventory();
      addItem(inv, ITEMS.bow, 1);
      addItem(inv, ITEMS.arrows, Math.max(0, arrows));
      saveInventory(inv);

      const eq = loadEquipment();
      const nextEq: EquipmentState = { ...eq, heldItemId: "bow" };
      saveEquipment(nextEq);

      if (scene) {
        scene.equipment = nextEq;
        if (typeof scene.renderInventoryPanel === "function" && scene.inventoryOpen) scene.renderInventoryPanel();
      }
      return true;
    },
    countPlayerArrows: () => {
      const scene = getWorldScene(game) as any;
      if (!scene?.playerArrowsGroup) return 0;
      if (typeof scene.playerArrowsGroup.countActive === "function") {
        return scene.playerArrowsGroup.countActive(true);
      }
      const children = scene.playerArrowsGroup.getChildren?.() ?? [];
      return children.filter((c: any) => c?.active).length;
    },
    getEquipment: () => {
      const scene = getWorldScene(game) as any;
      if (!scene?.equipment) return null;
      return { ...scene.equipment };
    },
    getInventoryCount: (itemId) => {
      const inv = loadInventory();
      return inv.slots.reduce((sum, s) => (s?.id === itemId ? sum + s.qty : sum), 0);
    },
    getInventoryStacks: (itemId) => {
      const inv = loadInventory();
      return inv.slots.filter((s) => s?.id === itemId).map((s) => s?.qty ?? 0);
    },
    shootBowOnce: () => {
      const scene = getWorldScene(game) as any;
      if (!scene?.player || scene.equipment?.heldItemId !== "bow") return false;
      const inv = loadInventory();
      const arrows = getItemCount(inv, "arrows");
      const now = scene.time?.now ?? Date.now();
      const shot = tryShootWithAmmo({ nowMs: now, state: scene.bowState ?? { lastShotAtMs: -Infinity }, cooldownMs: 450, arrows });
      if (!shot.ok) return false;
      const removed = removeItem(inv, "arrows", 1);
      if (!removed) return false;
      saveInventory(inv);
      scene.bowState = shot.next;
      const dir =
        scene.facing === "up"
          ? { x: 0, y: -1 }
          : scene.facing === "down"
            ? { x: 0, y: 1 }
            : scene.facing === "left"
              ? { x: -1, y: 0 }
              : { x: 1, y: 0 };
      if (typeof scene.shootPlayerArrow === "function") scene.shootPlayerArrow(dir);
      if (scene.inventoryOpen && typeof scene.renderInventoryPanel === "function") scene.renderInventoryPanel();
      return true;
    },
    setTownPresencePeers: (peers) => {
      const scene = getWorldScene(game) as any;
      if (!scene) return false;
      if (typeof scene.setTownPresencePeersForTest !== "function") return false;
      scene.setTownPresencePeersForTest(peers);
      return true;
    },
    openTownPlayerDialog: (peer) => {
      const scene = getWorldScene(game) as any;
      if (!scene) return false;
      if (typeof scene.openTownPlayerDialogForTest !== "function") return false;
      scene.openTownPlayerDialogForTest(peer);
      return true;
    },
    setTownChatMessages: (messages) => {
      const scene = getWorldScene(game) as any;
      if (!scene) return false;
      if (typeof scene.setTownChatMessagesForTest !== "function") return false;
      scene.setTownChatMessagesForTest(messages);
      return true;
    },
    setTownTradeRequests: (requests) => {
      const scene = getWorldScene(game) as any;
      if (!scene) return false;
      if (typeof scene.setTownTradeRequestsForTest !== "function") return false;
      scene.setTownTradeRequestsForTest(requests);
      return true;
    },
  };

  window.__GREENHOLLOW_TEST_HOOKS__ = harness;
}

export function getInstalledTestHarness(): TestHarness | undefined {
  if (typeof window === "undefined") return undefined;
  return window.__GREENHOLLOW_TEST_HOOKS__;
}
