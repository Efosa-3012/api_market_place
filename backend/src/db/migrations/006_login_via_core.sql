-- Customer login now goes to the core banking service (its identity provider),
-- so the marketplace no longer holds customer credentials. Sessions and consents
-- keep the customer_id but no longer reference the old mock table.
--
-- Failed-login tracking stays here because the lockout is a gateway policy,
-- independent of where the credentials live.
ALTER TABLE bank_sessions DROP CONSTRAINT IF EXISTS bank_sessions_customer_id_fkey;
ALTER TABLE consents      DROP CONSTRAINT IF EXISTS consents_customer_id_fkey;
DROP TABLE IF EXISTS bank_customers;
ALTER TABLE bank_sessions ADD COLUMN full_name text NOT NULL DEFAULT '';

CREATE TABLE bank_login_attempts (
  username     text PRIMARY KEY,
  failed_count int NOT NULL DEFAULT 0,
  locked_until timestamptz,
  updated_at   timestamptz NOT NULL DEFAULT now()
);
