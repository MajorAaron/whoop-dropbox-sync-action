#!/bin/bash

echo "Getting new Whoop refresh token..."
echo ""
echo "1. Open this URL in your browser:"
echo ""
echo "https://api.prod.whoop.com/oauth/oauth2/auth?response_type=code&client_id=b64d5aa5-70ee-4082-bc40-6044890871e3&redirect_uri=http://localhost:3000/api/auth/callback&scope=read:recovery%20read:cycles%20read:sleep%20read:workout%20read:profile%20read:body_measurement%20offline&state=random_state"
echo ""
echo "2. After authorizing, you'll be redirected to a localhost URL that won't load"
echo "3. Copy the entire URL from your browser"
echo "4. Paste it here and press Enter:"
read REDIRECT_URL

# Extract the code from the URL
CODE=$(echo "$REDIRECT_URL" | grep -oP 'code=\K[^&]+')

if [ -z "$CODE" ]; then
    echo "Error: Could not extract code from URL"
    exit 1
fi

echo "Authorization code: $CODE"
echo ""
echo "Exchanging code for tokens..."

# Exchange code for tokens
RESPONSE=$(curl -s -X POST https://api.prod.whoop.com/oauth/oauth2/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=$CODE" \
  -d "client_id=b64d5aa5-70ee-4082-bc40-6044890871e3" \
  -d "client_secret=da62fe4a2c0674c3a563296e494b5217e42247979b60508ca4b38bd574e29dac" \
  -d "redirect_uri=http://localhost:3000/api/auth/callback")

# Extract refresh token
REFRESH_TOKEN=$(echo "$RESPONSE" | grep -oP '"refresh_token":"\K[^"]+')

if [ -z "$REFRESH_TOKEN" ]; then
    echo "Error: Could not get refresh token"
    echo "Response: $RESPONSE"
    exit 1
fi

echo ""
echo "✅ Success! Your new refresh token is:"
echo ""
echo "$REFRESH_TOKEN"
echo ""
echo "Updating .env file..."

# Update .env file
if grep -q "^WHOOP_REFRESH_TOKEN=" .env 2>/dev/null; then
    # On macOS, use sed with backup
    sed -i.bak "s/^WHOOP_REFRESH_TOKEN=.*/WHOOP_REFRESH_TOKEN=$REFRESH_TOKEN/" .env
    rm .env.bak
else
    echo "WHOOP_REFRESH_TOKEN=$REFRESH_TOKEN" >> .env
fi

echo "✅ Updated .env file"
echo ""
echo "Updating GitHub secret..."
gh secret set WHOOP_REFRESH_TOKEN --body "$REFRESH_TOKEN" --repo MajorAaron/whoop-obsidian-sync-action
echo "✅ Updated GitHub secret"
echo ""
echo "Ready to test the workflow!"