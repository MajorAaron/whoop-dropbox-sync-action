# Setup Automatic Token Updates

## Quick Setup Steps

### 1. Create Personal Access Token (PAT)
Go to: https://github.com/settings/tokens/new

Settings:
- **Name**: Whoop Token Updater
- **Expiration**: 90 days or more
- **Scope**: ✅ `repo` (full control)
- Click "Generate token"
- **COPY THE TOKEN!**

### 2. Add PAT to Your Repository
```bash
# Run this script and paste your PAT when prompted:
./add-pat-token.sh
```

### 3. Add Workflow to THE-MAINFRAME Repository

Go to your THE-MAINFRAME repository and create this file:
`.github/workflows/whoop-sync.yml`

Copy the contents from: `auto-update-workflow.yml`

Or run these commands:
```bash
# Navigate to your THE-MAINFRAME repo
cd ~/path/to/THE-MAINFRAME

# Create workflows directory
mkdir -p .github/workflows

# Copy the workflow
cp ~/Sites/whoop-obsidian-sync-action/auto-update-workflow.yml .github/workflows/whoop-sync.yml

# Commit and push
git add .github/workflows/whoop-sync.yml
git commit -m "Add Whoop sync workflow with automatic token updates"
git push
```

### 4. Test It!
Go to: https://github.com/MajorAaron/THE-MAINFRAME/actions

Click on "Sync Whoop Data to Obsidian" → "Run workflow"

## How It Works

The workflow will:
1. ✅ Run daily at 6:15 AM (or manually)
2. ✅ Sync your Whoop data to Obsidian notes
3. ✅ Automatically update the refresh token if it rotates
4. ✅ Commit the changes to your repository
5. ✅ No manual token updates needed!

## Verify It's Working

After the first run, check:
1. Your WHOOP folder has new markdown files
2. The Actions tab shows "✅ Sync Whoop Data to Obsidian"
3. If token rotated, you'll see "🔄 Token Rotated: Refresh token was automatically updated" in the summary

## Troubleshooting

If token update fails:
- Make sure PA_TOKEN secret is set correctly
- Ensure the PAT has `repo` scope
- Check the workflow has `secrets: write` permission

## Security Notes

- The PAT is only used to update the refresh token secret
- Delete `add-pat-token.sh` after use
- Rotate your PAT every 90 days for security