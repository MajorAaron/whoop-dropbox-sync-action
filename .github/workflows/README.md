# GitHub Actions Workflow

## Overview

This workflow runs in the `whoop-obsidian-sync-action` repository and pushes Whoop data to THE MAINFRAME repository.

## How It Works

1. **Scheduled Run**: Runs daily at 6:00 AM UTC (1:00 AM EST / 2:00 AM EDT)
2. **Manual Trigger**: Can be triggered manually via `workflow_dispatch`
3. **Dual Checkout**: 
   - Checks out this sync action repository
   - Checks out THE MAINFRAME repository to push data to
4. **Data Sync**: Runs the sync action to fetch Whoop data and save to THE MAINFRAME
5. **Auto-commit**: Commits and pushes changes to THE MAINFRAME
6. **Token Rotation**: Automatically updates refresh token if rotated

## Required Secrets

These secrets must be set in the `whoop-obsidian-sync-action` repository:

- `WHOOP_CLIENT_ID`: OAuth Client ID from Whoop Developer Portal
- `WHOOP_CLIENT_SECRET`: OAuth Client Secret  
- `WHOOP_REFRESH_TOKEN`: OAuth Refresh Token (rotates on each use!)
- `PA_TOKEN`: Personal Access Token with `repo` and `workflow` permissions

## Manual Trigger Options

When triggering manually, you can specify:

- `days_back`: Number of days to sync (default: 7)
- `start_date`: Start date (YYYY-MM-DD) - overrides days_back
- `end_date`: End date (YYYY-MM-DD) - overrides days_back

## File Structure

Data is saved to THE MAINFRAME repository in this structure:
```
WHOOP/
├── Daily/
│   └── YYYY/
│       └── MM-Month/
│           └── YYYY-MM-DD.md
└── README.md
```

## Token Rotation

The Whoop API rotates refresh tokens on each use. The workflow automatically:
1. Captures the new refresh token from the action output
2. Updates the `WHOOP_REFRESH_TOKEN` secret in this repository
3. Uses the new token for the next run

## Monitoring

Check the Actions tab in this repository to monitor sync status and debug any issues.