// lib/add-themes-command.js
const fs = require('fs');
const path = require('path');
const { ThemeResolver, Theme } = require('./theme-resolver');
const { VSCodeIntegration, VSCodeSettingsDTO } = require('./vscode-integration');
const { ThemeManager } = require('./theme-manager');
const { Prompts } = require('./prompts');
const {
  ThemeError,
  ThemeNotFoundError,
  ThemeAlreadyExistsError
} = require('./errors');

/**
 * Shared function for adding Marp themes to a project
 * Handles theme copying, dependency resolution, conflict detection, and VSCode sync
 */
class AddThemesCommand {
  /**
   * @param {Object} options - Configuration options
   * @param {string} options.templatePath - Path to themes library directory (optional, defaults to __dirname/../themes)
   * @param {boolean} options.interactive - Enable interactive prompts (default: true)
   * @param {Object} options.prompts - Prompt functions for testing (optional)
   */
  constructor(options = {}) {
    this.options = {
      interactive: options.interactive !== false,
      templatePath: options.templatePath || path.join(__dirname, '..', 'themes'),
      ...options
    };
  }

  /**
   * Returns the path to the themes library directory
   * @returns {string} Absolute path to themes library
   */
  getTemplateThemesPath() {
    // templatePath now points directly to the themes library
    return this.options.templatePath;
  }

  /**
   * Main execution method - adds themes to target project
   *
   * @param {string} targetPath - Path to target project directory
   * @param {Object} options - Execution options
   * @param {string[]} options.themes - Theme names to add (optional, prompts if not provided)
   * @param {string[]} options.skip - Theme names to skip conflicts (optional)
   * @param {boolean} options.force - Overwrite existing themes (default: false)
   * @param {boolean} options.noVscode - Skip VSCode settings sync (default: false)
   * @returns {Promise<Object>} Result object with copied, skipped, and conflicts arrays
   */
  async execute(targetPath, options = {}) {
    const execOptions = {
      themes: options.themes || null,
      skip: options.skip || [],
      force: options.force || false,
      noVscode: options.noVscode || false,
      ...options
    };

    // Validate target path
    if (!fs.existsSync(targetPath)) {
      throw new ThemeError(`Target path does not exist: ${targetPath}`);
    }

    const templateThemesPath = this.getTemplateThemesPath();

    // Scan available themes from themes library
    if (!fs.existsSync(templateThemesPath)) {
      throw new ThemeError(`Themes library directory not found: ${templateThemesPath}`);
    }

    const availableThemes = ThemeResolver.scanDirectory(templateThemesPath);

    if (availableThemes.length === 0) {
      throw new ThemeError('No themes found in themes library');
    }

    // Determine which themes to copy
    let themesToCopy;
    if (execOptions.themes != null) {
      // themes explicitly provided (even if empty array = copy nothing)
      if (execOptions.themes.length > 0) {
        themesToCopy = this._resolveThemeNames(execOptions.themes, availableThemes);
      } else {
        // Empty array means user chose no themes
        themesToCopy = [];
      }
    } else if (this.options.interactive) {
      // Interactive mode - prompt user using built-in Prompts.promptThemes()
      const selectedNames = await this._promptThemes(availableThemes);
      // Filter availableThemes to only include selected ones
      themesToCopy = availableThemes.filter(t => selectedNames.includes(t.name));
    } else {
      // Non-interactive without explicit themes: copy all available themes
      themesToCopy = availableThemes;
    }

    // Resolve dependencies
    const themesWithDependencies = ThemeResolver.resolveDependencies(
      themesToCopy,
      availableThemes
    );

    // Scan existing themes in project
    const existingThemes = this._scanProjectThemes(targetPath);

    // Find conflicts
    const conflicts = this._findConflicts(themesWithDependencies, existingThemes);

    // Handle conflicts
    let skipList = new Set(execOptions.skip);

    if (conflicts.length > 0 && !execOptions.force) {
      if (this.options.interactive) {
        const resolvedConflicts = await this._resolveConflictsInteractive(
          conflicts,
          execOptions.force
        );
        // Add overwrite choices to skip list (inverted logic - skip if not overwriting)
        conflicts.forEach(conflict => {
          if (!resolvedConflicts.overwrite.includes(conflict)) {
            skipList.add(conflict);
          }
        });
      } else {
        // Non-interactive: skip all conflicts
        conflicts.forEach(conflict => skipList.add(conflict));
      }
    }

    // Copy themes
    const copyResult = this.copyThemes(
      themesWithDependencies,
      templateThemesPath,
      targetPath,
      Array.from(skipList)
    );

    // Sync VSCode settings
    if (!execOptions.noVscode && copyResult.copied.length > 0) {
      this._syncVscodeSettings(targetPath, copyResult.copied);
    }

    // Ensure marp.themeSet is configured in package.json
    if (copyResult.copied.length > 0) {
      ThemeManager.ensureThemeSetConfig(targetPath, { silent: true });
    }

    // Return result with conflicts included
    return {
      ...copyResult,
      conflicts
    };
  }

  /**
   * Copy themes from themes library to target project
   *
   * @param {Theme[]} themes - Theme objects to copy
   * @param {string} templatePath - Path to themes library directory
   * @param {string} targetPath - Path to target project directory
   * @param {string[]} skipList - Theme names to skip
   * @returns {Object} Result with copied, skipped arrays
   */
  copyThemes(themes, templatePath, targetPath, skipList = []) {
    const skipSet = new Set(skipList);
    const copied = [];
    const skipped = [];

    // Ensure target themes directory exists
    const targetThemesDir = path.join(targetPath, 'themes');
    if (!fs.existsSync(targetThemesDir)) {
      fs.mkdirSync(targetThemesDir, { recursive: true });
    }

    for (const theme of themes) {
      if (skipSet.has(theme.name)) {
        skipped.push(theme.name);
        continue;
      }

      // Calculate relative path from themes library
      const relativePath = path.relative(templatePath, theme.path);
      const targetFilePath = path.join(targetThemesDir, relativePath);

      // Ensure target directory exists
      const targetDir = path.dirname(targetFilePath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Copy file
      fs.copyFileSync(theme.path, targetFilePath);
      copied.push(theme);  // Return Theme object, not just name
    }

    return { copied, skipped };
  }

  /**
   * Scan project themes directory for existing theme files
   * @private
   *
   * @param {string} projectPath - Path to project directory
   * @returns {Theme[]} Array of existing theme objects
   */
  _scanProjectThemes(projectPath) {
    const themesPath = path.join(projectPath, 'themes');

    if (!fs.existsSync(themesPath)) {
      return [];
    }

    try {
      return ThemeResolver.scanDirectory(themesPath);
    } catch (error) {
      // If scan fails, return empty array
      return [];
    }
  }

  /**
   * Find conflicts between themes to copy and existing themes
   * @private
   *
   * @param {Theme[]} themesToCopy - Themes that will be copied
   * @param {Theme[]} existingThemes - Themes that already exist
   * @returns {string[]} Array of conflicting theme names
   */
  _findConflicts(themesToCopy, existingThemes) {
    const existingNames = new Set(existingThemes.map(t => t.name));
    const conflicts = [];

    for (const theme of themesToCopy) {
      if (existingNames.has(theme.name)) {
        conflicts.push(theme.name);
      }
    }

    return conflicts;
  }

  /**
   * Resolve theme names to Theme objects
   * @private
   *
   * @param {string[]} themeNames - Theme names to resolve
   * @param {Theme[]} availableThemes - Available themes from themes library
   * @returns {Theme[]} Resolved theme objects
   * @throws {ThemeNotFoundError} If a theme name is not found
   */
  _resolveThemeNames(themeNames, availableThemes) {
    const themesMap = new Map();
    for (const theme of availableThemes) {
      themesMap.set(theme.name, theme);
    }

    const resolved = [];
    const notFound = [];

    for (const name of themeNames) {
      const theme = themesMap.get(name);
      if (theme) {
        resolved.push(theme);
      } else {
        notFound.push(name);
      }
    }

    if (notFound.length > 0) {
      const message = notFound.length === 1
        ? notFound[0]
        : `${notFound.join(', ')}`;
      throw new ThemeNotFoundError(message);
    }

    return resolved;
  }

  /**
   * Prompt user to select themes interactively
   * Uses Prompts.promptThemes() for built-in theme selection
   * @private
   *
   * @param {Theme[]} availableThemes - Available themes
   * @returns {Promise<string[]>} Selected theme names
   */
  async _promptThemes(availableThemes) {
    // Use built-in Prompts.promptThemes() for interactive selection
    return await Prompts.promptThemes(availableThemes);
  }

  /**
   * Resolve conflicts interactively
   * @private
   *
   * @param {string[]} conflicts - Conflicting theme names
   * @param {boolean} force - Force overwrite all
   * @returns {Promise<Object>} Resolution result with overwrite array
   */
  async _resolveConflictsInteractive(conflicts, force) {
    if (force) {
      return { overwrite: conflicts };
    }

    // Use custom prompt if provided (backward compatibility for tests)
    if (this.options.prompts?.resolveConflicts) {
      return await this.options.prompts.resolveConflicts(conflicts);
    }

    // Use built-in Prompts.promptConflictResolution
    const result = await Prompts.promptConflictResolution(
      conflicts.map(c => ({ name: c }))
    );

    if (result === 'skip-all') return { overwrite: [] };
    if (result === 'overwrite-all') return { overwrite: conflicts };
    if (result === 'cancel') return { overwrite: [] };

    // Handle single conflict responses
    if (result === 'skip') return { overwrite: [] };
    if (result === 'overwrite') return { overwrite: conflicts };

    // Handle 'choose-each' - prompt for each conflict individually
    const overwrite = [];
    for (const conflict of conflicts) {
      const choice = await Prompts.promptSingleConflict(conflict);
      if (choice === 'overwrite') {
        overwrite.push(conflict);
      } else if (choice === 'cancel') {
        break;
      }
    }
    return { overwrite };
  }

  /**
   * Sync themes to VSCode settings
   * @private
   *
   * @param {string} projectPath - Path to project directory
   * @param {string[]} copiedThemes - Names of copied themes
   */
  _syncVscodeSettings(projectPath, copiedThemes) {
    const vscode = new VSCodeIntegration(projectPath);

    // Use DTO for type-safe access
    const dto = vscode.createSettingsDTO();
    const existingThemes = dto.getMarpThemes();

    // Add new theme paths (relative to themes/)
    // copiedThemes are Theme objects - use their paths to compute relative paths
    const newThemePaths = copiedThemes.map(theme => {
      // theme.path is absolute, we need relative path from themes directory
      // e.g., /library/themes/marpx/socrates.css -> themes/marpx/socrates.css
      const filename = path.basename(theme.path);
      const themeName = path.basename(path.dirname(theme.path));
      // For single-file themes: themes/themeName/themeName.css
      // For themes in subdirs: themes/subdir/themeName.css
      return `themes/${themeName}/${filename}`;
    });

    // Merge without duplicates
    const allThemes = [...new Set([...existingThemes, ...newThemePaths])];

    dto.setMarpThemes(allThemes);
    vscode.writeSettings(dto.toObject());
  }
}

/**
 * Convenience function to create and execute AddThemesCommand
 *
 * @param {string} targetPath - Path to target project directory
 * @param {Object} options - Options passed to AddThemesCommand
 * @returns {Promise<Object>} Result object from execute()
 */
async function addThemesCommand(targetPath, options = {}) {
  const command = new AddThemesCommand(options);
  return await command.execute(targetPath, options);
}

module.exports = { AddThemesCommand, addThemesCommand };
