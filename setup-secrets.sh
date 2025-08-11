#!/bin/bash

echo "Setting up GitHub secrets for whoop-obsidian-sync-action from .env file..."
echo ""

# Load .env file
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Please run 'node get-whoop-token.js' first to create the .env file"
    exit 1
fi

# Source the .env file
export $(cat .env | grep -v '^#' | xargs)

# Check required variables
if [ -z "$WHOOP_CLIENT_ID" ] || [ -z "$WHOOP_CLIENT_SECRET" ] || [ -z "$WHOOP_REFRESH_TOKEN" ]; then
    echo "❌ Missing required environment variables in .env"
    echo "Required: WHOOP_CLIENT_ID, WHOOP_CLIENT_SECRET, WHOOP_REFRESH_TOKEN"
    exit 1
fi

REPO="MajorAaron/whoop-obsidian-sync-action"

echo "Setting secrets for repository: $REPO"
echo ""

# Set Whoop secrets
echo "Setting WHOOP_CLIENT_ID..."
gh secret set WHOOP_CLIENT_ID --body "$WHOOP_CLIENT_ID" --repo $REPO

echo "Setting WHOOP_CLIENT_SECRET..."
gh secret set WHOOP_CLIENT_SECRET --body "$WHOOP_CLIENT_SECRET" --repo $REPO

echo "Setting WHOOP_REFRESH_TOKEN..."
gh secret set WHOOP_REFRESH_TOKEN --body "$WHOOP_REFRESH_TOKEN" --repo $REPO

if [ -n "$WHOOP_REDIRECT_URI" ]; then
    echo "Setting WHOOP_REDIRECT_URI..."
    gh secret set WHOOP_REDIRECT_URI --body "$WHOOP_REDIRECT_URI" --repo $REPO
fi

# Check for PA_TOKEN
if [ -z "$PA_TOKEN" ]; then
    echo ""
    echo "⚠️  PA_TOKEN not found in .env file"
    echo ""
    echo "You need to create a Personal Access Token with 'repo' and 'workflow' permissions:"
    echo "1. Go to: https://github.com/settings/tokens/new"
    echo "2. Give it a name (e.g., 'Whoop Sync Action')"
    echo "3. Select scopes: 'repo' and 'workflow'"
    echo "4. Generate the token"
    echo ""
    echo "Enter your PA_TOKEN (or press Enter to skip):"
    read -s PA_TOKEN_INPUT
    
    if [ -n "$PA_TOKEN_INPUT" ]; then
        echo "Setting PA_TOKEN..."
        gh secret set PA_TOKEN --body "$PA_TOKEN_INPUT" --repo $REPO
        
        # Add to .env for future use
        echo "PA_TOKEN=$PA_TOKEN_INPUT" >> .env
        echo "✅ PA_TOKEN added to .env file"
    else
        echo "⚠️  Skipped PA_TOKEN - you'll need to set this manually"
        echo "Run: gh secret set PA_TOKEN --body 'YOUR_TOKEN' --repo $REPO"
    fi
else
    echo "Setting PA_TOKEN..."
    gh secret set PA_TOKEN --body "$PA_TOKEN" --repo $REPO
fi

echo ""
echo "✅ Secrets have been set for $REPO!"
echo ""
echo "You can now run the workflow from:"
echo "https://github.com/$REPO/actions/workflows/sync-to-mainframe.yml"
echo ""
echo "Or trigger it with:"
echo "gh workflow run sync-to-mainframe.yml --repo $REPO"