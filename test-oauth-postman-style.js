#!/usr/bin/env node

/**
 * Test OAuth with Postman-style configuration
 * This script mimics Postman's successful OAuth flow
 */

require('dotenv').config();
const https = require('https');
const TokenManager = require('./src/utils/token-manager');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Make an HTTPS request (Postman-style)
 */
function makeRequest(url, options) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    log(`\n📡 ${requestOptions.method} ${url}`, 'cyan');
    
    const req = https.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        log(`📥 Response Status: ${res.statusCode}`, res.statusCode === 200 ? 'green' : 'yellow');
        
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode === 200) {
            resolve(parsed);
          } else {
            reject(new Error(`API error (${res.statusCode}): ${JSON.stringify(parsed, null, 2)}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      log(`📤 Request Body: ${options.body.substring(0, 200)}...`, 'blue');
      req.write(options.body);
    }
    
    req.end();
  });
}

/**
 * Refresh token (Postman-style)
 */
async function refreshToken(clientId, clientSecret, refreshToken, redirectUri) {
  log('\n🔄 Attempting to refresh token (Postman-style)...', 'bright');
  
  // Match Postman configuration exactly:
  // - Include redirect_uri in refresh request (per error hint)
  // - No scope in refresh request
  // - Client credentials in body
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri
  });

  const body = params.toString();
  
  log('\n📋 Request Configuration:', 'yellow');
  log(`  Grant Type: refresh_token`);
  log(`  Client ID: ${clientId}`);
  log(`  Redirect URI: ${redirectUri}`);
  log(`  Has Refresh Token: ${!!refreshToken}`);
  log(`  Has Client Secret: ${!!clientSecret}`);
  log(`  Body Length: ${body.length} bytes`);
  
  const response = await makeRequest('https://api.prod.whoop.com/oauth/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body)
    },
    body
  });

  return response;
}

/**
 * Test API call with access token
 */
async function testApiCall(accessToken) {
  log('\n🧪 Testing API call with access token...', 'bright');
  
  const response = await makeRequest('https://api.prod.whoop.com/developer/v1/user/profile/basic', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  return response;
}

/**
 * Main test function
 */
async function main() {
  try {
    log('\n' + '='.repeat(60), 'bright');
    log('🚀 Whoop OAuth Test (Postman-Style Configuration)', 'bright');
    log('='.repeat(60) + '\n', 'bright');

    // Get credentials
    const clientId = process.env.WHOOP_CLIENT_ID;
    const clientSecret = process.env.WHOOP_CLIENT_SECRET;
    const refreshTokenEnv = process.env.WHOOP_REFRESH_TOKEN;
    const redirectUri = process.env.WHOOP_REDIRECT_URI || 'http://localhost:3000/api/auth/callback';

    if (!clientId || !clientSecret || !refreshTokenEnv) {
      throw new Error('Missing required environment variables: WHOOP_CLIENT_ID, WHOOP_CLIENT_SECRET, or WHOOP_REFRESH_TOKEN');
    }

    // Initialize token manager
    const tokenManager = new TokenManager();
    
    // Load existing tokens if available
    const existingTokens = tokenManager.loadTokens();
    if (existingTokens) {
      log('📂 Found existing token file', 'cyan');
      log(`  Last updated: ${existingTokens.updated_at}`);
      if (tokenManager.areTokensExpired(existingTokens)) {
        log('  ⚠️  Tokens may be expired', 'yellow');
      }
    }

    // Step 1: Refresh the token
    log('\n' + '-'.repeat(40), 'cyan');
    log('Step 1: Refresh Token', 'bright');
    log('-'.repeat(40), 'cyan');
    
    const tokenResponse = await refreshToken(clientId, clientSecret, refreshTokenEnv, redirectUri);
    
    log('\n✅ Token refresh successful!', 'green');
    log('\n📦 Token Response:', 'yellow');
    log(`  Access Token: ...${tokenResponse.access_token.slice(-20)}`);
    log(`  Token Type: ${tokenResponse.token_type}`);
    log(`  Expires In: ${tokenResponse.expires_in} seconds`);
    log(`  Scope: ${tokenResponse.scope || 'Not provided'}`);
    
    // Check for token rotation
    if (tokenResponse.refresh_token) {
      const rotated = tokenManager.hasTokenRotated(refreshTokenEnv, tokenResponse.refresh_token);
      if (rotated) {
        log('\n🔄 IMPORTANT: Refresh token was ROTATED!', 'yellow');
        log(`  Old token (last 8): ...${refreshTokenEnv.slice(-8)}`);
        log(`  New token (last 8): ...${tokenResponse.refresh_token.slice(-8)}`);
        log('\n⚠️  Update your WHOOP_REFRESH_TOKEN with the new value!', 'red');
      } else {
        log('\n✅ Refresh token unchanged', 'green');
      }
    } else {
      log('\n✅ No new refresh token in response (token not rotated)', 'green');
    }

    // Save tokens
    tokenManager.saveTokens({
      ...tokenResponse,
      refresh_token: tokenResponse.refresh_token || refreshTokenEnv
    });

    // Step 2: Test API call
    log('\n' + '-'.repeat(40), 'cyan');
    log('Step 2: Test API Call', 'bright');
    log('-'.repeat(40), 'cyan');
    
    const profile = await testApiCall(tokenResponse.access_token);
    
    log('\n✅ API call successful!', 'green');
    log('\n👤 User Profile:', 'yellow');
    log(`  User ID: ${profile.user_id}`);
    log(`  Email: ${profile.email}`);
    log(`  Name: ${profile.first_name} ${profile.last_name}`);

    // Summary
    log('\n' + '='.repeat(60), 'bright');
    log('✅ All tests passed successfully!', 'green');
    log('='.repeat(60) + '\n', 'bright');
    
    if (tokenResponse.refresh_token && tokenManager.hasTokenRotated(refreshTokenEnv, tokenResponse.refresh_token)) {
      log('📋 Next Steps:', 'yellow');
      log('1. Update your WHOOP_REFRESH_TOKEN environment variable with:');
      log(`   ${tokenResponse.refresh_token}`, 'cyan');
      log('2. If using GitHub Actions, update the secret:');
      log(`   gh secret set WHOOP_REFRESH_TOKEN --body "${tokenResponse.refresh_token}"`, 'cyan');
    }

  } catch (error) {
    log('\n' + '='.repeat(60), 'red');
    log('❌ Test failed!', 'red');
    log('='.repeat(60), 'red');
    log(`\nError: ${error.message}`, 'red');
    
    if (error.stack) {
      log('\nStack trace:', 'yellow');
      console.error(error.stack);
    }
    
    process.exit(1);
  }
}

// Run the test
main();