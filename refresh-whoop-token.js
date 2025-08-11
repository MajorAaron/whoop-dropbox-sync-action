#!/usr/bin/env node

/**
 * Automated Whoop Token Refresh Script
 * This script refreshes your Whoop token and automatically updates GitHub secrets
 */

require('dotenv').config();
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs');
const path = require('path');

// Import our enhanced Whoop client
const WhoopClient = require('./src/lib/whoop-client');
const TokenManager = require('./src/utils/token-manager');
const logger = require('./src/utils/logger');

async function updateGitHubSecret(secretName, secretValue, repo) {
  try {
    await execAsync(`gh secret set ${secretName} --body "${secretValue}" --repo ${repo}`);
    return true;
  } catch (error) {
    console.error(`Failed to update ${secretName}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('=== Whoop Token Refresh & GitHub Secrets Update ===\n');
  
  // Load credentials from .env
  const clientId = process.env.WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;
  const refreshToken = process.env.WHOOP_REFRESH_TOKEN;
  const redirectUri = process.env.WHOOP_REDIRECT_URI || 'http://localhost:8080/callback';
  
  if (!clientId || !clientSecret || !refreshToken) {
    console.error('❌ Missing required environment variables in .env file');
    console.error('Required: WHOOP_CLIENT_ID, WHOOP_CLIENT_SECRET, WHOOP_REFRESH_TOKEN');
    process.exit(1);
  }
  
  console.log('📋 Configuration:');
  console.log(`  Client ID: ${clientId.substring(0, 8)}...`);
  console.log(`  Redirect URI: ${redirectUri}`);
  console.log(`  Current Refresh Token (last 8): ...${refreshToken.slice(-8)}`);
  console.log();
  
  // Initialize components
  const whoopClient = new WhoopClient(clientId, clientSecret, refreshToken, redirectUri);
  const tokenManager = new TokenManager();
  
  try {
    // Step 1: Attempt to refresh the token
    console.log('🔄 Refreshing access token...');
    const success = await whoopClient.refreshAccessToken();
    
    if (success) {
      console.log('✅ Token refresh successful!');
      
      // Check if refresh token was rotated
      const newRefreshToken = whoopClient.getNewRefreshToken();
      
      if (newRefreshToken) {
        console.log('\n🔄 IMPORTANT: Refresh token was rotated!');
        console.log(`  Old token (last 8): ...${refreshToken.slice(-8)}`);
        console.log(`  New token (last 8): ...${newRefreshToken.slice(-8)}`);
        
        // Save to token manager
        tokenManager.saveTokens({
          access_token: whoopClient.accessToken,
          refresh_token: newRefreshToken,
          expires_in: 3600,
          token_type: 'bearer',
          scope: whoopClient.scope
        });
        
        // Update .env file
        const envPath = path.join(__dirname, '.env');
        let envContent = fs.readFileSync(envPath, 'utf8');
        envContent = envContent.replace(
          /WHOOP_REFRESH_TOKEN=.*/,
          `WHOOP_REFRESH_TOKEN=${newRefreshToken}`
        );
        fs.writeFileSync(envPath, envContent);
        console.log('✅ Updated .env file with new refresh token');
        
        // Update GitHub secrets
        console.log('\n📤 Updating GitHub secrets...');
        
        // Try to detect repository from git remote or use current repo
        let repo = process.env.GITHUB_REPOSITORY || 'aarongmajor/whoop-dropbox-sync-action';
        try {
          const { stdout } = await execAsync('git remote get-url origin');
          const match = stdout.match(/github\.com[:/]([^/]+\/[^.]+)/);
          if (match) {
            repo = match[1];
          }
        } catch (e) {
          // Use default repo
        }
        
        console.log(`  Repository: ${repo}`);
        
        const updated = await updateGitHubSecret('WHOOP_REFRESH_TOKEN', newRefreshToken, repo);
        
        if (updated) {
          console.log('✅ GitHub secret WHOOP_REFRESH_TOKEN updated successfully!');
        } else {
          console.log('\n⚠️  Failed to update GitHub secret automatically.');
          console.log('Please update manually with:');
          console.log(`gh secret set WHOOP_REFRESH_TOKEN --body "${newRefreshToken}" --repo ${repo}`);
        }
      } else {
        console.log('✅ Refresh token unchanged (not rotated)');
        
        // Still save the access token
        tokenManager.saveTokens({
          access_token: whoopClient.accessToken,
          refresh_token: refreshToken,
          expires_in: 3600,
          token_type: 'bearer',
          scope: whoopClient.scope
        });
      }
      
      // Test the new access token
      console.log('\n🧪 Testing access token with API call...');
      const testData = await whoopClient.makeRequest('/developer/v1/user/profile/basic');
      
      if (testData) {
        console.log('✅ API call successful!');
        console.log(`  User: ${testData.first_name} ${testData.last_name}`);
        console.log(`  Email: ${testData.email}`);
      }
      
      console.log('\n✅ All operations completed successfully!');
      
    } else {
      throw new Error('Token refresh failed');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.message.includes('invalid_request') || error.message.includes('400')) {
      console.error('\n⚠️  Your refresh token appears to be invalid or expired.');
      console.error('You need to get a new refresh token by running:');
      console.error('  node get-whoop-token.js');
      console.error('\nThis will guide you through the OAuth flow to get fresh tokens.');
    }
    
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);