#!/usr/bin/env node

/**
 * Test Dropbox Sync
 * Tests the complete Whoop to Dropbox sync process locally
 */

require('dotenv').config();

const WhoopClient = require('./src/lib/whoop-client');
const ObsidianFormatter = require('./src/lib/obsidian-formatter');
const FileManager = require('./src/lib/file-manager');
const DropboxClient = require('./src/lib/dropbox-client');
const DropboxTokenManager = require('./src/utils/dropbox-token-manager');

async function test() {
  try {
    console.log('🧪 Testing Whoop to Dropbox Sync\n');
    
    // Check environment variables
    const requiredEnvVars = [
      'WHOOP_CLIENT_ID',
      'WHOOP_CLIENT_SECRET',
      'WHOOP_REFRESH_TOKEN',
      'DROPBOX_APP_KEY',
      'DROPBOX_APP_SECRET',
      'DROPBOX_ACCESS_TOKEN',
      'DROPBOX_REFRESH_TOKEN'
    ];
    
    const missing = requiredEnvVars.filter(v => !process.env[v]);
    if (missing.length > 0) {
      console.error('❌ Missing environment variables:', missing.join(', '));
      console.log('\nPlease run the following scripts to set up authentication:');
      console.log('  1. node get-whoop-token.js  (for Whoop tokens)');
      console.log('  2. node setup-dropbox-auth.js  (for Dropbox tokens)');
      process.exit(1);
    }
    
    // Initialize Dropbox
    console.log('📦 Initializing Dropbox client...');
    const dropboxTokenManager = new DropboxTokenManager();
    const dropboxClient = new DropboxClient(
      process.env.DROPBOX_APP_KEY,
      process.env.DROPBOX_APP_SECRET,
      process.env.DROPBOX_ACCESS_TOKEN,
      process.env.DROPBOX_REFRESH_TOKEN,
      dropboxTokenManager
    );
    
    // Test Dropbox connection
    console.log('🔗 Testing Dropbox connection...');
    const dropboxConnected = await dropboxClient.testConnection();
    if (!dropboxConnected) {
      throw new Error('Failed to connect to Dropbox');
    }
    
    // Initialize Whoop client
    console.log('\n🏃 Initializing Whoop client...');
    const whoopClient = new WhoopClient(
      process.env.WHOOP_CLIENT_ID,
      process.env.WHOOP_CLIENT_SECRET,
      process.env.WHOOP_REFRESH_TOKEN,
      process.env.WHOOP_REDIRECT_URI || 'http://localhost:3000/api/auth/callback'
    );
    
    // Fetch Whoop data for the last 3 days (for testing)
    console.log('📊 Fetching Whoop data for the last 3 days...');
    const data = await whoopClient.fetchAllData(3);
    
    console.log('\n📈 Data fetched:');
    console.log(`  - ${data.sleep.length} sleep records`);
    console.log(`  - ${data.recovery.length} recovery records`);
    console.log(`  - ${data.cycles.length} cycle records`);
    console.log(`  - ${data.workouts.length} workout records`);
    
    if (data.profile) {
      console.log(`  - User: ${data.profile.first_name} ${data.profile.last_name}`);
    }
    
    // Initialize formatter and file manager
    const formatter = new ObsidianFormatter();
    const fileManager = new FileManager(dropboxClient, '/WHOOP-TEST');
    
    // Process and upload notes
    console.log('\n📝 Processing and uploading notes to Dropbox...');
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 3);
    
    let notesUploaded = 0;
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const currentDate = new Date(d);
      
      const { mainSleep } = formatter.getSleepForDate(data.sleep, currentDate);
      const recovery = formatter.getRecoveryForDate(data.recovery, currentDate);
      const cycle = formatter.getCycleForDate(data.cycles, currentDate);
      const workouts = formatter.getWorkoutsForDate(data.workouts, currentDate);
      
      if (mainSleep || recovery || cycle || workouts.length > 0) {
        const noteContent = formatter.createDailyNote(currentDate, data);
        const filePath = await fileManager.saveNote(currentDate, noteContent);
        console.log(`  ✅ Uploaded: ${filePath}`);
        notesUploaded++;
      } else {
        console.log(`  ⏭️ No data for ${currentDate.toISOString().split('T')[0]}`);
      }
    }
    
    // Upload README
    console.log('\n📄 Uploading README.md...');
    const readmeContent = formatter.createReadme(new Date(), {
      sleepRecords: data.sleep.length,
      recoveryRecords: data.recovery.length,
      workoutRecords: data.workouts.length,
      notesCreated: notesUploaded
    });
    await fileManager.saveReadme(readmeContent);
    
    // Check for token updates
    if (whoopClient.getNewRefreshToken()) {
      console.log('\n⚠️ Whoop refresh token was rotated! Update your .env file.');
    }
    
    if (dropboxTokenManager.newRefreshToken) {
      console.log('\n⚠️ Dropbox refresh token was rotated! Update your .env file.');
    }
    
    console.log('\n✅ Test completed successfully!');
    console.log(`📊 Uploaded ${notesUploaded} notes to Dropbox at /WHOOP-TEST/`);
    console.log('\n💡 To use in production:');
    console.log('  1. Update your GitHub secrets with the Dropbox tokens');
    console.log('  2. Run the workflow manually or wait for the schedule');
    console.log('  3. Notes will be uploaded to /WHOOP/ in your Dropbox');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  test();
}