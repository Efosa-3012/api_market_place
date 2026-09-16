-- Sandbox consents are pre-authorised for a demo customer without any customer
-- interaction, so developers can call the APIs from the portal straight away.
-- They go through exactly the same `authenticate` checks as real consents; the
-- flag only lets dashboards and Connected Apps tell them apart.
ALTER TABLE consents ADD COLUMN sandbox boolean NOT NULL DEFAULT false;
CREATE INDEX consents_sandbox_idx ON consents(client_id) WHERE sandbox;
