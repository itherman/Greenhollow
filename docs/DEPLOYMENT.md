# Deployment (Firebase Hosting)

This repo deploys a static build to **Firebase Hosting**.

## What gets deployed
- `npm run build` outputs `dist/`.
- `firebase.json` is configured with:
  - `hosting.public = "dist"`
  - a SPA rewrite from `/**` → `/index.html`

## Prerequisites
- Firebase project exists (see `docs/FIREBASE_SETUP.md`)
- Firebase CLI installed and authenticated:

```bash
npm i -g firebase-tools
firebase login
```

This repo includes a `.firebaserc` with a default project id. If you want to deploy to a different Firebase project, update your local Firebase project alias/config.

## Deploy
Full deploy (build + deploy):

```bash
npm run deploy
```

Hosting-only deploy:

```bash
npm run deploy:hosting
```

## Preview production build locally

```bash
npm run build
npm run preview
```


