# ADR 0002: Username/password login via synthetic email (Firebase Auth)

## Status
Accepted

## Context
We want "username + password" login and do not want to require the user to provide an email.
Firebase Auth supports email/password but not true username/password.

## Decision
- Collect `username` + `password` in the UI.
- Internally map username to a **synthetic email**:
  - `syntheticEmail = <normalizedUsername>@game.local`
- Use Firebase **Email/Password Auth** with that synthetic email.
- Enforce unique usernames in Firestore:
  - `usernames/{username}` contains `{ uid }`
  - Signup reserves the username before/alongside account creation.

## Consequences
- Username must be normalized and validated consistently.
- If we ever migrate to a custom auth backend, only the auth layer changes; game code stays the same.


