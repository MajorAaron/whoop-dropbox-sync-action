/**
 * File Manager
 * Handles file operations for saving markdown notes to Dropbox
 */

const path = require('path');
const logger = require('../utils/logger');

class FileManager {
  constructor(dropboxClient, basePath = '/WHOOP') {
    this.dropboxClient = dropboxClient;
    this.basePath = basePath; // Dropbox path always starts with /
    this.notesCreated = 0;
    logger.debug(`FileManager initialized with Dropbox base path: ${this.basePath}`);
  }

  /**
   * Ensure a directory exists in Dropbox, create if it doesn't
   */
  async ensureDirectory(dirPath) {
    await this.dropboxClient.createFolder(dirPath);
  }

  /**
   * Save a daily note to Dropbox
   */
  async saveNote(date, content) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const monthName = date.toLocaleDateString('en-US', { month: 'long' });
    const day = String(date.getDate()).padStart(2, '0');
    
    // Build the Dropbox path (using forward slashes)
    const dirPath = `${this.basePath}/Daily/${year}/${month}-${monthName}`;
    
    // Ensure directory structure exists in Dropbox
    await this.dropboxClient.ensurePathExists(dirPath + '/dummy.md');
    
    // Create file path
    const fileName = `${year}-${month}-${day}.md`;
    const filePath = `${dirPath}/${fileName}`;
    
    // Upload the file to Dropbox
    try {
      await this.dropboxClient.uploadFile(filePath, content);
      logger.success(`Uploaded note to Dropbox: ${fileName}`);
      this.notesCreated++;
    } catch (error) {
      logger.error(`Failed to upload note for ${year}-${month}-${day}: ${error.message}`);
      throw error;
    }
    
    return filePath;
  }

  /**
   * Save README file in the base directory
   */
  async saveReadme(content) {
    const readmePath = `${this.basePath}/README.md`;
    
    // Ensure base directory exists
    await this.dropboxClient.createFolder(this.basePath);
    
    // Upload README to Dropbox
    try {
      await this.dropboxClient.uploadFile(readmePath, content);
      logger.info('Updated README.md in Dropbox');
    } catch (error) {
      logger.error(`Failed to upload README: ${error.message}`);
      throw error;
    }
    
    return readmePath;
  }

  /**
   * Get the count of notes created/updated
   */
  getNotesCreated() {
    return this.notesCreated;
  }

  /**
   * Check if a note exists for a given date (not implemented for Dropbox)
   */
  async noteExists(date) {
    // For Dropbox, we'll just overwrite if it exists
    // Could implement a metadata check if needed
    return false;
  }

  /**
   * List all notes in Dropbox (not implemented - not needed for sync)
   */
  async listNotes() {
    // This functionality is not needed for the sync operation
    // Could implement using dropboxClient.listFolder if needed
    return [];
  }
}

module.exports = FileManager;