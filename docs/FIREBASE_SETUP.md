# Firebase setup (Auth + Firestore + Realtime Database)

## 1) Create a Firebase project
- Firebase Console → Add project

## 2) Create a Web App
- Project settings → Your apps → Web app
- Copy the config values into a local `.env` file (see `ENV.template`)

## 3) Enable Authentication
- Authentication → Sign-in method → enable **Email/Password**

## 4) Create Firestore database
- Firestore Database → Create database (test mode is OK for initial local dev)

## 5) Create Realtime Database (for town presence)
- Realtime Database → Create database (locked mode recommended)
- Add the rules from the "Realtime Database rules" section below

## 6) Local environment (.env)
This repo does not commit `.env`. Create a local `.env` by copying `ENV.template` and filling in your own Firebase project values.

Required keys (must all be present for Firebase mode to work):
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_DATABASE_URL`

If these are missing, the game still works in **guest mode** (offline), but login/cloud save will show a friendly error.

## 7) Realtime Database rules (town presence)
Use these rules so authenticated players can publish their own presence and read town presence:

```json
{
  "rules": {
    "towns": {
      "$townId": {
        "presence": {
          "$uid": {
            ".read": "auth != null",
            ".write": "auth != null && auth.uid == $uid"
          }
        }
      }
    }
  }
}
```

## 8) Firestore data used today
Current auth/profile + save system uses:
- `usernames/{username}`: `{ uid, createdAt }` (enforces unique usernames)
- `users/{uid}`: `{ username, createdAt }` (created at signup)
- `users/{uid}.state`: player save state (merged on save so it won’t overwrite `createdAt`)
- `leaderboards/global/scores/{uid}` (planned, not implemented)

## 9) Realtime Database data used today
- `towns/town/presence/{uid}`: `{ areaId, username, x, y, facing, updatedAtMs, updatedAt }` (town hub presence)

