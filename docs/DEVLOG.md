# Devlog

## 2025-12-27
- Fix store exit spawn so leaving the shop no longer drops the player back into the entrance trigger.
- Rework the troll clearing layout to enter from the bottom-left path that turns east toward the bridge.
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

