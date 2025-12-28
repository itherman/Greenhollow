# Firebase setup (Auth + Firestore)

## 1) Create a Firebase project
- Firebase Console → Add project

## 2) Create a Web App
- Project settings → Your apps → Web app
- Copy the config values into a local `.env` file (see `ENV.template`)

## 3) Enable Authentication
- Authentication → Sign-in method → enable **Email/Password**

## 4) Create Firestore database
- Firestore Database → Create database (test mode is OK for initial local dev)

## 5) Required Firestore collections (MVP)
- `usernames/{username}`: `{ uid, createdAt }`
- `users/{uid}`: `{ username, createdAt }`
- `leaderboards/global/scores/{uid}`: `{ username, score, updatedAt }`

## 6) Local environment
This repo does not commit `.env`. Create a local `.env` by copying `ENV.template`.


