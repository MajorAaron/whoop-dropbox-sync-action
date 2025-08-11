#!/bin/bash

echo "Add PA_TOKEN to whoop-obsidian-sync-action repository"
echo ""
echo "You need a Personal Access Token with 'repo' and 'workflow' permissions."
echo ""
echo "If you already have one in THE-MAINFRAME repo, you can copy it from:"
echo "https://github.com/MajorAaron/THE-MAINFRAME/settings/secrets/actions"
echo ""
echo "Or create a new one at:"
echo "https://github.com/settings/tokens/new"
echo "  - Name: 'Whoop Sync Action'"
echo "  - Scopes: 'repo' and 'workflow'"
echo ""
echo "Enter your PA_TOKEN:"
read -s PA_TOKEN

if [ -z "$PA_TOKEN" ]; then
    echo "❌ No token entered"
    exit 1
fi

echo ""
echo "Adding PA_TOKEN to GitHub secrets..."

REPO="MajorAaron/whoop-obsidian-sync-action"
gh secret set PA_TOKEN --body "$PA_TOKEN" --repo $REPO

echo "✅ PA_TOKEN added to $REPO"
echo ""
echo "The workflow should now work! You can trigger it from:"
echo "https://github.com/$REPO/actions/workflows/sync-to-mainframe.yml"