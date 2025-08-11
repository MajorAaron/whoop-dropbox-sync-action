#!/usr/bin/env node

const https = require('https');
const querystring = require('querystring');
const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const code = 'ViM82BOy_nGFBLj3jurMFW0iZhs4AtgpziQFVNFnfL8.ecEFb5pAIvQH9rIJmvcbaZKxexl0cMN_kUCrsDajGHs';
const clientId = 'b64d5aa5-70ee-4082-bc40-6044890871e3';
const clientSecret = 'da62fe4a2c0674c3a563296e494b5217e42247979b60508ca4b38bd574e29dac';
const redirectUri = 'http://localhost:3000/api/auth/callback';

console.log('Exchanging authorization code for tokens...\n');

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

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', async () => {
    try {
      const tokens = JSON.parse(data);
      
      if (tokens.refresh_token) {
        console.log('=== SUCCESS! ===\n');
        console.log('Access Token:', tokens.access_token.substring(0, 50) + '...');
        console.log('Refresh Token:', tokens.refresh_token);
        console.log('Expires In:', tokens.expires_in, 'seconds');
        console.log('Scope:', tokens.scope);
        console.log('');
        
        // Save to .env
        const envContent = `WHOOP_CLIENT_ID=${clientId}
WHOOP_CLIENT_SECRET=${clientSecret}
WHOOP_REFRESH_TOKEN=${tokens.refresh_token}
WHOOP_REDIRECT_URI=${redirectUri}`;
        
        fs.writeFileSync('.env', envContent);
        console.log('✅ Saved to .env file\n');
        
        // Update GitHub secrets
        console.log('Updating GitHub secrets...');
        try {
          const repo = process.env.GITHUB_REPOSITORY || 'aaronmajor/whoop-obsidian-sync-action';
          await execAsync(`gh secret set WHOOP_REFRESH_TOKEN --body "${tokens.refresh_token}" --repo ${repo}`);
          console.log(`✅ GitHub secret updated for ${repo}\n`);
        } catch (e) {
          console.log('⚠️  Could not update GitHub secret automatically\n');
        }
        
        console.log('Now testing refresh with the new token...\n');
        process.exit(0);
      } else {
        console.error('❌ Error in response:', data);
        process.exit(1);
      }
    } catch (e) {
      console.error('❌ Error:', e.message);
      console.error('Response:', data);
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request error:', e);
  process.exit(1);
});

req.write(tokenData);
req.end();