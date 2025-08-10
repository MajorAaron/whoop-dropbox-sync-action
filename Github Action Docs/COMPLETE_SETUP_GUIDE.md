# Complete Whoop to Obsidian Sync Setup Guide

This guide documents the complete setup of the Whoop to Obsidian sync system, including the abstracted GitHub Action and integration with your Obsidian vault.

## 📋 Table of Contents

1. [System Architecture](#system-architecture)
2. [Components Overview](#components-overview)
3. [Initial Setup](#initial-setup)
4. [GitHub Action Setup](#github-action-setup)
5. [Obsidian Vault Integration](#obsidian-vault-integration)
6. [Token Management](#token-management)
7. [Troubleshooting](#troubleshooting)
8. [Migration Guide](#migration-guide)

## System Architecture

The Whoop to Obsidian sync system consists of three main components:

```
┌─────────────────────────────────────────────────────────────┐
│                     Whoop API (api.prod.whoop.com)          │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               │ OAuth 2.0
                               │
┌──────────────────────────────▼──────────────────────────────┐
│         whoop-obsidian-sync-action (GitHub Action)          │
│                                                              │
│  • Fetches data from Whoop API                              │
│  • Formats into Obsidian markdown                           │
│  • Handles token refresh                                    │
│  • Writes files to calling repository                       │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               │ Uses
                               │
┌──────────────────────────────▼──────────────────────────────┐
│              Your Obsidian Vault Repository                 │
│                                                              │
│  .github/workflows/whoop-sync.yml                           │
│  WHOOP/                                                     │
│  ├── Daily/                                                 │
│  │   └── 2025/                                              │
│  │       └── 08-August/                                     │
│  │           ├── 2025-08-08.md                             │
│  │           └── 2025-08-09.md                             │
│  └── README.md                                              │
└──────────────────────────────────────────────────────────────┘
```

## Components Overview

### 1. whoop-obsidian-sync-action

**Repository**: [github.com/MajorAaron/whoop-obsidian-sync-action](https://github.com/MajorAaron/whoop-obsidian-sync-action)

A reusable GitHub Action that:
- Authenticates with Whoop API using OAuth 2.0
- Fetches comprehensive fitness data (recovery, sleep, strain, workouts)
- Formats data into Obsidian-compatible markdown
- Writes files to the repository that calls it
- Handles automatic token refresh

### 2. whoop-obsidian-sync (This Repository)

**Repository**: [github.com/MajorAaron/whoop-obsidian-sync](https://github.com/MajorAaron/whoop-obsidian-sync)

The original development repository containing:
- Local sync scripts for development/testing
- Web dashboard for OAuth authentication
- Enhanced sync scripts for GitHub Actions
- Documentation and setup guides

### 3. Your Obsidian Vault

**Repository**: Your personal Obsidian vault (e.g., THE-MAINFRAME)

Contains:
- GitHub workflow file that uses the action
- Synced Whoop data in markdown format
- Your personal notes and other Obsidian content

## Initial Setup

### Prerequisites

1. **Whoop Account**: Active Whoop subscription
2. **Whoop API Access**: Developer credentials from [developer.whoop.com](https://developer.whoop.com)
3. **GitHub Account**: For repositories and Actions
4. **Obsidian**: With a vault stored in a GitHub repository

### Step 1: Get Whoop API Credentials

1. Visit [developer.whoop.com](https://developer.whoop.com)
2. Create a new application
3. Note your:
   - Client ID
   - Client Secret
4. Set redirect URI to: `http://localhost:3000/api/auth/callback`

### Step 2: Get Initial Refresh Token

```bash
# Clone this repository
git clone https://github.com/MajorAaron/whoop-obsidian-sync
cd whoop-obsidian-sync

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
WHOOP_CLIENT_ID=your_client_id_here
WHOOP_CLIENT_SECRET=your_client_secret_here
EOF

# Start the server
npm start

# Open browser to http://localhost:3000
# Click "Connect with Whoop" and authorize
# Note the tokens from the dashboard
```

## GitHub Action Setup

### The Action Repository

The action is published at: **MajorAaron/whoop-obsidian-sync-action@v1.0.0**

#### Action Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `whoop_client_id` | Whoop OAuth Client ID | Yes | - |
| `whoop_client_secret` | Whoop OAuth Client Secret | Yes | - |
| `whoop_refresh_token` | Whoop Refresh Token | Yes | - |
| `days_back` | Number of days to sync | No | `7` |
| `output_path` | Output path for notes | No | `WHOOP` |
| `create_readme` | Create README in output directory | No | `true` |
| `debug` | Enable debug logging | No | `false` |

#### Action Outputs

| Output | Description |
|--------|-------------|
| `notes_created` | Number of notes created or updated |
| `new_refresh_token` | New refresh token if it was rotated |
| `sync_summary` | Summary of synced data |
| `sleep_records` | Number of sleep records synced |
| `recovery_records` | Number of recovery records synced |
| `workout_records` | Number of workout records synced |

## Obsidian Vault Integration

### Step 1: Create Workflow File

Create `.github/workflows/whoop-sync.yml` in your Obsidian vault repository:

```yaml
name: Sync Whoop Data

on:
  schedule:
    # Run daily at 6:15 AM UTC
    - cron: '15 6 * * *'
  workflow_dispatch:
    inputs:
      days_back:
        description: 'Number of days to sync'
        required: false
        default: '7'

permissions:
  contents: write

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        
      - name: Sync Whoop data
        id: whoop-sync
        uses: MajorAaron/whoop-obsidian-sync-action@v1.0.0
        with:
          whoop_client_id: ${{ secrets.WHOOP_CLIENT_ID }}
          whoop_client_secret: ${{ secrets.WHOOP_CLIENT_SECRET }}
          whoop_refresh_token: ${{ secrets.WHOOP_REFRESH_TOKEN }}
          days_back: ${{ github.event.inputs.days_back || '7' }}
          output_path: 'WHOOP'  # Customize this path
          
      - name: Commit and push changes
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          
          if [ -n "$(git status --porcelain)" ]; then
            git add -A
            git commit -m "🔄 Sync Whoop data $(date +'%Y-%m-%d')
            
            ${{ steps.whoop-sync.outputs.sync_summary }}"
            git push
          fi
```

### Step 2: Add Repository Secrets

Add these secrets to your Obsidian vault repository:

```bash
# Using GitHub CLI
gh secret set WHOOP_CLIENT_ID --body "your_client_id" --repo YourUsername/YourVaultRepo
gh secret set WHOOP_CLIENT_SECRET --body "your_client_secret" --repo YourUsername/YourVaultRepo
gh secret set WHOOP_REFRESH_TOKEN --body "your_refresh_token" --repo YourUsername/YourVaultRepo
```

Or via GitHub UI:
1. Go to Settings → Secrets and variables → Actions
2. Add each secret with its value

### Step 3: Test the Workflow

```bash
# Trigger manually
gh workflow run "Sync Whoop Data" --repo YourUsername/YourVaultRepo -f days_back=7

# Check status
gh run list --workflow="Sync Whoop Data" --repo YourUsername/YourVaultRepo --limit 1
```

## Token Management

### Automatic Token Refresh

The action automatically handles token refresh:
1. Uses refresh token to get new access token
2. If refresh token is rotated, outputs new token
3. Workflow shows warning to update secret

### Manual Token Update

When you see a token rotation warning:

```bash
# Update the refresh token secret
gh secret set WHOOP_REFRESH_TOKEN --body "new_refresh_token_here" --repo YourUsername/YourVaultRepo
```

### Getting Fresh Tokens

If tokens expire completely:

1. Use the local development server:
```bash
cd whoop-obsidian-sync
npm start
# Open http://localhost:3000 and re-authenticate
```

2. Or use the OAuth setup script:
```bash
node get-refresh-token-auto.js
```

## Data Structure

### Daily Notes Format

Each daily note includes:

```markdown
---
date: 2025-08-09
tags: [whoop, fitness, health]
recovery_score: 67
hrv: 45.2
rhr: 58
sleep_performance: 85
strain: 12.5
calories: 2450
workouts_count: 1
---

# 2025-08-09 - Whoop Summary

## 🔄 Recovery
- **Recovery Score**: 🟢 67%
- **HRV**: 45.2 ms
- **Resting Heart Rate**: 58 bpm
- **Skin Temp**: 34.2°C
- **SpO2**: 95.3%

## 😴 Sleep
- **Performance**: 85%
- **Time in Bed**: 8h 15m
- **Time Asleep**: 7h 02m
[... more sleep details ...]

## 💪 Strain & Activity
- **Day Strain**: 🟡 12.5
[... strain details ...]

## 🏃 Workouts
[... workout details if any ...]
```

### Folder Structure

```
WHOOP/
├── Daily/
│   └── 2025/
│       ├── 01-January/
│       ├── 02-February/
│       └── 08-August/
│           ├── 2025-08-01.md
│           ├── 2025-08-02.md
│           └── ...
└── README.md
```

## Troubleshooting

### Common Issues

#### 1. "Unable to resolve action" Error
- **Cause**: Incorrect action reference
- **Solution**: Use full version tag: `MajorAaron/whoop-obsidian-sync-action@v1.0.0`

#### 2. "Authorization was not valid" Error
- **Cause**: Expired or invalid tokens
- **Solution**: Get fresh tokens using the local server

#### 3. "API error 400" on Token Refresh
- **Cause**: Invalid refresh token
- **Solution**: Re-authenticate through the web interface

#### 4. No Data Synced
- **Cause**: No Whoop data for the specified date range
- **Solution**: Check your Whoop app for recent data

### Debug Mode

Enable debug logging for troubleshooting:

```yaml
- uses: MajorAaron/whoop-obsidian-sync-action@v1.0.0
  with:
    debug: 'true'
    # ... other inputs
```

## Migration Guide

### From Local Scripts to GitHub Action

If you were using local sync scripts:

1. **Stop local syncing**:
   - Stop any cron jobs or scheduled tasks
   - Keep scripts for emergency backup

2. **Set up GitHub Action**:
   - Follow the [Obsidian Vault Integration](#obsidian-vault-integration) steps
   - Use the same output path as your local scripts

3. **Verify data continuity**:
   - Run the action manually for 1 day
   - Check that notes are created in the correct location
   - Ensure formatting matches your expectations

### From whoop-obsidian-sync to Separate Action

If you were using the original combined repository:

1. **Keep the original repo** for:
   - Local development and testing
   - OAuth token generation
   - Emergency fallback

2. **Use the action** for:
   - Production syncing to your vault
   - Automated daily updates
   - Clean separation of concerns

## Advanced Configuration

### Custom Output Paths

Organize your Whoop data in a custom location:

```yaml
output_path: 'Health/Fitness/Whoop'  # Nested folders
# or
output_path: 'Daily'  # Mix with daily notes
```

### Multiple Vaults

Use the same action in multiple repositories:

```yaml
# Vault 1: Personal
output_path: 'Fitness/Whoop'

# Vault 2: Health Tracking
output_path: 'Biometrics/Whoop'
```

### Sync Frequency

Modify the cron schedule:

```yaml
on:
  schedule:
    # Every 12 hours
    - cron: '0 */12 * * *'
    
    # Weekly on Sundays
    - cron: '0 6 * * 0'
    
    # Multiple times per day
    - cron: '0 6,12,18 * * *'
```

## Development

### Local Testing

Test the action locally:

```bash
# Set environment variables
export INPUT_WHOOP_CLIENT_ID="your_client_id"
export INPUT_WHOOP_CLIENT_SECRET="your_client_secret"
export INPUT_WHOOP_REFRESH_TOKEN="your_refresh_token"
export INPUT_DAYS_BACK="7"
export INPUT_OUTPUT_PATH="test-output"
export INPUT_DEBUG="true"

# Run the action
cd whoop-obsidian-sync-action
npm test
```

### Contributing

Contributions welcome! See the action repository for:
- [Issues](https://github.com/MajorAaron/whoop-obsidian-sync-action/issues)
- [Pull Requests](https://github.com/MajorAaron/whoop-obsidian-sync-action/pulls)

## Security Considerations

### Token Security

- **Never commit tokens** to your repository
- Use GitHub Secrets for all credentials
- Rotate tokens regularly
- Monitor GitHub Action logs for sensitive data

### Repository Permissions

- Action requires `contents: write` permission
- Consider using a Personal Access Token with limited scope
- Review action code before using

## Resources

- [Whoop API Documentation](https://developer.whoop.com/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Obsidian Documentation](https://help.obsidian.md)
- [This Repository](https://github.com/MajorAaron/whoop-obsidian-sync)
- [Action Repository](https://github.com/MajorAaron/whoop-obsidian-sync-action)

## Support

For issues or questions:
1. Check this documentation
2. Search existing issues in the relevant repository
3. Create a new issue with details about your setup

---

*Last updated: August 10, 2025*