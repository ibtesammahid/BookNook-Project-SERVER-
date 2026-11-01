# AGENTS.md

## Overview

Single-file Express 5 API server (`index.js`) for the Booknook app, backed by MongoDB Atlas. ESM (`"type": "module"` in package.json) — use `import`, not `require`. Raw `mongodb` driver, no ODM.

## Commands

- Run server: `node index.js` (there is **no** `start`/`dev` npm script; `npm test` is the default placeholder and always fails)
- Install deps: `npm install`
- No lint, format, typecheck, or test tooling exists.

## Environment

- `.env` with `MONGODB_URI` is required (loaded via `import "dotenv/config"`). `.env` is gitignored, so fresh clones must create one before the server will start.
- Port is hard-coded to `5000` in `index.js` (not read from env).
- Data goes to the `booknook` database, `books` collection (hard-coded in `index.js`).

## Runtime gotchas

- Startup fails fast: the server exits with a clear error if `MONGODB_URI` is unset or the initial Mongo connection fails (it no longer starts without a DB).
- Routes: `GET /` (welcome message), `POST /addbooks` (inserts the JSON body into `books`, returns 201 + `insertedId`; 400 on empty body), and a catch-all 404.
- CORS is enabled for all origins/routes.
