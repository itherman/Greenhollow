import Phaser from "phaser";
import { type Direction } from "../../core/movement";
import { VILLAGE_HOUSE_TOP_LEFTS, getTile, isWalkable, type AreaDef, type AreaId, type EntryId } from "../../core/areas";
import {
  openDialog,
  type DialogState,
} from "../../core/dialog";
import { getDialogScript } from "../dialog/scripts";
import { clearFlags, hasFlag, setFlag } from "../../services/game/flags";
import { ITEMS, addItem, type ItemId } from "../../core/inventory";
import { clearInventory, loadInventory, saveInventory } from "../../services/game/inventoryStore";
import { ensureItemAndPropTextures } from "../art/sprites";
import { createExitGate, type TilePos } from "../../core/exitGate";
import { createEquipment, type EquipmentState } from "../../core/equipment";
import { clearEquipment, loadEquipment, saveEquipment } from "../../services/game/equipmentStore";
import { createAttackState, type AttackState } from "../../core/playerAttack";
import { createRangedState, normalize, type RangedState } from "../../core/rangedAttack";
import { applyDamage } from "../../core/hp";
import { normalizeScreenSize } from "../../core/screen";
import { computeMobileControlsLayout, type Rect as UiRect } from "../../core/mobileControlsLayout";
import { type TapCandidateKind } from "../../core/tapTargeting";
import { getTapInteractRangePx } from "../../core/tapIntentMovement";
import { shouldShowAttackButton } from "../../core/attackButtonVisibility";
import { clearProgress, saveProgress, type PlayerProgress as LocalProgress } from "../../services/game/progressStore";
import { clearSession } from "../../services/auth/session";
import { canToggleInventory } from "../../core/uiGating";
import { computePouchIconLayout } from "../../core/pouchIconLayout";
import { needsPouchUiRebuild } from "../../core/pouchUi";
import { getArmorBonus, isMeleeWeapon } from "../../core/shopCatalog";
import { attemptSaleFromSlot, getSellOffer } from "../../core/shopLogic";
import { ARROW_HITBOX } from "../../core/physicsTuning";
import { rollEnemyDrop, type EnemyDrop } from "../../core/enemyDrops";
import { getEnemyDefinition, type EnemyId } from "../../core/enemies";
import { getFeetDepth } from "./depthSort";
import { pickNpcForDialog } from "./npcInteract";
import { tryPickupSprite } from "./world/tryPickupSprite";
import { configureStaticPickupBody } from "./world/arcadeBody";
import { addBobbingTween } from "./world/bobbingTween";
import { InventoryPanelController } from "./world/inventoryPanelController";
import { loadAreaIntoWorldScene } from "./world/loadArea";
import { closeDialogUiInWorldScene, renderDialogInWorldScene } from "./world/dialogUi";
import { worldSceneUpdate } from "./worldSceneUpdate";
import { ensureTilesetTexture } from "./worldSceneTilesetTexture";
import { worldSceneCreate } from "./worldSceneCreate";

type NpcMovementState = {
  target?: Phaser.Math.Vector2;
  nextDecisionAt: number;
  paused: boolean;
  speed: number;
  wanderBounds?: { minX: number; maxX: number; minY: number; maxY: number };
  home: { x: number; y: number };
};

export class WorldScene extends Phaser.Scene {
  // @ts-expect-error TS6133 - Used in worldSceneCreate.ts and worldSceneUpdate.ts
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private player!: Phaser.Physics.Arcade.Sprite;
  // @ts-expect-error TS6133 - Used in worldSceneUpdate.ts
  private facing: Exclude<Direction, "none"> = "down";
  // @ts-expect-error TS6133 - Used in worldSceneCreate.ts and worldSceneUpdate.ts
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private area!: AreaDef;
  private npcsGroup?: Phaser.Physics.Arcade.Group;
  private npcMoveStates: Map<Phaser.GameObjects.Sprite, NpcMovementState> = new Map();
  // @ts-expect-error TS6133 - Used in worldSceneUpdate.ts and loadArea.ts
  private interactingNpc?: Phaser.GameObjects.Sprite;
  private chest?: Phaser.Physics.Arcade.Sprite;
  private chestContents?: {
    flag: string;
    loot: Array<{ itemId: ItemId; qty: number }>;
    openedDialog: string;
    emptyDialog: string;
  };
  // @ts-expect-error TS6133 - Used in worldSceneCreate.ts and worldSceneUpdate.ts
  private interactKey!: Phaser.Input.Keyboard.Key;
  // @ts-expect-error TS6133 - Used in worldSceneCreate.ts and worldSceneUpdate.ts
  private choiceKeys!: {
    ONE: Phaser.Input.Keyboard.Key;
    TWO: Phaser.Input.Keyboard.Key;
    THREE: Phaser.Input.Keyboard.Key;
    FOUR: Phaser.Input.Keyboard.Key;
  };
  // @ts-expect-error TS6133 - Used in worldSceneCreate.ts and worldSceneUpdate.ts
  private escapeKey!: Phaser.Input.Keyboard.Key;
  private uiCam!: Phaser.Cameras.Scene2D.Camera;
  private dialog: DialogState = { open: false };
  // @ts-expect-error TS6133 - Used in dialogUi.ts
  private dialogBox?: Phaser.GameObjects.Rectangle;
  // @ts-expect-error TS6133 - Used in dialogUi.ts
  private dialogText?: Phaser.GameObjects.Text;
  // @ts-expect-error TS6133 - Used in dialogUi.ts
  private dialogChoicesText?: Phaser.GameObjects.Text;
  // @ts-expect-error TS6133 - Used in dialogUi.ts
  private shopCoinsText?: Phaser.GameObjects.Text;
  private dialogChoiceTexts: Phaser.GameObjects.Text[] = [];
  private dialogChoiceBgs: Phaser.GameObjects.Rectangle[] = [];
  // @ts-expect-error TS6133 - Used in worldSceneUpdate.ts
  private shopDialogPage = 0;
  // @ts-expect-error TS6133 - Used in dialogUi.ts and worldSceneUpdate.ts
  private pendingPurchaseItemId: ItemId | null = null;
  private buyerSelectionActive = false;
  private buyerOffer: { slotIndex: number; coins: number; itemName: string; qty: number; itemId: ItemId } | null = null;
  // @ts-expect-error TS6133 - Used in worldSceneCreate.ts
  private startAreaId: AreaId = "village";
  private startEntry: EntryId = "start";
  // @ts-expect-error TS6133 - Used in loadArea.ts
  private startProgress?: LocalProgress;
  private currentEntry: EntryId = "start";
  private lastProgressWriteAtMs = 0;
  private lastHpWritten = -1;

  // @ts-expect-error TS6133 - Used in worldSceneCreate.ts and worldSceneUpdate.ts
  private inventoryKey!: Phaser.Input.Keyboard.Key;
  private inventoryOpen = false;
  private inventoryUi?: InventoryPanelController;
  // @ts-expect-error TS6133 - Used in worldSceneCreate.ts and worldSceneUpdate.ts
  private invSelectKeys!: {
    ONE: Phaser.Input.Keyboard.Key;
    TWO: Phaser.Input.Keyboard.Key;
    THREE: Phaser.Input.Keyboard.Key;
    FOUR: Phaser.Input.Keyboard.Key;
    FIVE: Phaser.Input.Keyboard.Key;
    SIX: Phaser.Input.Keyboard.Key;
    SEVEN: Phaser.Input.Keyboard.Key;
    EIGHT: Phaser.Input.Keyboard.Key;
    NINE: Phaser.Input.Keyboard.Key;
  };

  private equipment: EquipmentState = createEquipment();
  // @ts-expect-error TS6133 - Used in worldSceneUpdate.ts
  private heldItemSprite?: Phaser.GameObjects.Sprite;
  // @ts-expect-error TS6133 - Used in worldSceneUpdate.ts
  private slashSwordSprite?: Phaser.GameObjects.Sprite;
  private bodyArmorSprite?: Phaser.GameObjects.Sprite;

  private baseMaxHp = 20;
  private maxHp = 20;
  private hp = 20;
  // @ts-expect-error TS6133 - Used in worldSceneUpdate.ts
  private dead = false;
  private deathText?: Phaser.GameObjects.Text;
  // Use -Infinity so contact damage can apply immediately on first touch after entering an area.
  // @ts-expect-error TS6133 - Used in worldSceneUpdate.ts
  private lastHitAtMs = -Infinity;
  // @ts-expect-error TS6133 - Used in worldSceneUpdate.ts
  private hpText!: Phaser.GameObjects.Text;
  private pouchIcon?: Phaser.GameObjects.Image;
  private pouchHit?: Phaser.GameObjects.Rectangle;
  private keySprite?: Phaser.Physics.Arcade.Sprite;
  private swordSprite?: Phaser.Physics.Arcade.Sprite;
  private bowSprite?: Phaser.Physics.Arcade.Sprite;
  // @ts-expect-error TS6133 - Used in loadArea.ts
  private houseDoorSprite?: Phaser.GameObjects.Sprite;
  // @ts-expect-error TS6133 - Used in loadArea.ts
  private trollDoorSprite?: Phaser.GameObjects.Sprite;
  private monstersGroup?: Phaser.Physics.Arcade.Group;
  private goblinsGroup?: Phaser.Physics.Arcade.Group;
  private trollGroup?: Phaser.Physics.Arcade.Group;
  // @ts-expect-error TS6133 - Used in worldSceneUpdate.ts and loadArea.ts
  private arrowsGroup?: Phaser.Physics.Arcade.Group;
  private playerArrowsGroup?: Phaser.Physics.Arcade.Group;
  private dropsGroup?: Phaser.Physics.Arcade.Group;
  // @ts-expect-error TS6133 - Used in worldSceneUpdate.ts
  private bowState: RangedState = createRangedState();
  // @ts-expect-error TS6133 - Used in worldSceneUpdate.ts
  private lastRangedHitAtMs = 0;
  // @ts-expect-error TS6133 - Used in loadArea.ts
  private villageHouses: Phaser.GameObjects.Image[] = [];
  private heartSprite?: Phaser.Physics.Arcade.Sprite;
  private tapTarget?: { x: number; y: number };
  // @ts-expect-error TS6133 - Used in worldSceneUpdate.ts
  private tapIntent?: { kind: TapCandidateKind; id?: string };
  // @ts-expect-error TS6133 - Used in worldSceneUpdate.ts
  private suppressWorldPointerUntilTs = 0;
  // @ts-expect-error TS6133 - Used in worldSceneUpdate.ts
  private suppressExitUntilTs = 0;
  // @ts-expect-error TS6133 - Used in worldSceneUpdate.ts
  private blockedExitSticky?: { exitId: string; clearRect: { x: number; y: number; w: number; h: number } };
  // @ts-expect-error TS6133 - Used in worldSceneCreate.ts
  private onWorldPointerDown?: (pointer: Phaser.Input.Pointer) => void;
  // @ts-expect-error TS6133 - Used in worldSceneCreate.ts
  private onScaleResize?: (gameSize: Phaser.Structs.Size) => void;
  private mobileUi?: {
    attackHit: Phaser.GameObjects.Rectangle;
    attackBg: Phaser.GameObjects.Rectangle;
    attackText: Phaser.GameObjects.Text;
  };
  private mobilePress = { attack: false };
  private mobileControlsVisible = false;
  // @ts-expect-error TS6133 - Used in worldSceneUpdate.ts
  private lastMobileControlsEvalAtMs = 0;
  private trollWarningZone?: Phaser.GameObjects.Zone;
  private trollGuardRail?: Phaser.GameObjects.Zone;

  private setNpcPaused(npc: Phaser.GameObjects.Sprite, paused: boolean) {
    const state = this.npcMoveStates.get(npc);
    if (!state) return;
    state.paused = paused;
    state.target = undefined;
    state.nextDecisionAt = paused ? this.time.now + 300 : this.time.now + Phaser.Math.Between(600, 1200);
    const body = npc.body as Phaser.Physics.Arcade.Body | undefined;
    if (body) body.setVelocity(0, 0);
  }

  // @ts-expect-error TS6133 - Used in loadArea.ts
  private computeNpcWanderBounds(npc: { pos: { x: number; y: number } }): NpcMovementState["wanderBounds"] | undefined {
    // Homeowners should stay near their house fronts.
    const idx = VILLAGE_HOUSE_TOP_LEFTS.findIndex(
      (h) => Math.abs(h.x + 3 - npc.pos.x) <= 1 && Math.abs(h.y + 4 - npc.pos.y) <= 1,
    );
    if (idx < 0) return undefined;
    const tl = VILLAGE_HOUSE_TOP_LEFTS[idx]!;
    return {
      minX: Math.max(1, tl.x - 1),
      maxX: Math.min(this.area.width - 2, tl.x + 7),
      minY: Math.max(1, tl.y + 2),
      maxY: Math.min(this.area.height - 2, tl.y + 6),
    };
  }

  // @ts-expect-error TS6133 - Used in worldSceneUpdate.ts
  private tryInteract(prefer: TapCandidateKind | "any", npcScriptId?: string): boolean {
    const playerPos = { x: this.player.x, y: this.player.y };

    const tryKey = () => {
      return tryPickupSprite({
        player: playerPos,
        sprite: this.keySprite,
        rangePx: getTapInteractRangePx("key"),
        onPickup: () => {
          setFlag("item.rusty_key.woods.1");
          this.keySprite?.destroy();
          this.keySprite = undefined;
          const inv = loadInventory();
          addItem(inv, ITEMS.rusty_key, 1);
          saveInventory(inv);
          if (this.inventoryOpen) this.renderInventoryPanel();
          this.openNpcDialog("keyFound");
        },
      });
    };

    const trySword = () => {
      return tryPickupSprite({
        player: playerPos,
        sprite: this.swordSprite,
        rangePx: getTapInteractRangePx("sword"),
        onPickup: () => {
          setFlag("item.sword.1");
          this.swordSprite?.destroy();
          this.swordSprite = undefined;
          const inv = loadInventory();
          addItem(inv, ITEMS.sword, 1);
          saveInventory(inv);
          if (this.inventoryOpen) this.renderInventoryPanel();
          this.openNpcDialog("swordFound");
        },
      });
    };

    const tryBow = () => {
      return tryPickupSprite({
        player: playerPos,
        sprite: this.bowSprite,
        rangePx: getTapInteractRangePx("bow"),
        onPickup: () => {
          setFlag("item.bow.1");
          this.bowSprite?.destroy();
          this.bowSprite = undefined;
          const inv = loadInventory();
          addItem(inv, ITEMS.bow, 1);
          saveInventory(inv);
          // Auto-equip bow if nothing is held.
          if (!this.equipment.heldItemId) {
            this.equipment = { ...this.equipment, heldItemId: "bow" };
            saveEquipment(this.equipment);
          }
          if (this.inventoryOpen) this.renderInventoryPanel();
          this.openNpcDialog("bowFound");
        },
      });
    };

    const tryChest = () => {
      const contents = this.chestContents;
      if (!contents) return false;
      return tryPickupSprite({
        player: playerPos,
        sprite: this.chest,
        rangePx: getTapInteractRangePx("chest"),
        onPickup: () => {
          const opened = hasFlag(contents.flag);
          if (!opened) {
            setFlag(contents.flag);
            this.chest?.setTexture("chest_open");
            if (this.chest) this.chest.setDepth(this.chest.y);
            const inv = loadInventory();
            for (const loot of contents.loot) {
              const def = ITEMS[loot.itemId];
              addItem(inv, def, loot.qty);
            }
            saveInventory(inv);
            if (this.inventoryOpen) this.renderInventoryPanel();
            this.openNpcDialog(contents.openedDialog);
          } else {
            this.openNpcDialog(contents.emptyDialog);
          }
        },
      });
    };

    const tryNpc = () => {
      if (!this.npcsGroup) return false;
      const rangePx = getTapInteractRangePx("npc");
      const npcs = this.npcsGroup.getChildren() as Phaser.GameObjects.Sprite[];
      const chosen = pickNpcForDialog({
        player: playerPos,
        npcs: npcs as any,
        rangePx,
        scriptId: npcScriptId,
        tapTarget: this.tapTarget,
      }) as Phaser.GameObjects.Sprite | null;

      if (!chosen) return false;
      const npcDef = (chosen as any).npcDef as { dialogScriptId?: string } | undefined;
      const scriptId = npcScriptId ?? npcDef?.dialogScriptId;
      if (!scriptId) return false;
      const script = getDialogScript(scriptId);
      if (!script) return false;
      this.openNpcDialog(scriptId, chosen);
      return true;
    };

    const ordered: Array<() => boolean> =
      prefer === "key"
        ? [tryKey]
        : prefer === "sword"
          ? [trySword]
          : prefer === "bow"
            ? [tryBow]
          : prefer === "chest"
            ? [tryChest]
            : prefer === "npc"
              ? [tryNpc]
              : // default priority
              [tryKey, trySword, tryBow, tryChest, tryNpc];

    for (const fn of ordered) if (fn()) return true;
    return false;
  }

  // @ts-expect-error TS6133 - Used in worldSceneCreate.ts and worldSceneUpdate.ts
  private attackKey!: Phaser.Input.Keyboard.Key;
  // @ts-expect-error TS6133 - Used in worldSceneUpdate.ts
  private attackState: AttackState = createAttackState();

  // @ts-expect-error TS6133 - Used in loadArea.ts
  private playEnemyAttackAnim(monster: Phaser.Physics.Arcade.Sprite) {
    // Avoid stacking multiple attack tweens on the same monster.
    const anyM = monster as any;
    if (anyM.__attackAnimActive) return;
    anyM.__attackAnimActive = true;

    // Flash + squash feels like a bite/lunge without fighting Arcade physics.
    const baseScaleX = monster.scaleX;
    const baseScaleY = monster.scaleY;
    monster.setTintFill(0xff6b6b);
    this.tweens.add({
      targets: monster,
      scaleX: baseScaleX * 1.15,
      scaleY: baseScaleY * 0.85,
      duration: 90,
      yoyo: true,
      ease: "Sine.InOut",
      onComplete: () => {
        monster.setScale(baseScaleX, baseScaleY);
        monster.clearTint();
        anyM.__attackAnimActive = false;
      },
    });

    // Safety: if tween is cancelled by destruction, clear the flag eventually.
    this.time.delayedCall(140, () => {
      if (!monster.active) return;
      monster.clearTint();
      anyM.__attackAnimActive = false;
    });
  }

  private spawnBowDrop(x: number, y: number) {
    if (this.area.id !== "cave") return;
    if (hasFlag("item.bow.1")) return;
    if (this.bowSprite?.active) return;
    this.bowSprite = this.physics.add.sprite(x, y, "item_bow");
    this.bowSprite.setDepth(this.bowSprite.y);
    const bb = this.bowSprite.body as Phaser.Physics.Arcade.Body;
    configureStaticPickupBody(bb, { w: 14, h: 10, offsetX: 5, offsetY: 12 });
    this.uiCam.ignore(this.bowSprite);
    // slight bob so it feels like a drop
    addBobbingTween(this.tweens, this.bowSprite, { baseY: y, durationMs: 700 });
  }

  // @ts-expect-error TS6133 - Used in loadArea.ts
  private damageGoblin(gob: Phaser.Physics.Arcade.Sprite, damage: number) {
    const goblins = this.goblinsGroup;
    if (!goblins || !gob.active) return;
    const anyG = gob as any;
    const hp = (anyG.__hp as number | undefined) ?? 0;
    const wasLast = goblins.countActive(true) === 1;
    const r = applyDamage({ hp, damage });
    anyG.__hp = r.hp;
    gob.setTintFill(0xffffff);
    this.time.delayedCall(60, () => {
      if (gob.active) gob.clearTint();
    });
    if (r.died) {
      const dropX = gob.x;
      const dropY = gob.y;
      this.spawnEnemyDrop(dropX, dropY, "cave_goblin_archer");
      gob.destroy();
      if (wasLast) this.spawnBowDrop(dropX, dropY);
    }
  }

  // @ts-expect-error TS6133 - Used in worldSceneUpdate.ts and loadArea.ts
  private damageTroll(troll: Phaser.Physics.Arcade.Sprite, damage: number) {
    const trolls = this.trollGroup;
    if (!trolls || !troll.active) return;
    const anyT = troll as any;
    const hp = (anyT.__hp as number | undefined) ?? 0;
    const r = applyDamage({ hp, damage });
    anyT.__hp = r.hp;
    troll.setTintFill(0xffffff);
    this.time.delayedCall(80, () => {
      if (troll.active) troll.clearTint();
    });
    if (r.died) {
      const dropX = troll.x;
      const dropY = troll.y;
      const trollAlreadyCleared = hasFlag("enemy.trollBridge.defeated");
      if (!trollAlreadyCleared) {
        this.spawnEnemyDrop(dropX, dropY, "bridge_troll", { kind: "item", itemId: "troll_key", qty: 1 });
        setFlag("enemy.trollBridge.defeated");
      }
      this.spawnEnemyDrop(dropX + 6, dropY + 4, "bridge_troll", { kind: "item", itemId: "leather_armor", qty: 1 });
      this.spawnEnemyDrop(dropX - 6, dropY - 4, "bridge_troll");
      troll.destroy();
      this.trollGuardRail?.destroy();
      this.trollGuardRail = undefined;
    }
  }

  private spawnEnemyDrop(x: number, y: number, enemyId: EnemyId, dropOverride?: EnemyDrop) {
    if (!this.dropsGroup) return;
    ensureItemAndPropTextures(this);
    const enemy = getEnemyDefinition(enemyId);
    const drop: EnemyDrop = dropOverride ?? rollEnemyDrop({ rng: () => Math.random(), difficultyRank: enemy.difficultyRank });
    const key =
      drop.kind === "heart"
        ? "item_heart"
        : drop.kind === "coins"
          ? "item_coins"
          : drop.kind === "item"
            ? drop.itemId === "leather_armor"
              ? "item_leather_armor"
              : drop.itemId === "iron_armor"
                ? "item_iron_armor"
                : drop.itemId === "rusty_key" || drop.itemId === "troll_key"
                  ? "item_key"
                  : "item_bread"
            : drop.itemId === "stew"
              ? "item_stew"
              : "item_bread";
    const s = this.dropsGroup.create(x, y, key) as Phaser.Physics.Arcade.Sprite;
    s.setDepth(s.y);
    const b = s.body as Phaser.Physics.Arcade.Body;
    configureStaticPickupBody(b, { w: 12, h: 12, offsetX: 6, offsetY: 6 });
    (s as any).__drop = drop;
    this.uiCam.ignore(s);
    // subtle bob
    addBobbingTween(this.tweens, s, { baseY: y, durationMs: 650 });
  }

  // @ts-expect-error TS6133 - Used in worldSceneUpdate.ts
  private shootPlayerArrow(dir: { x: number; y: number }) {
    if (!this.playerArrowsGroup) return;
    const v = normalize(dir);
    if (v.x === 0 && v.y === 0) return;
    const speed = 230;
    const spawnDist = 16;
    const ax = this.player.x + v.x * spawnDist;
    const ay = this.player.y + v.y * spawnDist;
    const arrow = this.playerArrowsGroup.create(ax, ay, "proj_arrow") as Phaser.Physics.Arcade.Sprite;
    arrow.setDepth(arrow.y);
    const ab = arrow.body as Phaser.Physics.Arcade.Body;
    ab.setAllowGravity(false);
    ab.setSize(ARROW_HITBOX.w, ARROW_HITBOX.h).setOffset(ARROW_HITBOX.offsetX, ARROW_HITBOX.offsetY);
    ab.setVelocity(v.x * speed, v.y * speed);
    arrow.setRotation(Math.atan2(v.y, v.x));
    this.uiCam.ignore(arrow);
    this.time.delayedCall(2400, () => {
      if (arrow.active) arrow.destroy();
    });
  }
  // @ts-expect-error TS6133 - Used in worldSceneUpdate.ts
  private exitGate = createExitGate();

  constructor() {
    super("WorldScene");
  }

  init(data: { areaId?: AreaId; entry?: EntryId; progress?: LocalProgress }) {
    // On scene restart, we can pass the desired spawn.
    this.startAreaId = data?.areaId ?? "village";
    this.startEntry = data?.entry ?? "start";
    this.currentEntry = this.startEntry;
    this.startProgress = data?.progress;
    // Reset transient state as close to a new game as possible.
    this.dialog = { open: false };
    this.facing = "down";
    this.exitGate = createExitGate();
    // Scene restart destroys game objects, but our instance fields persist. Reset UI refs to avoid
    // calling methods on destroyed objects (which can crash the loop and look like a freeze).
    this.inventoryOpen = false;
    this.inventoryUi?.reset();
    this.chestContents = undefined;
    this.heldItemSprite = undefined;
    this.slashSwordSprite = undefined;
    this.bodyArmorSprite?.destroy();
    this.bodyArmorSprite = undefined;
    this.equipment = loadEquipment();
    this.updateMaxHpFromArmor();
    this.monstersGroup = undefined;
    this.goblinsGroup = undefined;
    this.trollGroup = undefined;
    this.arrowsGroup = undefined;
    this.playerArrowsGroup = undefined;
    this.dropsGroup = undefined;
    this.lastRangedHitAtMs = 0;
    this.villageHouses = [];
    this.heartSprite = undefined;
    this.bowSprite?.destroy();
    this.bowSprite = undefined;
    this.bowState = createRangedState();
    this.dead = false;
    this.lastHitAtMs = -Infinity;
    this.deathText?.destroy();
    this.deathText = undefined;
    this.tapTarget = undefined;
    this.tapIntent = undefined;
    this.mobilePress.attack = false;
    // Scene restart destroys display objects; clear cached UI refs so we don't touch destroyed objects.
    this.mobileUi = undefined;
    this.mobileControlsVisible = false;
    this.lastMobileControlsEvalAtMs = 0;
    this.suppressWorldPointerUntilTs = 0;
    this.suppressExitUntilTs = 0;
    this.blockedExitSticky = undefined;
    this.trollWarningZone?.destroy();
    this.trollWarningZone = undefined;
    for (const t of this.dialogChoiceTexts) t.destroy();
    this.dialogChoiceTexts = [];
    for (const r of this.dialogChoiceBgs) r.destroy();
    this.dialogChoiceBgs = [];
    // Reset pouch UI refs to avoid stale destroyed objects.
    this.pouchIcon?.destroy();
    this.pouchHit?.destroy();
    this.pouchIcon = undefined;
    this.pouchHit = undefined;
  }

  // @ts-expect-error TS6133 - Used in worldSceneUpdate.ts and loadArea.ts
  private getPlayerTilePos(): TilePos {
    const tileSize = 32;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const tx = Math.floor(this.player.x / tileSize);
    const ty = Math.floor((body.bottom - 1) / tileSize);
    return { x: tx, y: ty };
  }

  private updateMaxHpFromArmor() {
    const armorBonus =
      getArmorBonus(this.equipment.headArmorItemId) +
      getArmorBonus(this.equipment.bodyArmorItemId) +
      getArmorBonus(this.equipment.legArmorItemId);
    const newMaxHp = this.baseMaxHp + armorBonus;
    const oldMaxHp = this.maxHp;
    this.maxHp = newMaxHp;
    // Clamp current HP to new max (in case armor was removed)
    if (this.hp > this.maxHp) this.hp = this.maxHp;
    // If maxHp increased and we're at full health, increase HP too
    if (newMaxHp > oldMaxHp && this.hp === oldMaxHp) {
      this.hp = newMaxHp;
    }
  }

  create() {
    worldSceneCreate(this);
  }

  private ensureMobileControls() {
    if (this.mobileUi) return;

    const mkButton = (label: string) => {
      // Use a separate hit-rect so we can make it interactive without changing visuals.
      const hit = this.add.rectangle(0, 0, 10, 10, 0x000000, 0).setOrigin(0, 0).setScrollFactor(0).setDepth(4000);
      const bg = this.add
        .rectangle(0, 0, 10, 10, 0x0f1418, 0.42)
        .setStrokeStyle(2, 0x2a3a44, 0.65)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(3999);
      const text = this.add
        .text(0, 0, label, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "14px",
          color: "#ffffff",
          align: "center",
        })
        .setOrigin(0.5, 0.5)
        .setScrollFactor(0)
        .setDepth(4001)
        .setAlpha(0.95);

      // UI camera only.
      this.cameras.main.ignore([hit, bg, text]);
      return { hit, bg, text };
    };

    const attack = mkButton("Attack");

    attack.hit.setInteractive({ useHandCursor: false });

    // pointerdown/up to simulate key press for this frame(s)
    attack.hit.on("pointerdown", () => {
      this.suppressWorldPointerUntilTs = Date.now() + 250;
      this.mobilePress.attack = true;
      this.tapTarget = undefined; // avoid accidental drift when attacking
    });
    attack.hit.on("pointerup", () => (this.mobilePress.attack = false));
    attack.hit.on("pointerout", () => (this.mobilePress.attack = false));

    this.mobileUi = {
      attackHit: attack.hit,
      attackBg: attack.bg,
      attackText: attack.text,
    };
  }

  // @ts-expect-error TS6133 - Used in worldSceneUpdate.ts and worldSceneCreate.ts
  private layoutMobileControls() {
    if (!this.mobileUi) return;
    // Safety: if a restart destroyed the objects but we still have references, rebuild.
    if (!this.mobileUi.attackHit.active) {
      this.mobileUi = undefined;
      this.ensureMobileControls();
      if (!this.mobileUi) return;
    }
    const hasTouch =
      !!this.sys.game.device.input.touch ||
      (typeof navigator !== "undefined" && (navigator.maxTouchPoints ?? 0) > 0) ||
      (typeof window !== "undefined" && ("ontouchstart" in window));
    const showAttack = shouldShowAttackButton({
      screenW: this.scale.width,
      screenH: this.scale.height,
      hasTouch,
      enemyNearby: this.isEnemyNearby(32 * 7, { includeTrollsLongRange: true }),
      hasWeapon: isMeleeWeapon(this.equipment.heldItemId) || this.equipment.heldItemId === "bow",
    });
    this.mobileControlsVisible = showAttack;

    const setVisible = (v: boolean) => {
      this.mobileUi!.attackHit.setVisible(v);
      this.mobileUi!.attackBg.setVisible(v);
      this.mobileUi!.attackText.setVisible(v);
      if (!v) {
        this.mobilePress.attack = false;
      }
    };
    setVisible(showAttack);
    if (!showAttack) return;

    const { attack } = computeMobileControlsLayout({
      screenW: this.scale.width,
      screenH: this.scale.height,
    });
    const place = (r: UiRect, hit: Phaser.GameObjects.Rectangle, bg: Phaser.GameObjects.Rectangle, text: Phaser.GameObjects.Text) => {
      hit.setPosition(r.x, r.y).setSize(r.w, r.h);
      bg.setPosition(r.x, r.y).setSize(r.w, r.h);
      text.setPosition(r.x + r.w / 2, r.y + r.h / 2);
    };
    place(attack, this.mobileUi.attackHit, this.mobileUi.attackBg, this.mobileUi.attackText);
  }

  // @ts-expect-error TS6133 - Used in worldSceneCreate.ts
  private isPointerOverMobileControls(pointer: Phaser.Input.Pointer): boolean {
    if (!this.mobileUi) return false;
    if (!this.mobileControlsVisible) return false;
    const px = pointer.x;
    const py = pointer.y;
    const within = (r: Phaser.GameObjects.Rectangle) =>
      px >= r.x && px <= r.x + r.width && py >= r.y && py <= r.y + r.height;
    return within(this.mobileUi.attackHit);
  }

  private isEnemyNearby(maxDistPx: number, opts?: { includeTrollsLongRange?: boolean }): boolean {
    const max2 = maxDistPx * maxDistPx;
    const trollMax2 = opts?.includeTrollsLongRange ? Math.pow(Math.max(maxDistPx, 32 * 12), 2) : max2;
    const px = this.player?.x ?? 0;
    const py = this.player?.y ?? 0;
    const nearGroup = (g?: Phaser.Physics.Arcade.Group, overrideMax2?: number) => {
      if (!g) return false;
      for (const obj of g.getChildren()) {
        const s = obj as Phaser.Physics.Arcade.Sprite;
        if (!s.active) continue;
        const dx = s.x - px;
        const dy = s.y - py;
        const thresh = overrideMax2 ?? max2;
        if (dx * dx + dy * dy <= thresh) return true;
      }
      return false;
    };
    return nearGroup(this.monstersGroup) || nearGroup(this.goblinsGroup) || nearGroup(this.trollGroup, trollMax2);
  }

  // @ts-expect-error TS6133 - Used in worldSceneCreate.ts
  private getTapCandidates() {
    const out: { kind: TapCandidateKind; x: number; y: number; id?: string }[] = [];
    if (this.heartSprite?.active) out.push({ kind: "heart", x: this.heartSprite.x, y: this.heartSprite.y });
    if (this.keySprite?.active) out.push({ kind: "key", x: this.keySprite.x, y: this.keySprite.y });
    if (this.swordSprite?.active) out.push({ kind: "sword", x: this.swordSprite.x, y: this.swordSprite.y });
    if (this.bowSprite?.active) out.push({ kind: "bow", x: this.bowSprite.x, y: this.bowSprite.y });
    if (this.chest?.active) out.push({ kind: "chest", x: this.chest.x, y: this.chest.y });
    if (this.npcsGroup) {
      for (const obj of this.npcsGroup.getChildren()) {
        const s = obj as Phaser.GameObjects.Sprite;
        const npcDef = (s as any).npcDef as { dialogScriptId?: string } | undefined;
        if (!npcDef?.dialogScriptId) continue;
        out.push({ kind: "npc", x: s.x, y: s.y, id: npcDef.dialogScriptId });
      }
    }
    return out;
  }

  private pickNpcTarget(state: NpcMovementState, tileSize: number): Phaser.Math.Vector2 | undefined {
    const homeTile = { x: Math.floor(state.home.x / tileSize), y: Math.floor(state.home.y / tileSize) };
    const radius = 2;

    for (let i = 0; i < 12; i++) {
      const tx = homeTile.x + Phaser.Math.Between(-radius, radius);
      const ty = homeTile.y + Phaser.Math.Between(-radius, radius);

      if (state.wanderBounds) {
        if (tx < state.wanderBounds.minX || tx > state.wanderBounds.maxX) continue;
        if (ty < state.wanderBounds.minY || ty > state.wanderBounds.maxY) continue;
      }

      const t = getTile(this.area, { x: tx, y: ty });
      if (t == null || !isWalkable(t)) continue;

      return new Phaser.Math.Vector2(tx * tileSize + tileSize / 2, ty * tileSize + tileSize / 2);
    }

    return undefined;
  }

  // @ts-expect-error TS6133 - Used in worldSceneUpdate.ts
  // Called from worldSceneUpdate.ts via this.updateNpcMovement() (line 83)
  // TypeScript flags this as unused because it can't detect calls via this binding from extracted files
  private updateNpcMovement() {
    if (!this.npcsGroup) return;
    const now = this.time.now;
    const tileSize = 32;

    for (const obj of this.npcsGroup.getChildren()) {
      const s = obj as Phaser.GameObjects.Sprite;
      const state = this.npcMoveStates.get(s);
      if (!state) continue;
      const body = s.body as Phaser.Physics.Arcade.Body | undefined;
      if (!body) continue;
      if (!s.active) continue;

      if (state.paused) {
        body.setVelocity(0, 0);
        s.setDepth(getFeetDepth(s as any));
        continue;
      }

      // Acquire a new target occasionally or when none exists.
      if (!state.target || now >= state.nextDecisionAt) {
        state.target = this.pickNpcTarget(state, tileSize);
        state.nextDecisionAt = now + Phaser.Math.Between(1200, 2200);
      }

      if (state.target) {
        const dx = state.target.x - s.x;
        const dy = state.target.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 4) {
          body.setVelocity(0, 0);
          state.target = undefined;
          state.nextDecisionAt = now + Phaser.Math.Between(700, 1400);
        } else {
          const inv = 1 / dist;
          body.setVelocity(dx * inv * state.speed, dy * inv * state.speed);
        }
      } else {
        body.setVelocity(0, 0);
      }

      // Keep feet-based depth sorting for moving sprites.
      s.setDepth(getFeetDepth(s as any));
    }
  }

  private renderInventoryPanel() {
    if (!this.inventoryUi) {
      this.inventoryUi = new InventoryPanelController({
        scene: this,
        getEquipment: () => this.equipment,
        setEquipment: (next) => {
          this.equipment = next;
        },
        isDialogOpen: () => this.dialog.open,
        updateMaxHpFromArmor: () => this.updateMaxHpFromArmor(),
        getHp: () => this.hp,
        getMaxHp: () => this.maxHp,
        setHp: (nextHp) => {
          this.hp = Math.max(0, Math.min(this.maxHp, Math.floor(nextHp)));
        },
        writeProgress: (force) => this.writeProgress(force),
        exitToTitle: () => this.exitToTitle(),
        setInventoryOpen: (open) => {
          this.inventoryOpen = open;
        },
        clearTapIntent: () => {
          this.tapTarget = undefined;
          this.tapIntent = undefined;
        },
        suppressWorldPointerForMs: (ms) => {
          this.suppressWorldPointerUntilTs = Date.now() + ms;
        },
        suppressExitForMs: (ms) => {
          this.suppressExitUntilTs = Date.now() + ms;
        },
        handleInventorySlotClick: (slotIndex) => this.handleInventorySlotClick(slotIndex),
        getInventoryHint: (inv) => this.getInventoryHint(inv),
      });
    }
    this.inventoryUi.render(this.inventoryOpen);
  }

  private handleInventorySlotClick(slotIndex: number): boolean {
    if (!this.buyerSelectionActive || !this.dialog.open || this.dialog.scriptId !== "buyerNpc") return false;

    const inv = loadInventory();
    const slot = inv.slots[slotIndex];
    this.buyerSelectionActive = false;
    this.inventoryOpen = false;
    this.renderInventoryPanel();

    const script = getDialogScript("buyerNpc");
    if (!script) return false;

    if (!slot) {
      this.buyerOffer = null;
      this.dialog = { open: true, scriptId: script.id, nodeId: "waitPick" };
      this.renderDialog(script);
      return true;
    }

    const offer = getSellOffer(slot);
    if (!offer.ok) {
      this.buyerOffer = null;
      this.dialog = { open: true, scriptId: script.id, nodeId: "noValue" };
      this.renderDialog(script);
      return true;
    }

    this.buyerOffer = { slotIndex, coins: offer.coins, itemName: slot.name, qty: slot.qty, itemId: slot.id };
    this.dialog = { open: true, scriptId: script.id, nodeId: "offer" };
    this.renderDialog(script);
    return true;
  }

  private getInventoryHint(inv: ReturnType<typeof loadInventory>): string | null {
    if (this.buyerSelectionActive && this.dialog.open && this.dialog.scriptId === "buyerNpc") {
      const hasItem = inv.slots.some(Boolean);
      return hasItem ? "Tap an item to offer for sale." : "Your pouch is empty.";
    }
    return null;
  }

  // @ts-expect-error TS6133 - Used in worldSceneCreate.ts
  private ensurePouchButton(): void {
    if (!needsPouchUiRebuild(this.pouchIcon, this.pouchHit)) return;

    // Clean up stale refs (e.g., after scene restart).
    this.pouchIcon?.destroy();
    this.pouchHit?.destroy();
    this.pouchIcon = undefined;
    this.pouchHit = undefined;

    const hit = this.add.rectangle(0, 0, 10, 10, 0x000000, 0).setOrigin(0, 0).setScrollFactor(0).setDepth(1101);
    const icon = this.add.image(0, 0, "ui_pouch").setOrigin(0, 0).setScrollFactor(0).setDepth(1100).setAlpha(0.7);
    icon.setScale(1); // texture is 24x24; layout will size hitbox around it.

    // UI camera only.
    this.cameras.main.ignore([hit, icon]);

    hit.setInteractive({ useHandCursor: true });
    hit.on("pointerdown", (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: any) => {
      // Prevent this click from also becoming a world tap-to-move.
      event?.stopPropagation?.();
      this.suppressWorldPointerUntilTs = Date.now() + 250;
      this.tapTarget = undefined;
      this.tapIntent = undefined;

      if (!canToggleInventory(this.dialog.open)) return;
      this.inventoryOpen = !this.inventoryOpen;
      this.renderInventoryPanel();
    });

    this.pouchIcon = icon;
    this.pouchHit = hit;
  }

  // @ts-expect-error TS6133 - Used in worldSceneCreate.ts
  private layoutPouchButton(): void {
    if (!this.pouchIcon || !this.pouchHit || !this.pouchIcon.active || !this.pouchHit.active) return;

    const { w, h } = normalizeScreenSize(this.scale.width, this.scale.height);
    const l = computePouchIconLayout({ screenW: w, screenH: h });

    // Position icon; size hit rect generously for touch.
    this.pouchIcon.setPosition(l.icon.x, l.icon.y);
    this.pouchIcon.setDisplaySize(l.icon.w, l.icon.h);

    this.pouchHit.setPosition(l.hit.x, l.hit.y);
    this.pouchHit.setSize(l.hit.w, l.hit.h);
  }

  private exitToTitle(): void {
    // Clear local state and sign out before returning to the intro/title.
    clearInventory();
    clearEquipment();
    clearFlags();
    clearProgress();
    clearSession();
    if (typeof window !== "undefined") window.location.reload();
  }

  // @ts-expect-error TS6133 - Used in worldSceneCreate.ts
  private ensurePlayerAnimations() {
    const mk = (key: string, row: number) => {
      if (this.anims.exists(key)) return;
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers("player", { start: row * 4, end: row * 4 + 3 }),
        frameRate: 10,
        repeat: -1,
      });
    };
    mk("walk-down", 0);
    mk("walk-left", 1);
    mk("walk-right", 2);
    mk("walk-up", 3);
  }

  // @ts-expect-error TS6133 - Used in worldSceneCreate.ts
  private ensureTilesetTexture() {
    ensureTilesetTexture(this);
  }

  // @ts-expect-error TS6133 - Used in worldSceneCreate.ts
  private loadArea(areaId: AreaId, entry: EntryId) {
    loadAreaIntoWorldScene(this as any, areaId, entry);
  }

  private openNpcDialog(scriptId: string, npcSprite?: Phaser.GameObjects.Sprite) {
    const script = getDialogScript(scriptId);
    if (!script) return;
    if (npcSprite) {
      this.interactingNpc = npcSprite;
      this.setNpcPaused(npcSprite, true);
    }
    // Ensure inventory doesn't "fight" with dialog input/movement freeze.
    if (this.inventoryOpen) {
      this.inventoryOpen = false;
      this.renderInventoryPanel();
    }
    // Opening dialog should stop any current tap-to-move intent so we don't "snap back"
    // into triggers (like a locked door) immediately after closing.
    this.tapTarget = undefined;
    this.tapIntent = undefined;
    // Reset paging state whenever a dialog is opened (especially for shop menus).
    this.shopDialogPage = 0;
    this.pendingPurchaseItemId = null;
    this.resetBuyerFlow();
    this.dialog = openDialog(script);
    this.renderDialog(script);
  }

  private renderDialog(script: NonNullable<ReturnType<typeof getDialogScript>>) {
    renderDialogInWorldScene(this as any, script);
  }

  // @ts-expect-error TS6133 - Used in worldSceneUpdate.ts
  private closeDialogUi() {
    closeDialogUiInWorldScene(this as any);
    this.resetBuyerFlow();
  }

  private resetBuyerFlow() {
    if (this.buyerSelectionActive && this.inventoryOpen) {
      this.inventoryOpen = false;
      this.renderInventoryPanel();
    }
    this.buyerSelectionActive = false;
    this.buyerOffer = null;
  }

  private startBuyerSelection() {
    this.buyerSelectionActive = true;
    this.buyerOffer = null;
    this.inventoryOpen = true;
    this.renderInventoryPanel();
  }

  // @ts-expect-error TS6133 - Used in dialogUi.ts and worldSceneUpdate.ts
  private handleBuyerChoice(choiceId: string, script: NonNullable<ReturnType<typeof getDialogScript>>): boolean {
    if (choiceId === "sell") {
      this.startBuyerSelection();
      this.dialog = { open: true, scriptId: script.id, nodeId: "waitPick" };
      this.renderDialog(script);
      return true;
    }
    if (choiceId === "offer_pick") {
      this.startBuyerSelection();
      this.dialog = { open: true, scriptId: script.id, nodeId: "waitPick" };
      this.renderDialog(script);
      return true;
    }
    if (choiceId === "offer_accept") {
      const offer = this.buyerOffer;
      if (!offer) {
        this.dialog = { open: true, scriptId: script.id, nodeId: "menu" };
        this.renderDialog(script);
        return true;
      }
      const inv = loadInventory();
      const res = attemptSaleFromSlot(inv, offer.slotIndex);
      if (res.ok) {
        saveInventory(inv);
        this.resetBuyerFlow();
        if (this.inventoryOpen) this.renderInventoryPanel();
        this.dialog = { open: true, scriptId: script.id, nodeId: "sold" };
      } else if (res.reason === "no_value") {
        this.dialog = { open: true, scriptId: script.id, nodeId: "noValue" };
      } else if (res.reason === "empty_slot") {
        this.dialog = { open: true, scriptId: script.id, nodeId: "waitPick" };
      } else {
        this.dialog = { open: true, scriptId: script.id, nodeId: "offer" };
      }
      this.renderDialog(script);
      return true;
    }
    return false;
  }

  update() {
    worldSceneUpdate(this);
  }

  private writeProgress(force: boolean) {
    const now = this.time?.now ?? 0;
    if (!force && now - this.lastProgressWriteAtMs < 500) return;
    if (!this.area) return;
    // Only write when HP changes or forced, to avoid spamming storage too much.
    if (!force && this.hp === this.lastHpWritten) return;
    this.lastHpWritten = this.hp;
    this.lastProgressWriteAtMs = now;
    const p: LocalProgress = {
      areaId: this.area.id,
      entry: this.currentEntry,
      playerX: this.player.x,
      playerY: this.player.y,
      hp: this.hp,
      maxHp: this.maxHp,
    };
    saveProgress(p);
  }
}
