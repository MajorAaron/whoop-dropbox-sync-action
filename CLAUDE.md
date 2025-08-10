# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
GitHub Action that syncs Whoop fitness data to Obsidian markdown notes using OAuth 2.0 authentication. Creates beautifully formatted daily health notes with comprehensive metrics.

## Development Commands

```bash
# Install dependencies
npm install

# Test locally with environment variables
npm run test:local

# Test OAuth authentication
node test-oauth.js

# Get fresh OAuth tokens (interactive)
node fix-whoop-auth.js

# Run main action locally
node src/index.js
```

## Architecture

### Core Components
- **OAuth Client** (`src/lib/whoop-client.js`): Handles OAuth 2.0 with refresh token rotation, fetches all Whoop data endpoints
- **Formatter** (`src/lib/obsidian-formatter.js`): Converts API data to Obsidian markdown with frontmatter and visual indicators
- **File Manager** (`src/lib/file-manager.js`): Creates hierarchical directory structure (WHOOP/Daily/YYYY/MM-Month/)
- **Main Entry** (`src/index.js`): Orchestrates sync process, handles GitHub Actions I/O

### OAuth Implementation Details
- Refresh tokens rotate on each use - new tokens must be captured from action outputs
- Redirect URI must match exactly between Whoop app settings and action configuration
- Default redirect URI: `http://localhost:8080/callback`
- Required scopes: `read:recovery read:cycles read:sleep read:workout read:profile read:body_measurement offline`

### Data Flow
1. Validate inputs and authenticate with Whoop
2. Fetch data for specified date range (default: 7 days)
3. Format each day's data into markdown with comprehensive metrics
4. Save to hierarchical directory structure
5. Output new tokens if rotated

## Testing & Debugging

### OAuth Issues
- Use `test-oauth.js` to verify token refresh
- Check redirect URI matches exactly
- Verify all required scopes are present
- Use `fix-whoop-auth.js` to get fresh tokens

### Local Testing
Create `.env` file:
```
WHOOP_CLIENT_ID=your_client_id
WHOOP_CLIENT_SECRET=your_client_secret
WHOOP_REFRESH_TOKEN=your_refresh_token
WHOOP_REDIRECT_URI=http://localhost:8080/callback
```

## GitHub Secrets Required
- `WHOOP_CLIENT_ID`: OAuth Client ID from Whoop Developer Portal
- `WHOOP_CLIENT_SECRET`: OAuth Client Secret
- `WHOOP_REFRESH_TOKEN`: OAuth Refresh Token (from fix-whoop-auth.js)

## Important Notes
- No linting or build process - pure Node.js
- Minimal dependencies (only @actions/core and dotenv)
- Uses Node.js built-in https module for API calls
- Requires Node.js 20+
- Tokens output as `new_refresh_token` and `new_access_token` for rotation handling