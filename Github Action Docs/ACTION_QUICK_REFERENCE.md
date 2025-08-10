# Whoop to Obsidian Sync Action - Quick Reference

## 🚀 Quick Setup

```yaml
# .github/workflows/whoop-sync.yml
name: Sync Whoop Data
on:
  schedule:
    - cron: '15 6 * * *'  # Daily at 6:15 AM UTC
  workflow_dispatch:

permissions:
  contents: write

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: MajorAaron/whoop-obsidian-sync-action@v1.0.0
        with:
          whoop_client_id: ${{ secrets.WHOOP_CLIENT_ID }}
          whoop_client_secret: ${{ secrets.WHOOP_CLIENT_SECRET }}
          whoop_refresh_token: ${{ secrets.WHOOP_REFRESH_TOKEN }}
      - run: |
          git config user.email "action@github.com"
          git config user.name "GitHub Action"
          git add -A && git commit -m "🔄 Sync Whoop data" || exit 0
          git push
```

## 📥 Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `whoop_client_id` | ✅ | - | Whoop OAuth Client ID |
| `whoop_client_secret` | ✅ | - | Whoop OAuth Client Secret |
| `whoop_refresh_token` | ✅ | - | Whoop Refresh Token |
| `days_back` | ❌ | `7` | Number of days to sync |
| `output_path` | ❌ | `WHOOP` | Output folder path |
| `create_readme` | ❌ | `true` | Create README.md |
| `debug` | ❌ | `false` | Enable debug logging |

## 📤 Outputs

| Output | Description | Example |
|--------|-------------|---------|
| `notes_created` | Number of notes created/updated | `7` |
| `new_refresh_token` | New token if rotated | `abc123...` |
| `sync_summary` | Summary of sync | `Synced 7 notes (5 sleep, 4 recovery, 1 workout)` |
| `sleep_records` | Sleep records count | `5` |
| `recovery_records` | Recovery records count | `4` |
| `workout_records` | Workout records count | `1` |

## 🔑 Setting Secrets

```bash
# Using GitHub CLI
gh secret set WHOOP_CLIENT_ID --body "your_client_id" --repo YourUsername/YourRepo
gh secret set WHOOP_CLIENT_SECRET --body "your_client_secret" --repo YourUsername/YourRepo
gh secret set WHOOP_REFRESH_TOKEN --body "your_refresh_token" --repo YourUsername/YourRepo
```

## 🎯 Common Use Cases

### Daily Sync (Default)
```yaml
- uses: MajorAaron/whoop-obsidian-sync-action@v1.0.0
  with:
    whoop_client_id: ${{ secrets.WHOOP_CLIENT_ID }}
    whoop_client_secret: ${{ secrets.WHOOP_CLIENT_SECRET }}
    whoop_refresh_token: ${{ secrets.WHOOP_REFRESH_TOKEN }}
```

### Custom Output Path
```yaml
- uses: MajorAaron/whoop-obsidian-sync-action@v1.0.0
  with:
    whoop_client_id: ${{ secrets.WHOOP_CLIENT_ID }}
    whoop_client_secret: ${{ secrets.WHOOP_CLIENT_SECRET }}
    whoop_refresh_token: ${{ secrets.WHOOP_REFRESH_TOKEN }}
    output_path: 'Health/Fitness/Whoop'
```

### Extended History Sync
```yaml
- uses: MajorAaron/whoop-obsidian-sync-action@v1.0.0
  with:
    whoop_client_id: ${{ secrets.WHOOP_CLIENT_ID }}
    whoop_client_secret: ${{ secrets.WHOOP_CLIENT_SECRET }}
    whoop_refresh_token: ${{ secrets.WHOOP_REFRESH_TOKEN }}
    days_back: '30'
```

### Debug Mode
```yaml
- uses: MajorAaron/whoop-obsidian-sync-action@v1.0.0
  with:
    whoop_client_id: ${{ secrets.WHOOP_CLIENT_ID }}
    whoop_client_secret: ${{ secrets.WHOOP_CLIENT_SECRET }}
    whoop_refresh_token: ${{ secrets.WHOOP_REFRESH_TOKEN }}
    debug: 'true'
```

### Without README Creation
```yaml
- uses: MajorAaron/whoop-obsidian-sync-action@v1.0.0
  with:
    whoop_client_id: ${{ secrets.WHOOP_CLIENT_ID }}
    whoop_client_secret: ${{ secrets.WHOOP_CLIENT_SECRET }}
    whoop_refresh_token: ${{ secrets.WHOOP_REFRESH_TOKEN }}
    create_readme: 'false'
```

## 🔄 Token Refresh Handling

```yaml
- name: Sync Whoop data
  id: whoop-sync
  uses: MajorAaron/whoop-obsidian-sync-action@v1.0.0
  with:
    whoop_client_id: ${{ secrets.WHOOP_CLIENT_ID }}
    whoop_client_secret: ${{ secrets.WHOOP_CLIENT_SECRET }}
    whoop_refresh_token: ${{ secrets.WHOOP_REFRESH_TOKEN }}

- name: Handle token refresh
  if: steps.whoop-sync.outputs.new_refresh_token
  run: |
    echo "::warning::Refresh token updated! Update WHOOP_REFRESH_TOKEN secret"
    echo "New token available in logs (hidden for security)"
```

## 📅 Scheduling Options

### Daily at 6 AM UTC
```yaml
on:
  schedule:
    - cron: '0 6 * * *'
```

### Twice Daily
```yaml
on:
  schedule:
    - cron: '0 6,18 * * *'
```

### Weekly on Sundays
```yaml
on:
  schedule:
    - cron: '0 6 * * 0'
```

### Manual Only
```yaml
on:
  workflow_dispatch:
    inputs:
      days_back:
        description: 'Days to sync'
        default: '7'
```

## 🛠️ Manual Trigger

```bash
# Default (7 days)
gh workflow run "Sync Whoop Data" --repo YourUsername/YourRepo

# Custom days
gh workflow run "Sync Whoop Data" --repo YourUsername/YourRepo -f days_back=30

# With debug
gh workflow run "Sync Whoop Data" --repo YourUsername/YourRepo -f days_back=7 -f debug=true
```

## 📁 Output Structure

```
output_path/           # Default: WHOOP/
├── Daily/
│   └── 2025/
│       └── 08-August/
│           ├── 2025-08-08.md
│           ├── 2025-08-09.md
│           └── ...
└── README.md          # If create_readme: true
```

## 📝 Note Format

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

## 😴 Sleep
- **Performance**: 85%
- **Time in Bed**: 8h 15m

## 💪 Strain & Activity
- **Day Strain**: 🟡 12.5
- **Calories**: 2450 cal

## 🏃 Workouts
[Details of workouts if any]
```

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Unable to resolve action" | Use full version: `@v1.0.0` |
| "Authorization was not valid" | Refresh token expired - get new one |
| "Permission denied" | Add `permissions: contents: write` |
| No data synced | Check date range and Whoop app for data |
| Different paths | Ensure `output_path` is correct |

## 📊 Check Status

```bash
# List recent runs
gh run list --workflow="Sync Whoop Data" --repo YourUsername/YourRepo

# View specific run
gh run view RUN_ID --repo YourUsername/YourRepo

# Watch run in progress
gh run watch --repo YourUsername/YourRepo
```

## 🔗 Links

- **Action**: [MajorAaron/whoop-obsidian-sync-action](https://github.com/MajorAaron/whoop-obsidian-sync-action)
- **Documentation**: [Complete Setup Guide](COMPLETE_SETUP_GUIDE.md)
- **Migration**: [Migration Guide](ACTION_MIGRATION_GUIDE.md)
- **Whoop API**: [developer.whoop.com](https://developer.whoop.com)

---

*Version: v1.0.0 | Updated: August 10, 2025*