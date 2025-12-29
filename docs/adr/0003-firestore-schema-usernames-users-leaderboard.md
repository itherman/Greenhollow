# ADR 0003: Firestore schema (usernames, users, leaderboard)

## Status
Accepted

## Context
We need:
- Unique usernames
- User profiles
- Cloud save/load of player state (MVP convenience)
- A global scoreboard/leaderboard (planned)

## Decision
Collections/Documents:

- `usernames/{username}`
  - `{ uid: string, createdAt: Timestamp }`
  - Used to enforce uniqueness

- `users/{uid}`
  - `{ username: string, createdAt: Timestamp }`
  - Also stores a nested save payload under `state` (see below)

- `users/{uid}.state`
  - A versioned player state blob (see `src/core/playerStateCodec.ts`)
  - Written with `merge: true` so `createdAt` and other profile fields are preserved

- `leaderboards/global/scores/{uid}`
  - `{ username: string, score: number, updatedAt: Timestamp }`
  - Updated when a user posts a new high score

## Consequences
- Read leaderboard with a query ordered by score descending.
- Username changes are non-trivial (we will treat usernames as immutable in MVP).


