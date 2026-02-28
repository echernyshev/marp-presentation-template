// lib/theme-manager.js
const fs = require('fs');
const path = require('path');
const { ThemeResolver } = require('./theme-resolver');
const { VSCodeIntegration } = require('./vscode-integration');
const { Frontmatter } = require('./frontmatter');
const {
  ThemeNotFoundError,
  ThemeAlreadyExistsError,
  PresentationNotFoundError
} = require('./errors');

/**
 * Main class for theme operations
 * Manages Marp themes in a project, including scanning, creating, and updating themes
 */
class ThemeManager {
  // System themes that are always available
  static SYSTEM_THEMES = ['default', 'gaia', 'uncover'];

  /**
   * Ensure marp.themeSet is configured in package.json
   * This is a static utility that can be called without instantiating ThemeManager
   *
   * @param {string} projectPath - Path to the project directory
   * @param {Object} options - Optional configuration
   * @param {boolean} options.silent - If true, don't log messages (default: false)
   * @returns {boolean} - True if configuration was added, false if already present or error occurred
   */
  static ensureThemeSetConfig(projectPath, options = {}) {
    const { silent = false } = options;
    const pkgPath = path.join(projectPath, 'package.json');

    if (!fs.existsSync(pkgPath)) {
      if (!silent) console.warn('  Warning: package.json not found');
      return false;
    }

    try {
      const pkgContent = fs.readFileSync(pkgPath, 'utf-8');
      const pkg = JSON.parse(pkgContent);

      // Check if marp.themeSet is already configured
      if (pkg.marp && pkg.marp.themeSet) {
        return false; // Already configured
      }

      // Add marp.themeSet configuration
      if (!pkg.marp) {
        pkg.marp = {};
      }
      pkg.marp.themeSet = './themes';

      // Write back to package.json with proper formatting
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

      if (!silent) {
        console.log('✓ Added marp.themeSet configuration to package.json');
      }
      return true; // Configuration was added
    } catch (error) {
      if (!silent) {
        console.warn(`  Warning: Could not ensure marp.themeSet: ${error.message}`);
      }
      return false;
    }
  }

  /**
   * Create a new ThemeManager instance
   *
   * @param {string} projectPath - Path to the project root
   */
  constructor(projectPath) {
    if (!projectPath) {
      throw new Error('Project path is required');
    }
    this.projectPath = projectPath;
    this.themesPath = path.join(projectPath, 'themes');
    this.presentationPath = path.join(projectPath, 'presentation.md');
  }

  /**
   * Scan themes in project
   * Delegates to ThemeResolver.scanDirectory
   *
   * @returns {Theme[]} Array of Theme objects found in themes directory
   */
  scanThemes() {
    return ThemeResolver.scanDirectory(this.themesPath);
  }

  /**
   * List theme names (for theme-cli.js compatibility)
   *
   * @returns {string[]} Array of theme names including system themes
   */
  listThemes() {
    const themes = this.scanThemes().map(t => t.name);
    return [...themes, ...ThemeManager.SYSTEM_THEMES];
  }

  /**
   * List theme directory names (for theme-cli.js compatibility)
   *
   * @returns {string[]} Array of directory names in themes folder
   */
  listDirectories() {
    if (!fs.existsSync(this.themesPath)) {
      return [];
    }

    const entries = fs.readdirSync(this.themesPath, { withFileTypes: true });
    return entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);
  }

  /**
   * Get theme by name
   *
   * @param {string} name - Theme name
   * @returns {Theme|null} Theme object or null if not found
   */
  getTheme(name) {
    const themes = this.scanThemes();
    return themes.find((theme) => theme.name === name) || null;
  }

  /**
   * Get active theme from presentation.md
   *
   * @returns {string|null} Theme name or null if not found
   */
  getActiveTheme() {
    if (!fs.existsSync(this.presentationPath)) {
      return null;
    }

    const content = fs.readFileSync(this.presentationPath, 'utf-8');
    return Frontmatter.getTheme(content);
  }

  /**
   * Set active theme in presentation.md
   *
   * @param {string} themeName - Theme name to set
   * @throws {ThemeNotFoundError} If theme does not exist
   * @throws {PresentationNotFoundError} If presentation.md does not exist
   */
  setActiveTheme(themeName) {
    if (!fs.existsSync(this.presentationPath)) {
      throw new PresentationNotFoundError(this.presentationPath);
    }

    // Validate theme exists
    const availableThemes = this.scanThemes().map((t) => t.name);
    const allThemes = [...availableThemes, ...ThemeManager.SYSTEM_THEMES];

    if (!allThemes.includes(themeName)) {
      throw new ThemeNotFoundError(themeName);
    }

    const content = fs.readFileSync(this.presentationPath, 'utf-8');
    const updated = Frontmatter.setTheme(content, themeName);
    Frontmatter.writeToFile(this.presentationPath, updated);
  }

  /**
   * Create new theme
   *
   * @param {string} name - Theme name
   * @param {string|null} parent - Parent theme name or null
   * @param {string} location - 'root', 'existing' folder name, or 'new'
   * @param {string} newFolderName - Required if location is 'new'
   * @throws {ThemeAlreadyExistsError} If theme with same name already exists
   * @throws {Error} If location is 'new' but newFolderName not provided
   */
  createTheme(name, parent, location, newFolderName = null) {
    // Check for duplicate
    if (this.getTheme(name)) {
      throw new ThemeAlreadyExistsError(name);
    }

    let cssPath;
    if (location === 'root') {
      cssPath = path.join(this.themesPath, `${name}.css`);
    } else if (location === 'new') {
      if (!newFolderName) {
        throw new Error('newFolderName required when location is "new"');
      }
      const folderPath = path.join(this.themesPath, newFolderName);
      fs.mkdirSync(folderPath, { recursive: true });
      cssPath = path.join(folderPath, `${name}.css`);
    } else {
      // Existing folder
      cssPath = path.join(this.themesPath, location, `${name}.css`);
    }

    // Generate CSS content
    let css = `/* @theme ${name} */\n\n`;

    if (parent) {
      css += `@import "${parent}";\n\n`;
    }

    css += `:root {\n  /* Your theme variables */\n}\n`;

    fs.writeFileSync(cssPath, css, 'utf-8');

    // Update VSCode settings
    this.updateVSCodeSettings();

    return { path: cssPath };
  }

  /**
   * Update VSCode settings with current themes
   * Syncs all discovered themes plus system themes to .vscode/settings.json
   */
  updateVSCodeSettings() {
    const themes = this.scanThemes();
    const vscode = new VSCodeIntegration(this.projectPath);

    // Convert theme objects to relative paths for VSCode
    const themePaths = themes.map((theme) => {
      return path.relative(this.projectPath, theme.path);
    });

    // Add system theme paths for VSCode (system themes use flat structure)
    const systemThemePaths = ThemeManager.SYSTEM_THEMES.map(name => `themes/${name}.css`);
    const allThemePaths = [...themePaths, ...systemThemePaths];

    vscode.syncThemes(allThemePaths);
  }
}

module.exports = { ThemeManager };
