#!/usr/bin/env node

/**
 * Whoop to Obsidian Sync Action
 * Main entry point for the GitHub Action
 */

const WhoopClient = require('./lib/whoop-client');
const ObsidianFormatter = require('./lib/obsidian-formatter');
const FileManager = require('./lib/file-manager');
const logger = require('./utils/logger');

/**
 * Get input from GitHub Action or environment variable
 */
function getInput(name, defaultValue = '') {
  const actionInput = process.env[`INPUT_${name.toUpperCase()}`];
  const envVar = process.env[name.toUpperCase()];
  return actionInput || envVar || defaultValue;
}

/**
 * Main function
 */
async function main() {
  try {
    logger.info('🚀 Starting Whoop to Obsidian Sync Action');
    
    // Get inputs
    const clientId = getInput('whoop_client_id');
    const clientSecret = getInput('whoop_client_secret');
    const refreshToken = getInput('whoop_refresh_token');
    const redirectUri = getInput('whoop_redirect_uri', 'http://localhost:3000/api/auth/callback');
    const daysBack = parseInt(getInput('days_back', '7'));
    const outputPath = getInput('output_path', 'WHOOP');
    const createReadme = getInput('create_readme', 'true') === 'true';
    const debug = getInput('debug', 'false') === 'true';
    
    // Validate required inputs
    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error('Missing required inputs: whoop_client_id, whoop_client_secret, or whoop_refresh_token');
    }
    
    if (debug) {
      logger.debug('Debug mode enabled');
      logger.debug(`Days back: ${daysBack}`);
      logger.debug(`Output path: ${outputPath}`);
      logger.debug(`Redirect URI: ${redirectUri}`);
    }
    
    // Initialize components
    const whoopClient = new WhoopClient(clientId, clientSecret, refreshToken, redirectUri);
    const formatter = new ObsidianFormatter();
    const fileManager = new FileManager(outputPath);
    
    // Fetch data from Whoop
    logger.info(`📅 Fetching Whoop data for the last ${daysBack} days...`);
    const data = await whoopClient.fetchAllData(daysBack);
    
    // Log summary
    logger.info('📊 Fetched data summary:');
    logger.info(`  - ${data.sleep.length} sleep records`);
    logger.info(`  - ${data.recovery.length} recovery records`);
    logger.info(`  - ${data.cycles.length} cycle records`);
    logger.info(`  - ${data.workouts.length} workout records`);
    logger.info(`  - ${data.bodyMeasurements.length} body measurements`);
    
    // Log user info if available
    if (data.profile) {
      logger.info(`👤 User: ${data.profile.first_name} ${data.profile.last_name}`);
    }
    
    // Process and save notes for each day
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    
    let notesCreated = 0;
    const processedDates = [];
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const currentDate = new Date(d);
      
      // Check if we have any data for this date
      const { mainSleep } = formatter.getSleepForDate(data.sleep, currentDate);
      const recovery = formatter.getRecoveryForDate(data.recovery, currentDate);
      const cycle = formatter.getCycleForDate(data.cycles, currentDate);
      const workouts = formatter.getWorkoutsForDate(data.workouts, currentDate);
      
      if (mainSleep || recovery || cycle || workouts.length > 0) {
        const noteContent = formatter.createDailyNote(currentDate, data);
        await fileManager.saveNote(currentDate, noteContent);
        notesCreated++;
        processedDates.push(currentDate.toISOString().split('T')[0]);
      } else {
        logger.debug(`No data for ${currentDate.toISOString().split('T')[0]}, skipping...`);
      }
    }
    
    // Create README if requested
    if (createReadme) {
      const readmeContent = formatter.createReadme(new Date(), {
        sleepRecords: data.sleep.length,
        recoveryRecords: data.recovery.length,
        workoutRecords: data.workouts.length,
        notesCreated
      });
      await fileManager.saveReadme(readmeContent);
    }
    
    // Set outputs
    logger.setOutput('notes_created', notesCreated);
    logger.setOutput('sleep_records', data.sleep.length);
    logger.setOutput('recovery_records', data.recovery.length);
    logger.setOutput('workout_records', data.workouts.length);
    
    // Check for new refresh token
    const newRefreshToken = whoopClient.getNewRefreshToken();
    if (newRefreshToken) {
      logger.warning('⚠️ Refresh token was updated! Update your WHOOP_REFRESH_TOKEN secret with the new value.');
      logger.setOutput('new_refresh_token', newRefreshToken);
    }
    
    // Create sync summary
    const syncSummary = `Synced ${notesCreated} notes (${data.sleep.length} sleep, ${data.recovery.length} recovery, ${data.workouts.length} workouts)`;
    logger.setOutput('sync_summary', syncSummary);
    
    // Success message
    logger.success(`✅ Sync completed! Created/updated ${notesCreated} notes.`);
    
    if (processedDates.length > 0) {
      logger.info(`📝 Processed dates: ${processedDates.slice(0, 5).join(', ')}${processedDates.length > 5 ? ` and ${processedDates.length - 5} more` : ''}`);
    }
    
  } catch (error) {
    logger.error('❌ Sync failed:', error.message);
    if (getInput('debug', 'false') === 'true') {
      console.error(error.stack);
    }
    logger.setFailed(error.message);
  }
}

// Run if this is the main module
if (require.main === module) {
  main();
}

module.exports = main;