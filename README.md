# Open Banking API Marketplace

The bank's safe, controlled front door for third-party developers. A fintech registers an app,
obtains a customer's consent through OAuth 2.0, and reads account data on their behalf —
scoped, revocable, rate-limited and fully audited. The customer owns the data; the app only
borrows access, and can lose it at any time.

## Structure

- `backend/` — API gateway, auth + consent services, resource APIs, portal + analytics backend (Node + Express + TypeScript + Postgres)
- `frontend/` — developer portal + sandbox, bank consent pages, analytics dashboard (Vite + React)
- `docker-compose.yml` — the whole stack with one command
- Core banking mock lives in a separate repo: https://github.com/Derakoptes/core-banking (Go)

## Run everything

```bash
# one-time: clone the core banking mock next to this repo
git clone https://github.com/Derakoptes/core-banking.git ../core-banking

docker compose up --build            # postgres :5433, redis :6379, core-banking :8081, backend :4000
```

Then open http://localhost:4000/docs.

## Backend development (hot reload)

```bash
docker compose up -d postgres redis core-banking   # dependencies only
cd backend
cp .env.example .env                         # defaults work with the compose services
npm install
npm run seed                                 # migrations + demo data (idempotent — run before every rehearsal)
npm run dev                                  # http://localhost:4000
```

Smoke-test the entire consent journey with curl:

```bash
bash backend/scripts/demo-flow.sh
```

## Frontend development

```bash
cd frontend
cp .env.example .env        # VITE_API_URL=http://localhost:4000
npm install
npm run dev                 # http://localhost:3000
```

Routes: `/login`, `/signup`, `/app/*` (developer portal, My Apps, Sandbox), `/bank/login`, `/consent`,
`/bank/connected-apps` (customer side), `/callback` (where the demo app lands), `/admin/*`.

Or in Postman: import `backend/postman/api-marketplace.postman_collection.json` and run the
folders top to bottom (or use the Collection Runner). Each request stores what the next one
needs — consent id, session, code, token — in collection variables.

### Demo data

| What | Value |
|---|---|
| Bank customers (core banking seed) | `ada` / `adaeze-ada-okonkwo`, `emeka` / `emeka-emeka-okafor`, `fatima` / `fatima-fatima-abubakar` … pattern `firstname-shortname-lastname` |
| Developer portal | `dev@budgetbuddy.example` / `password123` |
| Bank staff (analytics dashboard) | `admin@stanbic.example` / `password123` |
| Sample fintech app | client_id `budgetbuddy`, secret `budgetbuddy-secret-dev-only`, redirect `http://localhost:3000/callback` |
| Analytics admin key (scripts) | `dev-admin-key-change-me` as `X-Admin-Key` |
| Accounts | `acct-demo-001` … `acct-demo-010` (one per customer; 006 is dormant; 007 USD, 009 GBP) |

## How the pieces fit

```
fintech app ──(1) GET /oauth/authorize ──▶ backend ──▶ 302 to bank consent UI
                                                          │ customer logs in, picks accounts, approves
                                                          ▼
fintech app ◀──(2) redirect ?code=... ◀── POST /bank/consents/:id/authorise
fintech app ──(3) POST /oauth/token ─────▶ JWT { sub: customer, client_id, consent_id, scope }
fintech app ──(4) GET /api/v1/accounts ──▶ authenticate ▸ scope ▸ consented account ▸ core banking adapter
customer    ──(5) POST /bank/connected-apps/:id/revoke ──▶ next partner call: 403 consent_revoked
```

The `api_calls` table is the audit trail and the analytics source (who, on whose behalf, under
which consent, when, outcome).

## Backend layout

```
backend/src
├── app.ts                  Express app: gateway middleware + module routers
├── config.ts               env validation (zod)
├── core-banking/           adapter interface + HTTP client for the Go mock + in-memory fake
├── db/migrations/          schema (consents are the central object)
├── db/seed.ts              deterministic demo data
├── middleware/             correlationId, authenticate (token+consent check), errorHandler
└── modules/
    ├── auth/               /oauth/authorize, /oauth/token
    ├── consent/            consent state machine + authorization codes
    ├── bank/               /bank/* — login (delegated to core banking), consent screen, connected apps
    ├── resources/          /api/v1/accounts (partner-facing, consent enforced on every call)
    ├── portal/             /portal/* — developer signup, app registration, sandbox,
    │                       and the developer's own slice of the audit trail
    └── analytics/          /analytics/* — dashboard data from api_calls
```

Both dashboards read the same `api_calls` audit trail, scoped differently:

| Surface | Sees | Credential |
|---|---|---|
| Developer portal — `/portal/summary`, `/portal/logs` | Only that developer's own apps | Portal token |
| Bank dashboard — `/analytics/*` | Everything, attributed to partner and customer | Portal token whose account has the `admin` role, **or** `X-Admin-Key` |

The admin key is there for `demo-flow.sh` and smoke tests. The browser never receives it —
the dashboard signs in as bank staff instead, because a Vite env var ships to the client in
clear text.

Errors always look like `{ "error": { "code", "message", "correlation_id" } }` (except
`/oauth/token`, which follows RFC 6749). Internal details never leak.
