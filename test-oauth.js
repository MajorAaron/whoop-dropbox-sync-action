#!/usr/bin/env node

/**
 * Test OAuth Token Refresh
 * Tests the updated OAuth implementation with the Whoop API
 */

require('dotenv').config();
const WhoopClient = require('./src/lib/whoop-client');

async function testOAuth() {
  console.log('=== Testing Whoop OAuth Token Refresh ===\n');
  
  // Get credentials from environment or .env file
  const clientId = process.env.WHOOP_CLIENT_ID || process.env.INPUT_WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET || process.env.INPUT_WHOOP_CLIENT_SECRET;
  const refreshToken = process.env.WHOOP_REFRESH_TOKEN || process.env.INPUT_WHOOP_REFRESH_TOKEN;
  const redirectUri = process.env.WHOOP_REDIRECT_URI || 'http://localhost:3000/api/auth/callback';
  
  console.log('Configuration:');
  console.log(`  Client ID: ${clientId ? clientId.substring(0, 8) + '...' : 'NOT SET'}`);
  console.log(`  Client Secret: ${clientSecret ? '***' : 'NOT SET'}`);
  console.log(`  Refresh Token: ${refreshToken ? refreshToken.substring(0, 20) + '...' : 'NOT SET'}`);
  console.log(`  Redirect URI: ${redirectUri}\n`);
  
  if (!clientId || !clientSecret || !refreshToken) {
    console.error('❌ Missing required credentials!');
    console.error('Please ensure WHOOP_CLIENT_ID, WHOOP_CLIENT_SECRET, and WHOOP_REFRESH_TOKEN are set.');
    process.exit(1);
  }
  
  try {
    // Initialize the client
    const client = new WhoopClient(clientId, clientSecret, refreshToken, redirectUri);
    
    // Try to refresh the access token
    console.log('🔄 Attempting to refresh access token...');
    await client.refreshAccessToken();
    
    console.log('✅ Token refresh successful!');
    
    // Check if token was rotated
    const newRefreshToken = client.getNewRefreshToken();
    if (newRefreshToken) {
      console.log('\n⚠️  IMPORTANT: Your refresh token was rotated!');
      console.log('New refresh token (save this):');
      console.log(newRefreshToken);
    }
    
    // Try to fetch profile to verify the token works
    console.log('\n📊 Testing API access by fetching profile...');
    const profile = await client.makeRequest('/developer/v1/user/profile/basic');
    
    if (profile) {
      console.log('✅ API access successful!');
      console.log(`User: ${profile.first_name} ${profile.last_name}`);
      console.log(`User ID: ${profile.user_id}`);
    }
    
    console.log('\n🎉 OAuth test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ OAuth test failed!');
    console.error('Error:', error.message);
    
    if (error.message.includes('invalid_request')) {
      console.error('\n💡 Troubleshooting tips:');
      console.error('1. Ensure your redirect URI matches exactly what\'s registered in your Whoop app');
      console.error('2. Your Whoop app redirect URI is: http://localhost:3000/api/auth/callback');
      console.error('3. If you haven\'t gotten a refresh token yet, run: node get-whoop-token.js');
      console.error('4. Make sure the redirect URI in .env matches your Whoop app settings.');
    }
    
    process.exit(1);
  }
}

testOAuth();