# Whoop OAuth Troubleshooting Guide

## Common OAuth Errors and Solutions

### Error: API error (400): "invalid_request"

This error typically occurs when the OAuth token refresh fails. The most common causes are:

1. **Mismatched Redirect URI**: The redirect URI in your request must exactly match what's registered in your Whoop app
2. **Invalid or Expired Refresh Token**: The refresh token may have expired or been revoked
3. **Missing Required Parameters**: The OAuth request may be missing required parameters

## Fix Applied to This Repository

The OAuth implementation has been updated to include:

1. **Redirect URI Parameter**: Now included in refresh token requests
2. **Scope Parameter**: Explicitly specifies required scopes
3. **Enhanced Error Logging**: Better debugging information for OAuth failures
4. **Configurable Redirect URI**: Can be customized via environment variable

## Getting a Fresh Refresh Token

### Method 1: Using fix-whoop-auth.js (Recommended)

1. Ensure your Whoop app has the redirect URI set to: `http://localhost:8080/callback`
2. Run the OAuth helper script:
   ```bash
   node fix-whoop-auth.js
   ```
3. Enter your Client ID and Client Secret when prompted
4. Open the authorization URL in your browser
5. Log in to Whoop and authorize the application
6. Copy the refresh token from the terminal output

### Method 2: Manual OAuth Flow

1. Visit the authorization URL:
   ```
   https://api.prod.whoop.com/oauth/oauth2/auth?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost:8080/callback&scope=read:recovery read:cycles read:sleep read:workout read:profile read:body_measurement offline&state=auth_123
   ```

2. After authorization, you'll be redirected to localhost with a code parameter
3. Exchange the code for tokens using a POST request to:
   ```
   https://api.prod.whoop.com/oauth/oauth2/token
   ```

## GitHub Actions Configuration

### Required Secrets

Add these to your repository secrets at:
`https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions`

- `WHOOP_CLIENT_ID`: Your Whoop OAuth Client ID
- `WHOOP_CLIENT_SECRET`: Your Whoop OAuth Client Secret
- `WHOOP_REFRESH_TOKEN`: Your Whoop Refresh Token

### Optional: Custom Redirect URI

If you used a different redirect URI when registering your Whoop app, you can specify it:

```yaml
- name: Sync Whoop Data
  uses: MajorAaron/whoop-obsidian-sync-action@v1
  with:
    whoop_client_id: ${{ secrets.WHOOP_CLIENT_ID }}
    whoop_client_secret: ${{ secrets.WHOOP_CLIENT_SECRET }}
    whoop_refresh_token: ${{ secrets.WHOOP_REFRESH_TOKEN }}
    whoop_redirect_uri: 'http://localhost:3000/api/auth/callback'  # Optional
```

## Testing Your OAuth Setup

Use the included test script to verify your OAuth configuration:

```bash
# Create a .env file with your credentials
cat > .env << EOF
WHOOP_CLIENT_ID=your_client_id
WHOOP_CLIENT_SECRET=your_client_secret
WHOOP_REFRESH_TOKEN=your_refresh_token
WHOOP_REDIRECT_URI=http://localhost:8080/callback
EOF

# Run the test
node test-oauth.js
```

## Important Notes

1. **Token Rotation**: Whoop may rotate your refresh token. If this happens, the action will output a new refresh token that you must update in your GitHub secrets.

2. **Redirect URI Consistency**: The redirect URI must be exactly the same as:
   - What's registered in your Whoop app settings
   - What was used when obtaining the initial refresh token
   - What's configured in the GitHub Action

3. **Scope Requirements**: The following scopes are required:
   - `read:recovery`
   - `read:cycles`
   - `read:sleep`
   - `read:workout`
   - `read:profile`
   - `read:body_measurement`
   - `offline` (for refresh token support)

## Debug Mode

Enable debug logging to see detailed OAuth information:

```yaml
- name: Sync Whoop Data
  uses: MajorAaron/whoop-obsidian-sync-action@v1
  with:
    whoop_client_id: ${{ secrets.WHOOP_CLIENT_ID }}
    whoop_client_secret: ${{ secrets.WHOOP_CLIENT_SECRET }}
    whoop_refresh_token: ${{ secrets.WHOOP_REFRESH_TOKEN }}
    debug: true
```

## Still Having Issues?

1. Verify your Whoop app settings at https://developer.whoop.com
2. Ensure the redirect URI is exactly: `http://localhost:8080/callback`
3. Try generating a fresh refresh token using `fix-whoop-auth.js`
4. Check the GitHub Actions logs with debug mode enabled
5. Open an issue at: https://github.com/MajorAaron/whoop-obsidian-sync-action/issues