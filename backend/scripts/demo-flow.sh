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
ADMIN_KEY=${ADMIN_KEY:-dev-admin-key-change-me}
RATE_LIMIT_MAX=${RATE_LIMIT_MAX:-60}

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
curl -s "$B/api/v1/accounts/$ACCOUNT/balances" -H "authorization: Bearer $ACCESS_TOKEN"; echo
TXNS=$(curl -s "$B/api/v1/accounts/$ACCOUNT/transactions?limit=2" -H "authorization: Bearer $ACCESS_TOKEN")
echo "$TXNS"
CURSOR=$(echo "$TXNS" | json next_cursor)
if [ -n "$CURSOR" ]; then
  echo "   next page (cursor=$CURSOR):"
  curl -s "$B/api/v1/accounts/$ACCOUNT/transactions?limit=2&cursor=$CURSOR" -H "authorization: Bearer $ACCESS_TOKEN"; echo
fi

step "7b. An account the customer did NOT share -> 404"
curl -s "$B/api/v1/accounts/acct-demo-002" -H "authorization: Bearer $ACCESS_TOKEN"; echo

step "7c. Per-client quota headers (keyed on client_id, never on IP)"
curl -s -D - -o /dev/null "$B/api/v1/accounts" -H "authorization: Bearer $ACCESS_TOKEN" | grep -i '^ratelimit' || true
echo "   (the 429 itself is shown in step 11, on a client registered fresh in this run,"
echo "    so re-running this script never starts against an exhausted quota)"

step "8. Customer opens Connected Apps and revokes"
curl -s "$B/bank/connected-apps" -H "authorization: Bearer $SESSION" | head -c 200; echo ...
curl -s -X POST "$B/bank/connected-apps/$CONSENT_ID/revoke" -H "authorization: Bearer $SESSION"; echo

step "9. The app's next call fails instantly"
curl -s "$B/api/v1/accounts" -H "authorization: Bearer $ACCESS_TOKEN"; echo
echo
step "10. Control room: the dashboard sees the whole sequence"
curl -s "$B/analytics/summary" -H "x-admin-key: $ADMIN_KEY"; echo
echo "   calls per client:"
curl -s "$B/analytics/calls-per-client" -H "x-admin-key: $ADMIN_KEY"; echo
echo "   consents by status:"
curl -s "$B/analytics/consents" -H "x-admin-key: $ADMIN_KEY"; echo
echo "   last 5 calls (note the 403 after revocation is still attributed to $CLIENT_ID):"
curl -s "$B/analytics/recent-calls?limit=5" -H "x-admin-key: $ADMIN_KEY"; echo
echo "   without the admin key:"
curl -s "$B/analytics/summary"; echo

step "11. Developer portal: self-service registration, then the blast-radius switch"
PORTAL_EMAIL=${PORTAL_EMAIL:-demo-partner@example.com}
PORTAL_PASS=${PORTAL_PASS:-portal-password-123}
SIGNUP=$(curl -s -X POST "$B/portal/signup" -H 'content-type: application/json' \
  -d "{\"email\":\"$PORTAL_EMAIL\",\"password\":\"$PORTAL_PASS\",\"name\":\"Demo Partner\",\"company\":\"Demo Partner Ltd\"}")
PORTAL_TOKEN=$(echo "$SIGNUP" | json portal_token)
if [ -z "$PORTAL_TOKEN" ]; then
  echo "   (account already exists, logging in instead)"
  PORTAL_TOKEN=$(curl -s -X POST "$B/portal/login" -H 'content-type: application/json' \
    -d "{\"email\":\"$PORTAL_EMAIL\",\"password\":\"$PORTAL_PASS\"}" | json portal_token)
fi
echo "   portal token: ${PORTAL_TOKEN:0:28}..."

echo "   register an app — the secret is shown exactly once:"
APP=$(curl -s -X POST "$B/portal/apps" -H "authorization: Bearer $PORTAL_TOKEN" -H 'content-type: application/json' \
  -d "{\"name\":\"Demo Partner App\",\"description\":\"Registered live during the demo.\",\"redirect_uris\":[\"$REDIRECT_URI\"]}")
echo "$APP"
APP_ROW_ID=$(echo "$APP" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
NEW_CLIENT=$(echo "$APP" | json client_id)
NEW_SECRET=$(echo "$APP" | json client_secret)

echo "   the brand-new client runs the whole OAuth flow immediately:"
NC=$(curl -s "$B/oauth/authorize?response_type=code&client_id=$NEW_CLIENT&redirect_uri=$REDIRECT_URI&scope=accounts:read&format=json" | json consent_id)
NCODE=$(curl -s -X POST "$B/bank/consents/$NC/authorise" -H "authorization: Bearer $SESSION" \
  -H 'content-type: application/json' -d "{\"account_ids\":[\"$ACCOUNT\"]}" | sed -n 's/.*code=\([^&"]*\).*/\1/p')
NTOKEN=$(curl -s -X POST "$B/oauth/token" -u "$NEW_CLIENT:$NEW_SECRET" \
  -d "grant_type=authorization_code&code=$NCODE&redirect_uri=$REDIRECT_URI" | json access_token)
curl -s "$B/api/v1/accounts" -H "authorization: Bearer $NTOKEN"; echo

echo "   that client has its own quota — hammer it until it trips (max $((RATE_LIMIT_MAX + 5))):"
RL=0
while [ "$RL" -lt $((RATE_LIMIT_MAX + 5)) ]; do
  RL=$((RL + 1))
  RLCODE=$(curl -s -o /tmp/rl_body.json -w '%{http_code}' "$B/api/v1/accounts" -H "authorization: Bearer $NTOKEN")
  if [ "$RLCODE" = "429" ]; then
    echo "   request #$RL -> 429"
    cat /tmp/rl_body.json; echo
    break
  fi
done
[ "$RLCODE" = "429" ] || echo "   never tripped after $RL requests (RATE_LIMIT_MAX=$RATE_LIMIT_MAX?)"

echo "   now deactivate the app — one switch kills every consent under it:"
curl -s -X POST "$B/portal/apps/$APP_ROW_ID/deactivate" -H "authorization: Bearer $PORTAL_TOKEN"; echo
echo "   the same token on the very next call:"
curl -s "$B/api/v1/accounts" -H "authorization: Bearer $NTOKEN"; echo
echo "   and the customer sees it gone from Connected Apps:"
curl -s "$B/bank/connected-apps" -H "authorization: Bearer $SESSION" | sed -n 's/.*"status":"\(revoked\)".*/   consent status now: \1/p' | head -1
