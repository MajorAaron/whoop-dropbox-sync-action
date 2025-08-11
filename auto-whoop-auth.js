#!/usr/bin/env node

const http = require('http');
const https = require('https');
const { execSync } = require('child_process');
require('dotenv').config();

const PORT = 3000;
const CLIENT_ID = process.env.WHOOP_CLIENT_ID || 'b64d5aa5-70ee-4082-bc40-6044890871e3';
const CLIENT_SECRET = process.env.WHOOP_CLIENT_SECRET || 'da62fe4a2c0674c3a563296e494b5217e42247979b60508ca4b38bd574e29dac';
const REDIRECT_URI = 'http://localhost:3000/api/auth/callback';

console.log('🚀 Starting Whoop OAuth Server...\n');

// Create authorization URL
const authUrl = `https://api.prod.whoop.com/oauth/oauth2/auth?` +
  `response_type=code&` +
  `client_id=${CLIENT_ID}&` +
  `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
  `scope=${encodeURIComponent('read:recovery read:cycles read:sleep read:workout read:profile read:body_measurement offline')}&` +
  `state=auth_${Date.now()}`;

console.log('📋 Visit this URL to authorize:\n');
console.log(authUrl);
console.log('\n⏳ Waiting for authorization callback...\n');

// Start server to receive callback
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  if (url.pathname === '/api/auth/callback') {
    const code = url.searchParams.get('code');
    
    if (code) {
      console.log('✅ Authorization code received!\n');
      
      // Exchange code for tokens
      console.log('🔄 Exchanging code for tokens...\n');
      
      const tokenData = new URLSearchParams({
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
          'Content-Length': Buffer.byteLength(tokenData.toString())
        }
      };

      const tokenReq = https.request(options, (tokenRes) => {
        let data = '';
        tokenRes.on('data', chunk => data += chunk);
        tokenRes.on('end', () => {
          try {
            const tokens = JSON.parse(data);
            
            if (tokens.refresh_token) {
              console.log('✅ SUCCESS! Got refresh token:\n');
              console.log(tokens.refresh_token);
              console.log('\n');
              
              // Update .env file
              const fs = require('fs');
              let envContent = '';
              if (fs.existsSync('.env')) {
                envContent = fs.readFileSync('.env', 'utf-8');
              }
              
              const lines = envContent.split('\n').filter(line => 
                !line.startsWith('WHOOP_REFRESH_TOKEN=')
              );
              lines.push(`WHOOP_REFRESH_TOKEN=${tokens.refresh_token}`);
              
              fs.writeFileSync('.env', lines.join('\n'));
              console.log('✅ Updated .env file\n');
              
              // Update GitHub secret
              console.log('📤 Updating GitHub secret...\n');
              try {
                execSync(`gh secret set WHOOP_REFRESH_TOKEN --body "${tokens.refresh_token}" --repo aarongmajor/whoop-dropbox-sync-action`, { stdio: 'inherit' });
                console.log('✅ GitHub secret updated!\n');
              } catch (e) {
                console.log('❌ Failed to update GitHub secret. Update manually.\n');
              }
              
              // Send success response
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(`
                <html>
                  <body style="font-family: Arial; padding: 40px; text-align: center;">
                    <h1>✅ Success!</h1>
                    <p>Authorization complete. You can close this window.</p>
                    <p>Refresh token has been saved.</p>
                  </body>
                </html>
              `);
              
              console.log('🎉 Done! You can now run the GitHub workflow.\n');
              setTimeout(() => process.exit(0), 1000);
            } else {
              throw new Error('No refresh token in response');
            }
          } catch (error) {
            console.error('❌ Error:', error.message);
            console.error('Response:', data);
            res.writeHead(500);
            res.end('Error getting tokens');
            process.exit(1);
          }
        });
      });

      tokenReq.on('error', (error) => {
        console.error('❌ Token request error:', error);
        res.writeHead(500);
        res.end('Error');
        process.exit(1);
      });

      tokenReq.write(tokenData.toString());
      tokenReq.end();
    } else {
      res.writeHead(400);
      res.end('No authorization code');
    }
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`🌐 Server listening on http://localhost:${PORT}\n`);
  
  // Try to open browser
  const open = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  try {
    execSync(`${open} "${authUrl}"`);
    console.log('🌐 Opening browser...\n');
  } catch (e) {
    console.log('⚠️  Could not open browser automatically.\n');
  }
});