import Phaser from "phaser";
import { shouldAllowPlayerTapInventory } from "../../core/pouchUi";
import { isTapOnPlayer } from "../../core/tapOnPlayer";
import { pickTapCandidate } from "../../core/tapTargeting";
import { normalizeScreenSize } from "../../core/screen";
import { getDialogScript } from "../dialog/scripts";
import {
  ensureItemAndPropTextures,
  ensureGoblinAndArrowTextures,
  ensurePeasantPlayerBodyArmorSpriteSheets,
  ensurePeasantPlayerSpriteSheet,
  ensureUiPouchTexture,
} from "../art/sprites";

/**
 * WorldScene create() extracted to keep WorldScene.ts smaller.
 *
 * This function executes with the given scene bound as `this`.
 */
export function worldSceneCreate(scene: any): void {
  (function (this: any) {
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
    this.qtyAdjustKeys = this.input.keyboard!.addKeys("UP,DOWN") as {
      UP: Phaser.Input.Keyboard.Key;
      DOWN: Phaser.Input.Keyboard.Key;
    };

    this.ensureTilesetTexture();
    // Ensure item textures exist for held-item rendering even in areas that don't spawn items.
    ensureItemAndPropTextures(this);
    // Arrow texture is shared with goblin archers and the player bow.
    ensureGoblinAndArrowTextures(this);

    ensurePeasantPlayerSpriteSheet(this);
    ensurePeasantPlayerBodyArmorSpriteSheets(this);
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

    // Armor overlay sprite (renders over default clothing).
    this.bodyArmorSprite?.destroy();
    this.bodyArmorSprite = this.add.sprite(this.player.x, this.player.y, "player_armor_body_leather");
    this.bodyArmorSprite.setOrigin(0.5, 0.5);
    this.bodyArmorSprite.setScale(1);
    this.bodyArmorSprite.setVisible(false);
    // UI camera should not render world objects.
    this.uiCam.ignore(this.bodyArmorSprite);
    this.headArmorSprite?.destroy();
    this.headArmorSprite = this.add.sprite(this.player.x, this.player.y, "player_armor_head_mythril");
    this.headArmorSprite.setOrigin(0.5, 0.5);
    this.headArmorSprite.setScale(1);
    this.headArmorSprite.setVisible(false);
    this.uiCam.ignore(this.headArmorSprite);
    this.legArmorSprite?.destroy();
    this.legArmorSprite = this.add.sprite(this.player.x, this.player.y, "player_armor_legs_mythril");
    this.legArmorSprite.setOrigin(0.5, 0.5);
    this.legArmorSprite.setScale(1);
    this.legArmorSprite.setVisible(false);
    this.uiCam.ignore(this.legArmorSprite);

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

    if (!this.onDialogWheel) {
      this.onDialogWheel = (_pointer, _gameObjects, _dx, dy) => {
        if (typeof this.handleDialogWheel === "function") this.handleDialogWheel(dy);
      };
    }
    this.input.off("wheel", this.onDialogWheel);
    this.input.on("wheel", this.onDialogWheel);

    // Ensure we detach global listeners on shutdown to avoid stale callbacks during restart.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.onWorldPointerDown) this.input.off("pointerdown", this.onWorldPointerDown);
      if (this.onDialogWheel) this.input.off("wheel", this.onDialogWheel);
      if (this.onScaleResize) this.scale.off("resize", this.onScaleResize);
      if (typeof this.stopTownPresence === "function") this.stopTownPresence();
      if (typeof this.stopTownChat === "function") this.stopTownChat();
      if (typeof this.stopTownTrade === "function") this.stopTownTrade();
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
  
  }).call(scene);
}
