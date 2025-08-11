#!/usr/bin/env node

/**
 * Whoop OAuth Token Helper
 * 
 * This script helps you obtain a fresh refresh token for the Whoop API
 * 
 * Prerequisites:
 * 1. Register an app at https://developer.whoop.com
 * 2. Set redirect URI to: http://localhost:8080/callback
 * 3. Have your Client ID and Client Secret ready
 */

const http = require('http');
const https = require('https');
const url = require('url');
const querystring = require('querystring');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  console.log('=== Whoop OAuth Token Helper ===\n');
  
  // Get credentials
  const clientId = await prompt('Enter your Whoop Client ID: ');
  const clientSecret = await prompt('Enter your Whoop Client Secret: ');
  
  const redirectUri = 'http://localhost:8080/callback';
  
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
    
    if (parsedUrl.pathname === '/callback') {
      const code = parsedUrl.query.code;
      
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
                console.log('Your new refresh token (add this to GitHub Secrets as WHOOP_REFRESH_TOKEN):');
                console.log(`\n${tokens.refresh_token}\n`);
                console.log('=== GitHub Secrets Configuration ===');
                console.log(`WHOOP_CLIENT_ID: ${clientId}`);
                console.log(`WHOOP_CLIENT_SECRET: ${clientSecret}`);
                console.log(`WHOOP_REFRESH_TOKEN: ${tokens.refresh_token}`);
                console.log('\n✅ Add these to your repository secrets at:');
                const repo = process.env.GITHUB_REPOSITORY || 'aaronmajor/whoop-obsidian-sync-action';
                console.log(`https://github.com/${repo}/settings/secrets/actions\n`);
              } else {
                console.error('❌ Error: No refresh token received');
                console.error('Response:', data);
              }
            } catch (e) {
              console.error('❌ Error parsing token response:', e);
              console.error('Response:', data);
            }
            
            server.close();
            rl.close();
            process.exit(0);
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
    }
  });
  
  server.listen(8080, () => {
    console.log('🚀 Local server listening on http://localhost:8080\n');
    console.log('Waiting for authorization callback...\n');
  });
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});