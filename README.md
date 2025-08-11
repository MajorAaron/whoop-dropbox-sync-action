# Whoop to Dropbox Sync Action

[![GitHub Action](https://img.shields.io/badge/GitHub-Action-blue?logo=github)](https://github.com/marketplace/actions/whoop-to-dropbox-sync)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A GitHub Action that syncs your Whoop fitness data directly to Dropbox as beautifully formatted markdown notes with comprehensive health metrics, sleep analysis, recovery scores, and workout details.

## 🌟 Features

- **Direct Dropbox Upload**: Syncs data directly to your Dropbox account
- **Comprehensive Data Sync**: Recovery, sleep, strain, workouts, and body measurements
- **Rich Markdown Format**: Beautiful notes with frontmatter, emojis, and structured sections
- **Automatic Token Management**: Handles both Whoop and Dropbox token rotation
- **Flexible Configuration**: Customize Dropbox paths and sync duration
- **Daily Notes Structure**: Organized by year and month in Dropbox
- **No Local Storage**: Files upload directly to Dropbox without local intermediates

## 📊 Data Synced

### Recovery Metrics
- Recovery score with visual indicators (🟢🟡🔴)
- Heart Rate Variability (HRV)
- Resting Heart Rate (RHR)
- Skin Temperature
- Blood Oxygen (SpO2)

### Sleep Analysis
- Performance, efficiency, and consistency scores
- Sleep stages breakdown (REM, Deep, Light, Awake)
- Sleep need and debt calculations
- Respiratory rate
- Nap tracking

### Activity & Strain
- Daily strain score with visual indicators
- Workout details with heart rate zones
- Calorie burn
- Distance and elevation (when available)

### Body Measurements
- Height, weight, and max heart rate
- Automatically included when recently updated

## 🚀 Quick Start

### Prerequisites

1. A Dropbox account for storing your health notes
2. Whoop API credentials
3. Dropbox API credentials
4. A Personal Access Token (PAT) with `repo` and `workflow` permissions

### Step 1: Get API Credentials

#### Whoop API

1. Go to [Whoop Developer Portal](https://developer.whoop.com)
2. Create an application with redirect URI: `http://localhost:3000/api/auth/callback`
3. Note your Client ID and Client Secret
4. Get a refresh token:
   ```bash
   git clone https://github.com/MajorAaron/whoop-obsidian-sync-action.git
   cd whoop-obsidian-sync-action
   npm install
   node get-whoop-token.js
   ```

#### Dropbox API

1. Go to [Dropbox App Console](https://www.dropbox.com/developers/apps)
2. Create a new app with "Full Dropbox" access
3. Note your App Key and App Secret
4. Get OAuth tokens:
   ```bash
   cd whoop-obsidian-sync-action
   node setup-dropbox-auth.js
   ```

### Step 2: Add Secrets to Your Repository

Add these secrets to your repository (Settings → Secrets → Actions):

**Whoop Secrets:**
- `WHOOP_CLIENT_ID`: Your Whoop application client ID
- `WHOOP_CLIENT_SECRET`: Your Whoop application client secret
- `WHOOP_REFRESH_TOKEN`: Your Whoop refresh token

**Dropbox Secrets:**
- `DROPBOX_APP_KEY`: Your Dropbox app key
- `DROPBOX_APP_SECRET`: Your Dropbox app secret
- `DROPBOX_ACCESS_TOKEN`: Your Dropbox access token
- `DROPBOX_REFRESH_TOKEN`: Your Dropbox refresh token

**GitHub Secret:**
- `PA_TOKEN`: GitHub Personal Access Token with `repo` and `workflow` permissions

### Step 3: Create Workflow

Create `.github/workflows/whoop-to-dropbox.yml` in your repository:

```yaml
name: Sync Whoop Data to Dropbox

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

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout action
        uses: actions/checkout@v4
        with:
          repository: MajorAaron/whoop-obsidian-sync-action
          ref: main
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm install
        
      - name: Sync Whoop data to Dropbox
        id: whoop-sync
        env:
          # Whoop credentials
          WHOOP_CLIENT_ID: ${{ secrets.WHOOP_CLIENT_ID }}
          WHOOP_CLIENT_SECRET: ${{ secrets.WHOOP_CLIENT_SECRET }}
          WHOOP_REFRESH_TOKEN: ${{ secrets.WHOOP_REFRESH_TOKEN }}
          # Dropbox credentials
          DROPBOX_APP_KEY: ${{ secrets.DROPBOX_APP_KEY }}
          DROPBOX_APP_SECRET: ${{ secrets.DROPBOX_APP_SECRET }}
          DROPBOX_ACCESS_TOKEN: ${{ secrets.DROPBOX_ACCESS_TOKEN }}
          DROPBOX_REFRESH_TOKEN: ${{ secrets.DROPBOX_REFRESH_TOKEN }}
          # Configuration
          DAYS_BACK: ${{ github.event.inputs.days_back || '7' }}
          DROPBOX_PATH: '/WHOOP'
        run: node src/index.js
          
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
          if [ -n "${{ steps.whoop-sync.outputs.new_dropbox_refresh_token }}" ]; then
            gh secret set DROPBOX_REFRESH_TOKEN \
              --body "${{ steps.whoop-sync.outputs.new_dropbox_refresh_token }}" \
              --repo ${{ github.repository }}
          fi
```

## ⚙️ Configuration

### Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `whoop_client_id` | Whoop OAuth Client ID | Yes | - |
| `whoop_client_secret` | Whoop OAuth Client Secret | Yes | - |
| `whoop_refresh_token` | Whoop Refresh Token | Yes | - |
| `whoop_redirect_uri` | OAuth Redirect URI | No | `http://localhost:3000/api/auth/callback` |
| `dropbox_app_key` | Dropbox App Key | Yes | - |
| `dropbox_app_secret` | Dropbox App Secret | Yes | - |
| `dropbox_access_token` | Dropbox Access Token | Yes | - |
| `dropbox_refresh_token` | Dropbox Refresh Token | Yes | - |
| `days_back` | Number of days to sync | No | `7` |
| `dropbox_path` | Dropbox path for notes | No | `/WHOOP` |
| `create_readme` | Create README in Dropbox | No | `true` |
| `debug` | Enable debug logging | No | `false` |

### Outputs

| Output | Description |
|--------|-------------|
| `notes_created` | Number of notes uploaded to Dropbox |
| `new_refresh_token` | New Whoop refresh token if rotated |
| `new_dropbox_access_token` | New Dropbox access token if refreshed |
| `new_dropbox_refresh_token` | New Dropbox refresh token if rotated |
| `sync_summary` | Summary of synced data |
| `sleep_records` | Number of sleep records synced |
| `recovery_records` | Number of recovery records synced |
| `workout_records` | Number of workout records synced |

## 🔄 How Token Management Works

### Whoop Token Rotation
Whoop uses rotating refresh tokens for security. Each time a refresh token is used, it becomes invalid and a new one is issued.

### Dropbox Token Refresh
Dropbox access tokens expire after ~4 hours. The action automatically refreshes them using the refresh token.

### Automatic Updates
Both Whoop and Dropbox tokens are automatically updated in your GitHub secrets when they change:

1. **Initial Setup**: You provide initial tokens as GitHub secrets
2. **During Sync**: 
   - The action refreshes tokens as needed
   - Captures any new tokens issued
3. **Automatic Update**: 
   - The workflow detects new tokens via action outputs
   - Uses GitHub CLI to update secrets
   - Next run uses the new tokens automatically

**Important**: Your PA_TOKEN must have permissions to update repository secrets.

## 📁 Dropbox Structure

The action creates the following structure in your Dropbox:

```
/WHOOP/
├── Daily/
│   └── 2025/
│       └── 08-August/
│           ├── 2025-08-08.md
│           ├── 2025-08-09.md
│           └── ...
└── README.md
```

You can customize the root path using the `dropbox_path` input.

## 📝 Note Format

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
...

## 😴 Sleep
- **Performance**: 85%
- **Time in Bed**: 8h 15m
...

## 💪 Strain & Activity
- **Day Strain**: 🟡 12.5
...
```

## 🧪 Testing Locally

You can test the action locally:

```bash
# Clone the action repository
git clone https://github.com/MajorAaron/whoop-obsidian-sync-action
cd whoop-obsidian-sync-action

# Install dependencies
npm install

# Set up Whoop authentication (interactive)
node get-whoop-token.js
# OR use the automated helper
node auto-whoop-auth.js

# Set up Dropbox authentication
node setup-dropbox-auth.js

# Test the complete sync to Dropbox
node test-dropbox-sync.js
```

### Helper Scripts

- `get-whoop-token.js` - Interactive Whoop OAuth flow with local server
- `auto-whoop-auth.js` - Automated Whoop OAuth with browser opening
- `setup-dropbox-auth.js` - Interactive Dropbox OAuth setup
- `test-dropbox-sync.js` - Test complete sync to Dropbox
- `test-oauth.js` - Test Whoop OAuth token refresh
- `refresh-whoop-token.js` - Refresh Whoop token and update GitHub secrets

## 🔧 Troubleshooting

### OAuth Error 400: invalid_request

This error means your refresh token is invalid. Common causes and fixes:

1. **Token Expired or Revoked**: 
   - Run `node get-whoop-token.js` to get a fresh token
   - Update your `WHOOP_REFRESH_TOKEN` secret

2. **Redirect URI Mismatch**:
   - Ensure your Whoop app has `http://localhost:3000/api/auth/callback` as a redirect URI
   - Match this exactly in your workflow

3. **Token Not Updating**:
   - Verify your `PA_TOKEN` has `repo` and `workflow` permissions
   - Check the workflow logs to see if the update step is running

### Token Rotation Not Working

If tokens aren't updating automatically:

1. Check that the "Update refresh token if rotated" step is present in your workflow
2. Ensure `PA_TOKEN` is set correctly with proper permissions
3. Look for the step output in your workflow run logs

### No Data in Dropbox

- Verify you have Whoop data for the sync period
- Check the action logs for any API errors
- Ensure Dropbox authentication is working
- Check the Dropbox path in your configuration

### Dropbox Authentication Issues

1. **Access Token Expired**:
   - Access tokens expire after ~4 hours
   - The action automatically refreshes using the refresh token
   - If not working, run `node setup-dropbox-auth.js` for new tokens

2. **Permission Denied**:
   - Ensure your Dropbox app has "Full Dropbox" access
   - Check that all Dropbox secrets are set correctly

### Workflow Success

When the workflow runs successfully, you'll see:
- Files uploaded to `/WHOOP/Daily/YYYY/MM-Month/` in your Dropbox
- README.md created/updated in `/WHOOP/`
- Tokens automatically updated in GitHub secrets if rotated

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Whoop](https://whoop.com) for the fitness tracking platform
- [Obsidian](https://obsidian.md) for the knowledge management app
- GitHub Actions community for inspiration

## 🐛 Issues & Support

If you encounter any issues or have questions:

1. Check the Troubleshooting section above
2. Search [existing issues](https://github.com/MajorAaron/whoop-obsidian-sync-action/issues)
3. Create a [new issue](https://github.com/MajorAaron/whoop-obsidian-sync-action/issues/new)

---

Made with ❤️ by [MajorAaron](https://github.com/MajorAaron)