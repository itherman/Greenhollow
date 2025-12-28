# ADR 0003: Firestore schema (usernames, users, leaderboard)

## Status
Accepted

## Context
We need:
- Unique usernames
- User profiles
- A global scoreboard/leaderboard

## Decision
Collections/Documents:

- `usernames/{username}`
  - `{ uid: string, createdAt: Timestamp }`
  - Used to enforce uniqueness

- `users/{uid}`
  - `{ username: string, createdAt: Timestamp }`

- `leaderboards/global/scores/{uid}`
  - `{ username: string, score: number, updatedAt: Timestamp }`
  - Updated when a user posts a new high score

## Consequences
- Read leaderboard with a query ordered by score descending.
- Username changes are non-trivial (we will treat usernames as immutable in MVP).


