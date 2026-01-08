# Roadmap

## Milestone: MVP (local playable)
- [x] Project scaffold: Vite + TS + Phaser + Vitest
- [x] Docs system + ADRs
- [x] Basic Phaser boot + one world scene renders
- [x] 4-direction movement + walk/idle animation hooks
- [x] Simple collision (placeholder rectangle or tile collision)
- [x] Multiple areas (village/woods/cave) with transitions
- [x] NPC interaction + dialog box
- [x] Minimal UI overlay (HUD stub)
- [x] Auth UI: signup/signin with username+password (no email shown)
- [x] Firebase: username uniqueness + user profile doc
- [ ] Cloud save/load (users/{uid}.state) polish + UX
- [ ] Scoreboard: submit score + view leaderboard

## Milestone: v0.2 (Zelda/Pokémon feel)
- [ ] Tilemap village (Tiled)
- [ ] Transition triggers to woods/cave maps
- [ ] NPC dialog box + choices
- [ ] Inventory stub (items list)
- [ ] Simple combat encounter stub (turn-based or bump-to-hit)

## Milestone: v0.3 (content + polish)
- [ ] Sounds + music
- [ ] Save/load (cloud + local)
- [ ] Basic accessibility and controls remapping

## Milestone: Town multiplayer (alpha)
- [ ] Tier 1 data model scope: town presence, listings (buy/sell), and trades (player-to-player)
- [ ] Real-time presence sync (position + facing + sprite)
- [ ] Town listings board (basic buy/sell loop)
- [ ] Trade offers UI and state sync

