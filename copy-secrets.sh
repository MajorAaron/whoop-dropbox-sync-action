#!/bin/bash

echo "This script will copy secrets from THE-MAINFRAME to whoop-obsidian-sync-action"
echo ""
echo "You'll need to enter each secret value when prompted."
echo "The secrets are currently stored in THE-MAINFRAME repo."
echo ""
echo "Required secrets:"
echo "1. WHOOP_CLIENT_ID"
echo "2. WHOOP_CLIENT_SECRET" 
echo "3. WHOOP_REFRESH_TOKEN"
echo "4. PA_TOKEN (Personal Access Token with repo and workflow permissions)"
echo ""
echo "You can view the current values at:"
echo "https://github.com/MajorAaron/THE-MAINFRAME/settings/secrets/actions"
echo ""
echo "Press Enter to continue..."
read

# Function to set a secret
set_secret() {
    local SECRET_NAME=$1
    local PROMPT_TEXT=$2
    
    echo ""
    echo "Enter $PROMPT_TEXT:"
    read -s SECRET_VALUE
    
    if [ -n "$SECRET_VALUE" ]; then
        gh secret set "$SECRET_NAME" --body "$SECRET_VALUE" --repo MajorAaron/whoop-obsidian-sync-action
        echo "✅ $SECRET_NAME set successfully"
    else
        echo "⚠️  Skipped $SECRET_NAME (no value entered)"
    fi
}

# Set each secret
set_secret "WHOOP_CLIENT_ID" "WHOOP Client ID"
set_secret "WHOOP_CLIENT_SECRET" "WHOOP Client Secret"
set_secret "WHOOP_REFRESH_TOKEN" "WHOOP Refresh Token"
set_secret "PA_TOKEN" "Personal Access Token (PA_TOKEN)"

echo ""
echo "✅ Done! Secrets have been copied to whoop-obsidian-sync-action"
echo ""
echo "You can now run the workflow from:"
echo "https://github.com/MajorAaron/whoop-obsidian-sync-action/actions"