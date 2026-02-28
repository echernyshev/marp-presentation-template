// cli/utils/prompt-utils.js
/**
 * Prompt utilities for meta-package CLI commands
 * These functions are NOT copied to generated projects
 */
const readline = require('readline');

/**
 * Ask user if they want to create example slides
 * @returns {Promise<boolean>} True if user wants examples
 */
async function askCreateExamples() {
  return new Promise((resolve) => {
    // Interactive mode - ask user
    if (process.stdin.isTTY) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      rl.question('Create example slides file? (Y/n) ', (answer) => {
        rl.close();
        const normalized = answer.toLowerCase().trim();
        resolve(normalized !== 'n' && normalized !== 'no');
      });
    } else {
      // Non-interactive mode - read from stdin if there's data
      let input = '';
      process.stdin.setEncoding('utf8');

      process.stdin.on('readable', () => {
        let chunk;
        while ((chunk = process.stdin.read()) !== null) {
          input += chunk;
        }
      });

      process.stdin.on('end', () => {
        const normalized = input.toLowerCase().trim();
        // If input is empty, create examples by default
        if (normalized === '') {
          resolve(true);
        } else {
          resolve(normalized !== 'n' && normalized !== 'no');
        }
      });

      // If stdin has no data immediately, finish
      if (process.stdin.readableLength === 0) {
        // Give a short time for data to appear
        setTimeout(() => {
          if (input === '') {
            process.stdin.destroy();
            resolve(true);
          }
        }, 10);
      }
    }
  });
}

/**
 * Ask user if they want to add themes to the project
 * @returns {Promise<boolean>} True if user wants themes
 */
async function askAddThemes() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      rl.question('Add custom themes to the project? (Y/n) ', (answer) => {
        rl.close();
        const normalized = answer.toLowerCase().trim();
        resolve(normalized !== 'n' && normalized !== 'no');
      });
    } else {
      // Non-interactive mode: default to false (don't add themes without consent)
      resolve(false);
    }
  });
}

module.exports = {
  askCreateExamples,
  askAddThemes
};
