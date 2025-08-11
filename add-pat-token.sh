#!/bin/bash

echo "Enter your Personal Access Token (PAT):"
read -s PAT_TOKEN

echo ""
echo "Adding PAT to GitHub secrets..."

gh secret set PA_TOKEN --body "$PAT_TOKEN" --repo MajorAaron/THE-MAINFRAME

echo "✅ PA_TOKEN added to repository secrets"
echo ""
echo "You can now delete this script for security"