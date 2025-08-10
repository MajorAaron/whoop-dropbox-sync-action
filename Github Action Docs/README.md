# Whoop to Obsidian Sync

Automatically sync your Whoop fitness data to Obsidian notes using GitHub Actions.

> **🎉 New: Reusable GitHub Action Available!**  
> Use our published action: [MajorAaron/whoop-obsidian-sync-action](https://github.com/MajorAaron/whoop-obsidian-sync-action)  
> See the [Complete Setup Guide](docs/COMPLETE_SETUP_GUIDE.md) for full documentation.

## 🌟 Features

- **Comprehensive Data Sync**: Recovery, sleep, strain, workouts, and body measurements
- **GitHub Action Integration**: Fully automated daily syncing
- **Reusable Action**: Clean separation of sync logic from your vault
- **Rich Markdown Format**: Beautiful notes with frontmatter and structured sections
- **Smart Token Management**: Automatic refresh token rotation
- **Local Development**: Web dashboard for testing and OAuth setup

## 🚀 Quick Start

### Option 1: Use the GitHub Action (Recommended)

Add to your Obsidian vault's `.github/workflows/whoop-sync.yml`:

```yaml
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
          output_path: 'WHOOP'
      - run: |
          git config user.email "action@github.com"
          git config user.name "GitHub Action"
          git add -A
          git commit -m "🔄 Sync Whoop data" || exit 0
          git push
```

See the [Complete Setup Guide](docs/COMPLETE_SETUP_GUIDE.md) for detailed instructions.

### Option 2: Local Development

```bash
# Clone this repository
git clone https://github.com/MajorAaron/whoop-obsidian-sync
cd whoop-obsidian-sync

# Install dependencies
npm install

# Create .env file with your credentials
cp .env.example .env
# Edit .env with your Whoop API credentials

# Start the web dashboard
npm start
# Open http://localhost:3000

# Or run sync directly
node sync-to-obsidian.js 7  # Sync last 7 days
```

## 📁 Repository Structure

This repository contains:

```
whoop-obsidian-sync/
├── .github/
│   ├── workflows/           # GitHub Action workflow
│   └── scripts/             # Enhanced sync scripts for Actions
├── api/                     # API clients and routes
│   ├── whoop-client.js     # Whoop API client
│   ├── routes.js           # API endpoints
│   └── auth.js             # OAuth implementation
├── public/                  # Web dashboard
│   ├── dashboard.html      # Main dashboard
│   └── js/                 # Frontend JavaScript
├── docs/                    # Documentation
│   ├── COMPLETE_SETUP_GUIDE.md  # Full setup documentation
│   └── *.md                # Other guides
├── server.js               # Express server for local development
├── sync-to-obsidian.js     # Local sync script
└── README.md               # This file
```

## 🔗 Related Repositories

- **[whoop-obsidian-sync-action](https://github.com/MajorAaron/whoop-obsidian-sync-action)**: The reusable GitHub Action
- **[Your Obsidian Vault](https://github.com/YourUsername/YourVault)**: Where the synced data lives

## 📊 What Gets Synced

### Daily Notes Include:
- 🔄 **Recovery**: Score, HRV, RHR, skin temp, SpO2
- 😴 **Sleep**: Performance, stages, efficiency, respiratory rate
- 💪 **Strain**: Daily strain, average/max HR, calories
- 🏃 **Workouts**: Type, duration, heart rate zones, distance
- 📊 **Body**: Height, weight, max HR (when updated)

### Example Note Structure:
```markdown
---
date: 2025-08-09
tags: [whoop, fitness, health]
recovery_score: 67
hrv: 45.2
rhr: 58
sleep_performance: 85
strain: 12.5
---

# 2025-08-09 - Whoop Summary

## 🔄 Recovery
- **Recovery Score**: 🟢 67%
[... more data ...]
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file:

```bash
# Whoop OAuth
WHOOP_CLIENT_ID=your_client_id
WHOOP_CLIENT_SECRET=your_client_secret
WHOOP_REFRESH_TOKEN=your_refresh_token  # Optional, obtained via OAuth

# Optional
OBSIDIAN_VAULT_PATH=/path/to/vault
DEBUG=false
```

### GitHub Secrets

For GitHub Actions, add these secrets to your repository:
- `WHOOP_CLIENT_ID`
- `WHOOP_CLIENT_SECRET`
- `WHOOP_REFRESH_TOKEN`

## 🔐 Authentication

### Getting Whoop API Credentials

1. Visit [developer.whoop.com](https://developer.whoop.com)
2. Create an application
3. Note your Client ID and Client Secret
4. Set redirect URI to: `http://localhost:3000/api/auth/callback`

### Getting Refresh Token

Option 1: Web Dashboard
```bash
npm start
# Open http://localhost:3000
# Click "Connect with Whoop"
```

Option 2: CLI Script
```bash
node get-refresh-token-auto.js
```

## 📝 Documentation

- [Complete Setup Guide](docs/COMPLETE_SETUP_GUIDE.md) - Full documentation
- [Obsidian Git Setup](OBSIDIAN_GIT_SETUP.md) - Obsidian Git plugin integration
- [API Documentation](docs/whoop_api.json) - Whoop API reference

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Whoop](https://whoop.com) for the fitness tracking platform
- [Obsidian](https://obsidian.md) for the knowledge management app
- GitHub Actions community for inspiration

## ⚠️ Important Notes

- **Whoop API v1**: Currently using v1 endpoints (with `/developer` prefix)
- **Migration Required**: v2 migration required by October 1, 2025
- **Token Security**: Never commit tokens to your repository
- **Rate Limits**: Be mindful of Whoop API rate limits

## 🐛 Troubleshooting

### Common Issues

1. **"Authorization was not valid"**: Token expired - re-authenticate
2. **"Unable to resolve action"**: Use full version tag (v1.0.0)
3. **No data synced**: Check Whoop app for recent data

### Debug Mode

Enable debug logging:
```bash
DEBUG=true node sync-to-obsidian.js
```

Or in GitHub Actions:
```yaml
debug: 'true'
```

## 📞 Support

- [Create an Issue](https://github.com/MajorAaron/whoop-obsidian-sync/issues)
- Check the [Complete Setup Guide](docs/COMPLETE_SETUP_GUIDE.md)
- Review [GitHub Action Documentation](https://github.com/MajorAaron/whoop-obsidian-sync-action)

---

*Last updated: August 10, 2025*