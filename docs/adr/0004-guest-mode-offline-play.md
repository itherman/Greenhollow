# ADR 0004: Guest mode (offline play without Firebase)

## Status
Accepted

## Context
We want the game to be playable immediately without requiring:
- Firebase project setup
- Login credentials

We also want a path to cloud features (leaderboard) when users do log in.

## Decision
- Support a **Guest** session:
  - Stored in `localStorage` as `game.session.v1`
  - Identified with `mode="guest"`, `uid="guest:<id>"`, and a generated `username` like `guest_ab12cd`
- Auth UI offers **Continue as guest** and never blocks gameplay.
- Cloud features (leaderboard) will require `mode="firebase"` in later slices.

## Consequences
- Guest sessions are device-local and not secure (fine for MVP).
- If Firebase is not configured, login attempts fail with a friendly UI message, but guest play still works.


