# Whoop to Obsidian Sync Action

[![GitHub Action](https://img.shields.io/badge/GitHub-Action-blue?logo=github)](https://github.com/marketplace/actions/whoop-to-obsidian-sync)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A GitHub Action that syncs your Whoop fitness data to Obsidian markdown notes with comprehensive health metrics, sleep analysis, recovery scores, and workout details.

## 🌟 Features

- **Comprehensive Data Sync**: Recovery, sleep, strain, workouts, and body measurements
- **Rich Markdown Format**: Beautiful notes with frontmatter, emojis, and structured sections
- **Smart Token Management**: Automatic refresh token rotation
- **Flexible Configuration**: Customize output paths and sync duration
- **Daily Notes Structure**: Organized by year and month
- **No Dependencies**: Uses only Node.js built-in modules

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

### Step 1: Get Whoop API Credentials

1. Go to [Whoop Developer Portal](https://developer.whoop.com)
2. Create an application
3. Note your Client ID and Client Secret
4. Get a refresh token using OAuth flow

### Step 2: Add Secrets to Your Repository

Add these secrets to your repository (Settings → Secrets → Actions):

- `WHOOP_CLIENT_ID`: Your Whoop application client ID
- `WHOOP_CLIENT_SECRET`: Your Whoop application client secret
- `WHOOP_REFRESH_TOKEN`: Your Whoop refresh token

### Step 3: Create Workflow

Create `.github/workflows/whoop-sync.yml` in your repository:

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
        uses: MajorAaron/whoop-obsidian-sync-action@v1
        with:
          whoop_client_id: ${{ secrets.WHOOP_CLIENT_ID }}
          whoop_client_secret: ${{ secrets.WHOOP_CLIENT_SECRET }}
          whoop_refresh_token: ${{ secrets.WHOOP_REFRESH_TOKEN }}
          days_back: ${{ github.event.inputs.days_back || '7' }}
          output_path: 'Fitness/Whoop'  # Customize your path
          
      - name: Commit and push changes
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          
          if [ -n "$(git status --porcelain)" ]; then
            git add -A
            git commit -m "🔄 Sync Whoop data $(date +'%Y-%m-%d')
            
            ${{ steps.whoop-sync.outputs.sync_summary }}"
            git push
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

## 🔄 Token Refresh

The action automatically handles token refresh. If the refresh token is rotated:

1. The action will output the new token
2. You'll see a warning in the workflow logs
3. Update your `WHOOP_REFRESH_TOKEN` secret with the new value

To handle this automatically, add this step after the sync:

```yaml
- name: Update refresh token if needed
  if: steps.whoop-sync.outputs.new_refresh_token
  run: |
    echo "::warning::Update WHOOP_REFRESH_TOKEN secret with new token"
    # You can use GitHub CLI or API to update the secret programmatically
```

## 🧪 Testing Locally

You can test the action locally:

```bash
# Clone the action repository
git clone https://github.com/MajorAaron/whoop-obsidian-sync-action
cd whoop-obsidian-sync-action

# Install dependencies
npm install

# Set environment variables
export INPUT_WHOOP_CLIENT_ID="your-client-id"
export INPUT_WHOOP_CLIENT_SECRET="your-client-secret"
export INPUT_WHOOP_REFRESH_TOKEN="your-refresh-token"
export INPUT_DAYS_BACK="7"
export INPUT_OUTPUT_PATH="test-output"
export INPUT_DEBUG="true"

# Run the action
npm test
```

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

1. Check the [FAQ](#faq) section below
2. Search [existing issues](https://github.com/MajorAaron/whoop-obsidian-sync-action/issues)
3. Create a [new issue](https://github.com/MajorAaron/whoop-obsidian-sync-action/issues/new)

## ❓ FAQ

### How do I get a Whoop refresh token?

You'll need to implement the OAuth flow. See the [Whoop API documentation](https://developer.whoop.com/docs/authentication) for details.

### Can I sync more than 30 days of data?

Yes, adjust the `days_back` input. Note that syncing large amounts of data may take longer.

### What happens if the action fails?

The action will log the error. Your existing notes remain unchanged. Check the workflow logs for details.

### Can I customize the note format?

Currently, the format is fixed. Fork the repository to customize the formatter.

### Does this work with private repositories?

Yes! The action works with both public and private repositories.

## 🏗️ Roadmap

- [ ] Support for Whoop API v2 (migration required by October 2025)
- [ ] Customizable note templates
- [ ] Weekly/monthly summary notes
- [ ] Integration with other fitness platforms
- [ ] Webhook support for real-time syncing

---

Made with ❤️ by [MajorAaron](https://github.com/MajorAaron)