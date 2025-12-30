import Phaser from "phaser";
import { computeMovement, type Direction } from "../../core/movement";
import { VILLAGE_HOUSE_TOP_LEFTS, getArea, type AreaDef, type AreaId, type EntryId } from "../../core/areas";
import {
  advanceLine,
  choose,
  closeDialog,
  getNode,
  openDialog,
  type DialogState,
} from "../../core/dialog";
import { computeDialogLayout } from "../../core/dialogLayout";
import { getPlayerAnim } from "../../core/playerAnimation";
import { getDialogScript } from "../dialog/scripts";
import {
  ensureChestTextures,
  ensureGoblinAndArrowTextures,
  ensureMonsterTexture,
  ensureNpcTextures,
  ensurePeasantPlayerSpriteSheet,
  ensureUiPouchTexture,
  ensureVillageHouseTexture,
} from "../art/sprites";
import { clearFlags, hasFlag, setFlag } from "../../services/game/flags";
import { ITEMS, addItem, getItemCount, removeItem, type ItemId } from "../../core/inventory";
import { clearInventory, loadInventory, saveInventory } from "../../services/game/inventoryStore";
import { applyContactDamage } from "../../core/combat";
import { ensureItemAndPropTextures } from "../art/sprites";
import { clearExitBlockIfLeft, createExitGate, isExitBlocked, blockExit, type TilePos } from "../../core/exitGate";
import { canToggleInventory } from "../../core/uiGating";
import { createEquipment, toggleEquipFromInventorySlot, type EquipmentState } from "../../core/equipment";
import { clearEquipment, loadEquipment, saveEquipment } from "../../services/game/equipmentStore";
import { computeSwordHitbox, createAttackState, tryStartAttack, type AttackState } from "../../core/playerAttack";
import { computeHeldSwordPose, computeSwordSwing } from "../../core/swordVisual";
import { createRangedState, normalize, tryShoot, tryShootWithAmmo, type RangedState } from "../../core/rangedAttack";
import { applyDamage } from "../../core/hp";
import { chooseHeartSpawnTile } from "../../core/heartSpawn";
import { computeDeathTransition } from "../../core/death";
import { normalizeScreenSize } from "../../core/screen";
import { computeTapToMoveInput } from "../../core/tapToMove";
import { computeMobileControlsLayout, type Rect as UiRect } from "../../core/mobileControlsLayout";
import { computeDialogTapAction } from "../../core/dialogTap";
import { pickTapCandidate, type TapCandidateKind } from "../../core/tapTargeting";
import { getTapInteractRangePx, getTapStopDistancePx } from "../../core/tapIntentMovement";
import { shouldShowAttackButton } from "../../core/attackButtonVisibility";
import { clearProgress, saveProgress, type PlayerProgress as LocalProgress } from "../../services/game/progressStore";
import { clearSession, loadSession } from "../../services/auth/session";
import { saveCloudPlayerState } from "../../services/game/cloudPlayerState";
import { isTapOnPlayer } from "../../core/tapOnPlayer";
import { computePouchIconLayout } from "../../core/pouchIconLayout";
import { needsPouchUiRebuild, shouldAllowPlayerTapInventory } from "../../core/pouchUi";
import { withLoadingOverlay } from "../../ui/loadingOverlay";
import { attemptPurchase } from "../../core/shopLogic";
import { getMeleeWeaponStats, getArmorBonus } from "../../core/shopCatalog";
import { paginateDialogChoices } from "../../core/dialogPagination";
import { ARROW_HITBOX } from "../../core/physicsTuning";
import { chooseEnemySpawnTiles } from "../../core/enemySpawn";
import { rollEnemyDrop, type EnemyDrop } from "../../core/enemyDrops";

export class WorldScene extends Phaser.Scene {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private player!: Phaser.Physics.Arcade.Sprite;
  private facing: Exclude<Direction, "none"> = "down";
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private area!: AreaDef;
  private npcsGroup?: Phaser.Physics.Arcade.StaticGroup;
  private chest?: Phaser.Physics.Arcade.Sprite;
  private chestContents?: {
    flag: string;
    loot: Array<{ itemId: ItemId; qty: number }>;
    openedDialog: string;
    emptyDialog: string;
  };
  private interactKey!: Phaser.Input.Keyboard.Key;
  private choiceKeys!: {
    ONE: Phaser.Input.Keyboard.Key;
    TWO: Phaser.Input.Keyboard.Key;
    THREE: Phaser.Input.Keyboard.Key;
    FOUR: Phaser.Input.Keyboard.Key;
  };
  private escapeKey!: Phaser.Input.Keyboard.Key;
  private uiCam!: Phaser.Cameras.Scene2D.Camera;
  private dialog: DialogState = { open: false };
  private dialogBox?: Phaser.GameObjects.Rectangle;
  private dialogText?: Phaser.GameObjects.Text;
  private dialogChoicesText?: Phaser.GameObjects.Text;
  private dialogChoiceTexts: Phaser.GameObjects.Text[] = [];
  private dialogChoiceBgs: Phaser.GameObjects.Rectangle[] = [];
  private shopDialogPage = 0;
  private startAreaId: AreaId = "village";
  private startEntry: EntryId = "start";
  private startProgress?: LocalProgress;
  private currentEntry: EntryId = "start";
  private lastProgressWriteAtMs = 0;
  private lastHpWritten = -1;

  private inventoryKey!: Phaser.Input.Keyboard.Key;
  private inventoryOpen = false;
  private inventoryPanel?: Phaser.GameObjects.Container;
  private inventoryBackdrop?: Phaser.GameObjects.Rectangle;
  private inventorySlotRects: Phaser.GameObjects.Rectangle[] = [];
  private inventorySlotIndexText: Phaser.GameObjects.Text[] = [];
  private inventorySlotNameText: Phaser.GameObjects.Text[] = [];
  private inventorySlotQtyText: Phaser.GameObjects.Text[] = [];
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
  private heldItemSprite?: Phaser.GameObjects.Sprite;
  private slashSwordSprite?: Phaser.GameObjects.Sprite;

  private baseMaxHp = 20;
  private maxHp = 20;
  private hp = 20;
  private dead = false;
  private deathText?: Phaser.GameObjects.Text;
  // Use -Infinity so contact damage can apply immediately on first touch after entering an area.
  private lastHitAtMs = -Infinity;
  private hpText!: Phaser.GameObjects.Text;
  private pouchIcon?: Phaser.GameObjects.Image;
  private pouchHit?: Phaser.GameObjects.Rectangle;
  private keySprite?: Phaser.Physics.Arcade.Sprite;
  private swordSprite?: Phaser.Physics.Arcade.Sprite;
  private bowSprite?: Phaser.Physics.Arcade.Sprite;
  private houseDoorSprite?: Phaser.GameObjects.Sprite;
  private monstersGroup?: Phaser.Physics.Arcade.Group;
  private goblinsGroup?: Phaser.Physics.Arcade.Group;
  private arrowsGroup?: Phaser.Physics.Arcade.Group;
  private playerArrowsGroup?: Phaser.Physics.Arcade.Group;
  private dropsGroup?: Phaser.Physics.Arcade.Group;
  private bowState: RangedState = createRangedState();
  private lastRangedHitAtMs = 0;
  private villageHouses: Phaser.GameObjects.Image[] = [];
  private heartSprite?: Phaser.Physics.Arcade.Sprite;
  private tapTarget?: { x: number; y: number };
  private tapIntent?: { kind: TapCandidateKind; id?: string };
  private suppressWorldPointerUntilTs = 0;
  private suppressExitUntilTs = 0;
  private blockedExitSticky?: { exitId: string; clearRect: { x: number; y: number; w: number; h: number } };
  private onWorldPointerDown?: (pointer: Phaser.Input.Pointer) => void;
  private onScaleResize?: (gameSize: Phaser.Structs.Size) => void;
  private mobileUi?: {
    attackHit: Phaser.GameObjects.Rectangle;
    attackBg: Phaser.GameObjects.Rectangle;
    attackText: Phaser.GameObjects.Text;
  };
  private mobilePress = { attack: false };
  private mobileControlsVisible = false;
  private lastMobileControlsEvalAtMs = 0;

  private dist2(a: { x: number; y: number }, b: { x: number; y: number }) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  }

  private tryInteract(prefer: TapCandidateKind | "any", npcScriptId?: string): boolean {
    const playerPos = { x: this.player.x, y: this.player.y };

    const tryKey = () => {
      const range2 = getTapInteractRangePx("key") ** 2;
      if (!this.keySprite?.active) return false;
      if (this.dist2(playerPos, this.keySprite) > range2) return false;
      setFlag("item.rusty_key.woods.1");
      this.keySprite.destroy();
      this.keySprite = undefined;
      const inv = loadInventory();
      addItem(inv, ITEMS.rusty_key, 1);
      saveInventory(inv);
      if (this.inventoryOpen) this.renderInventoryPanel();
      this.openNpcDialog("keyFound");
      return true;
    };

    const trySword = () => {
      const range2 = getTapInteractRangePx("sword") ** 2;
      if (!this.swordSprite?.active) return false;
      if (this.dist2(playerPos, this.swordSprite) > range2) return false;
      setFlag("item.sword.1");
      this.swordSprite.destroy();
      this.swordSprite = undefined;
      const inv = loadInventory();
      addItem(inv, ITEMS.sword, 1);
      saveInventory(inv);
      if (this.inventoryOpen) this.renderInventoryPanel();
      this.openNpcDialog("swordFound");
      return true;
    };

    const tryBow = () => {
      const range2 = getTapInteractRangePx("bow") ** 2;
      if (!this.bowSprite?.active) return false;
      if (this.dist2(playerPos, this.bowSprite) > range2) return false;
      setFlag("item.bow.1");
      this.bowSprite.destroy();
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
      return true;
    };

    const tryChest = () => {
      const range2 = getTapInteractRangePx("chest") ** 2;
      if (!this.chest?.active) return false;
      if (this.dist2(playerPos, this.chest) > range2) return false;
      const contents = this.chestContents;
      if (!contents) return false;
      const opened = hasFlag(contents.flag);
      if (!opened) {
        setFlag(contents.flag);
        this.chest.setTexture("chest_open");
        this.chest.setDepth(this.chest.y);
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
      return true;
    };

    const tryNpc = () => {
      const range2 = getTapInteractRangePx("npc") ** 2;
      if (!this.npcsGroup) return false;
      const npcs = this.npcsGroup.getChildren() as Phaser.GameObjects.GameObject[];
      let nearest: Phaser.GameObjects.Sprite | null = null;
      let best = Number.POSITIVE_INFINITY;
      for (const obj of npcs) {
        const s = obj as Phaser.GameObjects.Sprite;
        const d2 = this.dist2(playerPos, s);
        if (d2 < best) {
          best = d2;
          nearest = s;
        }
      }
      if (!nearest || best > range2) return false;
      const npcDef = (nearest as any).npcDef as { dialogScriptId?: string } | undefined;
      const scriptId = npcScriptId ?? npcDef?.dialogScriptId;
      if (!scriptId) return false;
      this.openNpcDialog(scriptId);
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

  private attackKey!: Phaser.Input.Keyboard.Key;
  private attackState: AttackState = createAttackState();

  private playEnemyAttackAnim(monster: Phaser.Physics.Arcade.Sprite) {
    // Avoid stacking multiple attack tweens on the same monster.
    const anyM = monster as any;
    if (anyM.__attackAnimActive) return;
    anyM.__attackAnimActive = true;

    // Flash + squash feels like a bite/lunge without fighting Arcade physics.
    monster.setTintFill(0xff6b6b);
    this.tweens.add({
      targets: monster,
      scaleX: 1.15,
      scaleY: 0.85,
      duration: 90,
      yoyo: true,
      ease: "Sine.InOut",
      onComplete: () => {
        monster.setScale(1);
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
    bb.setAllowGravity(false);
    bb.setImmovable(true);
    bb.setSize(14, 10).setOffset(5, 12);
    this.uiCam.ignore(this.bowSprite);
    // slight bob so it feels like a drop
    this.tweens.add({
      targets: this.bowSprite,
      y: y - 3,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });
  }

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
      this.spawnEnemyDrop(dropX, dropY);
      gob.destroy();
      if (wasLast) this.spawnBowDrop(dropX, dropY);
    }
  }

  private spawnEnemyDrop(x: number, y: number) {
    if (!this.dropsGroup) return;
    ensureItemAndPropTextures(this);
    const drop: EnemyDrop = rollEnemyDrop(() => Math.random());
    const key = drop.kind === "heart" ? "item_heart" : "item_coins";
    const s = this.dropsGroup.create(x, y, key) as Phaser.Physics.Arcade.Sprite;
    s.setDepth(s.y);
    const b = s.body as Phaser.Physics.Arcade.Body;
    b.setAllowGravity(false);
    b.setImmovable(true);
    b.setSize(12, 12).setOffset(6, 6);
    (s as any).__drop = drop;
    this.uiCam.ignore(s);
    // subtle bob
    this.tweens.add({ targets: s, y: y - 3, duration: 650, yoyo: true, repeat: -1, ease: "Sine.InOut" });
  }

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
    this.inventoryPanel = undefined;
    this.inventoryBackdrop = undefined;
    this.inventorySlotRects = [];
    this.inventorySlotIndexText = [];
    this.inventorySlotNameText = [];
    this.inventorySlotQtyText = [];
    this.chestContents = undefined;
    this.heldItemSprite = undefined;
    this.slashSwordSprite = undefined;
    this.equipment = loadEquipment();
    this.updateMaxHpFromArmor();
    this.monstersGroup = undefined;
    this.goblinsGroup = undefined;
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

  private getPlayerTilePos(): TilePos {
    const tileSize = 32;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const tx = Math.floor(this.player.x / tileSize);
    const ty = Math.floor((body.bottom - 1) / tileSize);
    return { x: tx, y: ty };
  }

  private updateMaxHpFromArmor() {
    const armorBonus = getArmorBonus(this.equipment.armorItemId);
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

  private expandRect(rect: { x: number; y: number; w: number; h: number }, by: number) {
    return { x: rect.x - by, y: rect.y - by, w: rect.w + by * 2, h: rect.h + by * 2 };
  }

  create() {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys("W,A,S,D") as {
      W: Phaser.Input.Keyboard.Key;
      A: Phaser.Input.Keyboard.Key;
      S: Phaser.Input.Keyboard.Key;
      D: Phaser.Input.Keyboard.Key;
    };

    this.cameras.main.setRoundPixels(true);
    this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.escapeKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.inventoryKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.I);
    this.attackKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.invSelectKeys = this.input.keyboard!.addKeys("ONE,TWO,THREE,FOUR,FIVE,SIX,SEVEN,EIGHT,NINE") as any;
    this.choiceKeys = this.input.keyboard!.addKeys("ONE,TWO,THREE,FOUR") as {
      ONE: Phaser.Input.Keyboard.Key;
      TWO: Phaser.Input.Keyboard.Key;
      THREE: Phaser.Input.Keyboard.Key;
      FOUR: Phaser.Input.Keyboard.Key;
    };

    this.ensureTilesetTexture();
    // Ensure item textures exist for held-item rendering even in areas that don't spawn items.
    ensureItemAndPropTextures(this);
    // Arrow texture is shared with goblin archers and the player bow.
    ensureGoblinAndArrowTextures(this);

    ensurePeasantPlayerSpriteSheet(this);
    this.ensurePlayerAnimations();

    this.player = this.physics.add.sprite(0, 0, "player");
    this.player.setOrigin(0.5, 0.5);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    this.player.setScale(1);
    // Tighten body to feet for better collisions vs tiles.
    // Frame is 24x24; body is 12x10 near the bottom.
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setSize(12, 10);
    body.setOffset(6, 13);

    this.cameras.main.startFollow(this.player, true);
    // Slightly closer now that sprites are larger/more detailed.
    this.cameras.main.setZoom(2.0);
    // Allow the player to move inside a box before the camera scrolls.
    this.cameras.main.setDeadzone(200, 120);

    // UI camera: renders UI at zoom=1 regardless of world camera zoom.
    this.uiCam = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    this.uiCam.setScroll(0, 0);
    this.uiCam.setZoom(1);
    // UI camera should not render world objects.
    this.uiCam.ignore(this.player);

    // Tap-to-move: set a world-space target on pointer down.
    // IMPORTANT: WorldScene is restarted between areas; avoid stacking listeners.
    if (!this.onWorldPointerDown) {
      this.onWorldPointerDown = (pointer: Phaser.Input.Pointer) => {
        if (Date.now() < this.suppressWorldPointerUntilTs) return;
        if (!this.player) return;
        if (this.dead) return;
        if (this.dialog.open) return;
        // Avoid right-click on desktop.
        if ((pointer as any).rightButtonDown?.()) return;
        // Avoid taps on mobile UI buttons counting as movement taps.
        if (this.isPointerOverMobileControls(pointer)) return;
        const wp = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

        const hasTouch =
          !!this.sys.game.device.input.touch ||
          (typeof navigator !== "undefined" && (navigator.maxTouchPoints ?? 0) > 0) ||
          (typeof window !== "undefined" && ("ontouchstart" in window));
        if (
          shouldAllowPlayerTapInventory() &&
          hasTouch &&
          isTapOnPlayer({
            tapX: wp.x,
            tapY: wp.y,
            playerX: this.player.x,
            playerY: this.player.y,
            radiusPx: 20,
          })
        ) {
          this.inventoryOpen = !this.inventoryOpen;
          this.tapTarget = undefined;
          this.tapIntent = undefined;
          this.renderInventoryPanel();
          // Prevent the same tap from becoming a movement target.
          this.suppressWorldPointerUntilTs = Date.now() + 250;
          return;
        }
        if (this.inventoryOpen) return;
        const candidates = this.getTapCandidates();
        const picked = pickTapCandidate({ tapX: wp.x, tapY: wp.y, candidates, maxDistancePx: 22 });
        if (picked.ok) {
          this.tapTarget = { x: picked.picked.x, y: picked.picked.y };
          this.tapIntent = { kind: picked.picked.kind, id: picked.picked.id };
        } else {
          this.tapTarget = { x: wp.x, y: wp.y };
          this.tapIntent = undefined;
        }
      };
    }
    this.input.off("pointerdown", this.onWorldPointerDown);
    this.input.on("pointerdown", this.onWorldPointerDown);

    // Ensure we detach global listeners on shutdown to avoid stale callbacks during restart.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.onWorldPointerDown) this.input.off("pointerdown", this.onWorldPointerDown);
      if (this.onScaleResize) this.scale.off("resize", this.onScaleResize);
    });

    // Previously: inline handler (kept for reference)
    // this.input.on("pointerdown", ...)
    /*
      if (this.dead) return;
      if (this.dialog.open) return;
      if (this.inventoryOpen) return;
      // Avoid right-click on desktop.
      if ((pointer as any).rightButtonDown?.()) return;
      // Avoid taps on mobile UI buttons counting as movement taps.
      if (this.isPointerOverMobileControls(pointer)) return;
      const wp = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const candidates = this.getTapCandidates();
      const picked = pickTapCandidate({ tapX: wp.x, tapY: wp.y, candidates, maxDistancePx: 22 });
      if (picked.ok) {
        this.tapTarget = { x: picked.picked.x, y: picked.picked.y };
        this.tapIntent = { kind: picked.picked.kind, id: picked.picked.id };
      } else {
        this.tapTarget = { x: wp.x, y: wp.y };
        this.tapIntent = undefined;
      }
    */

    this.hpText = this.add
      .text(10, 10, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "17px",
        color: "#ff6b6b",
      })
      .setScrollFactor(0)
      .setDepth(1000);
    this.cameras.main.ignore(this.hpText);
    // Remove debug HUD elements (keep only HP).

    // Inventory button (top-left): small semi-transparent pouch icon.
    ensureUiPouchTexture(this);
    this.ensurePouchButton();
    this.layoutPouchButton();

    // Keep UI camera + modal layouts correct across resizes (mobile address bar, rotation, etc).
    if (!this.onScaleResize) {
      this.onScaleResize = (gameSize: Phaser.Structs.Size) => {
        if (!this.uiCam) return;
        const { w, h } = normalizeScreenSize(gameSize.width, gameSize.height);
        this.uiCam.setSize(w, h);
        // Re-render modals with the new screen size.
        if (this.inventoryOpen) this.renderInventoryPanel();
        if (this.dialog.open) {
          const script = getDialogScript(this.dialog.scriptId);
          if (script) this.renderDialog(script);
        }
        // Center death overlay text if it's visible.
        if (this.deathText) this.deathText.setPosition(w / 2, h / 2);

        // Re-layout mobile buttons.
        this.layoutMobileControls();
        // Re-layout pouch icon.
        this.layoutPouchButton();
      };
    }
    this.scale.off("resize", this.onScaleResize);
    this.scale.on("resize", this.onScaleResize);

    this.ensureMobileControls();
    this.layoutMobileControls();

    this.loadArea(this.startAreaId, this.startEntry);
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
      enemyNearby: this.isEnemyNearby(32 * 7),
      hasWeapon: !!this.equipment.heldItemId,
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

  private isPointerOverMobileControls(pointer: Phaser.Input.Pointer): boolean {
    if (!this.mobileUi) return false;
    if (!this.mobileControlsVisible) return false;
    const px = pointer.x;
    const py = pointer.y;
    const within = (r: Phaser.GameObjects.Rectangle) =>
      px >= r.x && px <= r.x + r.width && py >= r.y && py <= r.y + r.height;
    return within(this.mobileUi.attackHit);
  }

  private isEnemyNearby(maxDistPx: number): boolean {
    const max2 = maxDistPx * maxDistPx;
    const px = this.player?.x ?? 0;
    const py = this.player?.y ?? 0;
    const nearGroup = (g?: Phaser.Physics.Arcade.Group) => {
      if (!g) return false;
      for (const obj of g.getChildren()) {
        const s = obj as Phaser.Physics.Arcade.Sprite;
        if (!s.active) continue;
        const dx = s.x - px;
        const dy = s.y - py;
        if (dx * dx + dy * dy <= max2) return true;
      }
      return false;
    };
    return nearGroup(this.monstersGroup) || nearGroup(this.goblinsGroup);
  }

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

  private renderInventoryPanel() {
    const inv = loadInventory();
    const truncate = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

    // Lazily create modal elements
    if (!this.inventoryBackdrop) {
      this.inventoryBackdrop = this.add
        .rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.45)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(2400)
        .setInteractive();
      this.inventoryBackdrop.on("pointerdown", (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: any) => {
        // Prevent this click from also becoming a world tap-to-move.
        event?.stopPropagation?.();
        this.suppressWorldPointerUntilTs = Date.now() + 250;
        this.tapTarget = undefined;
        this.tapIntent = undefined;
        this.inventoryOpen = false;
        this.renderInventoryPanel();
      });
      this.cameras.main.ignore(this.inventoryBackdrop);
    }

    if (!this.inventoryPanel) {
      const bg = this.add.rectangle(0, 0, 10, 10, 0x0d1a12, 0.97).setStrokeStyle(2, 0x3a2a1a, 0.9);
      const header = this.add.rectangle(0, 0, 10, 32, 0x1c2b1f, 0.94).setOrigin(0, 0.5).setStrokeStyle(1, 0x3d4a3a, 0.9);
      const title = this.add.text(0, 0, "Pouch", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        color: "#f5d76e",
      });
      const hint = this.add.text(0, 0, "Tap pouch / I / Esc to close • 1-9 to hold item", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "12px",
        color: "#cbd5df",
      });

      this.inventoryPanel = this.add.container(0, 0, [bg, header, title, hint]);
      (bg as any).invRole = "bg";
      (header as any).invRole = "header";
      (title as any).invRole = "title";
      (hint as any).invRole = "hint";
      this.inventoryPanel.setDepth(2500).setScrollFactor(0);
      this.cameras.main.ignore(this.inventoryPanel);

      // Build 20 slots (5x4 grid)
      for (let i = 0; i < 20; i++) {
        const r = this.add.rectangle(0, 0, 10, 10, 0x14251a, 1).setStrokeStyle(1, 0x2f3b32, 1);
        r.setInteractive({ useHandCursor: true });
        r.on("pointerdown", () => {
          // Allow tap-to-equip on mobile (and click on desktop) while inventory is open.
          if (!this.inventoryOpen) return;
          if (this.dialog.open) return;
          const invNow = loadInventory();
          const res = toggleEquipFromInventorySlot(this.equipment, invNow, i);
          if (!res.ok) return;
          this.equipment = res.next;
          saveEquipment(this.equipment);
          this.updateMaxHpFromArmor();
          this.renderInventoryPanel();
        });
        const idx = this.add.text(0, 0, "", {
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: "11px",
          color: "#9fb5c4",
        });
        const name = this.add.text(0, 0, "", {
          fontFamily: "system-ui, sans-serif",
          fontSize: "12px",
          color: "#e8f0e6",
        });
        const qty = this.add.text(0, 0, "", {
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: "12px",
          color: "#f5d76e",
        });
        this.inventorySlotRects.push(r);
        this.inventorySlotIndexText.push(idx);
        this.inventorySlotNameText.push(name);
        this.inventorySlotQtyText.push(qty);
        this.inventoryPanel.add([r, idx, name, qty]);
      }

      // Cloud save + Exit buttons (bottom center row)
      const saveBg = this.add.rectangle(0, 0, 10, 10, 0x1a2b20, 1).setStrokeStyle(1, 0x3b6b88, 1);
      const saveText = this.add
        .text(0, 0, "Save", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "20px",
        color: "#ffffff",
        })
        .setOrigin(0, 0.5);
      const exitBg = this.add.rectangle(0, 0, 10, 10, 0x2a1b1b, 1).setStrokeStyle(1, 0x8b3a3a, 1);
      const exitText = this.add
        .text(0, 0, "Save and Exit to Title", {
          fontFamily: "system-ui, sans-serif",
          fontSize: "22px",
          color: "#ffffff",
        })
        .setOrigin(0.5, 0.5);
      const saveMsg = this.add
        .text(0, 0, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "12px",
          color: "#cbd5df",
        })
        .setOrigin(0.5, 0.5);
      const versionText = this.add
        .text(0, 0, "v0.1.2", {
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: "11px",
          color: "#9fb5c4",
        })
        .setOrigin(1, 0.5);
      (saveBg as any).invRole = "saveBg";
      (saveText as any).invRole = "saveText";
      (saveMsg as any).invRole = "saveMsg";
      (exitBg as any).invRole = "exitBg";
      (exitText as any).invRole = "exitText";
      (versionText as any).invRole = "version";
      // Set initial label depending on auth state.
      const initialSession = loadSession();
      const initialIsFirebase = initialSession?.mode === "firebase";
      exitText.setText(initialIsFirebase ? "Save and Exit to Title" : "Exit to Title");
      saveBg.setInteractive({ useHandCursor: true });
      saveBg.on("pointerdown", async () => {
        const session = loadSession();
        if (!session || session.mode !== "firebase") return;
        // Always ensure local progress is up to date before saving.
        this.writeProgress(true);
        const res = await saveCloudPlayerState(session);
        if (res.ok) {
          saveMsg.setText("Saved.");
          this.time.delayedCall(1200, () => saveMsg.setText(""));
        } else {
          saveMsg.setText(res.reason === "firebase_not_configured" ? "Firebase not configured." : "Save failed.");
          this.time.delayedCall(2000, () => saveMsg.setText(""));
        }
      });
      exitBg.setInteractive({ useHandCursor: true });
      exitBg.on("pointerdown", async () => {
        const session = loadSession();
        const isFirebase = session?.mode === "firebase";
        // Update label based on auth state before closing so text stays accurate.
        exitText.setText(isFirebase ? "Save and Exit to Title" : "Exit to Title");
        this.inventoryOpen = false;
        this.renderInventoryPanel();

        await withLoadingOverlay(
          async () => {
            if (isFirebase) {
              // Save before exiting
              this.writeProgress(true);
              await saveCloudPlayerState(session);
            }
            this.exitToTitle();
          },
          {
            message: isFirebase ? "Saving and Exiting to title..." : "Exiting to title",
            minDurationMs: 2000,
          }
        );
      });
      this.inventoryPanel.add([saveBg, saveText, saveMsg, exitBg, exitText, versionText]);
    }

    // Layout (responsive)
    const W = this.scale.width;
    const H = this.scale.height;
    const panelW = Math.min(520, W - 40);
    const panelH = Math.min(360, H - 40);
    const panelX = W / 2;
    const panelY = H / 2;
    const pad = 14;
    const topBarH = 34;
    const cols = 5;
    const rows = 4;
    const gap = 10;

    this.inventoryBackdrop.setSize(W, H).setPosition(0, 0);
    this.inventoryPanel.setPosition(panelX, panelY);

    const bg = this.inventoryPanel.list.find((o) => (o as any).invRole === "bg") as Phaser.GameObjects.Rectangle;
    const header = this.inventoryPanel.list.find((o) => (o as any).invRole === "header") as Phaser.GameObjects.Rectangle;
    const title = this.inventoryPanel.list.find((o) => (o as any).invRole === "title") as Phaser.GameObjects.Text;
    const hint = this.inventoryPanel.list.find((o) => (o as any).invRole === "hint") as Phaser.GameObjects.Text;
    const saveBg = this.inventoryPanel.list.find((o) => (o as any).invRole === "saveBg") as Phaser.GameObjects.Rectangle;
    const saveText = this.inventoryPanel.list.find((o) => (o as any).invRole === "saveText") as Phaser.GameObjects.Text;
    const saveMsg = this.inventoryPanel.list.find((o) => (o as any).invRole === "saveMsg") as Phaser.GameObjects.Text;
    const exitBg = this.inventoryPanel.list.find((o) => (o as any).invRole === "exitBg") as Phaser.GameObjects.Rectangle;
    const exitText = this.inventoryPanel.list.find((o) => (o as any).invRole === "exitText") as Phaser.GameObjects.Text;
    const versionText = this.inventoryPanel.list.find((o) => (o as any).invRole === "version") as Phaser.GameObjects.Text;

    bg.setSize(panelW, panelH);
    header.setSize(panelW, topBarH).setPosition(-panelW / 2, -panelH / 2 + topBarH / 2);
    title.setPosition(-panelW / 2 + pad, -panelH / 2 + 8).setText("Pouch (20)");
    hint.setPosition(panelW / 2 - pad - hint.width, -panelH / 2 + 10);

    // Save + Exit row (bottom center, slightly overlapping for a "tab" look)
    const saveW = 140;
    const saveH = 44;
    const exitW = 240;
    const exitH = 44;
    const buttonsGap = 16;
    const canSave = (() => {
      const s = loadSession();
      return !!s && s.mode === "firebase";
    })();
    const rowW = (canSave ? saveW + buttonsGap : 0) + exitW;
    const buttonsStartX = -rowW / 2;
    const buttonY = panelH / 2 - saveH / 2 + 38;

    if (canSave) {
      saveBg.setSize(saveW, saveH).setPosition(buttonsStartX, buttonY).setOrigin(0, 0.5).setVisible(true);
      saveText.setPosition(buttonsStartX + saveW / 2, buttonY).setOrigin(0.5, 0.5).setVisible(true);
    } else {
      saveBg.setVisible(false);
      saveText.setVisible(false);
    }
    saveMsg.setPosition(0, buttonY - saveH / 2 - 8);

    exitBg
      .setSize(exitW, exitH)
      .setPosition(buttonsStartX + (canSave ? saveW + buttonsGap : 0), buttonY)
      .setOrigin(0, 0.5);
    exitText.setPosition(exitBg.x + exitW / 2, buttonY);
    // saveMsg remains visible only when text is set; still hide when not logged in
    if (!canSave) saveMsg.setText("");
    saveMsg.setVisible(canSave);

    // Version tag at bottom-right of the panel
    versionText.setPosition(panelW / 2 - pad, panelH / 2 - pad / 2).setVisible(true);

    const gridW = panelW - pad * 2;
    const gridH = panelH - pad * 2 - topBarH;
    const slotW = Math.floor((gridW - gap * (cols - 1)) / cols);
    const slotH = Math.floor((gridH - gap * (rows - 1)) / rows);
    const gridStartX = -panelW / 2 + pad;
    const startY = -panelH / 2 + pad + topBarH;

    for (let i = 0; i < 20; i++) {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const x = gridStartX + c * (slotW + gap);
      const y = startY + r * (slotH + gap);

      const rect = this.inventorySlotRects[i]!;
      const idx = this.inventorySlotIndexText[i]!;
      const name = this.inventorySlotNameText[i]!;
      const qty = this.inventorySlotQtyText[i]!;

      rect.setPosition(x + slotW / 2, y + slotH / 2).setSize(slotW, slotH);
      idx.setPosition(x + 6, y + 4).setText(String(i + 1));
      name.setPosition(x + 6, y + 18);
      qty.setPosition(x + slotW - 6, y + slotH - 18).setOrigin(1, 0);

      const s = inv.slots[i];
      if (!s) {
        rect.setFillStyle(0x16281d, 1).setStrokeStyle(1, 0x2f3b32, 1);
        name.setText("").setColor("#9fb5c4");
        qty.setText("");
      } else {
        const held = this.equipment.heldItemId === s.id;
        rect
          .setFillStyle(0x1c2c22, 1)
          .setStrokeStyle(held ? 2 : 1, held ? 0xf5d76e : 0x4f7a6b, 1);
        name.setText(truncate(s.name, 10)).setColor("#e8f0e6");
        qty.setText(String(s.qty));
      }
    }

    const visible = this.inventoryOpen;
    this.inventoryBackdrop.setVisible(visible);
    this.inventoryPanel.setVisible(visible);
  }

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

  private ensureTilesetTexture() {
    if (this.textures.exists("tileset_2x2")) return;

    // Build a 3x2 tilesheet: 96x64, each tile is 32x32.
    // Indices are row-major (cols=3):
    // 0 grass, 1 wall, 2 forest, 3 cave, 4 dirt, 5 trees (canopy wall)
    const c = document.createElement("canvas");
    c.width = 96;
    c.height = 64;
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");

    const rect = (x: number, y: number, w: number, h: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
    };
    const px = (x: number, y: number, color: string) => rect(x, y, 1, 1, color);

    // 0 grass (shaded + speckles, no hard horizontal borders to avoid stripe artifacts)
    rect(0, 0, 32, 32, "#2b8a3e");
    for (let i = 0; i < 70; i++)
      px(1 + ((i * 7) % 30), 1 + ((i * 13) % 30), i % 3 ? "#2f9442" : "#257a38");
    for (let i = 0; i < 18; i++)
      px(2 + ((i * 11) % 28), 2 + ((i * 17) % 28), "#38a34a");

    // 1 wall/wood (beveled)
    rect(32, 0, 32, 32, "#6b4f2a");
    rect(32, 0, 32, 2, "#7a5a30");
    rect(32, 30, 32, 2, "#5b4122");
    for (let x = 34; x < 64; x += 6) {
      rect(x, 4, 2, 24, "#644826");
      rect(x + 1, 4, 1, 24, "#5b4122");
    }

    // 2 forest floor (darker, with leaf speckles)
    rect(64, 0, 32, 32, "#1b5e20");
    for (let i = 0; i < 60; i++)
      px(65 + ((i * 11) % 30), 1 + ((i * 5) % 30), i % 3 ? "#1f6a24" : "#164d1a");
    for (let i = 0; i < 20; i++)
      px(66 + ((i * 9) % 28), 2 + ((i * 19) % 28), "#2a8a3a");

    // 3 cave floor (stone with cracks)
    rect(0, 32, 32, 32, "#4b5563");
    rect(0, 32, 32, 1, "#5b6676");
    rect(0, 63, 32, 1, "#3b4450");
    for (let i = 0; i < 20; i++) px(2 + ((i * 9) % 28), 34 + ((i * 7) % 28), "#424b57");
    for (let i = 0; i < 10; i++) {
      const x = 2 + ((i * 5) % 28);
      const y = 34 + ((i * 11) % 28);
      px(x, y, "#2c333d");
      px(x + 1, y, "#2c333d");
    }

    // 4 dirt path
    rect(32, 32, 32, 32, "#8b5a2b");
    for (let i = 0; i < 50; i++)
      px(33 + ((i * 7) % 30), 33 + ((i * 11) % 30), i % 2 ? "#7a4d25" : "#9c6a35");
    for (let i = 0; i < 14; i++)
      px(34 + ((i * 13) % 28), 34 + ((i * 17) % 28), "#a8743a");

    // 5 tree wall (dense canopy). Designed to tile without obvious repeated "trunks".
    rect(64, 32, 32, 32, "#12441f"); // canopy base
    // darker rim (reads like depth)
    rect(64, 32, 32, 2, "#0a2a12");
    rect(64, 62, 32, 2, "#071f0e");
    rect(64, 32, 2, 32, "#0a2a12");
    rect(64 + 30, 32, 2, 32, "#071f0e");

    // Layered leaf speckles (deterministic pseudo-random patterns)
    for (let i = 0; i < 220; i++) {
      const x = 64 + 1 + ((i * 11 + 3) % 30);
      const y = 32 + 1 + ((i * 17 + 7) % 30);
      px(x, y, i % 5 ? "#145724" : "#0e3a19");
    }
    for (let i = 0; i < 90; i++) {
      const x = 64 + 2 + ((i * 19 + 5) % 28);
      const y = 32 + 2 + ((i * 23 + 11) % 28);
      px(x, y, i % 3 ? "#1a6b2c" : "#0b2f15");
    }
    // highlights
    for (let i = 0; i < 45; i++) {
      const x = 64 + 3 + ((i * 13 + 9) % 26);
      const y = 32 + 3 + ((i * 29 + 4) % 26);
      px(x, y, "#2a8a3a");
    }

    // soft shadow under canopy (helps borders read as a wall)
    for (let x = 64 + 2; x < 64 + 30; x += 2) {
      px(x, 32 + 29, "#071f0e");
    }

    this.textures.addSpriteSheet("tileset_2x2", c as unknown as HTMLImageElement, {
      frameWidth: 32,
      frameHeight: 32,
    });

    // Ensure nearest-neighbor sampling to avoid seams.
    this.textures.get("tileset_2x2").setFilter(Phaser.Textures.FilterMode.NEAREST);
  }

  private loadArea(areaId: AreaId, entry: EntryId) {
    // WorldScene is designed to be restarted between areas.
    // loadArea assumes a fresh scene state.

    this.area = getArea(areaId);
    // HUD removed (keep only HP).
    this.bowState = createRangedState();

    const tileSize = 32;
    const map = this.make.tilemap({
      data: this.area.tiles,
      tileWidth: tileSize,
      tileHeight: tileSize,
    });
    const tileset = map.addTilesetImage("tileset_2x2");
    const layer = map.createLayer(0, tileset!, 0, 0);
    if (!layer) throw new Error("Failed to create tilemap layer");
    layer.setCollision([1, 5]);
    layer.setDepth(-10000);
    this.uiCam.ignore(layer);

    const worldW = this.area.width * tileSize;
    const worldH = this.area.height * tileSize;
    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setBounds(0, 0, worldW, worldH);

    // Collide player with walls.
    this.physics.add.collider(this.player, layer);
    // Fresh area: clear single-area objects.
    this.chest?.destroy();
    this.chest = undefined;
    this.chestContents = undefined;
    this.bowSprite?.destroy();
    this.bowSprite = undefined;
    this.playerArrowsGroup = this.physics.add.group();
    this.physics.add.collider(this.playerArrowsGroup, layer, (_arrow) => {
      const a = _arrow as Phaser.Physics.Arcade.Sprite;
      a.destroy();
    });

    // Drop items (coins/hearts) created by enemy deaths.
    this.dropsGroup = this.physics.add.group();
    this.physics.add.collider(this.dropsGroup, layer);
    this.physics.add.overlap(this.player, this.dropsGroup, (_p, d) => {
      const drop = d as Phaser.Physics.Arcade.Sprite;
      const meta = (drop as any).__drop as EnemyDrop | undefined;
      if (!meta) {
        drop.destroy();
        return;
      }
      if (meta.kind === "heart") {
        const heal = 5;
        this.hp = Math.min(this.maxHp, this.hp + heal);
        this.writeProgress(true);
        drop.destroy();
        return;
      }
      // coins
      const inv = loadInventory();
      addItem(inv, ITEMS.coins, meta.qty);
      saveInventory(inv);
      if (this.inventoryOpen) this.renderInventoryPanel();
      drop.destroy();
    });

    // Spawn player
    const spawn = this.area.spawns[entry] ?? this.area.spawns.start;
    this.currentEntry = entry;
    // If we have a saved progress for this area, prefer exact coordinates.
    const sp = this.startProgress && this.startProgress.areaId === areaId ? this.startProgress : undefined;
    if (sp) {
      this.player.setPosition(sp.playerX, sp.playerY);
      // Recompute maxHp from armor (in case armor changed since save)
      this.updateMaxHpFromArmor();
      this.hp = Math.max(0, Math.min(this.maxHp, sp.hp));
    } else {
      this.player.setPosition(spawn.x * tileSize + tileSize / 2, spawn.y * tileSize + tileSize / 2);
      this.updateMaxHpFromArmor();
    }
    this.player.setVelocity(0, 0);
    // Persist progress locally (localStorage) so it can be saved to cloud by button.
    this.writeProgress(true);

    // One random heart pickup per area load.
    this.heartSprite?.destroy();
    const heartTile = chooseHeartSpawnTile(this.area);
    if (heartTile) {
      ensureItemAndPropTextures(this); // ensures item_heart exists too
      const hx = heartTile.x * tileSize + tileSize / 2;
      const hy = heartTile.y * tileSize + tileSize / 2;
      this.heartSprite = this.physics.add.sprite(hx, hy, "item_heart");
      this.heartSprite.setDepth(this.heartSprite.y);
      const hb = this.heartSprite.body as Phaser.Physics.Arcade.Body;
      hb.setAllowGravity(false);
      hb.setImmovable(true);
      hb.setSize(12, 12).setOffset(6, 6);
      this.uiCam.ignore(this.heartSprite);
      // little bob
      this.tweens.add({ targets: this.heartSprite, y: hy - 3, duration: 650, yoyo: true, repeat: -1, ease: "Sine.InOut" });

      this.physics.add.overlap(this.player, this.heartSprite, () => {
        if (!this.heartSprite?.active) return;
        const heal = 5;
        this.hp = Math.min(this.maxHp, this.hp + heal);
        this.writeProgress(true);
        this.heartSprite.destroy();
        this.heartSprite = undefined;
      });
    }

    // Exits
    const exits = this.physics.add.staticGroup();
    for (const ex of this.area.exits) {
      const r = ex.rect;
      const x = r.x * tileSize;
      const y = r.y * tileSize;
      const w = r.w * tileSize;
      const h = r.h * tileSize;

      const zone = this.add.zone(x + w / 2, y + h / 2, w, h);
      this.physics.add.existing(zone, true);
      (zone as any).exitDef = ex;
      exits.add(zone);
      this.uiCam.ignore(zone);
    }
    this.physics.add.overlap(this.player, exits, (_player, z) => {
      if (Date.now() < this.suppressExitUntilTs) return;
      if (this.dialog.open) return;
      const exitDef = (z as any).exitDef as {
        id: string;
        rect: { x: number; y: number; w: number; h: number };
        toArea: AreaId;
        toEntry: EntryId;
      };
      const playerTile = this.getPlayerTilePos();

      // Sticky suppression: if we already showed a "blocked" dialog for this exit and the
      // player hasn't moved away from the doorway region, don't re-trigger it.
      if (this.blockedExitSticky?.exitId === exitDef.id) {
        const r = this.blockedExitSticky.clearRect;
        const inside =
          playerTile.x >= r.x &&
          playerTile.x < r.x + r.w &&
          playerTile.y >= r.y &&
          playerTile.y < r.y + r.h;
        if (inside) return;
        this.blockedExitSticky = undefined;
      }

      if (isExitBlocked(this.exitGate, exitDef.id, playerTile)) return;

      // Locked door logic (house -> hallway)
      if (this.area.id === "house" && exitDef.id === "toHallway") {
        if (!hasFlag("door.house.hallway.unlocked")) {
          const inv = loadInventory();
          const ok = removeItem(inv, "rusty_key", 1);
          if (!ok) {
            this.exitGate = blockExit(exitDef.id, exitDef.rect);
            // Suppress re-showing until the player leaves the doorway region.
            this.blockedExitSticky = { exitId: exitDef.id, clearRect: this.expandRect(exitDef.rect, 1) };
            // Give the player a moment to step away after dismissing the dialog.
            this.suppressExitUntilTs = Date.now() + 700;
            this.openNpcDialog("doorLocked");
            return;
          }
          saveInventory(inv);
          setFlag("door.house.hallway.unlocked");
          this.houseDoorSprite?.setTexture("prop_door_open");
        }
      }

      // Full reset between areas to avoid lingering physics/overlap/input state.
      this.scene.restart({ areaId: exitDef.toArea, entry: exitDef.toEntry });
    });

    // NPCs
    const npcs = this.physics.add.staticGroup();
    ensureNpcTextures(this);
    for (const npc of this.area.npcs) {
      const x = npc.pos.x * tileSize + tileSize / 2;
      const y = npc.pos.y * tileSize + tileSize / 2;
      const tex = npc.id === "elder" ? "npc_elder" : "npc_villager";
      const s = this.add.sprite(x, y, tex);
      s.setDepth(5);
      (s as any).npcDef = npc;
      this.physics.add.existing(s, true);
      const nb = s.body as Phaser.Physics.Arcade.StaticBody;
      // Feet collision: 12x10 near bottom of 24x24.
      nb.setSize(12, 10);
      nb.setOffset(6, 13);
      npcs.add(s);
      this.uiCam.ignore(s);
    }
    this.npcsGroup = npcs;

    // Village houses (visual only; collision is handled by wall tiles).
    if (this.area.id === "village") {
      ensureVillageHouseTexture(this);
      for (const topLeft of VILLAGE_HOUSE_TOP_LEFTS) {
        const houseX = topLeft.x * tileSize + (7 * tileSize) / 2;
        const houseY = topLeft.y * tileSize + (4 * tileSize) / 2;
        const img = this.add.image(houseX, houseY, "prop_house_village");
        // Depth near the bottom edge of the house so the player can appear in front when below it.
        img.setDepth(topLeft.y * tileSize + 4 * tileSize - 2);
        this.uiCam.ignore(img);
        this.villageHouses.push(img);
      }
    }

    // House chest
    if (this.area.id === "house") {
      ensureChestTextures(this);
      ensureItemAndPropTextures(this);
      const opened = hasFlag("chest.house.1");
      const tx = opened ? "chest_open" : "chest_closed";
      const cx = Math.floor(this.area.width / 2) * tileSize + tileSize / 2;
      const cy = Math.floor(this.area.height / 2) * tileSize + tileSize / 2;
      this.chest = this.physics.add.sprite(cx, cy, tx);
      this.chest.setImmovable(true);
      this.chest.setDepth(this.chest.y);
      const cb = this.chest.body as Phaser.Physics.Arcade.Body;
      cb.setSize(16, 12);
      cb.setOffset(4, 10);
      this.physics.add.collider(this.player, this.chest);
      this.uiCam.ignore(this.chest);
      this.chestContents = {
        flag: "chest.house.1",
        loot: [{ itemId: "coins", qty: 25 }],
        openedDialog: "chestMessage",
        emptyDialog: "chestEmpty",
      };

      // Locked door prop at top center
      const unlocked = hasFlag("door.house.hallway.unlocked");
      const dx = Math.floor(this.area.width / 2) * tileSize + tileSize / 2;
      const dy = tileSize / 2;
      this.houseDoorSprite = this.add.sprite(dx, dy, unlocked ? "prop_door_open" : "prop_door_locked");
      this.houseDoorSprite.setDepth(this.houseDoorSprite.y);
      this.uiCam.ignore(this.houseDoorSprite);
    }

    // Woods monsters
    if (this.area.id === "woods") {
      ensureMonsterTexture(this);
      ensureItemAndPropTextures(this);
      ensureChestTextures(this);
      const chestOpened = hasFlag("chest.woods.arrows.1");
      const cx = (this.area.width - 3) * tileSize + tileSize / 2;
      const cy = 2 * tileSize + tileSize / 2;
      this.chest = this.physics.add.sprite(cx, cy, chestOpened ? "chest_open" : "chest_closed");
      this.chest.setImmovable(true);
      this.chest.setDepth(this.chest.y);
      const cb = this.chest.body as Phaser.Physics.Arcade.Body;
      cb.setSize(16, 12);
      cb.setOffset(4, 10);
      this.physics.add.collider(this.player, this.chest);
      this.uiCam.ignore(this.chest);
      this.chestContents = {
        flag: "chest.woods.arrows.1",
        loot: [{ itemId: "arrows", qty: 25 }],
        openedDialog: "arrowsChest",
        emptyDialog: "chestEmpty",
      };
      // Key in the middle of the forest (once)
      if (!hasFlag("item.rusty_key.woods.1")) {
        const kx = Math.floor(this.area.width / 2) * tileSize + tileSize / 2;
        const ky = Math.floor(this.area.height / 2) * tileSize + tileSize / 2;
        this.keySprite = this.physics.add.sprite(kx, ky, "item_key");
        this.keySprite.setDepth(this.keySprite.y);
        const kb = this.keySprite.body as Phaser.Physics.Arcade.Body;
        kb.setSize(14, 10).setOffset(5, 12);
        this.physics.add.collider(this.keySprite, layer);
        this.uiCam.ignore(this.keySprite);
      } else {
        this.keySprite = undefined;
      }

      const monsters = this.physics.add.group();
      this.monstersGroup = monsters;

      const avoid = this.getPlayerTilePos();
      const monsterTiles = chooseEnemySpawnTiles({
        area: this.area,
        count: 5,
        rng: () => Math.random(),
        avoid: [avoid],
        minDistTiles: 4,
      });
      for (const p of monsterTiles) {
        const mx = p.x * tileSize + tileSize / 2;
        const my = p.y * tileSize + tileSize / 2;
        const m = this.physics.add.sprite(mx, my, "monster_slime");
        m.setDepth(m.y);
        (m.body as Phaser.Physics.Arcade.Body).setSize(14, 10).setOffset(5, 12);
        monsters.add(m);
        this.uiCam.ignore(m);
        // collide vs walls
        this.physics.add.collider(m, layer);
      }

      // Prevent monsters from crossing the player and each other.
      this.physics.add.collider(this.player, monsters);
      this.physics.add.collider(monsters, monsters);
      if (this.playerArrowsGroup) {
        this.physics.add.overlap(this.playerArrowsGroup, monsters, (_a, m) => {
          const arrow = _a as Phaser.Physics.Arcade.Sprite;
          const mon = m as Phaser.Physics.Arcade.Sprite;
          arrow.destroy();
          this.spawnEnemyDrop(mon.x, mon.y);
          mon.destroy();
        });
      }

      // Roam + chase: update velocities every 500ms
      this.time.addEvent({
        delay: 500,
        loop: true,
        callback: () => {
          for (const obj of monsters.getChildren()) {
            const m = obj as Phaser.Physics.Arcade.Sprite;
            const dx = this.player.x - m.x;
            const dy = this.player.y - m.y;
            const d2 = dx * dx + dy * dy;
            const chaseRadius = (32 * 6) ** 2;
            if (d2 <= chaseRadius) {
              const d = Math.max(1, Math.sqrt(d2));
              const speed = 70;
              m.setVelocity((dx / d) * speed, (dy / d) * speed);
            } else {
              const dir = Phaser.Math.Between(0, 3);
              const speed = 45;
              if (dir === 0) m.setVelocity(speed, 0);
              if (dir === 1) m.setVelocity(-speed, 0);
              if (dir === 2) m.setVelocity(0, speed);
              if (dir === 3) m.setVelocity(0, -speed);
            }
            m.setDepth(m.y);
          }
        },
      });

      // Damage on contact with cooldown + enemy attack animation when damage lands.
      this.physics.add.collider(this.player, monsters, (_p, m) => {
        const mon = m as Phaser.Physics.Arcade.Sprite;
        const now = this.time.now;
        const r = applyContactDamage({
          hp: this.hp,
          nowMs: now,
          lastHitAtMs: this.lastHitAtMs,
          cooldownMs: 450,
          damage: 1,
        });
        this.hp = r.hp;
        this.lastHitAtMs = r.lastHitAtMs;
        if (r.tookHit) this.playEnemyAttackAnim(mon);
        if (r.tookHit) this.writeProgress(true);
      });
    } else {
      // no monsters outside woods
      this.monstersGroup?.destroy(true);
      this.monstersGroup = undefined;
      this.keySprite?.destroy();
      this.keySprite = undefined;
    }

    // Cave goblin archers + arrows
    if (this.area.id === "cave") {
      ensureGoblinAndArrowTextures(this);
      const goblins = this.physics.add.group();
      const arrows = this.physics.add.group();
      this.goblinsGroup = goblins;
      this.arrowsGroup = arrows;

      // Spawn a few goblin archers near pillars.
      const avoid = this.getPlayerTilePos();
      const goblinTiles = chooseEnemySpawnTiles({
        area: this.area,
        count: 3,
        rng: () => Math.random(),
        avoid: [avoid],
        minDistTiles: 5,
      });
      for (const p of goblinTiles) {
        const gx = p.x * tileSize + tileSize / 2;
        const gy = p.y * tileSize + tileSize / 2;
        const g = this.physics.add.sprite(gx, gy, "enemy_goblin");
        g.setDepth(g.y);
        // feet-ish body
        const gb = g.body as Phaser.Physics.Arcade.Body;
        gb.setSize(12, 10).setOffset(6, 13);
        // Don't let the player "push" goblins around (looks like they run away).
        gb.setImmovable(true);
        (g as any).setPushable?.(false);
        (g as any).__lastShotAtMs = -Infinity;
        (g as any).__hp = 3;
        (g as any).__strafeSign = Math.random() < 0.5 ? -1 : 1;
        goblins.add(g);
        this.uiCam.ignore(g);
        this.physics.add.collider(g, layer);
      }

      // Goblins can't overlap the player or each other.
      this.physics.add.collider(this.player, goblins);
      this.physics.add.collider(goblins, goblins);

      // Arrow physics: no gravity, collide with walls, damage player.
      for (const obj of arrows.getChildren()) {
        // (none at init)
        void obj;
      }
      this.physics.add.collider(arrows, layer, (_a) => {
        const a = _a as Phaser.Physics.Arcade.Sprite;
        a.destroy();
      });
      this.physics.add.overlap(this.player, arrows, (_p, a) => {
        const arrow = a as Phaser.Physics.Arcade.Sprite;
        const now = this.time.now;
        const r = applyContactDamage({
          hp: this.hp,
          nowMs: now,
          lastHitAtMs: this.lastRangedHitAtMs,
          cooldownMs: 350,
          damage: 1,
        });
        this.hp = r.hp;
        this.lastRangedHitAtMs = r.lastHitAtMs;
        arrow.destroy();
        if (r.tookHit) {
          this.cameras.main.flash(60, 255, 107, 107);
        }
      });

      if (this.playerArrowsGroup) {
        this.physics.add.overlap(this.playerArrowsGroup, goblins, (_a, g) => {
          const arrow = _a as Phaser.Physics.Arcade.Sprite;
          const gob = g as Phaser.Physics.Arcade.Sprite;
          this.damageGoblin(gob, 1);
          arrow.destroy();
        });
      }

      // Shooting loop: goblins fire when player is within range and cooldown allows.
      this.time.addEvent({
        delay: 250,
        loop: true,
        callback: () => {
          const now = this.time.now;
          for (const obj of goblins.getChildren()) {
            const g = obj as Phaser.Physics.Arcade.Sprite;
            if (!g.active) continue;
            const dx = this.player.x - g.x;
            const dy = this.player.y - g.y;
            const d2 = dx * dx + dy * dy;
            const range2 = (32 * 10) ** 2;
            if (d2 > range2) continue;

            const lastShotAtMs = (g as any).__lastShotAtMs as number;
            const attempt = tryShoot({ nowMs: now, state: { lastShotAtMs }, cooldownMs: 900 });
            if (!attempt.ok) continue;
            (g as any).__lastShotAtMs = attempt.next.lastShotAtMs;

            // Shoot arrow toward player.
            const dir = normalize({ x: this.player.x - g.x, y: this.player.y - g.y });
            if (dir.x === 0 && dir.y === 0) continue;
            const speed = 190;
            const spawnDist = 16; // spawn out of the goblin body to avoid instant wall/pillar collisions
            const ax = g.x + dir.x * spawnDist;
            const ay = g.y + dir.y * spawnDist;
            // IMPORTANT: create via the physics group so the group doesn't re-enable/reset the body
            // after we set velocity (which would make arrows appear "stuck").
            const arrow = arrows.create(ax, ay, "proj_arrow") as Phaser.Physics.Arcade.Sprite;
            arrow.setDepth(arrow.y);
            const ab = arrow.body as Phaser.Physics.Arcade.Body;
            ab.setAllowGravity(false);
            ab.setSize(ARROW_HITBOX.w, ARROW_HITBOX.h).setOffset(ARROW_HITBOX.offsetX, ARROW_HITBOX.offsetY);
            ab.setVelocity(dir.x * speed, dir.y * speed);
            arrow.setRotation(Math.atan2(dir.y, dir.x));
            this.uiCam.ignore(arrow);

            // Small shoot "twitch"
            g.setTintFill(0xf5d76e);
            this.tweens.add({
              targets: g,
              scaleX: 1.08,
              scaleY: 0.92,
              duration: 70,
              yoyo: true,
              onComplete: () => {
                if (!g.active) return;
                g.setScale(1);
                g.clearTint();
              },
            });

            // Cleanup if arrow survives too long
            this.time.delayedCall(2200, () => {
              if (arrow.active) arrow.destroy();
            });
          }
        },
      });

      // Movement loop: keep distance and strafe a little so they feel alive.
      this.time.addEvent({
        delay: 300,
        loop: true,
        callback: () => {
          for (const obj of goblins.getChildren()) {
            const g = obj as Phaser.Physics.Arcade.Sprite;
            if (!g.active) continue;
            const dx = this.player.x - g.x;
            const dy = this.player.y - g.y;
            const d = Math.hypot(dx, dy);
            const dir = d > 0 ? { x: dx / d, y: dy / d } : { x: 0, y: 0 };

            // Desired distance band.
            const tooClose = d < 32 * 4.5;
            const tooFar = d > 32 * 7.5 && d < 32 * 10;
            const speed = tooClose ? 70 : tooFar ? 55 : 0;
            const toward = tooFar ? 1 : -1; // if tooClose -> move away (negative), if tooFar -> move toward (positive)
            const strafeSign = ((g as any).__strafeSign as number) ?? 1;
            const strafe = { x: -dir.y * strafeSign, y: dir.x * strafeSign };

            const vx = speed * (dir.x * toward + strafe.x * 0.35);
            const vy = speed * (dir.y * toward + strafe.y * 0.35);
            g.setVelocity(vx, vy);
            g.setDepth(g.y);
          }
        },
      });
    } else {
      // no goblins outside cave
      this.goblinsGroup?.destroy(true);
      this.goblinsGroup = undefined;
      this.arrowsGroup?.destroy(true);
      this.arrowsGroup = undefined;
      if (this.bowSprite) {
        this.bowSprite.destroy();
        this.bowSprite = undefined;
      }
    }

    // Hallway props: torches + sword
    if (this.area.id === "hallway") {
      ensureItemAndPropTextures(this);
      // Torches along walls
      for (let y = 3; y < this.area.height - 3; y += 4) {
        const lx = 1 * tileSize + tileSize / 2;
        const rx = (this.area.width - 2) * tileSize + tileSize / 2;
        const wy = y * tileSize + tileSize / 2;
        const t1 = this.add.sprite(lx, wy, "prop_torch").setDepth(wy);
        const t2 = this.add.sprite(rx, wy, "prop_torch").setDepth(wy);
        this.uiCam.ignore([t1, t2]);
      }
      // Sword at the end (once)
      if (!hasFlag("item.sword.1")) {
        const sx = Math.floor(this.area.width / 2) * tileSize + tileSize / 2;
        const sy = 2 * tileSize + tileSize / 2;
        this.swordSprite = this.physics.add.sprite(sx, sy, "item_sword");
        this.swordSprite.setDepth(this.swordSprite.y);
        const sb = this.swordSprite.body as Phaser.Physics.Arcade.Body;
        sb.setSize(14, 10).setOffset(5, 12);
        this.physics.add.collider(this.swordSprite, layer);
        this.uiCam.ignore(this.swordSprite);
      } else {
        this.swordSprite = undefined;
      }
    } else {
      this.swordSprite?.destroy();
      this.swordSprite = undefined;
    }
  }

  private openNpcDialog(scriptId: string) {
    const script = getDialogScript(scriptId);
    if (!script) return;
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
    this.dialog = openDialog(script);
    this.renderDialog(script);
  }

  private renderDialog(script: NonNullable<ReturnType<typeof getDialogScript>>) {
    const node = getNode(script, this.dialog);
    if (!node) {
      this.closeDialogUi();
      this.dialog = closeDialog();
      return;
    }

    const layout = computeDialogLayout(this.scale.width, this.scale.height);

    if (!this.dialogBox) {
      this.dialogBox = this.add
        .rectangle(layout.x, layout.y, layout.w, layout.h, 0x0f1418, 0.92)
        .setStrokeStyle(2, 0x2a3a44, 1)
        .setScrollFactor(0)
        .setDepth(2000);
      this.dialogBox.setInteractive();
      this.dialogBox.on("pointerdown", () => {
        this.suppressWorldPointerUntilTs = Date.now() + 250;
        this.suppressExitUntilTs = Date.now() + 250;
        if (!this.dialog.open) return;
        const nodeNow = getNode(script, this.dialog);
        if (!nodeNow) return;

        // If a choice line was tapped, its own handler will run (it's above the box).
        const action = computeDialogTapAction(nodeNow);
        if (action === "advance") {
          this.dialog = advanceLine(script, this.dialog);
          if (!this.dialog.open) {
            this.closeDialogUi();
            return;
          }
          this.renderDialog(script);
        } else if (action === "close") {
          this.dialog = closeDialog();
          this.closeDialogUi();
        }
      });

      this.dialogText = this.add
        .text(layout.x - layout.w / 2 + layout.padding, layout.y - layout.h / 2 + 10, "", {
          fontFamily: "system-ui, sans-serif",
          fontSize: "14px",
          color: "#ffffff",
          wordWrap: { width: layout.w - layout.padding * 2 },
        })
        .setScrollFactor(0)
        .setDepth(2001);

      this.dialogChoicesText = this.add
        .text(layout.x - layout.w / 2 + layout.padding, layout.y - layout.h / 2 + 70, "", {
          fontFamily: "system-ui, sans-serif",
          fontSize: "13px",
          color: "#b7c3cc",
          wordWrap: { width: layout.w - layout.padding * 2 },
        })
        .setScrollFactor(0)
        .setDepth(2001);

      // Render dialog via UI camera only (prevents zoom-based clipping).
      this.cameras.main.ignore([this.dialogBox, this.dialogText, this.dialogChoicesText]);
    }

    // Always re-position + re-wrap in case the canvas size changed.
    this.dialogBox!
      .setPosition(layout.x, layout.y)
      .setSize(layout.w, layout.h);
    this.dialogText!
      .setPosition(layout.x - layout.w / 2 + layout.padding, layout.y - layout.h / 2 + 10)
      .setWordWrapWidth(layout.w - layout.padding * 2);
    this.dialogChoicesText!
      // Footer/instructions live at the bottom of the panel to avoid overlapping choices.
      .setPosition(layout.x - layout.w / 2 + layout.padding, layout.y + layout.h / 2 - 28)
      .setWordWrapWidth(layout.w - layout.padding * 2);

    const header = node.kind === "end" ? (node.text ?? "") : node.text;
    this.dialogText!.setText(header);

    // Rebuild tappable choice lines each render (keeps handlers consistent).
    for (const t of this.dialogChoiceTexts) t.destroy();
    this.dialogChoiceTexts = [];
    for (const r of this.dialogChoiceBgs) r.destroy();
    this.dialogChoiceBgs = [];

    if (node.kind === "choice") {
      const baseX = layout.x - layout.w / 2 + layout.padding;
      // Reduce spacing: start choices just below the header text block.
      const headerH = Math.max(18, Math.ceil(this.dialogText!.getBounds().height));
      const baseY = (layout.y - layout.h / 2 + 10) + headerH + 6;
      const lineH = 22;

      const MORE_ID = "__more_items__";
      const isShop = script.id === "shopkeeper";
      let choicesToRender = node.choices;
      let nextPage: number | null = null;
      if (isShop) {
        const page = paginateDialogChoices(node.choices, this.shopDialogPage, 3);
        choicesToRender = page.visible;
        nextPage = page.nextPage;
        if (page.hasMore) {
          choicesToRender = [
            ...choicesToRender,
            // Synthetic; handled locally and does not advance the dialog node.
            { id: MORE_ID, text: "More items...", next: node.id },
          ];
        }
      }

      for (let i = 0; i < choicesToRender.length; i++) {
        const ch = choicesToRender[i]!;
        const y = baseY + i * lineH;
        const bg = this.add
          .rectangle(baseX, y + 2, layout.w - layout.padding * 2, lineH - 2, 0x000000, 0.14)
          .setOrigin(0, 0)
          .setScrollFactor(0)
          .setDepth(2001);
        const t = this.add
          .text(baseX + 10, y, `${i + 1}) ${ch.text}`, {
            fontFamily: "system-ui, sans-serif",
            fontSize: "13px",
            color: "#e2e8f0",
            wordWrap: { width: layout.w - layout.padding * 2 },
          })
          .setScrollFactor(0)
          .setDepth(2002);
        bg.setInteractive({ useHandCursor: true });
        t.setInteractive({ useHandCursor: true });
        const setHot = (hot: boolean) => {
          bg.setFillStyle(0x000000, hot ? 0.22 : 0.14);
          t.setColor(hot ? "#ffffff" : "#e2e8f0");
        };
        setHot(false);
        const onDown = () => {
          this.suppressWorldPointerUntilTs = Date.now() + 250;
          this.suppressExitUntilTs = Date.now() + 250;
          if (!this.dialog.open) return;
          const n = getNode(script, this.dialog);
          if (!n || n.kind !== "choice") return;

          // Shop paging: keep choices within the dialog box by paging in chunks of 3.
          if (isShop && ch.id === MORE_ID) {
            this.shopDialogPage = nextPage ?? 0;
            this.renderDialog(script);
            return;
          }

          // Shopkeeper purchases: apply side effects before re-render.
          if (isShop && ch.id.startsWith("buy_")) {
            const itemId = ch.id.slice("buy_".length) as any;
            const inv = loadInventory();
            const res = attemptPurchase(inv, itemId);
            saveInventory(inv);
            if (this.inventoryOpen) this.renderInventoryPanel();
            const nodeId = res.ok ? "buyOk" : res.reason === "insufficient_coins" ? "buyNoCoins" : "buyNoSpace";
            this.shopDialogPage = 0;
            this.dialog = { open: true, scriptId: script.id, nodeId } as DialogState;
            this.renderDialog(script);
            return;
          }

          this.dialog = choose(script, this.dialog, ch.id);
          if (isShop) this.shopDialogPage = 0;
          this.renderDialog(script);
        };
        for (const obj of [bg, t] as const) {
          obj.on("pointerover", () => setHot(true));
          obj.on("pointerout", () => setHot(false));
          obj.on("pointerdown", onDown);
        }
        this.cameras.main.ignore([bg, t]);
        this.dialogChoiceTexts.push(t);
        this.dialogChoiceBgs.push(bg);
      }

      this.dialogChoicesText!.setText("Tap a choice • Tap dialog to close");
    } else if (node.kind === "line") {
      this.dialogChoicesText!.setText("Tap dialog to continue");
    } else {
      this.dialogChoicesText!.setText("Tap dialog to close");
    }
  }

  private closeDialogUi() {
    this.dialogBox?.destroy();
    this.dialogText?.destroy();
    this.dialogChoicesText?.destroy();
    for (const t of this.dialogChoiceTexts) t.destroy();
    this.dialogChoiceTexts = [];
    for (const r of this.dialogChoiceBgs) r.destroy();
    this.dialogChoiceBgs = [];
    this.dialogBox = undefined;
    this.dialogText = undefined;
    this.dialogChoicesText = undefined;
    this.shopDialogPage = 0;
  }

  update() {
    const death = computeDeathTransition({ hp: this.hp, wasDead: this.dead });
    if (death.justDied) {
      this.dead = true;
      // Close any modal UI.
      if (this.inventoryOpen) {
        this.inventoryOpen = false;
        this.renderInventoryPanel();
      }
      if (this.dialog.open) {
        this.dialog = closeDialog();
        this.closeDialogUi();
      }

      // Stop motion + show overlay.
      this.player.setVelocity(0, 0);
      this.cameras.main.flash(120, 255, 80, 80);
      this.deathText = this.add
        .text(this.scale.width / 2, this.scale.height / 2, "You died\nRespawning…", {
          fontFamily: "system-ui, sans-serif",
          fontSize: "22px",
          color: "#ffffff",
          align: "center",
        })
        .setOrigin(0.5, 0.5)
        .setScrollFactor(0)
        .setDepth(5000);
      this.cameras.main.ignore(this.deathText);

      // Respawn after a short delay (restore HP and return to village start).
      this.time.delayedCall(900, () => {
        this.hp = this.maxHp;
        this.writeProgress(true);
        this.scene.restart({ areaId: "village", entry: "start" });
      });
      return;
    }

    if (this.dead) {
      // While dead, freeze gameplay.
      this.player.setVelocity(0, 0);
      return;
    }

    // If we have a tap intent (tap on item/NPC/chest), auto-trigger when in range.
    if (this.tapIntent && !this.dialog.open && !this.inventoryOpen) {
      if (this.tapIntent.kind === "heart") {
        // Keep moving until the overlap pickup destroys the heart.
        if (!this.heartSprite?.active) {
          this.tapTarget = undefined;
          this.tapIntent = undefined;
        }
      } else if (this.tapIntent.kind === "key") {
        if (!this.keySprite?.active) {
          this.tapTarget = undefined;
          this.tapIntent = undefined;
        } else {
          const ok = this.tryInteract("key");
          if (ok) {
            this.tapTarget = undefined;
            this.tapIntent = undefined;
          }
        }
      } else if (this.tapIntent.kind === "sword") {
        if (!this.swordSprite?.active) {
          this.tapTarget = undefined;
          this.tapIntent = undefined;
        } else {
          const ok = this.tryInteract("sword");
          if (ok) {
            this.tapTarget = undefined;
            this.tapIntent = undefined;
          }
        }
      } else if (this.tapIntent.kind === "chest") {
        const ok = this.tryInteract("chest");
        if (ok) {
          this.tapTarget = undefined;
          this.tapIntent = undefined;
        }
      } else if (this.tapIntent.kind === "npc") {
        const ok = this.tryInteract("npc", this.tapIntent.id);
        if (ok) {
          this.tapTarget = undefined;
          this.tapIntent = undefined;
        }
      }
    }

    // Clear "blocked exit" once the player steps off the exit tile.
    this.exitGate = clearExitBlockIfLeft(this.exitGate, this.getPlayerTilePos());
    // Also clear sticky blocked-exit suppression once the player truly leaves the doorway region.
    if (this.blockedExitSticky) {
      const t = this.getPlayerTilePos();
      const r = this.blockedExitSticky.clearRect;
      const inside =
        t.x >= r.x && t.x < r.x + r.w &&
        t.y >= r.y && t.y < r.y + r.h;
      if (!inside) this.blockedExitSticky = undefined;
    }

    // Close inventory with Esc (if not in dialog)
    if (this.inventoryOpen && !this.dialog.open && Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
      this.inventoryOpen = false;
      this.renderInventoryPanel();
    }

    if (canToggleInventory(this.dialog.open) && Phaser.Input.Keyboard.JustDown(this.inventoryKey)) {
      this.inventoryOpen = !this.inventoryOpen;
      this.renderInventoryPanel();
    }

    // Equip/hold item from inventory slots (1..9) while inventory is open.
    if (this.inventoryOpen && !this.dialog.open) {
      const pick =
        Phaser.Input.Keyboard.JustDown(this.invSelectKeys.ONE)
          ? 0
          : Phaser.Input.Keyboard.JustDown(this.invSelectKeys.TWO)
            ? 1
            : Phaser.Input.Keyboard.JustDown(this.invSelectKeys.THREE)
              ? 2
              : Phaser.Input.Keyboard.JustDown(this.invSelectKeys.FOUR)
                ? 3
                : Phaser.Input.Keyboard.JustDown(this.invSelectKeys.FIVE)
                  ? 4
                  : Phaser.Input.Keyboard.JustDown(this.invSelectKeys.SIX)
                    ? 5
                    : Phaser.Input.Keyboard.JustDown(this.invSelectKeys.SEVEN)
                      ? 6
                      : Phaser.Input.Keyboard.JustDown(this.invSelectKeys.EIGHT)
                        ? 7
                        : Phaser.Input.Keyboard.JustDown(this.invSelectKeys.NINE)
                          ? 8
                          : -1;
      if (pick >= 0) {
        const inv = loadInventory();
        const r = toggleEquipFromInventorySlot(this.equipment, inv, pick);
        if (r.ok) {
          this.equipment = r.next;
          saveEquipment(this.equipment);
          this.updateMaxHpFromArmor();
          this.renderInventoryPanel();
        }
      }
    }
    // Dialog input takes priority and freezes movement.
    if (this.dialog.open) {
      const script = getDialogScript(this.dialog.open ? this.dialog.scriptId : "");
      if (!script) {
        this.closeDialogUi();
        this.dialog = closeDialog();
        return;
      }

      if (Phaser.Input.Keyboard.JustDown(this.escapeKey)) {
        this.dialog = closeDialog();
        this.closeDialogUi();
        return;
      }

      if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
        const node = getNode(script, this.dialog);
        if (!node) {
          this.dialog = closeDialog();
          this.closeDialogUi();
          return;
        }
        if (node.kind === "line") this.dialog = advanceLine(script, this.dialog);
        else if (node.kind === "end") this.dialog = closeDialog();
        // for choice, E does nothing (use number keys)
        this.renderDialog(script);
        if (!this.dialog.open) this.closeDialogUi();
      }

      // Choice selection (1..4)
      const node = getNode(script, this.dialog);
      if (node && node.kind === "choice") {
        const pick =
          Phaser.Input.Keyboard.JustDown(this.choiceKeys.ONE)
            ? 0
            : Phaser.Input.Keyboard.JustDown(this.choiceKeys.TWO)
              ? 1
              : Phaser.Input.Keyboard.JustDown(this.choiceKeys.THREE)
                ? 2
                : Phaser.Input.Keyboard.JustDown(this.choiceKeys.FOUR)
                  ? 3
                : -1;
        if (pick >= 0 && node.kind === "choice") {
          const isShop = script.id === "shopkeeper";
          if (isShop) {
            const MORE_ID = "__more_items__";
            const page = paginateDialogChoices(node.choices, this.shopDialogPage, 3);
            const list = page.hasMore
              ? [...page.visible, { id: MORE_ID, text: "More items...", next: node.id }]
              : page.visible;
            if (pick < list.length) {
              const ch = list[pick]!;
              if (ch.id === MORE_ID) {
                this.shopDialogPage = page.nextPage ?? 0;
                this.renderDialog(script);
                return;
              }
              this.shopDialogPage = 0;
              this.dialog = choose(script, this.dialog, ch.id);
              this.renderDialog(script);
            }
            return;
          }

          if (pick < node.choices.length) {
            this.dialog = choose(script, this.dialog, node.choices[pick]!.id);
            this.renderDialog(script);
          }
        }
      }

      this.player.setVelocity(0, 0);
      return;
    }

    // Melee attack (Space or mobile Attack) when holding any melee weapon.
    const mobileAttackDown = this.mobilePress.attack;
    // Consume mobile press for "JustDown" semantics.
    if (mobileAttackDown) this.mobilePress.attack = false;
    const wantAttack = Phaser.Input.Keyboard.JustDown(this.attackKey) || mobileAttackDown;
    const heldWeaponId = this.equipment.heldItemId;
    const meleeStats = heldWeaponId ? getMeleeWeaponStats(heldWeaponId) : null;
    if (wantAttack && meleeStats) {
      const now = this.time.now;
      const r = tryStartAttack({ nowMs: now, state: this.attackState, cooldownMs: meleeStats.cooldownMs });
      if (r.ok) {
        this.attackState = r.next;

        // Visual slash: swing weapon sprite around the handle pivot.
        const pose = computeHeldSwordPose(this.facing);
        const handX = this.player.x + pose.dx;
        const handY = this.player.y + pose.dy;
        const swing = computeSwordSwing(this.facing);

        // Keep one active slash sprite (cooldown should prevent overlaps, but be safe).
        this.slashSwordSprite?.destroy();
        this.slashSwordSprite = this.add.sprite(handX, handY, meleeStats.textureKey);
        this.slashSwordSprite
          .setOrigin(pose.originX, pose.originY)
          .setScale(pose.scale * 1.08)
          .setRotation(swing.startRotation)
          .setAlpha(0.95);
        this.uiCam.ignore(this.slashSwordSprite);

        // Briefly hide the held weapon so it doesn't look like two weapons at once.
        if (this.heldItemSprite) this.heldItemSprite.setVisible(false);

        this.tweens.add({
          targets: this.slashSwordSprite,
          rotation: swing.endRotation,
          alpha: 0,
          duration: swing.durationMs,
          ease: "Sine.InOut",
          onComplete: () => {
            this.slashSwordSprite?.destroy();
            this.slashSwordSprite = undefined;
            if (this.heldItemSprite) this.heldItemSprite.setVisible(true);
          },
        });

        // Hitbox: short-lived overlap zone in front of player.
        const hb = computeSwordHitbox({
          playerX: this.player.x,
          playerY: this.player.y,
          facing: this.facing,
          reachPx: meleeStats.reachPx,
          widthPx: meleeStats.widthPx,
          heightPx: meleeStats.heightPx,
        });
        const zone = this.add.zone(hb.x + hb.w / 2, hb.y + hb.h / 2, hb.w, hb.h);
        this.physics.add.existing(zone);
        const zb = zone.body as Phaser.Physics.Arcade.Body;
        zb.setAllowGravity(false);
        zb.setImmovable(true);
        this.uiCam.ignore(zone);

        const monsters = this.monstersGroup;
        if (monsters) {
          this.physics.add.overlap(zone, monsters, (_z, m) => {
            const mon = m as Phaser.Physics.Arcade.Sprite;
            this.spawnEnemyDrop(mon.x, mon.y);
            mon.destroy();
          });
        }

        const goblins = this.goblinsGroup;
        if (goblins) {
          this.physics.add.overlap(zone, goblins, (_z, g) => {
            const gob = g as Phaser.Physics.Arcade.Sprite;
            this.damageGoblin(gob, meleeStats.damage);
          });
        }
        this.time.delayedCall(90, () => zone.destroy());
      }
    } else if (wantAttack && this.equipment.heldItemId === "bow") {
      const now = this.time.now;
      const inv = loadInventory();
      const arrows = getItemCount(inv, "arrows");
      const shot = tryShootWithAmmo({ nowMs: now, state: this.bowState, cooldownMs: 450, arrows });
      if (shot.ok) {
        this.bowState = shot.next;
        const removed = removeItem(inv, "arrows", 1);
        if (removed) {
          saveInventory(inv);
          if (this.inventoryOpen) this.renderInventoryPanel();
        }
        const dir =
          this.facing === "up"
            ? { x: 0, y: -1 }
            : this.facing === "down"
              ? { x: 0, y: 1 }
              : this.facing === "left"
                ? { x: -1, y: 0 }
                : { x: 1, y: 0 };
        this.shootPlayerArrow(dir);
      } else if (shot.reason === "no_arrows") {
        this.cameras.main.shake(80, 0.002);
      }
    }

    // Interact with NPC/chest/items (press E)
    if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.tryInteract("any");
      // Manual interact cancels any pending tap intent.
      this.tapIntent = undefined;
    }

    const keyboardInput = {
      up: !!(this.cursors.up?.isDown || this.wasd.W.isDown),
      down: !!(this.cursors.down?.isDown || this.wasd.S.isDown),
      left: !!(this.cursors.left?.isDown || this.wasd.A.isDown),
      right: !!(this.cursors.right?.isDown || this.wasd.D.isDown),
    };

    // If the player uses keyboard, cancel tap-to-move (and any pending tap intent).
    const keyboardActive =
      keyboardInput.up || keyboardInput.down || keyboardInput.left || keyboardInput.right;
    if (keyboardActive) {
      this.tapTarget = undefined;
      this.tapIntent = undefined;
    }

    const input =
      this.tapTarget && !keyboardActive
        ? (() => {
            const stopDistancePx = getTapStopDistancePx(this.tapIntent?.kind);
            const r = computeTapToMoveInput({
              playerX: this.player.x,
              playerY: this.player.y,
              targetX: this.tapTarget!.x,
              targetY: this.tapTarget!.y,
              stopDistancePx,
            });
            // If we have a tap intent, the intent completion logic decides when to clear.
            if (r.arrived && !this.tapIntent) this.tapTarget = undefined;
            return r.input;
          })()
        : keyboardInput;

    // 2x speed when walking on dirt path tiles
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const tileSize = 32;
    const tx = Math.floor(this.player.x / tileSize);
    const ty = Math.floor((body.bottom - 1) / tileSize);
    const tile = this.area.tiles[ty]?.[tx] ?? 0;
    const speed = tile === 4 ? 160 : 80;

    const { vx, vy, facing } = computeMovement(input, speed, this.facing);
    this.facing = facing;
    this.player.setVelocity(vx, vy);
    // Feet-based depth sorting: lower feet draw in front.
    this.player.setDepth(this.player.y);
    if (this.chest) this.chest.setDepth(this.chest.y);
    if (this.npcsGroup) {
      for (const obj of this.npcsGroup.getChildren()) {
        const s = obj as Phaser.GameObjects.Sprite;
        s.setDepth(s.y);
      }
    }

    const moving = vx !== 0 || vy !== 0;
    const anim = getPlayerAnim(this.facing, moving);
    if (anim.type === "walk") {
      this.player.anims.play(anim.key, true);
    } else {
      this.player.anims.stop();
      this.player.setFrame(anim.frame);
    }

    this.hpText.setText(`HP: ${this.hp}/${this.maxHp}`);
    this.writeProgress(false);

    // Re-evaluate mobile Attack visibility while playing (enemy proximity changes over time).
    // Throttled to avoid doing extra work every frame.
    if (this.time.now - this.lastMobileControlsEvalAtMs > 200) {
      this.lastMobileControlsEvalAtMs = this.time.now;
      this.layoutMobileControls();
    }

    // Held item rendering: melee weapons and bow.
    const heldId = this.equipment.heldItemId;
    const meleeWeaponStats = heldId ? getMeleeWeaponStats(heldId) : null;
    if (meleeWeaponStats) {
      if (!this.heldItemSprite) {
        this.heldItemSprite = this.add.sprite(this.player.x, this.player.y, meleeWeaponStats.textureKey);
        this.heldItemSprite.setOrigin(0.5, 0.9);
        this.uiCam.ignore(this.heldItemSprite);
      } else {
        this.heldItemSprite.setTexture(meleeWeaponStats.textureKey);
      }
      const pose = computeHeldSwordPose(this.facing);
      this.heldItemSprite
        .setPosition(this.player.x + pose.dx, this.player.y + pose.dy)
        .setOrigin(pose.originX, pose.originY)
        .setScale(pose.scale)
        .setRotation(pose.rotation);
      this.heldItemSprite.setDepth(this.player.y + 1);
      // If we're mid-slash, the held sprite stays hidden (slash sprite is shown instead).
      if (!this.slashSwordSprite) this.heldItemSprite.setVisible(true);
    } else if (this.equipment.heldItemId === "bow") {
      if (!this.heldItemSprite) {
        this.heldItemSprite = this.add.sprite(this.player.x, this.player.y, "item_bow");
        this.heldItemSprite.setOrigin(0.5, 0.9);
        this.uiCam.ignore(this.heldItemSprite);
      } else {
        this.heldItemSprite.setTexture("item_bow");
      }
      const offsets = {
        up: { dx: 0, dy: -4, rotation: -Math.PI / 2 },
        down: { dx: 0, dy: 6, rotation: Math.PI / 2 },
        left: { dx: -6, dy: 0, rotation: Math.PI },
        right: { dx: 6, dy: 0, rotation: 0 },
      };
      const pose = offsets[this.facing];
      this.heldItemSprite
        .setPosition(this.player.x + pose.dx, this.player.y + pose.dy)
        .setOrigin(0.5, 0.9)
        .setScale(1)
        .setRotation(pose.rotation);
      this.heldItemSprite.setDepth(this.player.y + 1);
      this.heldItemSprite.setVisible(true);
    } else if (this.heldItemSprite) {
      this.heldItemSprite.setVisible(false);
    }

    // If slashing, keep the slash sprite anchored to the current hand position while its rotation tweens.
    if (this.slashSwordSprite) {
      const pose = computeHeldSwordPose(this.facing);
      this.slashSwordSprite.setPosition(this.player.x + pose.dx, this.player.y + pose.dy);
      this.slashSwordSprite.setDepth(this.player.y + 5);
    }

    // Keep projectiles depth-sorted.
    if (this.arrowsGroup) {
      for (const obj of this.arrowsGroup.getChildren()) {
        const a = obj as Phaser.Physics.Arcade.Sprite;
        if (!a.active) continue;
        a.setDepth(a.y);
      }
    }
    if (this.playerArrowsGroup) {
      for (const obj of this.playerArrowsGroup.getChildren()) {
        const a = obj as Phaser.Physics.Arcade.Sprite;
        if (!a.active) continue;
        a.setDepth(a.y);
      }
    }
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


