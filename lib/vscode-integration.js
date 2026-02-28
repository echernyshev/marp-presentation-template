// lib/vscode-integration.js
const fs = require('fs');
const path = require('path');
const { VSCodeIntegrationError } = require('./errors');

/**
 * DTO for VSCode settings structure
 * Encapsulates the settings format and provides type-safe accessors
 */
class VSCodeSettingsDTO {
  /**
   * @param {Object} settings - Raw settings object
   */
  constructor(settings = {}) {
    this._settings = settings;
  }

  /**
   * Get Marp themes array
   * Supports both flat key "markdown.marp.themes" and nested markdown.marp.themes
   * @returns {string[]} Array of theme file paths
   */
  getMarpThemes() {
    // Support both flat key and nested structure for backward compatibility
    if (this._settings['markdown.marp.themes']) {
      return this._settings['markdown.marp.themes'];
    }
    return this._settings.markdown?.marp?.themes || [];
  }

  /**
   * Set Marp themes array
   * Always uses flat key format for VSCode
   * @param {string[]} themes - Array of theme file paths
   */
  setMarpThemes(themes) {
    // Always use flat key format for VSCode
    this._settings['markdown.marp.themes'] = themes;
  }

  /**
   * Merge another settings object into this one
   * Combines themes without duplicates
   * @param {VSCodeSettingsDTO} other - Other settings to merge
   */
  merge(other) {
    const otherThemes = other.getMarpThemes();
    const currentThemes = this.getMarpThemes();
    const merged = [...new Set([...currentThemes, ...otherThemes])];
    this.setMarpThemes(merged);
  }

  /**
   * Convert to plain object for JSON serialization
   * @returns {Object} Plain settings object
   */
  toObject() {
    return { ...this._settings };
  }
}

/**
 * Manages VSCode settings integration for Marp themes
 * Handles .vscode/settings.json for markdown.marp.themes configuration
 */
class VSCodeIntegration {
  /**
   * @param {string} projectPath - Path to the project root
   */
  constructor(projectPath) {
    if (!projectPath) {
      throw new VSCodeIntegrationError('Project path is required');
    }
    this.projectPath = projectPath;
  }

  /**
   * Returns the path to .vscode/settings.json
   * @returns {string} Absolute path to settings.json
   */
  getSettingsPath() {
    return path.join(this.projectPath, '.vscode', 'settings.json');
  }

  /**
   * Reads settings.json from .vscode directory
   * Returns empty object if file doesn't exist
   * Creates backup of corrupted JSON files
   *
   * @returns {Object} Parsed settings object
   * @throws {VSCodeIntegrationError} If backup creation fails
   */
  readSettings() {
    const settingsPath = this.getSettingsPath();

    // Return empty object if file doesn't exist
    if (!fs.existsSync(settingsPath)) {
      return {};
    }

    try {
      const content = fs.readFileSync(settingsPath, 'utf-8');
      const settings = JSON.parse(content);
      return settings;
    } catch (error) {
      if (error instanceof SyntaxError) {
        // Create backup of corrupted file
        this._backupCorruptedSettings(settingsPath);
        return {};
      }
      throw new VSCodeIntegrationError(`Failed to read settings: ${error.message}`);
    }
  }

  /**
   * Writes settings to .vscode/settings.json
   * Creates .vscode directory if it doesn't exist
   *
   * @param {Object} settings - Settings object to write
   * @throws {VSCodeIntegrationError} If directory creation or write fails
   */
  writeSettings(settings) {
    const vscodeDir = path.join(this.projectPath, '.vscode');
    const settingsPath = this.getSettingsPath();

    try {
      // Create .vscode directory if it doesn't exist
      if (!fs.existsSync(vscodeDir)) {
        fs.mkdirSync(vscodeDir, { recursive: true });
      }

      // Write settings with pretty formatting (2-space indent)
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
    } catch (error) {
      throw new VSCodeIntegrationError(`Failed to write settings: ${error.message}`);
    }
  }

  /**
   * Creates a new DTO instance from current settings
   * @returns {VSCodeSettingsDTO} DTO instance
   */
  createSettingsDTO() {
    const settings = this.readSettings();
    return new VSCodeSettingsDTO(settings);
  }

  /**
   * Syncs Marp themes to VSCode settings
   * Updates markdown.marp.themes array in settings.json
   * Preserves existing settings while updating theme list
   *
   * @param {string[]} themes - Array of theme file paths
   * @throws {VSCodeIntegrationError} If settings read/write fails
   */
  syncThemes(themes) {
    const dto = this.createSettingsDTO();
    dto.setMarpThemes(themes);
    this.writeSettings(dto.toObject());
  }

  /**
   * Reads and returns settings as DTO
   * @returns {VSCodeSettingsDTO} DTO instance
   */
  readSettingsAsDTO() {
    const settings = this.readSettings();
    return new VSCodeSettingsDTO(settings);
  }

  /**
   * Creates a backup of corrupted settings.json
   * Backup filename: settings.json.corrupted.YYYYMMDD-HHMMSS
   *
   * @private
   * @param {string} settingsPath - Path to corrupted settings file
   * @throws {VSCodeIntegrationError} If backup creation fails
   */
  _backupCorruptedSettings(settingsPath) {
    try {
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '-')
        .replace('T', '-')
        .slice(0, 19);
      const backupPath = `${settingsPath}.corrupted.${timestamp}`;

      fs.copyFileSync(settingsPath, backupPath);
      console.warn(`Corrupted settings.json backed up to: ${backupPath}`);
    } catch (error) {
      throw new VSCodeIntegrationError(
        `Failed to create backup of corrupted settings: ${error.message}`
      );
    }
  }
}

module.exports = { VSCodeIntegration, VSCodeSettingsDTO };
