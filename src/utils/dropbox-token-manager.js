const core = require('@actions/core');
const fs = require('fs');
const path = require('path');

class DropboxTokenManager {
  constructor() {
    this.newAccessToken = null;
    this.newRefreshToken = null;
  }

  setNewTokens(accessToken, refreshToken) {
    this.newAccessToken = accessToken;
    if (refreshToken && refreshToken !== this.newRefreshToken) {
      this.newRefreshToken = refreshToken;
      console.log('Dropbox refresh token rotated - will output for secret update');
    }
  }

  outputTokensForGitHub() {
    if (this.newAccessToken) {
      this.setOutput('new_dropbox_access_token', this.newAccessToken);
      console.log('New Dropbox access token outputted for GitHub secret update');
    }
    
    if (this.newRefreshToken) {
      this.setOutput('new_dropbox_refresh_token', this.newRefreshToken);
      console.log('New Dropbox refresh token outputted for GitHub secret update');
    }
  }

  setOutput(name, value) {
    if (process.env.GITHUB_OUTPUT) {
      const outputPath = process.env.GITHUB_OUTPUT;
      fs.appendFileSync(outputPath, `${name}=${value}\n`);
    } else {
      core.setOutput(name, value);
    }
  }

  async saveTokensToFile(tokens, filePath = '.dropbox-tokens.json') {
    try {
      const data = {
        access_token: tokens.access_token || this.newAccessToken,
        refresh_token: tokens.refresh_token || this.newRefreshToken,
        updated_at: new Date().toISOString()
      };
      
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      console.log(`Tokens saved to ${filePath}`);
    } catch (error) {
      console.error('Error saving tokens to file:', error.message);
    }
  }

  async loadTokensFromFile(filePath = '.dropbox-tokens.json') {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.log('No existing token file found');
      return null;
    }
  }

  async updateEnvFile(tokens) {
    const envPath = '.env';
    
    try {
      let envContent = '';
      try {
        envContent = await fs.readFile(envPath, 'utf-8');
      } catch (e) {
        console.log('No existing .env file, creating new one');
      }

      const lines = envContent.split('\n');
      const updatedLines = [];
      let foundAccessToken = false;
      let foundRefreshToken = false;

      for (const line of lines) {
        if (line.startsWith('DROPBOX_ACCESS_TOKEN=')) {
          updatedLines.push(`DROPBOX_ACCESS_TOKEN=${tokens.access_token || this.newAccessToken}`);
          foundAccessToken = true;
        } else if (line.startsWith('DROPBOX_REFRESH_TOKEN=') && tokens.refresh_token) {
          updatedLines.push(`DROPBOX_REFRESH_TOKEN=${tokens.refresh_token || this.newRefreshToken}`);
          foundRefreshToken = true;
        } else if (line.trim()) {
          updatedLines.push(line);
        }
      }

      if (!foundAccessToken && (tokens.access_token || this.newAccessToken)) {
        updatedLines.push(`DROPBOX_ACCESS_TOKEN=${tokens.access_token || this.newAccessToken}`);
      }
      
      if (!foundRefreshToken && (tokens.refresh_token || this.newRefreshToken)) {
        updatedLines.push(`DROPBOX_REFRESH_TOKEN=${tokens.refresh_token || this.newRefreshToken}`);
      }

      await fs.writeFile(envPath, updatedLines.join('\n') + '\n');
      console.log('.env file updated with new tokens');
    } catch (error) {
      console.error('Error updating .env file:', error.message);
    }
  }
}

module.exports = DropboxTokenManager;