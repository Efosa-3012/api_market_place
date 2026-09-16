-- Who is asking? The consent screen shows the customer the app's identity, not
-- just a name: logo, website and privacy policy, plus how long it has been a
-- registered partner. Collected on the portal when the app is registered.
ALTER TABLE clients
  ADD COLUMN website_url        text,
  ADD COLUMN privacy_policy_url text,
  ADD COLUMN logo_url           text;
