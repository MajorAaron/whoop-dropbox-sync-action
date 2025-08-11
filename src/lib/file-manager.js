/**
 * File Manager
 * Handles file system operations for saving Obsidian notes
 */

const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class FileManager {
  constructor(basePath = 'WHOOP') {
    // Support both relative and absolute paths
    // If OUTPUT_PATH env var is set, it takes precedence
    const outputPath = process.env.OUTPUT_PATH || basePath;
    
    // If the path is relative, resolve it from the current working directory
    if (path.isAbsolute(outputPath)) {
      this.basePath = path.join(outputPath, 'WHOOP');
    } else {
      this.basePath = path.resolve(process.cwd(), outputPath);
    }
    
    this.notesCreated = 0;
    logger.debug(`FileManager initialized with base path: ${this.basePath}`);
  }

  /**
   * Ensure a directory exists, create if it doesn't
   */
  async ensureDirectory(dirPath) {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
      logger.debug(`Created directory: ${dirPath}`);
    }
  }

  /**
   * Save a daily note to the file system
   */
  async saveNote(date, content) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const monthName = date.toLocaleDateString('en-US', { month: 'long' });
    const day = String(date.getDate()).padStart(2, '0');
    
    // Build the directory path
    const dirPath = path.join(
      this.basePath, 
      'Daily', 
      String(year), 
      `${month}-${monthName}`
    );
    
    // Ensure directory exists
    await this.ensureDirectory(dirPath);
    
    // Create file path
    const fileName = `${year}-${month}-${day}.md`;
    const filePath = path.join(dirPath, fileName);
    
    // Check if file already exists
    let action = 'Created';
    try {
      await fs.access(filePath);
      action = 'Updated';
    } catch {
      // File doesn't exist, will be created
    }
    
    // Write the file
    await fs.writeFile(filePath, content, 'utf8');
    logger.success(`${action} note for ${year}-${month}-${day}`);
    this.notesCreated++;
    
    return filePath;
  }

  /**
   * Save README file in the base directory
   */
  async saveReadme(content) {
    const readmePath = path.join(this.basePath, 'README.md');
    
    // Ensure base directory exists
    await this.ensureDirectory(this.basePath);
    
    // Write README
    await fs.writeFile(readmePath, content, 'utf8');
    logger.info('Updated README.md');
    
    return readmePath;
  }

  /**
   * Get the count of notes created/updated
   */
  getNotesCreated() {
    return this.notesCreated;
  }

  /**
   * Check if a note exists for a given date
   */
  async noteExists(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const monthName = date.toLocaleDateString('en-US', { month: 'long' });
    const day = String(date.getDate()).padStart(2, '0');
    
    const fileName = `${year}-${month}-${day}.md`;
    const filePath = path.join(
      this.basePath,
      'Daily',
      String(year),
      `${month}-${monthName}`,
      fileName
    );
    
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List all notes in the directory
   */
  async listNotes() {
    const dailyPath = path.join(this.basePath, 'Daily');
    const notes = [];
    
    try {
      const years = await fs.readdir(dailyPath);
      
      for (const year of years) {
        const yearPath = path.join(dailyPath, year);
        const stat = await fs.stat(yearPath);
        
        if (stat.isDirectory()) {
          const months = await fs.readdir(yearPath);
          
          for (const month of months) {
            const monthPath = path.join(yearPath, month);
            const monthStat = await fs.stat(monthPath);
            
            if (monthStat.isDirectory()) {
              const files = await fs.readdir(monthPath);
              
              for (const file of files) {
                if (file.endsWith('.md')) {
                  notes.push(path.join(monthPath, file));
                }
              }
            }
          }
        }
      }
    } catch (error) {
      logger.debug('Error listing notes:', error.message);
    }
    
    return notes;
  }
}

module.exports = FileManager;