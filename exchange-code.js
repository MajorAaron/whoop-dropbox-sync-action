const https = require('https');
require('dotenv').config();

const code = 'Bt_fiwgTf4-cZcN-ovqGhv4ulz7alJcj4ayRh9Ahv2c.KkugGj0VUEoIdwTC7fYCGADjlqz9jW3Hwkpjk1BWXBY';

async function exchangeCodeForTokens() {
  const data = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    client_id: process.env.WHOOP_CLIENT_ID,
    client_secret: process.env.WHOOP_CLIENT_SECRET,
    redirect_uri: process.env.WHOOP_REDIRECT_URI || 'http://localhost:3000/api/auth/callback'
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
    await execAsync(`gh secret set WHOOP_REFRESH_TOKEN --body "${refreshToken}" --repo aarongmajor/whoop-dropbox-sync-action`);
    console.log('✅ GitHub secret updated!');
  } catch (error) {
    console.error('Failed to update GitHub secret:', error.message);
  }
}

async function main() {
  console.log('🔄 Exchanging authorization code for tokens...\n');
  
  try {
    const tokens = await exchangeCodeForTokens();
    
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
      console.log('Response:', tokens);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);