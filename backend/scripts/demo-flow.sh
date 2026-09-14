#!/usr/bin/env bash
# Walks the full consent journey against a running backend using only curl.
# Useful as a smoke test before rehearsals and as a reference for the frontend/sample app.
#
#   bash backend/scripts/demo-flow.sh            # against http://localhost:4000
#   BASE=http://host:4000 bash backend/scripts/demo-flow.sh
set -euo pipefail

B=${BASE:-http://localhost:4000}
CLIENT_ID=${CLIENT_ID:-budgetbuddy}
CLIENT_SECRET=${CLIENT_SECRET:-budgetbuddy-secret-dev-only}
REDIRECT_URI=${REDIRECT_URI:-http://localhost:3000/callback}
USERNAME=${BANK_USER:-ada}
PASSWORD=${BANK_PASS:-password123}
ACCOUNT=${ACCOUNT:-acct-demo-001}

json() { sed -n "s/.*\"$1\":\"\([^\"]*\)\".*/\1/p"; }
step() { printf '\n\033[1;36m## %s\033[0m\n' "$*"; }

step "1. Partner calls the API with no token -> rejected"
curl -s "$B/api/v1/accounts"; echo

step "2. Sample app starts the consent flow (GET /oauth/authorize)"
AUTH=$(curl -s "$B/oauth/authorize?response_type=code&client_id=$CLIENT_ID&redirect_uri=$REDIRECT_URI&scope=accounts:read%20balances:read%20transactions:read&state=xyz123&format=json")
echo "$AUTH"; CONSENT_ID=$(echo "$AUTH" | json consent_id)

step "3. Customer logs in on the bank's page (POST /bank/login)"
LOGIN=$(curl -s -X POST "$B/bank/login" -H 'content-type: application/json' -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")
echo "$LOGIN"; SESSION=$(echo "$LOGIN" | json session_token)

step "4. Consent screen: what is requested + the customer's accounts"
curl -s "$B/bank/consents/$CONSENT_ID" -H "authorization: Bearer $SESSION"; echo

step "5. Customer approves and selects account $ACCOUNT"
APPROVE=$(curl -s -X POST "$B/bank/consents/$CONSENT_ID/authorise" -H "authorization: Bearer $SESSION" \
  -H 'content-type: application/json' -d "{\"account_ids\":[\"$ACCOUNT\"]}")
echo "$APPROVE"; CODE=$(echo "$APPROVE" | sed -n 's/.*code=\([^&"]*\).*/\1/p')

step "6. App exchanges the code for a token (POST /oauth/token)"
TOKEN=$(curl -s -X POST "$B/oauth/token" -u "$CLIENT_ID:$CLIENT_SECRET" \
  -d "grant_type=authorization_code&code=$CODE&redirect_uri=$REDIRECT_URI")
echo "$TOKEN" | head -c 160; echo ...; ACCESS_TOKEN=$(echo "$TOKEN" | json access_token)

step "6b. Replaying the same code -> rejected"
curl -s -X POST "$B/oauth/token" -u "$CLIENT_ID:$CLIENT_SECRET" \
  -d "grant_type=authorization_code&code=$CODE&redirect_uri=$REDIRECT_URI"; echo

step "7. App reads data with the token"
curl -s "$B/api/v1/accounts" -H "authorization: Bearer $ACCESS_TOKEN"; echo
curl -s "$B/api/v1/accounts/$ACCOUNT" -H "authorization: Bearer $ACCESS_TOKEN"; echo

step "7b. An account the customer did NOT share -> 404"
curl -s "$B/api/v1/accounts/acct-demo-002" -H "authorization: Bearer $ACCESS_TOKEN"; echo

step "8. Customer opens Connected Apps and revokes"
curl -s "$B/bank/connected-apps" -H "authorization: Bearer $SESSION" | head -c 200; echo ...
curl -s -X POST "$B/bank/connected-apps/$CONSENT_ID/revoke" -H "authorization: Bearer $SESSION"; echo

step "9. The app's next call fails instantly"
curl -s "$B/api/v1/accounts" -H "authorization: Bearer $ACCESS_TOKEN"; echo
echo
