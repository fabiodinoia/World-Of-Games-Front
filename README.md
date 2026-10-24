# World of Games — Frontend

![World of Games logo](./src/assets/WOG-logo1.png)

Angular 21 storefront for **World of Games**, a marketplace to browse, publish and
collect video games. Standalone components, the built-in control flow
(`@if` / `@for`), and signals. It talks to the World of Games REST API.

Browsing the catalogue and game pages works without an account. Cart, profile
and publishing games require signing in. Use **Try the demo** on the login page
for one-click access.

## Requirements

- Node.js **22.18+** (see `.nvmrc`; `nvm use`)
- A running World of Games API (defaults to `http://localhost:4800`)

## Getting started

```bash
npm install
cp .env.example .env   # optional: adjust API_URL / Firebase values
npm start              # http://localhost:4200
```

## Configuration

`src/environments/environment.ts` is **generated** (and git-ignored) by
`src/environments/set-env.mts`. It runs automatically before `start`, `build`,
`watch` and `test`, or on its own with `npm run config`. Values come from
environment variables or a local `.env` file:

| Variable | Default | Purpose |
| --- | --- | --- |
| `API_URL` | `http://localhost:4800` | Base URL of the API |
| `NODE_ENV` | `development` | `production` sets `environment.production` |
| `FIREBASE_*` | empty | Firebase web config, only needed for image uploads |

Without Firebase config the app still works: image uploads are disabled and a
game cover can be given as an image URL instead.

## Scripts

| Command | Description |
| --- | --- |
| `npm start` | Dev server on port 4200 |
| `npm run build` | Production build to `dist/world-of-games-front/` |
| `npm test` | Unit tests (Karma + Jasmine, watch mode) |
| `npm run test:ci` | Single headless run with coverage (`coverage/lcov.info`) |

## Demo account

`demo@worldofgames.dev` / `DemoPass123!` (seeded by the API).
