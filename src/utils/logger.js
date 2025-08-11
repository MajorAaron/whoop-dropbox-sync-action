/**
 * Logger utility for consistent logging across the action
 */

// Only require @actions/core if we're in a GitHub Actions environment
let core;
try {
  if (process.env.GITHUB_ACTIONS) {
    core = require('@actions/core');
  }
} catch (e) {
  // Not in GitHub Actions environment
}

class Logger {
  constructor() {
    this.debugMode = process.env.INPUT_DEBUG === 'true' || process.env.DEBUG === 'true';
  }

  debug(...args) {
    if (this.debugMode) {
      const message = args.join(' ');
      if (process.env.GITHUB_ACTIONS && core) {
        core.debug(message);
      } else {
        console.log('[DEBUG]', message);
      }
    }
  }

  info(...args) {
    const message = args.join(' ');
    if (process.env.GITHUB_ACTIONS && core) {
      core.info(message);
    } else {
      console.log('[INFO]', message);
    }
  }

  error(...args) {
    const message = args.join(' ');
    if (process.env.GITHUB_ACTIONS && core) {
      core.error(message);
    } else {
      console.error('[ERROR]', message);
    }
  }

  warning(...args) {
    const message = args.join(' ');
    if (process.env.GITHUB_ACTIONS && core) {
      core.warning(message);
    } else {
      console.warn('[WARNING]', message);
    }
  }

  success(...args) {
    const message = '✅ ' + args.join(' ');
    if (process.env.GITHUB_ACTIONS && core) {
      core.info(message);
    } else {
      console.log(message);
    }
  }

  setOutput(name, value) {
    if (process.env.GITHUB_ACTIONS) {
      // Use both methods for compatibility
      if (core) {
        core.setOutput(name, value);
      }
      // Also use the new GITHUB_OUTPUT method
      const outputFile = process.env.GITHUB_OUTPUT;
      if (outputFile) {
        const fs = require('fs');
        fs.appendFileSync(outputFile, `${name}=${value}\n`);
      }
    } else {
      console.log(`Output: ${name}=${value}`);
    }
  }

  setFailed(message) {
    if (process.env.GITHUB_ACTIONS && core) {
      core.setFailed(message);
    } else {
      console.error(`[FAILED] ${message}`);
      process.exit(1);
    }
  }
}

module.exports = new Logger();