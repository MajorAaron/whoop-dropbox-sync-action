#!/usr/bin/env node

/**
 * Whoop OAuth Token Helper - Flexible Version
 * 
 * This script helps you obtain a fresh refresh token for the Whoop API
 * Works with any redirect URI configuration
 */

const http = require('http');
const https = require('https');
const url = require('url');
const querystring = require('querystring');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function prompt(question, defaultValue = '') {
  return new Promise((resolve) => {
    const questionWithDefault = defaultValue ? `${question} [${defaultValue}]: ` : `${question}: `;
    rl.question(questionWithDefault, (answer) => {
      resolve(answer || defaultValue);
    });
  });
}

async function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  const config = {};
  
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        config[key.trim()] = valueParts.join('=').trim();
      }
    });
  }
  
  return config;
}

async function updateGitHubSecrets(clientId, clientSecret, refreshToken) {
  console.log('\n=== Updating GitHub Secrets ===');
  
  // Ask for repository
  const defaultRepo = process.env.GITHUB_REPOSITORY || 'aaronmajor/whoop-obsidian-sync-action';
  const repo = await prompt(`Enter your GitHub repository`, defaultRepo);
  
  try {
    // Check if gh CLI is installed
    await execAsync('which gh');
    
    console.log('\nUpdating secrets in repository:', repo);
    
    // Update each secret
    await execAsync(`gh secret set WHOOP_CLIENT_ID --body "${clientId}" --repo ${repo}`);
    console.log('✅ WHOOP_CLIENT_ID updated');
    
    await execAsync(`gh secret set WHOOP_CLIENT_SECRET --body "${clientSecret}" --repo ${repo}`);
    console.log('✅ WHOOP_CLIENT_SECRET updated');
    
    await execAsync(`gh secret set WHOOP_REFRESH_TOKEN --body "${refreshToken}" --repo ${repo}`);
    console.log('✅ WHOOP_REFRESH_TOKEN updated');
    
    console.log('\n✅ All GitHub secrets updated successfully!');
    console.log(`View at: https://github.com/${repo}/settings/secrets/actions\n`);
    
    return true;
  } catch (error) {
    if (error.message.includes('which gh')) {
      console.log('\n⚠️  GitHub CLI not installed.');
      console.log('Install it with: brew install gh');
      console.log('Or manually add these secrets at:');
      console.log(`https://github.com/${repo}/settings/secrets/actions\n`);
    } else if (error.message.includes('gh secret set')) {
      console.log('\n⚠️  Failed to update GitHub secrets.');
      console.log('Make sure you are logged in to GitHub CLI:');
      console.log('Run: gh auth login\n');
      console.log('Or manually add these secrets at:');
      console.log(`https://github.com/${repo}/settings/secrets/actions\n`);
    } else {
      console.log('\n⚠️  Error updating GitHub secrets:', error.message);
    }
    return false;
  }
}

async function main() {
  console.log('=== Whoop OAuth Token Helper ===\n');
  
  // Load existing .env file if present
  const envConfig = await loadEnvFile();
  
  // Get credentials with defaults from .env
  const clientId = await prompt('Enter your Whoop Client ID', envConfig.WHOOP_CLIENT_ID || '');
  const clientSecret = await prompt('Enter your Whoop Client Secret', envConfig.WHOOP_CLIENT_SECRET || '');
  
  console.log('\n📌 Redirect URI Configuration');
  console.log('Your Whoop app must be configured with one of these redirect URIs:');
  console.log('1. http://localhost:3000/api/auth/callback (original project)');
  console.log('2. http://localhost:8080/callback (GitHub Action default)');
  console.log('3. Custom URI');
  
  const redirectChoice = await prompt('Choose option (1/2/3)', '1');
  
  let redirectUri;
  let port;
  let callbackPath;
  
  if (redirectChoice === '1') {
    redirectUri = 'http://localhost:3000/api/auth/callback';
    port = 3000;
    callbackPath = '/api/auth/callback';
  } else if (redirectChoice === '2') {
    redirectUri = 'http://localhost:8080/callback';
    port = 8080;
    callbackPath = '/callback';
  } else {
    redirectUri = await prompt('Enter custom redirect URI', envConfig.WHOOP_REDIRECT_URI || '');
    const parsedUri = url.parse(redirectUri);
    port = parsedUri.port || 80;
    callbackPath = parsedUri.pathname;
  }
  
  console.log(`\n✅ Using redirect URI: ${redirectUri}`);
  
  // Generate authorization URL
  const authUrl = `https://api.prod.whoop.com/oauth/oauth2/auth?` + querystring.stringify({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'read:recovery read:cycles read:sleep read:workout read:profile read:body_measurement offline',
    state: 'auth_' + Date.now()
  });
  
  console.log('\n📌 Authorization Steps:');
  console.log('1. Open this URL in your browser:');
  console.log(`\n${authUrl}\n`);
  console.log('2. Log in to Whoop and authorize the application');
  console.log('3. You will be redirected to a localhost page\n');
  
  // Start local server to catch the callback
  const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    
    if (parsedUrl.pathname === callbackPath) {
      const code = parsedUrl.query.code;
      const error = parsedUrl.query.error;
      
      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`<h1>❌ Authorization Error</h1><p>Error: ${error}</p><p>Description: ${parsedUrl.query.error_description || 'Unknown error'}</p>`);
        console.error(`\n❌ Authorization error: ${error}`);
        if (parsedUrl.query.error_description) {
          console.error(`Description: ${parsedUrl.query.error_description}`);
        }
        server.close();
        rl.close();
        process.exit(1);
      }
      
      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>✅ Authorization successful!</h1><p>You can close this window and return to the terminal.</p>');
        
        console.log('✅ Authorization code received!\n');
        console.log('Exchanging code for tokens...\n');
        
        // Exchange code for tokens
        const tokenData = querystring.stringify({
          grant_type: 'authorization_code',
          code: code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri
        });
        
        const options = {
          hostname: 'api.prod.whoop.com',
          path: '/oauth/oauth2/token',
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': tokenData.length
          }
        };
        
        const tokenReq = https.request(options, (tokenRes) => {
          let data = '';
          
          tokenRes.on('data', (chunk) => {
            data += chunk;
          });
          
          tokenRes.on('end', () => {
            try {
              const tokens = JSON.parse(data);
              
              if (tokens.refresh_token) {
                console.log('=== SUCCESS! ===\n');
                console.log('Your new refresh token:');
                console.log(`\n${tokens.refresh_token}\n`);
                
                // Save to .env file
                const envContent = [
                  `WHOOP_CLIENT_ID=${clientId}`,
                  `WHOOP_CLIENT_SECRET=${clientSecret}`,
                  `WHOOP_REFRESH_TOKEN=${tokens.refresh_token}`,
                  `WHOOP_REDIRECT_URI=${redirectUri}`,
                  ''
                ].join('\n');
                
                fs.writeFileSync(path.join(__dirname, '.env'), envContent);
                console.log('✅ Saved credentials to .env file\n');
                
                // Update GitHub secrets
                updateGitHubSecrets(clientId, clientSecret, tokens.refresh_token).then((success) => {
                  if (!success) {
                    console.log('=== Manual Configuration Required ===');
                    console.log('Add these to your repository secrets:');
                    console.log(`WHOOP_CLIENT_ID: ${clientId}`);
                    console.log(`WHOOP_CLIENT_SECRET: ${clientSecret}`);
                    console.log(`WHOOP_REFRESH_TOKEN: ${tokens.refresh_token}`);
                  }
                  
                  console.log('\n=== Test Your Setup ===');
                  console.log('Run this command to test:');
                  console.log('node test-oauth.js\n');
                  
                  server.close();
                  rl.close();
                  process.exit(0);
                });
              } else {
                console.error('❌ Error: No refresh token received');
                console.error('Response:', data);
                console.error('\nMake sure your Whoop app has the "offline" scope enabled.');
                server.close();
                rl.close();
                process.exit(1);
              }
            } catch (e) {
              console.error('❌ Error parsing token response:', e);
              console.error('Response:', data);
              server.close();
              rl.close();
              process.exit(1);
            }
          });
        });
        
        tokenReq.on('error', (e) => {
          console.error('❌ Error exchanging code for tokens:', e);
          server.close();
          rl.close();
          process.exit(1);
        });
        
        tokenReq.write(tokenData);
        tokenReq.end();
      } else {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>❌ Error: No authorization code received</h1>');
        console.error('❌ No authorization code received');
        server.close();
        rl.close();
        process.exit(1);
      }
    } else {
      // Handle any other paths
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 - Not Found</h1>');
    }
  });
  
  server.listen(port, () => {
    console.log(`🚀 Local server listening on http://localhost:${port}\n`);
    console.log('Waiting for authorization callback...\n');
  });
  
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${port} is already in use!`);
      console.error('Please close any other applications using this port and try again.');
    } else {
      console.error('❌ Server error:', err);
    }
    rl.close();
    process.exit(1);
  });
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});