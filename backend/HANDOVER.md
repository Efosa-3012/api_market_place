# Backend handover

Hey — here's where the backend is and what I'd like you to pick up. I've got the skeleton and the
core consent flow working end to end (authorize → bank login → approve → token → `/api/v1/accounts`
→ revoke → next call fails), so everything below plugs into something that already runs. Pull `main`,
follow the "Backend development" steps in the root README, and run `bash backend/scripts/demo-flow.sh`
to see the current flow before you start.

I've ordered these roughly by how I'd tackle them: the first one is a quick warm-up to get familiar
with the middleware pattern, then the bigger pieces.

## 1. Rate limiting on the partner APIs

Right now `/api/v1/*` has no rate limit. Add one keyed **by client**, not by IP — after
`authenticate` runs, `req.auth.token.client_id` is available, so mount the limiter right after it in
`src/modules/resources/routes.ts`.

- `express-rate-limit` is the obvious choice (`npm i express-rate-limit`). Their `keyGenerator`
  option is where you use the client id; fall back to `ipKeyGenerator(req.ip)` for unauthenticated
  requests or the library complains about IPv6.
- Return 429 in our standard error envelope: `{ error: { code: 'rate_limited', message, correlation_id } }`.
  Set `req.errorCode = 'rate_limited'` too so the call log (task 3) can record it.
- Make the window and max configurable in `src/config.ts` (something like `RATE_LIMIT_WINDOW_MS=60000`,
  `RATE_LIMIT_MAX=60`) and add them to `.env.example`.
- Add a `'429'` response to the `/api/v1/accounts` entry in `openapi/openapi.yaml`.

The line to say in the presentation: "gateway concerns are Express middleware for the MVP; in production
this is Kong or Apigee with per-plan quotas."

## 2. Balances and transactions endpoints

`/api/v1/accounts` and `/api/v1/accounts/:accountId` exist. We need the other two:

```
GET /api/v1/accounts/:accountId/balances       needs scope balances:read
GET /api/v1/accounts/:accountId/transactions   needs scope transactions:read
```

Follow the pattern of the existing routes in `src/modules/resources/routes.ts`:

- Chain `requireScope('...')` then `requireConsentedAccount` before the handler. That second one is
  what stops a partner reading an account the customer didn't tick on the consent screen.
- The core banking adapter already has `coreBanking.listBalances(accountId)` and
  `coreBanking.listTransactions(accountId, query)` — see `src/core-banking/types.ts` for the shapes.
- Map the results to a **public shape** like `publicAccount` does. Don't return the raw core banking
  object; things like `running_balance`, `available_balance` internals and anything customer-identifying
  stay inside the bank. Balances: `account_id, type, amount, currency, credit_limit, as_of`.
  Transactions: `transaction_id, account_id, type, amount, currency, reference, narration, counterparty,
  booked_at, value_date`.
- Transactions take query params `limit` (1–100, default 20), `cursor`, `from`, `to`, `type`
  (`credit`|`debit`), `sort` (`booked_at_desc`|`booked_at_asc`). Validate them with zod via
  `parse()` from `src/lib/validate.ts`, pass them straight to the adapter, and return the adapter's
  `pagination` object under `meta.pagination` so the sample app can page.
- Document both in `openapi/openapi.yaml`. The `Balance` and `Transaction` schemas are already defined
  under `components`, you just need the path entries.
- Add them back into step 7 of `scripts/demo-flow.sh`.

`acct-demo-001` has enough transactions to show pagination with `limit=2`.

## 3. API call log + analytics

This is the "control room" deliverable and it's yours end to end. Two halves:

**a) Log every request.** There's an `api_calls` table in `src/db/migrations/001_init.sql` that nothing
writes to yet. Write a middleware (`src/middleware/auditLog.ts` or whatever you like) that inserts one
row per request when the response finishes (`res.on('finish', ...)`) and mount it early in `app.ts`,
after `correlationId`. Record method, path (strip the query string), status, `req.errorCode`,
duration, ip, and — when the call was authenticated — `req.auth.clientRowId`, `consentId`,
`customerId`. Do the insert fire-and-forget with a `.catch` that logs; a failed audit write must
never break a partner's call.

One detail worth doing: when `authenticate` rejects a call (revoked consent, deactivated client)
`req.auth` is never set, so the row won't be attributed to anyone. It's much better for the dashboard
if "BudgetBuddy's calls started failing after revocation" is visible, so set a lighter
`req.audit = { clientRowId, consentId, customerId }` in `authenticate.ts` as soon as the consent row is
looked up, before the status checks, and have the log middleware fall back to it.

**b) Expose it.** Endpoints under `/analytics` for the dashboard, all plain SQL over `api_calls` and
`consents`:

```
GET /analytics/summary               calls last 24h, error rate, active consents, revocations, p95 latency
GET /analytics/calls-per-client      [{ client_id, name, calls, errors }]
GET /analytics/timeseries?window=24h calls per 5-minute bucket (for a line chart)
GET /analytics/recent-calls?limit=50 live audit feed — great for the demo
GET /analytics/consents              counts by status
```

Protect them with something simple for the MVP — an `X-Admin-Key` header checked against an
`ADMIN_KEY` env var is fine. The frontend dev will build the dashboard against these, so agree the
response shapes with them early and put them in the OpenAPI file.

## 4. Developer portal backend

The self-service bit: a developer signs up, registers an app, gets credentials. Lives in
`src/modules/portal/routes.ts` (currently a stub). Tables `developers` and `clients` are already in
the schema and `src/db/seed.ts` shows how a client row is created.

```
POST /portal/signup                  { email, password, name, company? } -> { developer, portal_token }
POST /portal/login                   -> { developer, portal_token }
GET  /portal/apps                    the developer's clients
POST /portal/apps                    { name, description?, redirect_uris[] }
                                     -> { client_id, client_secret, ... }   secret is shown ONCE
POST /portal/apps/:id/rotate-secret  new secret, old one stops working
POST /portal/apps/:id/deactivate     the blast-radius switch
```

Notes:
- Hash secrets with `bcryptjs` exactly like `bank/routes.ts` does for passwords. Never store the
  plaintext; return it once from the create/rotate response and that's it.
- `client_id` should look like something a developer can read, e.g. `cl_` + 16 random base64url chars
  (`randomBytes(12).toString('base64url')`). Secrets: `randomBytes(32)`.
- Portal auth: a JWT with `{ developer_id }` signed with `JWT_SECRET` is the least code. Don't reuse
  the partner access-token shape.
- **Deactivate** must call `consentService.revokeAllForClient(clientRowId)` (already written in
  `src/modules/consent/service.ts`) and set `status = 'deactivated'`. That's the "one switch kills every
  token and consent under it" story from the brief — worth demoing.
- Every endpoint goes in `openapi/openapi.yaml` under a new `Portal` tag.

## House rules

- Errors go through `ApiError` from `src/lib/errors.ts` so they come out in the standard envelope.
  Throw, don't `res.status(...).json(...)` by hand.
- Validate input with zod + `parse()`; it turns issues into a 400 `validation_error` for you.
- Everything is `async (req, res, next) => { try { ... } catch (err) { next(err) } }` — Express 5
  does catch rejected promises, but keeping the pattern explicit has saved us confusion.
- `npm run typecheck` before you push. `npm run seed` resets demo data if you get the DB into a weird state.
- Don't touch `authenticate.ts`, `consent/service.ts` or `auth/routes.ts` without a quick chat — the
  frontend is being built against their behaviour.

Shout if anything's unclear. The fastest way to see how a piece is meant to work is usually to read
the route it's next to.
