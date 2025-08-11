#!/usr/bin/env node

/**
 * Setup Dropbox OAuth Authentication
 * Run this script to authenticate with Dropbox and get access/refresh tokens
 */

const http = require('http');
const crypto = require('crypto');
const https = require('https');
const readline = require('readline');
const fs = require('fs').promises;
const path = require('path');

const REDIRECT_URI = 'http://localhost:8888/callback';

// Generate PKCE parameters
function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  return { verifier, challenge };
}

// Make HTTP request to Dropbox
function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`Request failed: ${res.statusCode} - ${body}`));
        }
      });
    });
    
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// Exchange authorization code for tokens
async function exchangeCodeForToken(code, verifier, appKey, appSecret) {
  const params = new URLSearchParams({
    code,
    grant_type: 'authorization_code',
    client_id: appKey,
    client_secret: appSecret,
    redirect_uri: REDIRECT_URI,
    code_verifier: verifier
  });

  const options = {
    hostname: 'api.dropbox.com',
    path: '/oauth2/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(params.toString())
    }
  };

  return await makeRequest(options, params.toString());
}

// Save tokens to file and .env
async function saveTokens(tokens, appKey, appSecret) {
  // Save to JSON file
  const tokenData = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: tokens.expires_in,
    created_at: new Date().toISOString()
  };
  
  await fs.writeFile('.dropbox-tokens.json', JSON.stringify(tokenData, null, 2));
  console.log('✅ Tokens saved to .dropbox-tokens.json');
  
  // Update .env file
  const envPath = '.env';
  let envContent = '';
  
  try {
    envContent = await fs.readFile(envPath, 'utf-8');
  } catch (e) {
    // File doesn't exist, create new
  }
  
  const envLines = envContent.split('\n').filter(line => 
    !line.startsWith('DROPBOX_APP_KEY=') &&
    !line.startsWith('DROPBOX_APP_SECRET=') &&
    !line.startsWith('DROPBOX_ACCESS_TOKEN=') &&
    !line.startsWith('DROPBOX_REFRESH_TOKEN=') &&
    line.trim()
  );
  
  envLines.push(`DROPBOX_APP_KEY=${appKey}`);
  envLines.push(`DROPBOX_APP_SECRET=${appSecret}`);
  envLines.push(`DROPBOX_ACCESS_TOKEN=${tokens.access_token}`);
  envLines.push(`DROPBOX_REFRESH_TOKEN=${tokens.refresh_token}`);
  
  await fs.writeFile(envPath, envLines.join('\n') + '\n');
  console.log('✅ .env file updated');
}

// Main setup function
async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

  console.log('🔐 Dropbox OAuth Setup');
  console.log('======================');
  console.log('You\'ll need your Dropbox App Key and App Secret from:');
  console.log('https://www.dropbox.com/developers/apps');
  console.log('');

  const appKey = await question('Enter your Dropbox App Key: ');
  const appSecret = await question('Enter your Dropbox App Secret: ');

  // Generate PKCE
  const { verifier, challenge } = generatePKCE();

  // Build authorization URL
  const authParams = new URLSearchParams({
    response_type: 'code',
    client_id: appKey,
    redirect_uri: REDIRECT_URI,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    token_access_type: 'offline'
  });

  const authUrl = `https://www.dropbox.com/oauth2/authorize?${authParams}`;

  console.log('\n📝 Visit this URL to authorize the app:');
  console.log(authUrl);
  console.log('\nWaiting for authorization...');

  // Start local server to receive callback
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    
    if (url.pathname === '/callback') {
      const code = url.searchParams.get('code');
      
      if (code) {
        try {
          // Exchange code for tokens
          const tokens = await exchangeCodeForToken(code, verifier, appKey, appSecret);
          
          // Save tokens
          await saveTokens(tokens, appKey, appSecret);
          
          // Send success response
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
                <h1 style="color: #4CAF50;">✅ Success!</h1>
                <p>Dropbox authentication completed successfully.</p>
                <p>You can close this window and return to your terminal.</p>
              </body>
            </html>
          `);
          
          console.log('\n✅ Authentication successful!');
          console.log('Access token and refresh token have been saved.');
          console.log('\nYou can now use these tokens with the Whoop Obsidian Sync Action.');
          console.log('\nAdd these secrets to your GitHub repository:');
          console.log('  - DROPBOX_APP_KEY');
          console.log('  - DROPBOX_APP_SECRET');
          console.log('  - DROPBOX_ACCESS_TOKEN');
          console.log('  - DROPBOX_REFRESH_TOKEN');
          
          // Close server
          setTimeout(() => {
            server.close();
            rl.close();
            process.exit(0);
          }, 1000);
        } catch (error) {
          console.error('❌ Error exchanging code for token:', error.message);
          res.writeHead(500);
          res.end('Authentication failed');
        }
      } else {
        res.writeHead(400);
        res.end('No authorization code received');
      }
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  server.listen(8888, () => {
    console.log('Local server listening on http://localhost:8888');
  });
}

// Run the setup
if (require.main === module) {
  main().catch(error => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
}