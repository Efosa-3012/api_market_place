-- ============================================================================
-- Open Banking API Marketplace — core schema
--
-- Ownership of tables:
--   portal     : developers, clients
--   auth       : bank_customers, bank_sessions, authorization_codes
--   consent    : consents
--   gateway    : api_calls (audit trail + analytics source)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Developers: people who sign up on the portal and register apps
-- ---------------------------------------------------------------------------
CREATE TABLE developers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  name          text NOT NULL,
  company       text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Clients: a registered fintech app. client_id is public, the secret is
-- stored hashed and shown to the developer exactly once.
-- Deactivating a client is the "one switch" that kills every consent and
-- token under it (blast radius).
-- ---------------------------------------------------------------------------
CREATE TYPE client_status AS ENUM ('active', 'deactivated');

CREATE TABLE clients (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id       uuid NOT NULL REFERENCES developers(id) ON DELETE CASCADE,
  name               text NOT NULL,
  description        text,
  client_id          text NOT NULL UNIQUE,
  client_secret_hash text NOT NULL,
  redirect_uris      text[] NOT NULL DEFAULT '{}',
  allowed_scopes     text[] NOT NULL DEFAULT '{accounts:read,balances:read,transactions:read}',
  status             client_status NOT NULL DEFAULT 'active',
  created_at         timestamptz NOT NULL DEFAULT now(),
  deactivated_at     timestamptz
);
CREATE INDEX clients_developer_idx ON clients(developer_id);

-- ---------------------------------------------------------------------------
-- Bank customers: the mock internet-banking login. customer_id must match the
-- ids in the core banking service (customer-demo-001 ...). In production this
-- table does not exist — the bank's real identity provider handles login.
-- ---------------------------------------------------------------------------
CREATE TABLE bank_customers (
  customer_id   text PRIMARY KEY,
  username      text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  full_name     text NOT NULL
);

-- Short-lived session for the consent UI after mock login.
CREATE TABLE bank_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id text NOT NULL REFERENCES bank_customers(customer_id),
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Consents: THE central object. Who asked (client), on whose behalf
-- (customer), for what (scopes), on which accounts, until when.
--
-- Lifecycle:  awaiting_authorisation --> authorised --> revoked
--                       |                     \--> expired (expires_at passed)
--                       \--> rejected
-- ---------------------------------------------------------------------------
CREATE TYPE consent_status AS ENUM (
  'awaiting_authorisation', 'authorised', 'rejected', 'revoked', 'expired'
);

CREATE TABLE consents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid NOT NULL REFERENCES clients(id),
  customer_id   text REFERENCES bank_customers(customer_id),   -- null until the customer logs in
  scopes        text[] NOT NULL,
  account_ids   text[] NOT NULL DEFAULT '{}',                  -- chosen by the customer at approval
  status        consent_status NOT NULL DEFAULT 'awaiting_authorisation',
  redirect_uri  text NOT NULL,
  state         text,                                          -- OAuth state, echoed back to the client
  created_at    timestamptz NOT NULL DEFAULT now(),
  authorised_at timestamptz,
  expires_at    timestamptz,                                   -- set at authorisation (now + CONSENT_TTL_DAYS)
  revoked_at    timestamptz,
  revoked_by    text                                           -- 'customer' | 'bank' | 'client_deactivated'
);
CREATE INDEX consents_client_idx   ON consents(client_id);
CREATE INDEX consents_customer_idx ON consents(customer_id);
CREATE INDEX consents_status_idx   ON consents(status);

-- ---------------------------------------------------------------------------
-- Authorization codes: single-use, short-lived, bound to one consent.
-- ---------------------------------------------------------------------------
CREATE TABLE authorization_codes (
  code        text PRIMARY KEY,
  consent_id  uuid NOT NULL REFERENCES consents(id),
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- API call log: every request through the gateway. This is both the audit
-- trail ("who accessed what, on whose behalf, under which consent, when") and
-- the data source for the analytics dashboard.
-- ---------------------------------------------------------------------------
CREATE TABLE api_calls (
  id             bigserial PRIMARY KEY,
  correlation_id text NOT NULL,
  client_id      uuid REFERENCES clients(id),
  consent_id     uuid REFERENCES consents(id),
  customer_id    text,
  method         text NOT NULL,
  path           text NOT NULL,
  status_code    int  NOT NULL,
  error_code     text,
  duration_ms    int  NOT NULL,
  ip             text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX api_calls_created_idx ON api_calls(created_at DESC);
CREATE INDEX api_calls_client_idx  ON api_calls(client_id, created_at DESC);
