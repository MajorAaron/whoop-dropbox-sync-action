/**
 * Token Manager
 * Utilities for managing and persisting OAuth tokens
 */

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class TokenManager {
  constructor(tokenFile = '.whoop-tokens.json') {
    this.tokenFile = path.resolve(process.cwd(), tokenFile);
  }

  /**
   * Save tokens to file
   */
  saveTokens(tokens) {
    try {
      const data = {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
        token_type: tokens.token_type,
        scope: tokens.scope,
        updated_at: new Date().toISOString()
      };
      
      fs.writeFileSync(this.tokenFile, JSON.stringify(data, null, 2));
      logger.debug(`Tokens saved to ${this.tokenFile}`);
      return true;
    } catch (error) {
      logger.error('Failed to save tokens:', error.message);
      return false;
    }
  }

  /**
   * Load tokens from file
   */
  loadTokens() {
    try {
      if (!fs.existsSync(this.tokenFile)) {
        logger.debug('Token file does not exist');
        return null;
      }
      
      const data = JSON.parse(fs.readFileSync(this.tokenFile, 'utf8'));
      logger.debug('Tokens loaded from file');
      return data;
    } catch (error) {
      logger.error('Failed to load tokens:', error.message);
      return null;
    }
  }

  /**
   * Check if tokens are expired
   */
  areTokensExpired(tokens) {
    if (!tokens || !tokens.updated_at || !tokens.expires_in) {
      return true;
    }
    
    const updatedAt = new Date(tokens.updated_at);
    const expiresAt = new Date(updatedAt.getTime() + (tokens.expires_in * 1000));
    const now = new Date();
    
    // Consider expired if within 5 minutes of expiration
    const bufferTime = 5 * 60 * 1000; // 5 minutes
    return now.getTime() > (expiresAt.getTime() - bufferTime);
  }

  /**
   * Compare tokens to detect rotation
   */
  hasTokenRotated(oldToken, newToken) {
    return oldToken !== newToken;
  }

  /**
   * Log token rotation for debugging
   */
  logTokenRotation(oldRefreshToken, newRefreshToken) {
    if (this.hasTokenRotated(oldRefreshToken, newRefreshToken)) {
      logger.warning('🔄 Refresh token has been rotated!');
      logger.info('Token rotation details:');
      logger.info(`  Old token (last 8 chars): ...${oldRefreshToken.slice(-8)}`);
      logger.info(`  New token (last 8 chars): ...${newRefreshToken.slice(-8)}`);
      return true;
    }
    return false;
  }

  /**
   * Clean up token file
   */
  deleteTokenFile() {
    try {
      if (fs.existsSync(this.tokenFile)) {
        fs.unlinkSync(this.tokenFile);
        logger.debug('Token file deleted');
      }
    } catch (error) {
      logger.error('Failed to delete token file:', error.message);
    }
  }
}

module.exports = TokenManager;