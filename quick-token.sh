#!/bin/bash

CLIENT_ID="b64d5aa5-70ee-4082-bc40-6044890871e3"
CLIENT_SECRET="da62fe4a2c0674c3a563296e494b5217e42247979b60508ca4b38bd574e29dac"
REDIRECT_URI="http://localhost:3000/api/auth/callback"

# URL encode the redirect URI
ENCODED_REDIRECT_URI=$(echo -n "$REDIRECT_URI" | python3 -c "import sys, urllib.parse; print(urllib.parse.quote(sys.stdin.read()))")

# Generate the authorization URL
AUTH_URL="https://api.prod.whoop.com/oauth/oauth2/auth?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${ENCODED_REDIRECT_URI}&scope=read:recovery%20read:cycles%20read:sleep%20read:workout%20read:profile%20read:body_measurement%20offline&state=auth_$(date +%s)"

echo "=== Whoop OAuth Token Helper ==="
echo ""
echo "1. Open this URL in your browser:"
echo ""
echo "$AUTH_URL"
echo ""
echo "2. After authorizing, you'll be redirected to localhost:3000"
echo "3. The page might show an error - that's OK!"
echo "4. Copy the 'code' parameter from the URL"
echo "   Example: http://localhost:3000/api/auth/callback?code=XXXXXX&state=..."
echo ""
echo "5. Enter the code below:"
read -p "Code: " CODE

if [ -z "$CODE" ]; then
    echo "No code entered"
    exit 1
fi

echo ""
echo "Exchanging code for tokens..."

# Exchange the code for tokens
RESPONSE=$(curl -s -X POST https://api.prod.whoop.com/oauth/oauth2/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=${CODE}" \
  -d "client_id=${CLIENT_ID}" \
  -d "client_secret=${CLIENT_SECRET}" \
  -d "redirect_uri=${REDIRECT_URI}")

echo "Response: $RESPONSE"

# Extract tokens using Python
REFRESH_TOKEN=$(echo "$RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('refresh_token', ''))")
ACCESS_TOKEN=$(echo "$RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('access_token', ''))")

if [ -n "$REFRESH_TOKEN" ]; then
    echo ""
    echo "=== SUCCESS! ==="
    echo ""
    echo "Refresh Token:"
    echo "$REFRESH_TOKEN"
    echo ""
    echo "Updating .env file..."
    
    # Update .env file
    cat > .env << EOF
WHOOP_CLIENT_ID=${CLIENT_ID}
WHOOP_CLIENT_SECRET=${CLIENT_SECRET}
WHOOP_REFRESH_TOKEN=${REFRESH_TOKEN}
WHOOP_REDIRECT_URI=${REDIRECT_URI}
EOF
    
    echo "✅ .env file updated"
    echo ""
    echo "Updating GitHub secret..."
    gh secret set WHOOP_REFRESH_TOKEN --body "$REFRESH_TOKEN" --repo MajorAaron/THE-MAINFRAME
    echo "✅ GitHub secret updated"
else
    echo ""
    echo "❌ Failed to get tokens"
    echo "Response: $RESPONSE"
fi