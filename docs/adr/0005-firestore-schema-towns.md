# ADR 0005: Firestore schema (towns)

## Status
Accepted

## Context
We need a Town multiplayer data model that supports:
- Presence for players in a town
- Buy/sell listings in a shared market
- Player-to-player trade offers

## Decision
Collections/Documents:

- `towns/{townId}/presence/{uid}`
  - `{ x: number, y: number, dir: string, sprite: string, displayName: string, lastSeenAt: Timestamp }`
  - Presence is updated frequently; `lastSeenAt` is used for staleness checks.

- `towns/{townId}/listings/{listingId}`
  - `{ sellerUid: string, itemId: string, qty: number, price: number, status: string, createdAt: Timestamp }`
  - `status` should encode lifecycle (e.g. `open`, `sold`, `cancelled`).

- `towns/{townId}/trades/{tradeId}`
  - `{ offererUid: string, offereeUid: string, items: Array<{ itemId: string, qty: number }>, gold: number, status: string, updatedAt: Timestamp }`
  - `status` should encode lifecycle (e.g. `pending`, `accepted`, `declined`, `cancelled`).

## Consequences
- Town data can be queried/scoped by `townId` for multiplayer features.
- The schema leaves room for validation rules and state transitions in Firebase rules.
