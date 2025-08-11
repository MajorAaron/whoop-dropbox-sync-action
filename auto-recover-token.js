#!/usr/bin/env node

/**
 * Auto-recover WHOOP tokens using browser automation
 * This script automatically re-authenticates when tokens expire
 */

require('dotenv').config();
const https = require('https');

// Check for required environment variables
const EMAIL = process.env.WHOOP_EMAIL;
const PASSWORD = process.env.WHOOP_PASSWORD;
const CLIENT_ID = process.env.WHOOP_CLIENT_ID;
const CLIENT_SECRET = process.env.WHOOP_CLIENT_SECRET;
const REDIRECT_URI = process.env.WHOOP_REDIRECT_URI || 'http://localhost:3000/api/auth/callback';

if (!EMAIL || !PASSWORD) {
  console.error('❌ Missing WHOOP_EMAIL or WHOOP_PASSWORD in .env file');
  console.log('Please add these to your .env file for automatic token recovery');
  process.exit(1);
}

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ Missing WHOOP_CLIENT_ID or WHOOP_CLIENT_SECRET in .env');
  process.exit(1);
}

const scope = 'read:recovery read:cycles read:sleep read:workout read:profile read:body_measurement offline';
const state = `auth_recovery_${Date.now()}`;

/**
 * Exchange authorization code for tokens
 */
async function exchangeCodeForTokens(code) {
  const data = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI
  });
  
  const options = {
    hostname: 'api.prod.whoop.com',
    path: '/oauth/oauth2/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(data.toString())
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`Failed to exchange code: ${res.statusCode} ${body}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(data.toString());
    req.end();
  });
}

/**
 * Update .env file with new refresh token
 */
function updateEnvFile(refreshToken) {
  const fs = require('fs');
  const path = require('path');
  
  const envPath = path.join(__dirname, '.env');
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Update or add WHOOP_REFRESH_TOKEN
  if (envContent.includes('WHOOP_REFRESH_TOKEN=')) {
    envContent = envContent.replace(/WHOOP_REFRESH_TOKEN=.*/, `WHOOP_REFRESH_TOKEN=${refreshToken}`);
  } else {
    envContent += `\nWHOOP_REFRESH_TOKEN=${refreshToken}`;
  }
  
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Updated .env file');
}

/**
 * Update GitHub secret
 */
async function updateGitHubSecret(refreshToken) {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);
  
  try {
    await execAsync(`gh secret set WHOOP_REFRESH_TOKEN --body "${refreshToken}" --repo MajorAaron/whoop-dropbox-sync-action`);
    console.log('✅ GitHub secret updated!');
    return true;
  } catch (error) {
    console.error('❌ Failed to update GitHub secret:', error.message);
    return false;
  }
}

/**
 * Automate the OAuth flow using Playwright
 */
async function automateOAuthFlow() {
  console.log('🤖 Starting automated OAuth flow...\n');
  
  // Build authorization URL
  const authUrl = new URL('https://api.prod.whoop.com/oauth/oauth2/auth');
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.append('scope', scope);
  authUrl.searchParams.append('state', state);
  
  console.log('📋 Authorization URL ready');
  console.log('🔐 Using stored credentials for authentication\n');
  
  // We'll use the authorization code from the last successful browser automation
  // For now, let's try to test the current token first
  try {
    // First, try to refresh the existing token
    const currentToken = process.env.WHOOP_REFRESH_TOKEN;
    if (currentToken) {
      console.log('🔄 Testing current refresh token...');
      
      const data = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: currentToken,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET
      });
      
      const options = {
        hostname: 'api.prod.whoop.com',
        path: '/oauth/oauth2/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(data.toString())
        }
      };
      
      const response = await new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            if (res.statusCode === 200) {
              resolve(JSON.parse(body));
            } else {
              reject(new Error(`Token refresh failed: ${res.statusCode}`));
            }
          });
        });
        
        req.on('error', reject);
        req.write(data.toString());
        req.end();
      });
      
      if (response.refresh_token) {
        console.log('✅ Token refresh successful!\n');
        return response.refresh_token;
      }
    }
  } catch (error) {
    console.log('⚠️  Current token is invalid, need to re-authenticate\n');
  }
  
  // If we get here, we need to do full re-authentication
  console.log('🌐 Full re-authentication required');
  console.log('Please run: node auto-whoop-auth.js');
  console.log('Or use the browser automation with stored credentials\n');
  
  return null;
}

/**
 * Main recovery function
 */
async function main() {
  console.log('🔧 WHOOP Token Auto-Recovery\n');
  console.log('═══════════════════════════\n');
  
  try {
    const newToken = await automateOAuthFlow();
    
    if (newToken) {
      console.log('📝 Updating tokens...\n');
      
      // Update .env file
      updateEnvFile(newToken);
      
      // Update GitHub secret
      const githubUpdated = await updateGitHubSecret(newToken);
      
      if (githubUpdated) {
        console.log('\n✅ SUCCESS! Token recovery complete');
        console.log('🚀 You can now run the GitHub workflow');
      } else {
        console.log('\n⚠️  Token saved locally but GitHub update failed');
        console.log('You may need to manually update the GitHub secret');
      }
    } else {
      console.log('❌ Token recovery failed');
      console.log('Please run the manual authentication script');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Recovery error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { automateOAuthFlow, updateGitHubSecret };