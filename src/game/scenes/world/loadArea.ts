import Phaser from "phaser";
import {
  BOAT_ANCHOR_TILES,
  VILLAGE_HOUSE_TOP_LEFTS,
  getArea,
  type AreaId,
  type EntryId,
} from "../../../core/areas";
import { ITEMS, addItem, removeItem } from "../../../core/inventory";
import { applyContactDamage } from "../../../core/combat";
import { chooseHeartSpawnTile } from "../../../core/heartSpawn";
import { createRangedState, normalize, tryShoot } from "../../../core/rangedAttack";
import { ARROW_HITBOX } from "../../../core/physicsTuning";
import { chooseEnemySpawnTiles } from "../../../core/enemySpawn";
import type { EnemyDrop } from "../../../core/enemyDrops";
import { hasFlag, setFlag } from "../../../services/game/flags";
import { loadInventory, saveInventory } from "../../../services/game/inventoryStore";
import {
  blockExit,
  isExitBlocked,
  type TilePos,
  type TileRect,
} from "../../../core/exitGate";
import { ensureArcaneWizardTextures, ensureBoatTexture, ensureChestTextures, ensureGoblinAndArrowTextures, ensureItemAndPropTextures, ensureMonsterTexture, ensureNpcTextures, ensureShadowStalkerTexture, ensureStoreExteriorTexture, ensureTrollTexture, ensureVillageHouseTexture } from "../../art/sprites";
import { addNpcColliders } from "../physicsColliders";
import { configureStaticPickupBody } from "./arcadeBody";
import { addBobbingTween } from "./bobbingTween";

/**
 * Loads an area into the running `WorldScene` instance.
 *
 * This is extracted from `WorldScene.loadArea(...)` to shrink `WorldScene.ts`.
 *
 * Design notes:
 * - Uses `scene: any` so we can call private fields/methods without TypeScript fighting us.
 * - Intentionally keeps behavior the same by preserving the original imperative structure.
 */
function expandRect(rect: TileRect, margin: number): TileRect {
  return {
    x: rect.x - margin,
    y: rect.y - margin,
    w: rect.w + margin * 2,
    h: rect.h + margin * 2,
  };
}

export function loadAreaIntoWorldScene(scene: any, areaId: AreaId, entry: EntryId): void {
  // WorldScene is designed to be restarted between areas.
  // loadArea assumes a fresh scene state.

  scene.area = getArea(areaId);
  scene.npcMoveStates.clear();
  scene.interactingNpc = undefined;
  // HUD removed (keep only HP).
  scene.bowState = createRangedState();

  const tileSize = 32;
  const map = scene.make.tilemap({
    data: scene.area.tiles,
    tileWidth: tileSize,
    tileHeight: tileSize,
  });
  const tileset = map.addTilesetImage("tileset_2x2");
  const layer = map.createLayer(0, tileset!, 0, 0);
  if (!layer) throw new Error("Failed to create tilemap layer");
  layer.setCollision([1, 5, 6, 8]);
  layer.setDepth(-10000);
  scene.uiCam.ignore(layer);

  const addChest = (pos: { x: number; y: number }, contents: any) => {
    ensureChestTextures(scene);
    ensureItemAndPropTextures(scene);
    const opened = contents.resetOnAreaLoad ? false : contents.flag ? hasFlag(contents.flag) : false;
    const tx = pos.x * tileSize + tileSize / 2;
    const ty = pos.y * tileSize + tileSize / 2;
    const chest = scene.physics.add.sprite(tx, ty, opened ? "chest_open" : "chest_closed");
    chest.setImmovable(true);
    chest.setDepth(chest.y);
    const cb = chest.body as Phaser.Physics.Arcade.Body;
    cb.setSize(16, 12);
    cb.setOffset(4, 10);
    scene.physics.add.collider(scene.player, chest);
    scene.uiCam.ignore(chest);
    scene.chests.push({ sprite: chest, contents });
  };

  const storeColliders: Phaser.GameObjects.Zone[] = [];
  const createStorefront = (storeExit?: { rect: { x: number; y: number; w: number; h: number } }) => {
    if (!storeExit) return;
    ensureStoreExteriorTexture(scene);
    const storeFrontWidthTiles = 6;
    const storeFrontHeightTiles = 4;
    const imgX = (storeExit.rect.x - 2) * tileSize + (storeFrontWidthTiles * tileSize) / 2;
    const storeTopY = (storeExit.rect.y - 1) * tileSize;
    const imgY = storeTopY + (storeFrontHeightTiles * tileSize) / 2;
    const storeImg = scene.add.image(imgX, imgY, "prop_store_exterior");
    const storeImgDepth = (storeExit.rect.y + 0.5) * tileSize;
    storeImg.setDepth(storeImgDepth);
    scene.uiCam.ignore(storeImg);

    const storeLeftX = (storeExit.rect.x - 2) * tileSize;
    const storeHeightPx = storeFrontHeightTiles * tileSize;
    const storeCenterY = storeTopY + storeHeightPx / 2;

    const leftBlock = scene.add.zone(storeLeftX + tileSize, storeCenterY, tileSize * 2, storeHeightPx);
    scene.physics.add.existing(leftBlock, true);

    const rightBlockX = storeLeftX + tileSize * 4;
    const rightBlock = scene.add.zone(rightBlockX + tileSize, storeCenterY, tileSize * 2, storeHeightPx);
    scene.physics.add.existing(rightBlock, true);

    scene.uiCam.ignore([leftBlock, rightBlock]);
    storeColliders.push(leftBlock, rightBlock);
  };
  const shouldProcessArrowTileCollision = (_obj: unknown, tile: Phaser.Tilemaps.Tile) => {
    if (scene.area.id === "troll_bridge" && tile?.index === 6) return false;
    return true;
  };

  const worldW = scene.area.width * tileSize;
  const worldH = scene.area.height * tileSize;
  scene.physics.world.setBounds(0, 0, worldW, worldH);
  scene.cameras.main.setBounds(0, 0, worldW, worldH);

  // Collide player with walls.
  scene.physics.add.collider(scene.player, layer);
  // Fresh area: clear single-area objects.
  if (scene.chests) {
    for (const c of scene.chests) c.sprite.destroy();
  }
  scene.chests = [];
  scene.keySprite?.destroy();
  scene.keySprite = undefined;
  scene.arcaneWizardGroup?.destroy(true);
  scene.arcaneWizardGroup = undefined;
  scene.arcaneSpellGroup?.destroy(true);
  scene.arcaneSpellGroup = undefined;
  scene.boatSprite?.destroy();
  scene.boatSprite = undefined;
  scene.trollWarningZone?.destroy();
  scene.trollWarningZone = undefined;
  scene.trollGuardRail?.destroy();
  scene.trollGuardRail = undefined;
  scene.trollDoorSprite?.destroy();
  scene.trollDoorSprite = undefined;
  scene.trollGroup?.destroy(true);
  scene.trollGroup = undefined;
  scene.bowSprite?.destroy();
  scene.bowSprite = undefined;
  scene.playerArrowsGroup = scene.physics.add.group();
  scene.physics.add.collider(
    scene.playerArrowsGroup,
    layer,
    (_arrow: unknown) => {
      const a = _arrow as Phaser.Physics.Arcade.Sprite;
      a.destroy();
    },
    shouldProcessArrowTileCollision,
  );

  // Drop items (coins/hearts) created by enemy deaths.
  scene.dropsGroup = scene.physics.add.group();
  scene.physics.add.collider(scene.dropsGroup, layer);
  scene.physics.add.overlap(scene.player, scene.dropsGroup, (_p: unknown, d: unknown) => {
    const drop = d as Phaser.Physics.Arcade.Sprite;
    const meta = (drop as any).__drop as EnemyDrop | undefined;
    if (!meta) {
      drop.destroy();
      return;
    }
    if (meta.kind === "heart") {
      const heal = 5;
      scene.hp = Math.min(scene.maxHp, scene.hp + heal);
      scene.writeProgress(true);
      drop.destroy();
      return;
    }
    const inv = loadInventory();
    if (meta.kind === "coins") {
      addItem(inv, ITEMS.coins, meta.qty);
    } else if (meta.kind === "food") {
      addItem(inv, ITEMS[meta.itemId], meta.qty);
    } else if (meta.kind === "item") {
      addItem(inv, ITEMS[meta.itemId], meta.qty);
    }
    saveInventory(inv);
    if (scene.inventoryOpen) scene.renderInventoryPanel();
    drop.destroy();
  });

  // Spawn player
  const spawn = scene.area.spawns[entry] ?? scene.area.spawns.start;
  scene.currentEntry = entry;
  // If we have a saved progress for this area, prefer exact coordinates.
  const sp = scene.startProgress && scene.startProgress.areaId === areaId ? scene.startProgress : undefined;
  if (sp) {
    scene.player.setPosition(sp.playerX, sp.playerY);
    // Recompute maxHp from armor (in case armor changed since save)
    scene.updateMaxHpFromArmor();
    scene.hp = Math.max(0, Math.min(scene.maxHp, sp.hp));
  } else {
    scene.player.setPosition(spawn.x * tileSize + tileSize / 2, spawn.y * tileSize + tileSize / 2);
    scene.updateMaxHpFromArmor();
  }
  scene.player.setVelocity(0, 0);
  // Persist progress locally (localStorage) so it can be saved to cloud by button.
  scene.writeProgress(true);

  // One random heart pickup per area load.
  scene.heartSprite?.destroy();
  const heartTile = chooseHeartSpawnTile(scene.area);
  if (heartTile) {
    ensureItemAndPropTextures(scene); // ensures item_heart exists too
    const hx = heartTile.x * tileSize + tileSize / 2;
    const hy = heartTile.y * tileSize + tileSize / 2;
    scene.heartSprite = scene.physics.add.sprite(hx, hy, "item_heart");
    scene.heartSprite.setDepth(scene.heartSprite.y);
    const hb = scene.heartSprite.body as Phaser.Physics.Arcade.Body;
    configureStaticPickupBody(hb, { w: 12, h: 12, offsetX: 6, offsetY: 6 });
    scene.uiCam.ignore(scene.heartSprite);
    // little bob
    addBobbingTween(scene.tweens, scene.heartSprite, { baseY: hy, durationMs: 650 });

    scene.physics.add.overlap(scene.player, scene.heartSprite, () => {
      if (!scene.heartSprite?.active) return;
      const heal = 5;
      scene.hp = Math.min(scene.maxHp, scene.hp + heal);
      scene.writeProgress(true);
      scene.heartSprite.destroy();
      scene.heartSprite = undefined;
    });
  }

  // Exits
  const exits = scene.physics.add.staticGroup();
  for (const ex of scene.area.exits) {
    const r = ex.rect;
    const x = r.x * tileSize;
    const y = r.y * tileSize;
    const w = r.w * tileSize;
    const h = r.h * tileSize;

    const zone = scene.add.zone(x + w / 2, y + h / 2, w, h);
    scene.physics.add.existing(zone, true);
    (zone as any).exitDef = ex;
    exits.add(zone);
    scene.uiCam.ignore(zone);
  }
  scene.physics.add.overlap(scene.player, exits, (_player: unknown, z: unknown) => {
    if (Date.now() < scene.suppressExitUntilTs) return;
    if (scene.dialog.open) return;
    const exitDef = (z as any).exitDef as {
      id: string;
      rect: { x: number; y: number; w: number; h: number };
      toArea: AreaId;
      toEntry: EntryId;
    };
    const playerTile: TilePos = scene.getPlayerTilePos();

    // Sticky suppression: if we already showed a "blocked" dialog for this exit and the
    // player hasn't moved away from the doorway region, don't re-trigger it.
    if (scene.blockedExitSticky?.exitId === exitDef.id) {
      const r = scene.blockedExitSticky.clearRect;
      const inside = playerTile.x >= r.x && playerTile.x < r.x + r.w && playerTile.y >= r.y && playerTile.y < r.y + r.h;
      if (inside) return;
      scene.blockedExitSticky = undefined;
    }

    if (isExitBlocked(scene.exitGate, exitDef.id, playerTile)) return;

    if (scene.area.id === "troll_bridge" && exitDef.id === "toTrollClearing") {
      if (!hasFlag("door.trollBridge.east.unlocked")) {
        const inv = loadInventory();
        const ok = removeItem(inv, "troll_key", 1);
        if (!ok) {
          scene.exitGate = blockExit(exitDef.id, exitDef.rect);
          scene.blockedExitSticky = { exitId: exitDef.id, clearRect: expandRect(exitDef.rect, 1) };
          scene.suppressExitUntilTs = Date.now() + 700;
          scene.openNpcDialog("trollDoorLocked");
          return;
        }
        saveInventory(inv);
        setFlag("door.trollBridge.east.unlocked");
        scene.trollDoorSprite?.setTexture("prop_door_open");
      }
    }

    // Locked door logic (house -> hallway)
    if (scene.area.id === "house" && exitDef.id === "toHallway") {
      if (!hasFlag("door.house.hallway.unlocked")) {
        const inv = loadInventory();
        const ok = removeItem(inv, "rusty_key", 1);
        if (!ok) {
          scene.exitGate = blockExit(exitDef.id, exitDef.rect);
          // Suppress re-showing until the player leaves the doorway region.
          scene.blockedExitSticky = { exitId: exitDef.id, clearRect: expandRect(exitDef.rect, 1) };
          // Give the player a moment to step away after dismissing the dialog.
          scene.suppressExitUntilTs = Date.now() + 700;
          scene.openNpcDialog("doorLocked");
          return;
        }
        saveInventory(inv);
        setFlag("door.house.hallway.unlocked");
        scene.houseDoorSprite?.setTexture("prop_door_open");
      }
    }

    // Full reset between areas to avoid lingering physics/overlap/input state.
    scene.scene.restart({ areaId: exitDef.toArea, entry: exitDef.toEntry });
  });

  // NPCs
  const npcs = scene.physics.add.group({ allowGravity: false, immovable: true });
  // Dynamic physics groups require explicit colliders.
  addNpcColliders({ physics: scene.physics as any, player: scene.player, npcs, worldLayer: layer });
  ensureNpcTextures(scene);
  const npcTextureForId = (id: string) => {
    if (id === "elder") return "npc_elder";
    if (id === "shopkeeper") return "npc_shopkeeper";
    if (id === "rare_shopkeeper") return "npc_shopkeeper_dark";
    if (id === "buyer_npc") return "npc_buyer_dark";
    if (id === "river_sailor") return "npc_sailor";
    if (id === "homeowner2" || id === "homeowner4") return "npc_villager_dark";
    return "npc_villager";
  };
  for (const npc of scene.area.npcs) {
    const x = npc.pos.x * tileSize + tileSize / 2;
    const y = npc.pos.y * tileSize + tileSize / 2;
    const tex = npcTextureForId(npc.id);
    const isVillagerTexture = tex === "npc_villager" || tex === "npc_villager_dark";
    const s = npcs.create(x, y, tex) as Phaser.Physics.Arcade.Sprite;
    s.setDepth(s.y);
    (s as any).npcDef = npc;
    const nb = s.body as Phaser.Physics.Arcade.Body;
    // Feet collision: 12x10 near bottom of 24x24.
    nb.setSize(12, 10);
    nb.setOffset(6, 13);
    nb.setAllowGravity(false);
    nb.setImmovable(true);
    scene.npcMoveStates.set(s, {
      home: { x, y },
      target: undefined,
      nextDecisionAt: scene.time.now + Phaser.Math.Between(400, 900),
      paused: !isVillagerTexture,
      speed: isVillagerTexture ? Phaser.Math.Between(18, 26) : 0,
      wanderBounds: isVillagerTexture ? scene.computeNpcWanderBounds(npc) : undefined,
    });
    scene.uiCam.ignore(s);
  }
  scene.npcsGroup = npcs;

  // Boat visuals where applicable.
  const boatTile = BOAT_ANCHOR_TILES[scene.area.id as AreaId];
  if (boatTile) {
    ensureBoatTexture(scene);
    const bx = boatTile.x * tileSize + tileSize / 2;
    const by = boatTile.y * tileSize + tileSize / 2;
    scene.boatSprite = scene.add.sprite(bx, by, "prop_boat");
    scene.boatSprite.setDepth(by + 2);
    scene.uiCam.ignore(scene.boatSprite);
    addBobbingTween(scene.tweens, scene.boatSprite, { baseY: by, durationMs: 1200 });
  }

  // Village houses (visual only; collision is handled by wall tiles).
  if (scene.area.id === "village") {
    ensureVillageHouseTexture(scene);
    for (const topLeft of VILLAGE_HOUSE_TOP_LEFTS) {
      const houseX = topLeft.x * tileSize + (7 * tileSize) / 2;
      const houseY = topLeft.y * tileSize + (4 * tileSize) / 2;
      const img = scene.add.image(houseX, houseY, "prop_house_village");
      // Depth near the bottom edge of the house so the player can appear in front when below it.
      img.setDepth(topLeft.y * tileSize + 4 * tileSize - 2);
      scene.uiCam.ignore(img);
      scene.villageHouses.push(img);
    }
  }

  // House chest
  if (scene.area.id === "house") {
    addChest(
      { x: Math.floor(scene.area.width / 2), y: Math.floor(scene.area.height / 2) },
      {
        flag: "chest.house.1",
        loot: [{ itemId: "coins", qty: 25 }],
        openedDialog: "chestMessage",
        emptyDialog: "chestEmpty",
      },
    );

    // Locked door prop at top center
    const unlocked = hasFlag("door.house.hallway.unlocked");
    const dx = Math.floor(scene.area.width / 2) * tileSize + tileSize / 2;
    const dy = tileSize / 2;
    scene.houseDoorSprite = scene.add.sprite(dx, dy, unlocked ? "prop_door_open" : "prop_door_locked");
    scene.houseDoorSprite.setDepth(scene.houseDoorSprite.y);
    scene.uiCam.ignore(scene.houseDoorSprite);
  }

  if (scene.area.id === "river_village") {
    const storeExit = scene.area.exits.find((ex: any) => ex.id === "toRiverStore");
    createStorefront(storeExit);
    for (const zone of storeColliders) {
      scene.physics.add.collider(scene.player, zone);
    }
  }

  // Woods monsters + shadow forest foes
  if (scene.area.id === "woods" || scene.area.id === "shadow_forest") {
    const isShadowForest = scene.area.id === "shadow_forest";
    storeColliders.length = 0;
    ensureItemAndPropTextures(scene);
    if (isShadowForest) {
      ensureShadowStalkerTexture(scene);
    } else {
      ensureMonsterTexture(scene);
      ensureChestTextures(scene);
      const storeExit = scene.area.exits.find((ex: any) => ex.id === "toStore");
      createStorefront(storeExit);
      addChest(
        { x: scene.area.width - 3, y: 2 },
        {
          flag: "chest.woods.arrows.1",
          loot: [{ itemId: "arrows", qty: 25 }],
          openedDialog: "arrowsChest",
          emptyDialog: "chestEmpty",
        },
      );
      // Key in the middle of the forest (once)
      if (!hasFlag("item.rusty_key.woods.1")) {
        const kx = Math.floor(scene.area.width / 2) * tileSize + tileSize / 2;
        const ky = Math.floor(scene.area.height / 2) * tileSize + tileSize / 2;
        scene.keySprite = scene.physics.add.sprite(kx, ky, "item_key");
        scene.keySprite.setDepth(scene.keySprite.y);
        const kb = scene.keySprite.body as Phaser.Physics.Arcade.Body;
        kb.setSize(14, 10).setOffset(5, 12);
        scene.physics.add.collider(scene.keySprite, layer);
        scene.uiCam.ignore(scene.keySprite);
      } else {
        scene.keySprite = undefined;
      }
    }

    const monsters = scene.physics.add.group();
    scene.monstersGroup = monsters;

    const avoid = scene.getPlayerTilePos();
    const monsterTiles = chooseEnemySpawnTiles({
      area: scene.area,
      count: isShadowForest ? 6 : 5,
      rng: () => Math.random(),
      avoid: [avoid],
      minDistTiles: isShadowForest ? 6 : 4,
    });
    for (const p of monsterTiles) {
      const mx = p.x * tileSize + tileSize / 2;
      const my = p.y * tileSize + tileSize / 2;
      const m = scene.physics.add.sprite(mx, my, isShadowForest ? "enemy_shadow_stalker" : "monster_slime");
      m.setDepth(m.y);
      const mb = m.body as Phaser.Physics.Arcade.Body;
      mb.setSize(14, 10).setOffset(5, 12);
      (m as any).__enemyId = isShadowForest ? "shadow_stalker" : "woods_slime";
      (m as any).__hp = isShadowForest ? 10 : 1;
      (m as any).__contactDamage = isShadowForest ? 3 : 1;
      if (isShadowForest) {
        (m as any).__onDeath = (x: number, y: number) => {
          const roll = Math.random();
          if (roll < 0.08) {
            const itemId = roll < 0.03 ? "iron_armor" : roll < 0.055 ? "mythril_helm" : "mythril_leggings";
            scene.spawnEnemyDrop(x + 4, y - 2, "shadow_stalker", { kind: "item", itemId, qty: 1 });
          }
        };
      }
      monsters.add(m);
      scene.uiCam.ignore(m);
      // collide vs walls
      scene.physics.add.collider(m, layer);
    }

    for (const zone of storeColliders) {
      scene.physics.add.collider(scene.player, zone);
      scene.physics.add.collider(monsters, zone);
    }

    // Prevent monsters from crossing the player and each other.
    scene.physics.add.collider(scene.player, monsters);
    scene.physics.add.collider(monsters, monsters);
    if (scene.playerArrowsGroup) {
      scene.physics.add.overlap(scene.playerArrowsGroup, monsters, (_a: unknown, m: unknown) => {
        const arrow = _a as Phaser.Physics.Arcade.Sprite;
        const mon = m as Phaser.Physics.Arcade.Sprite;
        arrow.destroy();
        scene.damageMonster(mon, 1);
      });
    }

    // Roam + chase: update velocities every 500ms
    scene.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        for (const obj of monsters.getChildren()) {
          const m = obj as Phaser.Physics.Arcade.Sprite;
          const dx = scene.player.x - m.x;
          const dy = scene.player.y - m.y;
          const d2 = dx * dx + dy * dy;
          const chaseRadius = (32 * 6) ** 2;
          if (d2 <= chaseRadius) {
            const d = Math.max(1, Math.sqrt(d2));
            const speed = isShadowForest ? 90 : 70;
            m.setVelocity((dx / d) * speed, (dy / d) * speed);
          } else {
            const dir = Phaser.Math.Between(0, 3);
            const speed = isShadowForest ? 60 : 45;
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
    scene.physics.add.collider(scene.player, monsters, (_p: unknown, m: unknown) => {
      const mon = m as Phaser.Physics.Arcade.Sprite;
      const now = scene.time.now;
      const contactDamage = ((mon as any).__contactDamage as number | undefined) ?? 1;
      const r = applyContactDamage({
        hp: scene.hp,
        nowMs: now,
        lastHitAtMs: scene.lastHitAtMs,
        cooldownMs: 450,
        damage: contactDamage,
      });
      scene.hp = r.hp;
      scene.lastHitAtMs = r.lastHitAtMs;
      if (r.tookHit) scene.playEnemyAttackAnim(mon);
      if (r.tookHit) scene.writeProgress(true);
    });
  } else {
    // Arcane keep defenders
    if (scene.area.id === "arcane_keep") {
      ensureArcaneWizardTextures(scene);
      ensureItemAndPropTextures(scene);

      const guards = scene.physics.add.group();
      scene.monstersGroup = guards;
      const guardTiles = [
        { x: 13, y: 12 },
        { x: 15, y: 13 },
        { x: 17, y: 12 },
      ];
      for (const p of guardTiles) {
        const gx = p.x * tileSize + tileSize / 2;
        const gy = p.y * tileSize + tileSize / 2;
        const g = scene.physics.add.sprite(gx, gy, "enemy_castle_guard");
        g.setDepth(g.y);
        const gb = g.body as Phaser.Physics.Arcade.Body;
        gb.setSize(14, 10).setOffset(5, 12);
        (g as any).__enemyId = "castle_guardian";
        (g as any).__hp = 4;
        (g as any).__contactDamage = 2;
        guards.add(g);
        scene.uiCam.ignore(g);
        scene.physics.add.collider(g, layer);
      }
      scene.physics.add.collider(scene.player, guards, (_p: unknown, m: unknown) => {
        const mon = m as Phaser.Physics.Arcade.Sprite;
        const now = scene.time.now;
        const contactDamage = ((mon as any).__contactDamage as number | undefined) ?? 2;
        const r = applyContactDamage({
          hp: scene.hp,
          nowMs: now,
          lastHitAtMs: scene.lastHitAtMs,
          cooldownMs: 420,
          damage: contactDamage,
        });
        scene.hp = r.hp;
        scene.lastHitAtMs = r.lastHitAtMs;
        if (r.tookHit) scene.playEnemyAttackAnim(mon);
        if (r.tookHit) scene.writeProgress(true);
      });
      scene.physics.add.collider(guards, guards);

      scene.time.addEvent({
        delay: 520,
        loop: true,
        callback: () => {
          for (const obj of guards.getChildren()) {
            const g = obj as Phaser.Physics.Arcade.Sprite;
            const dx = scene.player.x - g.x;
            const dy = scene.player.y - g.y;
            const d2 = dx * dx + dy * dy;
            const chaseRadius = (32 * 7) ** 2;
            if (d2 <= chaseRadius) {
              const d = Math.max(1, Math.sqrt(d2));
              const speed = 80;
              g.setVelocity((dx / d) * speed, (dy / d) * speed);
            } else {
              g.setVelocity(0, 0);
            }
            g.setDepth(g.y);
          }
        },
      });

      const wizards = scene.physics.add.group();
      const spells = scene.physics.add.group();
      scene.arcaneWizardGroup = wizards;
      scene.arcaneSpellGroup = spells;
      const wizardTiles = [
        { x: 5, y: Math.floor(scene.area.height * 0.55) },
        { x: 7, y: Math.floor(scene.area.height * 0.55) - 2 },
        { x: 8, y: Math.floor(scene.area.height * 0.55) + 2 },
        { x: 10, y: Math.floor(scene.area.height * 0.55) },
      ];
      for (const p of wizardTiles) {
        const wx = p.x * tileSize + tileSize / 2;
        const wy = p.y * tileSize + tileSize / 2;
        const w = scene.physics.add.sprite(wx, wy, "enemy_arcane_wizard");
        w.setDepth(w.y);
        const wb = w.body as Phaser.Physics.Arcade.Body;
        wb.setSize(14, 12).setOffset(5, 11);
        (w as any).__hp = 8;
        (w as any).__lastShotAtMs = -Infinity;
        (w as any).__strafeSign = Math.random() < 0.5 ? -1 : 1;
        wizards.add(w);
        scene.uiCam.ignore(w);
        scene.physics.add.collider(w, layer);
      }

      scene.physics.add.collider(wizards, guards);
      scene.physics.add.collider(wizards, wizards);
      scene.physics.add.collider(scene.player, wizards, (_p: unknown, w: unknown) => {
        const wiz = w as Phaser.Physics.Arcade.Sprite;
        const now = scene.time.now;
        const r = applyContactDamage({
          hp: scene.hp,
          nowMs: now,
          lastHitAtMs: scene.lastHitAtMs,
          cooldownMs: 450,
          damage: 3,
        });
        scene.hp = r.hp;
        scene.lastHitAtMs = r.lastHitAtMs;
        if (r.tookHit) scene.playEnemyAttackAnim(wiz);
        if (r.tookHit) scene.writeProgress(true);
      });

      scene.physics.add.collider(
        spells,
        layer,
        (_s: unknown) => {
          const s = _s as Phaser.Physics.Arcade.Sprite;
          s.destroy();
        },
        shouldProcessArrowTileCollision,
      );
      scene.physics.add.collider(spells, guards, (_s: unknown) => {
        const s = _s as Phaser.Physics.Arcade.Sprite;
        s.destroy();
      });
      scene.physics.add.overlap(scene.player, spells, (_p: unknown, s: unknown) => {
        const spell = s as Phaser.Physics.Arcade.Sprite;
        const now = scene.time.now;
        const r = applyContactDamage({
          hp: scene.hp,
          nowMs: now,
          lastHitAtMs: scene.lastRangedHitAtMs,
          cooldownMs: 500,
          damage: 4,
        });
        scene.hp = r.hp;
        scene.lastRangedHitAtMs = r.lastHitAtMs;
        spell.destroy();
        if (r.tookHit) {
          scene.cameras.main.flash(80, 140, 90, 255);
        }
      });

      if (scene.playerArrowsGroup) {
        scene.physics.add.overlap(scene.playerArrowsGroup, wizards, (_a: unknown, w: unknown) => {
          const arrow = _a as Phaser.Physics.Arcade.Sprite;
          const wiz = w as Phaser.Physics.Arcade.Sprite;
          scene.damageArcaneWizard(wiz, 1);
          arrow.destroy();
        });
      }

      scene.time.addEvent({
        delay: 260,
        loop: true,
        callback: () => {
          for (const obj of wizards.getChildren()) {
            const w = obj as Phaser.Physics.Arcade.Sprite;
            if (!w.active) continue;
            const dx = scene.player.x - w.x;
            const dy = scene.player.y - w.y;
            const d = Math.hypot(dx, dy);
            const dir = d > 0 ? { x: dx / d, y: dy / d } : { x: 0, y: 0 };
            const tooClose = d < 32 * 5;
            const tooFar = d > 32 * 9;
            const speed = tooClose ? 70 : tooFar ? 55 : 0;
            const strafe = { x: -dir.y, y: dir.x };
            const toward = tooFar ? 1 : -1;
            const vx = speed * (dir.x * toward + strafe.x * 0.45);
            const vy = speed * (dir.y * toward + strafe.y * 0.45);
            w.setVelocity(vx, vy);
            w.setDepth(w.y);
          }
        },
      });

      scene.time.addEvent({
        delay: 220,
        loop: true,
        callback: () => {
          const now = scene.time.now;
          for (const obj of wizards.getChildren()) {
            const w = obj as Phaser.Physics.Arcade.Sprite;
            if (!w.active) continue;
            const dx = scene.player.x - w.x;
            const dy = scene.player.y - w.y;
            const d2 = dx * dx + dy * dy;
            const range2 = (32 * 12) ** 2;
            if (d2 > range2) continue;
            const lastShotAtMs = (w as any).__lastShotAtMs as number;
            const attempt = tryShoot({ nowMs: now, state: { lastShotAtMs }, cooldownMs: 750 });
            if (!attempt.ok) continue;
            (w as any).__lastShotAtMs = attempt.next.lastShotAtMs;

            const dir = normalize({ x: dx, y: dy });
            if (dir.x === 0 && dir.y === 0) continue;
            const speed = 220;
            const spawnDist = 18;
            const sx = w.x + dir.x * spawnDist;
            const sy = w.y + dir.y * spawnDist;
            const spell = spells.create(sx, sy, "proj_arcane_bolt") as Phaser.Physics.Arcade.Sprite;
            spell.setDepth(spell.y);
            const sb = spell.body as Phaser.Physics.Arcade.Body;
            sb.setAllowGravity(false);
            sb.setSize(12, 8).setOffset(1, 1);
            sb.setVelocity(dir.x * speed, dir.y * speed);
            spell.setRotation(Math.atan2(dir.y, dir.x));
            scene.uiCam.ignore(spell);
            scene.time.delayedCall(2000, () => {
              if (spell.active) spell.destroy();
            });
          }
        },
      });

      const gateSpawn = scene.area.spawns.fromShadowForest ?? spawn;
      addChest(
        { x: gateSpawn.x + 1, y: gateSpawn.y },
        {
          loot: [
            { itemId: "coins", qty: 35 },
            { itemId: "bread", qty: 2 },
          ],
          openedDialog: "arcaneChest",
          emptyDialog: "chestEmpty",
          resetOnAreaLoad: true,
        },
      );
      addChest(
        { x: gateSpawn.x + 2, y: gateSpawn.y + 1 },
        {
          loot: [
            { itemId: "coins", qty: 40 },
            { itemId: "stew", qty: 1 },
          ],
          openedDialog: "arcaneChest",
          emptyDialog: "chestEmpty",
          resetOnAreaLoad: true,
        },
      );
    } else {
      // no monsters outside woods and the shadow forest
      scene.monstersGroup?.destroy(true);
      scene.monstersGroup = undefined;
      scene.keySprite?.destroy();
      scene.keySprite = undefined;
      scene.arcaneWizardGroup?.destroy(true);
      scene.arcaneWizardGroup = undefined;
      scene.arcaneSpellGroup?.destroy(true);
      scene.arcaneSpellGroup = undefined;
    }
  }

  // Troll bridge boss
  if (scene.area.id === "troll_bridge") {
    ensureTrollTexture(scene);
    ensureItemAndPropTextures(scene);
    const trolls = scene.physics.add.group();
    scene.trollGroup = trolls;

    const bridgeY = Math.floor(scene.area.height / 2);
    const bridgeX = Math.floor(scene.area.width / 2);
    const bridgeSprite = scene.add.image(bridgeX * tileSize + tileSize / 2, bridgeY * tileSize + tileSize / 2, "prop_bridge_center");
    bridgeSprite.setDepth(bridgeSprite.y + 1);
    scene.uiCam.ignore(bridgeSprite);
    const tx = (scene.area.width - 4) * tileSize + tileSize / 2;
    const ty = bridgeY * tileSize + tileSize / 2;
    const troll = scene.physics.add.sprite(tx, ty, "enemy_troll");
    troll.setDepth(troll.y);
    troll.setScale(1.4);
    const tb = troll.body as Phaser.Physics.Arcade.Body;
    tb.setSize(18, 14).setOffset(7, 16);
    (troll as any).__hp = 16;
    (troll as any).setPushable?.(false);
    trolls.add(troll);
    scene.uiCam.ignore(troll);

    scene.physics.add.collider(trolls, layer);
    const guardWidth = tileSize * 3;
    const guardX = bridgeX * tileSize;
    const guardZone = scene.add.zone(guardX, worldH / 2, guardWidth, worldH);
    scene.physics.add.existing(guardZone, true);
    scene.physics.add.collider(trolls, guardZone);
    scene.uiCam.ignore(guardZone);
    scene.trollGuardRail = guardZone;
    const clearingExit = scene.area.exits.find((ex: any) => ex.id === "toTrollClearing");
    if (clearingExit) {
      const dx = clearingExit.rect.x * tileSize + (clearingExit.rect.w * tileSize) / 2;
      const dy = clearingExit.rect.y * tileSize + (clearingExit.rect.h * tileSize) / 2;
      const unlocked = hasFlag("door.trollBridge.east.unlocked");
      scene.trollDoorSprite = scene.add.sprite(dx, dy, unlocked ? "prop_door_open" : "prop_door_locked");
      scene.trollDoorSprite.setDepth(scene.trollDoorSprite.y);
      scene.uiCam.ignore(scene.trollDoorSprite);
    }
    scene.physics.add.collider(scene.player, trolls, (_p: unknown, t: unknown) => {
      const mon = t as Phaser.Physics.Arcade.Sprite;
      const now = scene.time.now;
      const r = applyContactDamage({
        hp: scene.hp,
        nowMs: now,
        lastHitAtMs: scene.lastHitAtMs,
        cooldownMs: 400,
        damage: 3,
      });
      scene.hp = r.hp;
      scene.lastHitAtMs = r.lastHitAtMs;
      if (r.tookHit) scene.playEnemyAttackAnim(mon);
      if (r.tookHit) scene.writeProgress(true);
    });

    if (scene.playerArrowsGroup) {
      scene.physics.add.overlap(scene.playerArrowsGroup, trolls, (_a: unknown, t: unknown) => {
        const arrow = _a as Phaser.Physics.Arcade.Sprite;
        const tr = t as Phaser.Physics.Arcade.Sprite;
        arrow.destroy();
        scene.damageTroll(tr, 1);
      });
    }

    scene.time.addEvent({
      delay: 320,
      loop: true,
      callback: () => {
        for (const obj of trolls.getChildren()) {
          const t = obj as Phaser.Physics.Arcade.Sprite;
          const dx = scene.player.x - t.x;
          const dy = scene.player.y - t.y;
          const d = Math.max(1, Math.hypot(dx, dy));
          const speed = 60;
          t.setVelocity((dx / d) * speed, (dy / d) * speed);
          t.setDepth(t.y);
        }
      },
    });

    const bridgeZone = scene.add.zone(bridgeX * tileSize + tileSize / 2, bridgeY * tileSize + tileSize / 2, tileSize * 3, tileSize * 3);
    scene.physics.add.existing(bridgeZone);
    const bzb = bridgeZone.body as Phaser.Physics.Arcade.Body;
    bzb.setAllowGravity(false);
    bzb.setImmovable(true);
    scene.trollWarningZone = bridgeZone;
    if (hasFlag("dialog.trollBridge.warned")) {
      scene.trollGuardRail?.destroy();
      scene.trollGuardRail = undefined;
      bridgeZone.destroy();
      scene.trollWarningZone = undefined;
    }
    if (bridgeZone.active) {
      scene.physics.add.overlap(scene.player, bridgeZone, () => {
        if (hasFlag("dialog.trollBridge.warned")) return;
        setFlag("dialog.trollBridge.warned");
        scene.openNpcDialog("trollWarning");
        scene.trollGuardRail?.destroy();
        scene.trollGuardRail = undefined;
        bridgeZone.destroy();
        scene.trollWarningZone = undefined;
      });
    }
  }

  // Goblin archers + arrows
  const goblinTiles: TilePos[] | null =
    scene.area.id === "cave"
      ? chooseEnemySpawnTiles({
          area: scene.area,
          count: 3,
          rng: () => Math.random(),
          avoid: [scene.getPlayerTilePos()],
          minDistTiles: 5,
        })
      : scene.area.id === "troll_bridge"
        ? (() => {
            const riverX = Math.floor(scene.area.width / 2);
            const baseline: TilePos[] = [
              { x: riverX + 3, y: Math.floor(scene.area.height / 2) - 2 },
              { x: riverX + 5, y: Math.floor(scene.area.height / 2) + 1 },
              { x: riverX + 7, y: Math.floor(scene.area.height / 2) - 1 },
            ];
            const walkable = (p: TilePos) => {
              const tileIndex = scene.area.tiles[p.y]?.[p.x];
              return tileIndex != null && tileIndex !== 1 && tileIndex !== 5 && tileIndex !== 6;
            };
            const filtered = baseline.filter(walkable);
            if (filtered.length > 0) return filtered;
            // Fallback: look for any walkable tiles on the eastern bank.
            const eastBank: TilePos[] = [];
            for (let y = 1; y < scene.area.height - 1; y++) {
              for (let x = riverX + 2; x < scene.area.width - 1; x++) {
                eastBank.push({ x, y });
              }
            }
            return eastBank.filter(walkable).slice(0, 2);
          })()
        : null;

  if (goblinTiles && goblinTiles.length > 0) {
    ensureGoblinAndArrowTextures(scene);
    const goblins = scene.physics.add.group();
    const arrows = scene.physics.add.group();
    scene.goblinsGroup = goblins;
    scene.arrowsGroup = arrows;

    for (const p of goblinTiles) {
      const gx = p.x * tileSize + tileSize / 2;
      const gy = p.y * tileSize + tileSize / 2;
      const g = scene.physics.add.sprite(gx, gy, "enemy_goblin");
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
      scene.uiCam.ignore(g);
      scene.physics.add.collider(g, layer);
    }

    // Goblins can't overlap the player or each other.
    scene.physics.add.collider(scene.player, goblins);
    scene.physics.add.collider(goblins, goblins);

    // Arrow physics: no gravity, collide with walls, damage player.
    scene.physics.add.collider(
      arrows,
      layer,
      (_a: unknown) => {
        const a = _a as Phaser.Physics.Arcade.Sprite;
        a.destroy();
      },
      shouldProcessArrowTileCollision,
    );
    scene.physics.add.overlap(scene.player, arrows, (_p: unknown, a: unknown) => {
      const arrow = a as Phaser.Physics.Arcade.Sprite;
      const now = scene.time.now;
      const r = applyContactDamage({
        hp: scene.hp,
        nowMs: now,
        lastHitAtMs: scene.lastRangedHitAtMs,
        cooldownMs: 350,
        damage: 1,
      });
      scene.hp = r.hp;
      scene.lastRangedHitAtMs = r.lastHitAtMs;
      arrow.destroy();
      if (r.tookHit) {
        scene.cameras.main.flash(60, 255, 107, 107);
      }
    });

    if (scene.playerArrowsGroup) {
      scene.physics.add.overlap(scene.playerArrowsGroup, goblins, (_a: unknown, g: unknown) => {
        const arrow = _a as Phaser.Physics.Arcade.Sprite;
        const gob = g as Phaser.Physics.Arcade.Sprite;
        scene.damageGoblin(gob, 1);
        arrow.destroy();
      });
    }

    // Shooting loop: goblins fire when player is within range and cooldown allows.
    scene.time.addEvent({
      delay: 250,
      loop: true,
      callback: () => {
        const now = scene.time.now;
        for (const obj of goblins.getChildren()) {
          const g = obj as Phaser.Physics.Arcade.Sprite;
          if (!g.active) continue;
          const dx = scene.player.x - g.x;
          const dy = scene.player.y - g.y;
          const d2 = dx * dx + dy * dy;
          const range2 = (32 * 10) ** 2;
          if (d2 > range2) continue;

          const lastShotAtMs = (g as any).__lastShotAtMs as number;
          const attempt = tryShoot({ nowMs: now, state: { lastShotAtMs }, cooldownMs: 900 });
          if (!attempt.ok) continue;
          (g as any).__lastShotAtMs = attempt.next.lastShotAtMs;

          // Shoot arrow toward player.
          const dir = normalize({ x: scene.player.x - g.x, y: scene.player.y - g.y });
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
          scene.uiCam.ignore(arrow);

          // Small shoot "twitch"
          g.setTintFill(0xf5d76e);
          scene.tweens.add({
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
          scene.time.delayedCall(2200, () => {
            if (arrow.active) arrow.destroy();
          });
        }
      },
    });

    // Movement loop: keep distance and strafe a little so they feel alive.
    scene.time.addEvent({
      delay: 300,
      loop: true,
      callback: () => {
        for (const obj of goblins.getChildren()) {
          const g = obj as Phaser.Physics.Arcade.Sprite;
          if (!g.active) continue;
          const dx = scene.player.x - g.x;
          const dy = scene.player.y - g.y;
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
    // no goblins in this area
    scene.goblinsGroup?.destroy(true);
    scene.goblinsGroup = undefined;
    scene.arrowsGroup?.destroy(true);
    scene.arrowsGroup = undefined;
    if (scene.bowSprite) {
      scene.bowSprite.destroy();
      scene.bowSprite = undefined;
    }
  }

  if (scene.area.id === "troll_clearing") {
    addChest(
      { x: Math.floor(scene.area.width / 2), y: Math.floor(scene.area.height / 2) },
      {
        flag: "chest.troll.clearing.1",
        loot: [{ itemId: "coins", qty: 60 }],
        openedDialog: "chestMessage",
        emptyDialog: "chestEmpty",
      },
    );
  }

  // Hallway props: torches + sword
  if (scene.area.id === "hallway") {
    ensureItemAndPropTextures(scene);
    // Torches along walls
    for (let y = 3; y < scene.area.height - 3; y += 4) {
      const lx = 1 * tileSize + tileSize / 2;
      const rx = (scene.area.width - 2) * tileSize + tileSize / 2;
      const wy = y * tileSize + tileSize / 2;
      const t1 = scene.add.sprite(lx, wy, "prop_torch").setDepth(wy);
      const t2 = scene.add.sprite(rx, wy, "prop_torch").setDepth(wy);
      scene.uiCam.ignore([t1, t2]);
    }
    // Sword at the end (once)
    if (!hasFlag("item.sword.1")) {
      const sx = Math.floor(scene.area.width / 2) * tileSize + tileSize / 2;
      const sy = 2 * tileSize + tileSize / 2;
      scene.swordSprite = scene.physics.add.sprite(sx, sy, "item_sword");
      scene.swordSprite.setDepth(scene.swordSprite.y);
      const sb = scene.swordSprite.body as Phaser.Physics.Arcade.Body;
      sb.setSize(14, 10).setOffset(5, 12);
      scene.physics.add.collider(scene.swordSprite, layer);
      scene.uiCam.ignore(scene.swordSprite);
    } else {
      scene.swordSprite = undefined;
    }
  } else {
    scene.swordSprite?.destroy();
    scene.swordSprite = undefined;
  }
}
