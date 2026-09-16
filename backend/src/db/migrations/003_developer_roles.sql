-- Bank staff sign in through the same portal login as developers and are told
-- apart by this role. The analytics dashboard is the only thing that checks it.
--
-- In production the bank's own staff SSO issues these identities and this
-- column does not exist — which is why the analytics routes still accept the
-- X-Admin-Key shared secret as well, for scripts and smoke tests.
CREATE TYPE developer_role AS ENUM ('developer', 'admin');

ALTER TABLE developers ADD COLUMN role developer_role NOT NULL DEFAULT 'developer';

CREATE INDEX developers_role_idx ON developers(role) WHERE role = 'admin';
