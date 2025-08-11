#!/usr/bin/env node

/**
 * Test the complete sync workflow
 */

require('dotenv').config();

// Set up environment variables for the sync script
process.env.INPUT_WHOOP_CLIENT_ID = process.env.WHOOP_CLIENT_ID;
process.env.INPUT_WHOOP_CLIENT_SECRET = process.env.WHOOP_CLIENT_SECRET;
process.env.INPUT_WHOOP_REFRESH_TOKEN = process.env.WHOOP_REFRESH_TOKEN;
process.env.INPUT_WHOOP_REDIRECT_URI = process.env.WHOOP_REDIRECT_URI || 'http://localhost:3000/api/auth/callback';

// For testing, we'll skip Dropbox for now
process.env.INPUT_DROPBOX_APP_KEY = 'test';
process.env.INPUT_DROPBOX_APP_SECRET = 'test';
process.env.INPUT_DROPBOX_ACCESS_TOKEN = 'test';
process.env.INPUT_DROPBOX_REFRESH_TOKEN = 'test';

process.env.INPUT_DAYS_BACK = '1';
process.env.INPUT_DEBUG = 'true';

// Mock the Dropbox client for testing
const DropboxClient = require('./src/lib/dropbox-client');

// Override the Dropbox client methods for testing
DropboxClient.prototype.testConnection = async function() {
  console.log('[MOCK] Dropbox connection test - returning true');
  return true;
};

DropboxClient.prototype.uploadFile = async function(path, content) {
  console.log(`[MOCK] Would upload file to: ${path}`);
  console.log(`[MOCK] Content length: ${content.length} characters`);
  return true;
};

// Run the main sync
const main = require('./src/index');
main().catch(console.error);