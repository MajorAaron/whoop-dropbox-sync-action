# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
GitHub Action that syncs Whoop fitness data to Obsidian markdown notes using OAuth 2.0 authentication. Creates beautifully formatted daily health notes with comprehensive metrics. Handles Whoop's rotating refresh tokens automatically.

### Deployment Options
1. **Self-contained workflow** (NEW): The workflow lives in this repo and pushes to external repos
   - See `.github/workflows/sync-to-mainframe.yml`
   - Workflow runs here, pushes data to THE MAINFRAME or any target repo
2. **Traditional action**: Other repos can use this action via `uses: aaronmajor/whoop-obsidian-sync-action@main`

## Development Commands

```bash
# Install dependencies
npm install

# Test OAuth authentication
node test-oauth.js

# Get fresh OAuth tokens (interactive)
node get-whoop-token.js

# Refresh tokens and update GitHub secrets
node refresh-whoop-token.js

# Run main action locally
npm run test:local
```

## Architecture

### Core Components
- **OAuth Client** (`src/lib/whoop-client.js`): Handles OAuth 2.0 with refresh token rotation, fetches all Whoop data endpoints
- **Formatter** (`src/lib/obsidian-formatter.js`): Converts API data to Obsidian markdown with frontmatter and visual indicators
- **File Manager** (`src/lib/file-manager.js`): Creates hierarchical directory structure (WHOOP/Daily/YYYY/MM-Month/)
- **Logger** (`src/utils/logger.js`): Handles GitHub Actions outputs with both legacy and new GITHUB_OUTPUT format
- **Token Manager** (`src/utils/token-manager.js`): Manages token persistence and rotation detection
- **Main Entry** (`src/index.js`): Orchestrates sync process, handles GitHub Actions I/O

### OAuth Implementation Details
- **Token Rotation**: Refresh tokens rotate on each use - new tokens MUST be captured and saved
- **Refresh Request Parameters**: Must include `redirect_uri` and `scope: 'offline'`
- **Default redirect URI**: `http://localhost:3000/api/auth/callback`
- **Required scopes**: `read:recovery read:cycles read:sleep read:workout read:profile read:body_measurement offline`

### Data Flow
1. Validate inputs and authenticate with Whoop
2. Refresh access token (may rotate refresh token)
3. Fetch data for specified date range (default: 7 days)
4. Format each day's data into markdown with comprehensive metrics
5. Save to hierarchical directory structure
6. Output new tokens if rotated for workflow to update secrets

## Critical Implementation Notes

### Token Persistence
The workflow MUST include a step to update the refresh token when rotated:
```yaml
- name: Update refresh token if rotated
  if: steps.whoop-sync.outputs.new_refresh_token != ''
  env:
    GH_TOKEN: ${{ secrets.PA_TOKEN }}
  run: |
    gh secret set WHOOP_REFRESH_TOKEN \
      --body "${{ steps.whoop-sync.outputs.new_refresh_token }}" \
      --repo ${{ github.repository }}
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
- `WHOOP_CLIENT_ID`: OAuth Client ID from Whoop Developer Portal
- `WHOOP_CLIENT_SECRET`: OAuth Client Secret
- `WHOOP_REFRESH_TOKEN`: OAuth Refresh Token (rotates on each use!)
- `PA_TOKEN`: Personal Access Token with `repo` and `workflow` permissions

## Important Notes
- No linting or build process - pure Node.js
- Minimal dependencies (@actions/core and dotenv only)
- Uses Node.js built-in https module for API calls
- Requires Node.js 20+
- Tokens output as `new_refresh_token` for automatic secret updates
- Refresh tokens become invalid after use - MUST save new ones