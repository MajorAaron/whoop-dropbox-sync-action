# Whoop to Obsidian Sync Action

[![GitHub Action](https://img.shields.io/badge/GitHub-Action-blue?logo=github)](https://github.com/marketplace/actions/whoop-to-obsidian-sync)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A GitHub Action that syncs your Whoop fitness data to Obsidian markdown notes with comprehensive health metrics, sleep analysis, recovery scores, and workout details.

## 🌟 Features

- **Comprehensive Data Sync**: Recovery, sleep, strain, workouts, and body measurements
- **Rich Markdown Format**: Beautiful notes with frontmatter, emojis, and structured sections
- **Automatic Token Rotation**: Handles Whoop's rotating refresh tokens seamlessly
- **Flexible Configuration**: Customize output paths and sync duration
- **Daily Notes Structure**: Organized by year and month
- **Minimal Dependencies**: Uses @actions/core and dotenv only

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

1. A GitHub repository for your Obsidian vault
2. Whoop API credentials
3. A Personal Access Token (PAT) with `repo` and `workflow` permissions

### Step 1: Get Whoop API Credentials

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

### Step 2: Add Secrets to Your Repository

Add these secrets to your repository (Settings → Secrets → Actions):

- `WHOOP_CLIENT_ID`: Your Whoop application client ID
- `WHOOP_CLIENT_SECRET`: Your Whoop application client secret
- `WHOOP_REFRESH_TOKEN`: Your Whoop refresh token (from step 1)
- `PA_TOKEN`: GitHub Personal Access Token with `repo` and `workflow` permissions

### Step 3: Create Workflow

Create `.github/workflows/whoop-sync.yml` in your repository:

```yaml
name: Sync Whoop Data to Obsidian

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
  actions: write

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          token: ${{ secrets.PA_TOKEN }}
        
      - name: Sync Whoop data
        id: whoop-sync
        uses: MajorAaron/whoop-obsidian-sync-action@main
        with:
          whoop_client_id: ${{ secrets.WHOOP_CLIENT_ID }}
          whoop_client_secret: ${{ secrets.WHOOP_CLIENT_SECRET }}
          whoop_refresh_token: ${{ secrets.WHOOP_REFRESH_TOKEN }}
          whoop_redirect_uri: 'http://localhost:3000/api/auth/callback'
          days_back: ${{ github.event.inputs.days_back || '7' }}
          output_path: 'WHOOP'
          create_readme: 'true'
          debug: 'false'
          
      - name: Update refresh token if rotated
        if: steps.whoop-sync.outputs.new_refresh_token != ''
        env:
          GH_TOKEN: ${{ secrets.PA_TOKEN }}
        run: |
          echo "🔄 Refresh token was rotated, updating secret..."
          gh secret set WHOOP_REFRESH_TOKEN \
            --body "${{ steps.whoop-sync.outputs.new_refresh_token }}" \
            --repo ${{ github.repository }}
          echo "✅ Refresh token updated successfully"
          
      - name: Commit and push changes
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          
          if [[ -n $(git status -s) ]]; then
            git add .
            git commit -m "Sync Whoop data - ${{ steps.whoop-sync.outputs.sync_summary || 'Daily sync' }}"
            git push
            echo "✅ Changes committed and pushed"
          else
            echo "No changes to commit"
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
| `days_back` | Number of days to sync | No | `7` |
| `output_path` | Output path for notes | No | `WHOOP` |
| `create_readme` | Create README in output directory | No | `true` |
| `debug` | Enable debug logging | No | `false` |

### Outputs

| Output | Description |
|--------|-------------|
| `notes_created` | Number of notes created or updated |
| `new_refresh_token` | New refresh token if it was rotated |
| `sync_summary` | Summary of synced data |
| `sleep_records` | Number of sleep records synced |
| `recovery_records` | Number of recovery records synced |
| `workout_records` | Number of workout records synced |

## 🔄 How Token Rotation Works

Whoop uses rotating refresh tokens for security. Each time a refresh token is used, it becomes invalid and a new one is issued. This action handles this automatically:

1. **Initial Setup**: You provide the initial refresh token as a GitHub secret
2. **During Sync**: 
   - The action uses the refresh token to get an access token
   - If Whoop rotates the refresh token, the action captures the new one
3. **Automatic Update**: 
   - The workflow detects the new token via the action's output
   - Uses GitHub CLI to update the `WHOOP_REFRESH_TOKEN` secret
   - Next run uses the new token automatically

**Important**: Your PA_TOKEN must have permissions to update repository secrets.

## 📁 Output Structure

The action creates the following structure in your repository:

```
output_path/
├── Daily/
│   └── 2025/
│       └── 08-August/
│           ├── 2025-08-08.md
│           ├── 2025-08-09.md
│           └── ...
└── README.md
```

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

# Create .env file with your credentials
cat > .env << EOF
WHOOP_CLIENT_ID=your-client-id
WHOOP_CLIENT_SECRET=your-client-secret
WHOOP_REFRESH_TOKEN=your-refresh-token
WHOOP_REDIRECT_URI=http://localhost:3000/api/auth/callback
EOF

# Test the OAuth flow
node test-oauth.js

# Run the sync locally
npm run test:local
```

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

### No Data Appearing

- Verify you have Whoop data for the sync period
- Check the action logs for any API errors
- Ensure your output path exists in the repository

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