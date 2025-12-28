# ADR 0001: Tech stack (Vite + Phaser 3 + TypeScript)

## Status
Accepted

## Context
We want a 2D web game that can be iterated quickly, runs locally, and can later be deployed as a static site.

## Decision
- Use **Vite** for dev/build tooling
- Use **TypeScript** for safer refactors and testable logic modules
- Use **Phaser 3** for the 2D engine
- Use **Vitest** for unit testing

## Consequences
- Rendering is handled by Phaser scenes, but game rules should live in pure TS modules for testability.


