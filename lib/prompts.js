// lib/prompts.js
const inquirer = require('@inquirer/prompts');
const { THEME_NOT_FOUND } = require('./errors');

/**
 * Interactive prompts for theme management
 */
class Prompts {
  /**
   * Prompt user to select themes from available options
   *
   * @param {Array} availableThemes - Array of {name, description} objects
   * @returns {Promise<string[]>} Array of selected theme names
   */
  static async promptThemes(availableThemes) {
    if (availableThemes.length === 0) {
      return [];
    }

    const choices = availableThemes.map(theme => ({
      name: theme.name,
      value: theme.name,
      checked: false
    }));

    return await inquirer.checkbox({
      message: 'Select themes to add:',
      choices
    });
  }

  /**
   * Prompt user to select active theme from available themes
   *
   * @param {string[]} selectedThemes - Array of available theme names
   * @returns {Promise<string>} Selected theme name
   * @throws {Error} If no themes available
   */
  static async promptActiveTheme(selectedThemes) {
    if (selectedThemes.length === 0) {
      throw new Error('No themes available');
    }

    // Return single theme if only one available
    if (selectedThemes.length === 1) {
      return selectedThemes[0];
    }

    return await inquirer.select({
      message: 'Select active theme:',
      choices: selectedThemes
    });
  }

  /**
   * Prompt user for new theme name with validation
   *
   * @returns {Promise<string>} Validated theme name
   */
  static async promptNewThemeName() {
    return await inquirer.input({
      message: 'Theme name:',
      validate: (input) => {
        if (!input || input.trim().length === 0) {
          return 'Theme name is required';
        }
        if (!/^[a-z0-9-]+$/.test(input)) {
          return 'Theme name must contain only lowercase letters, numbers, and hyphens';
        }
        return true;
      }
    });
  }

  /**
   * Prompt user to select parent theme
   *
   * @param {Array} existingThemes - Array of {name, isSystem} objects
   * @returns {Promise<string|null>} Selected parent theme name or null for none
   */
  static async promptParentTheme(existingThemes) {
    const choices = [
      { name: 'none (create from scratch)', value: null },
      new inquirer.Separator('--- System Themes ---'),
      { name: 'default (system built-in)', value: 'default' },
      { name: 'gaia (system built-in)', value: 'gaia' },
      { name: 'uncover (system built-in)', value: 'uncover' }
    ];

    // Add custom themes
    const customThemes = existingThemes.filter(t => !t.isSystem);
    if (customThemes.length > 0) {
      choices.push(new inquirer.Separator('--- Custom Themes ---'));
      customThemes.forEach(theme => {
        choices.push({ name: theme.name, value: theme.name });
      });
    }

    return await inquirer.select({
      message: 'Parent theme:',
      choices
    });
  }

  /**
   * Prompt user for directory location for new theme
   *
   * @param {Array} existingDirs - Array of existing directory names
   * @returns {Promise<string>} Selected option: 'root', 'existing', or 'new'
   */
  static async promptDirectoryLocation(existingDirs) {
    const choices = [
      { name: 'In root (themes/<name>.css)', value: 'root' }
    ];

    if (existingDirs.length > 0) {
      choices.push(new inquirer.Separator('--- Existing Folders ---'));
      existingDirs.forEach(dir => {
        choices.push({
          name: `In existing folder: themes/${dir}/`,
          value: dir
        });
      });
    }

    choices.push(new inquirer.Separator('--- New Folder ---'));
    choices.push({ name: 'In new folder (enter name)', value: 'new' });

    return await inquirer.select({
      message: 'Where to create the theme CSS file?',
      choices
    });
  }

  /**
   * Prompt user for new folder name
   *
   * @returns {Promise<string>} Folder name
   */
  static async promptNewFolderName() {
    return await inquirer.input({
      message: 'Folder name:',
      validate: (input) => {
        if (!input || input.trim().length === 0) {
          return 'Folder name is required';
        }
        if (!/^[a-z0-9-]+$/.test(input)) {
          return 'Folder name must contain only lowercase letters, numbers, and hyphens';
        }
        return true;
      }
    });
  }

  /**
   * Prompt user for conflict resolution
   *
   * @param {Array} conflicts - Array of conflicting theme names
   * @returns {Promise<string>} Selected action: 'skip', 'overwrite', 'skip-all', 'overwrite-all', or 'cancel'
   */
  static async promptConflictResolution(conflicts) {
    const isMultiple = conflicts.length > 1;

    if (isMultiple) {
      const conflictList = conflicts.map(c => `  - ${c.name}`).join('\n');
      console.log(`\n${conflicts.length} themes already exist in your project:\n${conflictList}\n`);

      return await inquirer.select({
        message: 'Apply to all conflicts?',
        choices: [
          { name: 'Skip all', value: 'skip-all' },
          { name: 'Overwrite all', value: 'overwrite-all' },
          { name: 'Choose for each', value: 'choose-each' },
          { name: 'Cancel', value: 'cancel' }
        ]
      });
    }

    const conflict = conflicts[0];
    return await inquirer.select({
      message: `Theme "${conflict.name}" already exists. What would you like to do?`,
      choices: [
        { name: 'Skip (keep existing)', value: 'skip' },
        { name: 'Overwrite (replace with template version)', value: 'overwrite' },
        { name: 'Cancel (stop adding themes)', value: 'cancel' }
      ]
    });
  }

  /**
   * Prompt user for single theme conflict resolution
   *
   * @param {string} themeName - Name of conflicting theme
   * @returns {Promise<string>} Selected action: 'skip', 'overwrite', or 'cancel'
   */
  static async promptSingleConflict(themeName) {
    return await inquirer.select({
      message: `Theme "${themeName}" already exists. What would you like to do?`,
      choices: [
        { name: 'Skip (keep existing)', value: 'skip' },
        { name: 'Overwrite (replace with template version)', value: 'overwrite' },
        { name: 'Cancel (stop adding themes)', value: 'cancel' }
      ]
    });
  }

  /**
   * Confirm action with user
   *
   * @param {string} message - Confirmation message
   * @param {boolean} defaultValue - Default value (true: yes, false: no)
   * @returns {Promise<boolean>} User's choice
   */
  static async confirm(message, defaultValue = true) {
    return await inquirer.confirm({
      message,
      default: defaultValue
    });
  }
}

module.exports = { Prompts };
