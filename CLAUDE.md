# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
GitHub Action that syncs Whoop fitness data directly to Dropbox as Obsidian-formatted markdown notes using OAuth 2.0 authentication. Creates beautifully formatted daily health notes with comprehensive metrics. Handles both Whoop and Dropbox token rotation automatically.

### Deployment
The workflow runs in this repository and uploads files directly to Dropbox at `/WHOOP/` path. No git operations or local file storage needed.

## Development Commands

```bash
# Install dependencies
npm install

# Get fresh Whoop OAuth tokens (interactive)
node get-whoop-token.js
# OR use automated helper
node auto-whoop-auth.js

# Get fresh Dropbox OAuth tokens
node setup-dropbox-auth.js

# Test OAuth authentication
node test-oauth.js

# Test complete Dropbox sync locally
node test-dropbox-sync.js

# Refresh Whoop tokens and update GitHub secrets
node refresh-whoop-token.js
```

## Architecture

### Core Components
- **Whoop Client** (`src/lib/whoop-client.js`): Handles OAuth 2.0 with refresh token rotation, fetches all Whoop data endpoints
- **Dropbox Client** (`src/lib/dropbox-client.js`): Handles Dropbox API operations, file uploads, and token refresh
- **Formatter** (`src/lib/obsidian-formatter.js`): Converts API data to Obsidian markdown with frontmatter and visual indicators
- **File Manager** (`src/lib/file-manager.js`): Uploads files to Dropbox with hierarchical directory structure (/WHOOP/Daily/YYYY/MM-Month/)
- **Logger** (`src/utils/logger.js`): Handles GitHub Actions outputs with both legacy and new GITHUB_OUTPUT format
- **Token Managers** (`src/utils/token-manager.js`, `src/utils/dropbox-token-manager.js`): Manage token persistence and rotation
- **Main Entry** (`src/index.js`): Orchestrates sync process, integrates both APIs

### OAuth Implementation Details
- **Token Rotation**: Refresh tokens rotate on each use - new tokens MUST be captured and saved
- **Refresh Request Parameters**: Must include `redirect_uri` and `scope: 'offline'`
- **Default redirect URI**: `http://localhost:3000/api/auth/callback`
- **Required scopes**: `read:recovery read:cycles read:sleep read:workout read:profile read:body_measurement offline`

### Data Flow
1. Validate inputs and authenticate with both Whoop and Dropbox
2. Test Dropbox connection
3. Refresh Whoop access token (may rotate refresh token)
4. Fetch data for specified date range (default: 7 days)
5. Format each day's data into markdown with comprehensive metrics
6. Upload files directly to Dropbox at `/WHOOP/` path
7. Output new tokens if rotated for workflow to update secrets

## Critical Implementation Notes

### Token Persistence
The workflow MUST include steps to update tokens when rotated:
```yaml
- name: Update Whoop refresh token if rotated
  if: steps.whoop-sync.outputs.new_refresh_token != ''
  env:
    GH_TOKEN: ${{ secrets.PA_TOKEN }}
  run: |
    gh secret set WHOOP_REFRESH_TOKEN \
      --body "${{ steps.whoop-sync.outputs.new_refresh_token }}" \
      --repo ${{ github.repository }}

- name: Update Dropbox tokens if refreshed
  if: steps.whoop-sync.outputs.new_dropbox_access_token != '' || steps.whoop-sync.outputs.new_dropbox_refresh_token != ''
  env:
    GH_TOKEN: ${{ secrets.PA_TOKEN }}
  run: |
    if [ -n "${{ steps.whoop-sync.outputs.new_dropbox_access_token }}" ]; then
      gh secret set DROPBOX_ACCESS_TOKEN \
        --body "${{ steps.whoop-sync.outputs.new_dropbox_access_token }}" \
        --repo ${{ github.repository }}
    fi
```

### GitHub Actions Output
Logger uses both methods for compatibility:
1. `core.setOutput()` for legacy runners
2. `GITHUB_OUTPUT` environment variable for new runners

## Testing & Debugging

### OAuth Issues
- Use `test-oauth.js` to verify token refresh works
- Use `get-whoop-token.js` to get fresh tokens through OAuth flow
- Use `refresh-whoop-token.js` to test token rotation and auto-update

### Common Error: 400 invalid_request
Causes:
1. Expired/invalid refresh token - run `get-whoop-token.js`
2. Missing `redirect_uri` in refresh request
3. Missing `scope: 'offline'` in refresh request
4. Token was rotated but not saved

### Local Testing
Create `.env` file:
```
WHOOP_CLIENT_ID=your_client_id
WHOOP_CLIENT_SECRET=your_client_secret
WHOOP_REFRESH_TOKEN=your_refresh_token
WHOOP_REDIRECT_URI=http://localhost:3000/api/auth/callback
```

## GitHub Secrets Required

### Whoop Secrets
- `WHOOP_CLIENT_ID`: OAuth Client ID from Whoop Developer Portal
- `WHOOP_CLIENT_SECRET`: OAuth Client Secret
- `WHOOP_REFRESH_TOKEN`: OAuth Refresh Token (rotates on each use!)
- `WHOOP_REDIRECT_URI`: OAuth Redirect URI (optional, defaults to `http://localhost:3000/api/auth/callback`)

### Dropbox Secrets
- `DROPBOX_APP_KEY`: App Key from Dropbox App Console
- `DROPBOX_APP_SECRET`: App Secret from Dropbox
- `DROPBOX_ACCESS_TOKEN`: OAuth Access Token (expires ~4 hours, auto-refreshes)
- `DROPBOX_REFRESH_TOKEN`: OAuth Refresh Token for automatic renewal

### GitHub Secret
- `PA_TOKEN`: Personal Access Token with `repo` and `workflow` permissions (for updating secrets)

## Important Notes
- No linting or build process - pure Node.js
- Minimal dependencies (@actions/core and dotenv only)
- Uses Node.js built-in https module for API calls
- Requires Node.js 20+
- Whoop tokens rotate on each use - MUST capture and save new ones
- Dropbox access tokens expire after ~4 hours but auto-refresh
- Files upload directly to Dropbox - no local storage or git operations needed
- Default Dropbox path is `/WHOOP/` but can be customized