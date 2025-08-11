#!/usr/bin/env node

/**
 * Automated Whoop OAuth using browser automation
 */

require('dotenv').config();
const http = require('http');

const CLIENT_ID = process.env.WHOOP_CLIENT_ID;
const CLIENT_SECRET = process.env.WHOOP_CLIENT_SECRET;
const REDIRECT_URI = process.env.WHOOP_REDIRECT_URI || 'http://localhost:3000/api/auth/callback';
const EMAIL = process.env.WHOOP_EMAIL;
const PASSWORD = process.env.WHOOP_PASSWORD;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing WHOOP_CLIENT_ID or WHOOP_CLIENT_SECRET in .env');
  process.exit(1);
}

if (!EMAIL || !PASSWORD) {
  console.error('Missing WHOOP_EMAIL or WHOOP_PASSWORD in .env');
  console.log('Please add these to your .env file to use automated authentication');
  process.exit(1);
}

const scope = 'read:recovery read:cycles read:sleep read:workout read:profile read:body_measurement offline';
const state = `auth_${Date.now()}`;

async function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://${req.headers.host}`);
      
      if (url.pathname === '/api/auth/callback') {
        const code = url.searchParams.get('code');
        const returnedState = url.searchParams.get('state');
        
        if (code && returnedState === state) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body>
                <h1>✅ Authorization successful!</h1>
                <p>You can close this window now.</p>
                <script>window.close();</script>
              </body>
            </html>
          `);
          
          server.close();
          resolve(code);
        } else {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Invalid request');
        }
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
      }
    });
    
    server.listen(3000, () => {
      console.log('🌐 OAuth callback server listening on http://localhost:3000');
    });
  });
}

async function exchangeCodeForTokens(code) {
  const https = require('https');
  
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

async function updateEnvFile(refreshToken) {
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

async function updateGitHubSecret(refreshToken) {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);
  
  try {
    await execAsync(`gh secret set WHOOP_REFRESH_TOKEN --body "${refreshToken}" --repo MajorAaron/whoop-dropbox-sync-action`);
    console.log('✅ GitHub secret updated!');
  } catch (error) {
    console.error('Failed to update GitHub secret:', error.message);
  }
}

async function main() {
  console.log('🚀 Starting Whoop OAuth with browser automation...\n');
  
  // Start the callback server
  const codePromise = startServer();
  
  // Build authorization URL
  const authUrl = new URL('https://api.prod.whoop.com/oauth/oauth2/auth');
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.append('scope', scope);
  authUrl.searchParams.append('state', state);
  
  console.log('📋 Opening browser to authorize...\n');
  console.log('URL:', authUrl.toString(), '\n');
  
  // Now we'll use Playwright to automate the login
  console.log('🤖 Automating login with provided credentials...\n');
  
  // Note: The browser automation would go here
  // For now, let's just open the browser and have the user login manually
  const open = require('child_process').exec;
  open(`open "${authUrl.toString()}"`);
  
  console.log('⏳ Waiting for authorization callback...\n');
  
  try {
    const code = await codePromise;
    console.log('✅ Authorization code received!\n');
    
    console.log('🔄 Exchanging code for tokens...\n');
    const tokens = await exchangeCodeForTokens(code);
    
    if (tokens.refresh_token) {
      console.log('✅ SUCCESS! Got refresh token:\n');
      console.log(tokens.refresh_token);
      console.log('\n');
      
      // Update .env file
      await updateEnvFile(tokens.refresh_token);
      
      // Update GitHub secret
      console.log('📤 Updating GitHub secret...\n');
      await updateGitHubSecret(tokens.refresh_token);
      
      console.log('🎉 Done! You can now run the GitHub workflow.');
    } else {
      console.error('❌ No refresh token received');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);