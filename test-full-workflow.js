#!/usr/bin/env node

/**
 * Test the full workflow locally
 */

require('dotenv').config();
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function main() {
  console.log('🧪 Testing Full Workflow Locally\n');
  
  // Check environment variables
  const requiredVars = [
    'WHOOP_CLIENT_ID',
    'WHOOP_CLIENT_SECRET', 
    'WHOOP_REFRESH_TOKEN',
    'DROPBOX_APP_KEY',
    'DROPBOX_APP_SECRET',
    'DROPBOX_ACCESS_TOKEN',
    'DROPBOX_REFRESH_TOKEN'
  ];
  
  const missing = requiredVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    console.error('❌ Missing environment variables:', missing.join(', '));
    console.log('\nPlease run:');
    console.log('  1. node auto-whoop-auth.js  (for Whoop tokens)');
    console.log('  2. node setup-dropbox-auth.js  (for Dropbox tokens)');
    process.exit(1);
  }
  
  // Set additional environment variables
  process.env.WHOOP_REDIRECT_URI = process.env.WHOOP_REDIRECT_URI || 'http://localhost:3000/api/auth/callback';
  process.env.DROPBOX_PATH = '/WHOOP';
  process.env.DAYS_BACK = '1';
  
  console.log('✅ All environment variables are set\n');
  console.log('🚀 Running sync...\n');
  
  try {
    // Run the main sync
    const { stdout, stderr } = await execAsync('node src/index.js', {
      env: process.env,
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });
    
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    
    console.log('\n✅ Workflow test completed successfully!');
    
    // Check for token rotation warnings
    if (stdout.includes('Whoop refresh token was updated') || stdout.includes('new_refresh_token')) {
      console.log('\n⚠️  IMPORTANT: Whoop refresh token was rotated!');
      console.log('Run: node refresh-whoop-token.js to update GitHub secrets');
    }
    
    if (stdout.includes('Dropbox refresh token rotated')) {
      console.log('\n⚠️  IMPORTANT: Dropbox tokens were refreshed!');
      console.log('The workflow should automatically update these in GitHub');
    }
    
  } catch (error) {
    console.error('\n❌ Workflow test failed:');
    console.error(error.message);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
    process.exit(1);
  }
}

main().catch(console.error);