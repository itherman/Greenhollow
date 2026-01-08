# Devlog

## 2026-01-14
- Move Town presence syncing to Firebase Realtime Database with on-disconnect cleanup.
- Add a helper to build town presence paths and cover it with unit tests.
- Document the Realtime Database setup + rules needed for presence.

## 2026-01-13
- Add a Town presence service that publishes player tile/facing and listens for other players while in the hub.
- Wire the town entry/exit flow to start and stop presence updates.
- Add core helper tests plus a Playwright regression to confirm presence toggles with town visits.

## 2026-01-12
- Add a Town Hub area linked from the village, including a house exterior and wandering NPC.
- Route town entry through the loading overlay with a minimum one-second display to prep for multiplayer syncing.
- Add a Playwright regression that walks into town and verifies the hub load experience.

## 2026-01-11
- Normalize saved inventories so stackable items (coins, food, ammo) merge into a single stack up to the 999,999 cap.
- Hide quantity labels for single-slot gear so weapons and armor no longer show an implied "1".
- Add a Playwright regression to validate legacy stacks collapse when loading.

## 2026-01-09
- Track dialog quantity control state in the world scene to keep UI cleanup consistent.
- Add inventory coverage for multi-item add operations that must fully fit.

## 2026-01-10
- Limit Arcane Keep chest loot to one extraction per visit, resetting only after leaving the area.
- Target chest interactions to the tapped chest so dialogs no longer open from another chest nearby.
- Extend the Arcane Keep Playwright regression to assert chest loot does not repeat within the same visit.

## 2026-01-08
- Block item pickups (including chest loot) when the inventory is full so items stay in the world until space opens up.
- Add quantity controls to shop confirmations for buying or selling multiple items at once.
- Add a Playwright regression that checks quantity adjustments inside the shop purchase dialog.

## 2026-01-07
- Double enemy health pools and attack damage so monsters hit harder and take more punishment across every combat encounter.
- Shift the river boat and sailor onto the waterline by each dock and hide travel options that point back to the current area.
- Refresh peasant sprites and armor overlays so the base tunic and arms read more clearly while armored.
- Add a Playwright regression that checks ferry travel options and dock placement for the boat and sailor.
- Widen keyboard NPC interaction range so dock-side conversations reliably open when standing on adjacent tiles.

## 2026-01-06
- Split the Vite build output into dedicated Phaser/Firebase chunks to shrink the main bundle and suppress chunk size warnings.

## 2025-12-28
- Move the troll clearing return exit to the bottom-left entry path so players can double back the way they arrived.
- Add a Playwright regression that warps into the troll clearing and verifies the new exit links back to the bridge.
- Extend the browser test harness with a `restartInArea` helper to quickly hop between areas during automation.

## 2025-12-29
- Add the Arcane Keep area east of the shadowed wilds, guarded by wizards who sling high-damage bolts before players can reach the castle gate.
- Give the keep a stone tileset (new floor + wall styles) with an indoor layout full of guardians, mid-tier loot, and treasure chests that refill every visit.
- Ship a Playwright regression that restarts into the keep and confirms the castle chest opens on every revisit.

## 2025-12-30
- Spawn Arcane Keep return trips on the eastern gate path of the shadowed wilds instead of the ferry dock, so exits feel consistent with the entrance.
- Extend the Playwright harness with a bow/arrow helper and add a keep regression that equips the bow and fires inside the castle to avoid area-specific input bugs.
- Move the Arcane Keep refilling chests onto the castle pedestals and retarget the Playwright regression to the new location so the dialog triggers reliably on every visit.

## 2025-12-27
- Fix store exit spawn so leaving the shop no longer drops the player back into the entrance trigger.
- Rework the troll clearing layout to enter from the bottom-left path that turns east toward the bridge, and reroute the troll bridge approach to match (no top/left exits).
- Restore troll bridge goblin archers with deterministic spawns along the river’s right bank.

## 2025-12-26
- Initialize Vite + TypeScript project
- Add Phaser 3, Firebase, and Vitest
- Add docs system (roadmap/devlog/testing) + ADRs
- Add core logic tests (username + movement)
- Add Firebase auth/Firestore scaffolding (username+password via synthetic email)
- Add guest mode (play without Firebase) + session persistence
- Add multi-area exploration prototype (village/woods/cave) via generated tilemaps + collisions + exits
- Add NPC interaction + dialog choices (E to talk, 1-3 to choose), with dialog logic unit-tested
