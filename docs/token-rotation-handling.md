# Handling Whoop Token Rotation

## Why Tokens Rotate

Whoop implements refresh token rotation as a security best practice. This means:
- Each time you use a refresh token, you get a new one
- The old refresh token becomes invalid
- This is NOT a bug or expiration issue - it's a security feature

## How the Action Handles This

The GitHub Action automatically handles token rotation:

1. Uses the current refresh token to authenticate
2. Receives a new refresh token (if rotated)
3. Outputs the new token as `new_refresh_token`
4. Continues with the sync process

## Manual Token Update

When you see a new refresh token in the action output:

```bash
# Update the GitHub secret
gh secret set WHOOP_REFRESH_TOKEN --body "NEW_TOKEN_HERE" --repo YOUR_USERNAME/YOUR_REPO
```

## Automatic Token Update (Advanced)

You can create a workflow that automatically updates the token:

```yaml
name: Sync Whoop Data with Auto Token Update

on:
  schedule:
    - cron: '15 6 * * *'
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        
      - name: Sync Whoop data
        id: whoop-sync
        uses: MajorAaron/whoop-dropbox-sync-action@v1
        with:
          whoop_client_id: ${{ secrets.WHOOP_CLIENT_ID }}
          whoop_client_secret: ${{ secrets.WHOOP_CLIENT_SECRET }}
          whoop_refresh_token: ${{ secrets.WHOOP_REFRESH_TOKEN }}
          
      - name: Update refresh token if rotated
        if: steps.whoop-sync.outputs.new_refresh_token
        uses: gliech/create-github-secret-action@v1
        with:
          name: WHOOP_REFRESH_TOKEN
          value: ${{ steps.whoop-sync.outputs.new_refresh_token }}
          pa_token: ${{ secrets.PA_TOKEN }}
```

Note: This requires creating a Personal Access Token (PA_TOKEN) with repo scope.

## Token Lifetime

- **Access Token**: Expires in 1 hour (3600 seconds)
- **Refresh Token**: Doesn't expire with regular use, but rotates on each use
- If unused for extended periods (typically 30-90 days), refresh tokens may expire

## Best Practices

1. **Don't share refresh tokens** - Each integration should use its own
2. **Update tokens promptly** - When rotation occurs, update your secrets
3. **Monitor action outputs** - Check for new refresh tokens in the logs
4. **Use the latest token** - Always use the most recent refresh token

## Troubleshooting

If you get "invalid_grant" errors:
1. Your refresh token was already used (and rotated)
2. Get a fresh token using: `node get-whoop-token.js`
3. Update your GitHub secret with the new token

This is normal OAuth 2.0 security behavior, not a configuration issue!