#!/bin/bash

echo "Enter your Personal Access Token (PAT):"
read -s PAT_TOKEN

echo ""
echo "Adding PAT to GitHub secrets..."

REPO=${GITHUB_REPOSITORY:-aaronmajor/whoop-obsidian-sync-action}
gh secret set PA_TOKEN --body "$PAT_TOKEN" --repo $REPO

echo "✅ PA_TOKEN added to repository secrets for $REPO"
echo ""
echo "You can now delete this script for security"