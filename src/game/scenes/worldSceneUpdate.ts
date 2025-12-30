import Phaser from "phaser";
import { computeMovement } from "../../core/movement";
import { clearExitBlockIfLeft } from "../../core/exitGate";
import { canToggleInventory } from "../../core/uiGating";
import { toggleEquipFromInventorySlot } from "../../core/equipment";
import { saveEquipment } from "../../services/game/equipmentStore";
import { advanceLine, choose, closeDialog, getNode } from "../../core/dialog";
import { paginateDialogChoices } from "../../core/dialogPagination";
import { getDialogScript } from "../dialog/scripts";
import { getMeleeWeaponStats } from "../../core/shopCatalog";
import { tryStartAttack } from "../../core/playerAttack";
import { computeHeldSwordPose, computeSwordSwing } from "../../core/swordVisual";
import { computeSwordHitbox } from "../../core/playerAttack";
import { tryShootWithAmmo } from "../../core/rangedAttack";
import { getItemCount, removeItem } from "../../core/inventory";
import { loadInventory, saveInventory } from "../../services/game/inventoryStore";
import { getTapStopDistancePx } from "../../core/tapIntentMovement";
import { computeTapToMoveInput } from "../../core/tapToMove";
import { getPlayerAnim } from "../../core/playerAnimation";
import { computeDeathTransition } from "../../core/death";
import { depthSortByY, depthSortManyByFeet, depthSortManyByY } from "./world/depthSorting";
import { getFeetDepth } from "./depthSort";
import { anchorSlashSprite, renderHeldItem } from "./world/heldItemRendering";

/**
 * WorldScene update loop extracted to keep WorldScene.ts smaller.
 *
 * This function executes with the given scene bound as `this`.
 */
export function worldSceneUpdate(scene: any): void {
  (function (this: any) {

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
      if (this.interactingNpc?.active) this.setNpcPaused(this.interactingNpc, false);
      this.interactingNpc = undefined;
      return;
    }

    if (this.dead) {
      // While dead, freeze gameplay.
      this.player.setVelocity(0, 0);
      return;
    }

    if (!this.dialog.open && this.interactingNpc) {
      if (this.interactingNpc.active) this.setNpcPaused(this.interactingNpc, false);
      this.interactingNpc = undefined;
    }

    this.updateNpcMovement();

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
          this.physics.add.overlap(zone, monsters, (_z: Phaser.GameObjects.GameObject, m: Phaser.GameObjects.GameObject) => {
            const mon = m as Phaser.Physics.Arcade.Sprite;
            this.spawnEnemyDrop(mon.x, mon.y);
            mon.destroy();
          });
        }

        const goblins = this.goblinsGroup;
        if (goblins) {
          this.physics.add.overlap(zone, goblins, (_z: Phaser.GameObjects.GameObject, g: Phaser.GameObjects.GameObject) => {
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
    depthSortManyByFeet([this.player as any], getFeetDepth);
    depthSortByY(this.chest as any);
    if (this.npcsGroup) depthSortManyByFeet(this.npcsGroup.getChildren() as any, getFeetDepth);

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
    this.heldItemSprite = renderHeldItem({
      scene: this,
      uiCam: this.uiCam,
      player: this.player,
      facing: this.facing,
      heldItemId: this.equipment.heldItemId,
      heldItemSprite: this.heldItemSprite,
      slashSwordSprite: this.slashSwordSprite,
    }) as any;

    // If slashing, keep the slash sprite anchored to the current hand position while its rotation tweens.
    anchorSlashSprite({ slashSwordSprite: this.slashSwordSprite, player: this.player, facing: this.facing });

    // Keep projectiles depth-sorted.
    if (this.arrowsGroup) {
      const list = (this.arrowsGroup.getChildren() as Phaser.Physics.Arcade.Sprite[]).filter((a) => a.active);
      depthSortManyByY(list as any);
    }
    if (this.playerArrowsGroup) {
      const list = (this.playerArrowsGroup.getChildren() as Phaser.Physics.Arcade.Sprite[]).filter((a) => a.active);
      depthSortManyByY(list as any);
    }
  
  }).call(scene);
}
