#!/usr/bin/env node

/**
 * Browser-based OAuth flow for WHOOP using Playwright
 */

require('dotenv').config();
const { chromium } = require('playwright');
const https = require('https');
const fs = require('fs');
const { execSync } = require('child_process');

const EMAIL = process.env.WHOOP_EMAIL;
const PASSWORD = process.env.WHOOP_PASSWORD;
const CLIENT_ID = process.env.WHOOP_CLIENT_ID;
const CLIENT_SECRET = process.env.WHOOP_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:3000/api/auth/callback';

if (!EMAIL || !PASSWORD) {
  console.error('❌ Missing WHOOP_EMAIL or WHOOP_PASSWORD in .env file');
  process.exit(1);
}

async function exchangeCodeForTokens(code) {
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

async function main() {
  console.log('🌐 Starting browser-based OAuth flow...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    timeout: 60000 
  });
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Build authorization URL
    const authUrl = new URL('https://api.prod.whoop.com/oauth/oauth2/auth');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('scope', 'read:recovery read:cycles read:sleep read:workout read:profile read:body_measurement offline');
    authUrl.searchParams.append('state', `auth_${Date.now()}`);
    
    console.log('📋 Navigating to WHOOP OAuth page...');
    await page.goto(authUrl.toString());
    
    // Wait for login page
    await page.waitForSelector('input[type="email"], input[name="email"], input[id="email"]', { timeout: 10000 });
    
    console.log('🔐 Entering credentials...');
    
    // Fill in email
    await page.fill('input[type="email"], input[name="email"], input[id="email"]', EMAIL);
    
    // Fill in password
    await page.fill('input[type="password"], input[name="password"], input[id="password"]', PASSWORD);
    
    // Click login button
    console.log('🔑 Logging in...');
    await page.click('button[type="submit"], input[type="submit"], button:has-text("Log in"), button:has-text("Sign in")');
    
    // Wait for redirect or authorization page
    console.log('⏳ Waiting for authorization...');
    
    // Listen for the redirect
    const codePromise = new Promise((resolve) => {
      page.on('request', request => {
        const url = request.url();
        if (url.includes(REDIRECT_URI) && url.includes('code=')) {
          const urlObj = new URL(url);
          const code = urlObj.searchParams.get('code');
          if (code) {
            resolve(code);
          }
        }
      });
    });
    
    // Also check if we need to click an authorize button
    try {
      await page.waitForSelector('button:has-text("Authorize"), button:has-text("Allow"), button:has-text("Approve")', { timeout: 5000 });
      await page.click('button:has-text("Authorize"), button:has-text("Allow"), button:has-text("Approve")');
    } catch (e) {
      // Authorization might be automatic
    }
    
    // Wait for the code
    const code = await Promise.race([
      codePromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for code')), 30000))
    ]);
    
    console.log('✅ Authorization code received!\n');
    
    // Exchange code for tokens
    console.log('🔄 Exchanging code for tokens...');
    const tokens = await exchangeCodeForTokens(code);
    
    if (tokens.refresh_token) {
      console.log('✅ SUCCESS! Got refresh token\n');
      
      // Update .env file
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
      console.log('📤 Updating GitHub secret...');
      try {
        execSync(`gh secret set WHOOP_REFRESH_TOKEN --body "${tokens.refresh_token}" --repo MajorAaron/whoop-dropbox-sync-action`, { stdio: 'inherit' });
        console.log('✅ GitHub secret updated!\n');
      } catch (e) {
        console.log('❌ Failed to update GitHub secret. Update manually.\n');
      }
      
      // Save tokens to token manager file
      const tokenData = {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
        token_type: tokens.token_type,
        scope: tokens.scope,
        updated_at: new Date().toISOString()
      };
      
      fs.writeFileSync('.whoop-tokens.json', JSON.stringify(tokenData, null, 2));
      console.log('✅ Saved tokens to .whoop-tokens.json\n');
      
      console.log('🎉 OAuth flow complete! You can now run the sync.');
    } else {
      throw new Error('No refresh token in response');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);