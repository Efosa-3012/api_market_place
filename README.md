# Open Banking API Marketplace

The bank's safe, controlled front door for third-party developers. A fintech registers an app,
obtains a customer's consent through OAuth 2.0, and reads account data on their behalf —
scoped, revocable, rate-limited and fully audited. The customer owns the data; the app only
borrows access, and can lose it at any time.

## Structure

- `backend/` — API gateway, auth + consent services, resource APIs, portal + analytics backend (Node + Express + TypeScript + Postgres)
- `frontend/` — bank consent UI, developer portal, analytics dashboard, sample fintech app (Next.js)
- `docker-compose.yml` — the whole stack with one command
- Core banking mock lives in a separate repo: https://github.com/Derakoptes/core-banking (Go)

## Run everything

```bash
# one-time: clone the core banking mock next to this repo
git clone https://github.com/Derakoptes/core-banking.git ../core-banking

docker compose up --build            # postgres :5433, core-banking :8081, backend :4000
```

Then open http://localhost:4000/docs.

## Backend development (hot reload)

```bash
docker compose up -d postgres core-banking   # dependencies only
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

### Demo data

| What | Value |
|---|---|
| Bank customers (mock login) | `ada`, `emeka`, `fatima`, `seun`, `chiamaka`, `ibrahim`, `ngozi`, `tunde`, `amina`, `kelechi` / `password123` |
| Sample fintech app | client_id `budgetbuddy`, secret `budgetbuddy-secret-dev-only`, redirect `http://localhost:3000/callback` |
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
    ├── bank/               /bank/* — backend for the bank's own login/consent/connected-apps pages
    ├── resources/          /api/v1/accounts (partner-facing, consent enforced on every call)
    ├── portal/             /portal/* — developer signup, app registration
    └── analytics/          /analytics/* — dashboard data from api_calls  
```

Errors always look like `{ "error": { "code", "message", "correlation_id" } }` (except
`/oauth/token`, which follows RFC 6749). Internal details never leak.
