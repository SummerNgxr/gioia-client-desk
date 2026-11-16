# Client Desk

A small client desk: clients, quotations, monthly and ad hoc invoices, service workspaces with approvals, and an activity feed. Three roles sign in with Google: admin, team member and client.

## Run

Needs Node 20+ and a Postgres database.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `SESSION_SECRET` | Long random string that signs the sign-in cookie |
| `ADMIN_EMAIL`, `ADMIN_NAME` | The first admin's Google email and display name |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth web client. Redirect URI: `<app address>/auth/google/callback` |
| `BASE_URL` | Optional. The app's public address, if it differs from the request host |
| `SEED_JSON` | Optional, first boot only: starter brand, catalogue and clients |
| `NODE_ENV` | `production` when live |

`npm install`, then `npm start`.

For local testing only, `DEV_LOGIN=1` (ignored in production) enables `/auth/dev?email=...`.

## How it is put together

- `server.js`: sign-in, permissions and every change to the data. The browser is never trusted with a rule.
- `public/logic.js`: the quotation, invoice and task rules, shared by server and browser.
- `public/app.js`, `public/style.css`: the screens.

No client or pricing data lives in this repository; it is stored in the database.
