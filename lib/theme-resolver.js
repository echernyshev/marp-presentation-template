// lib/theme-resolver.js
const fs = require('fs');
const { readdirSync } = require('fs');
const path = require('path');

/**
 * Represents a Marp theme
 */
class Theme {
  constructor(name, cssPath, css, dependencies = []) {
    this.name = name;
    this.path = cssPath;
    this.css = css;
    this.dependencies = dependencies;
    this.isSystem = ['default', 'gaia', 'uncover'].includes(name);
  }
}

/**
 * Resolves theme information from CSS files
 */
class ThemeResolver {
  static SYSTEM_THEMES = ['default', 'gaia', 'uncover'];

  /**
   * Extract theme name from CSS comment directive
   * Pattern: /* @theme name *\/
   *
   * @param {string} cssContent - CSS file content
   * @param {string} fallbackFilename - Filename to use as fallback
   * @returns {string|null} Theme name or null if not found
   */
  static extractThemeName(cssContent, fallbackFilename = null) {
    // Match /* @theme name */ - supports multi-line comments
    // The [\s\S]*? allows matching across newlines (non-greedy)
    const themeDirectiveRegex = /\/\*[\s\S]*?@theme\s+([\w-]+)[\s\S]*?\*\//;
    const match = cssContent.match(themeDirectiveRegex);

    if (match && match[1]) {
      return match[1].trim();
    }

    // Fallback to filename (with or without .css extension)
    if (fallbackFilename) {
      const basename = path.basename(fallbackFilename, '.css');
      return basename;
    }

    return null;
  }

  /**
   * Extract @import dependencies from CSS
   * Ignores url() imports
   *
   * @param {string} cssContent - CSS file content
   * @returns {string[]} Array of theme names from @import statements
   */
  static extractDependencies(cssContent) {
    // Match @import "theme" or @import 'theme' - exclude url() imports using negative lookahead
    const importRegex = /@import\s+(?!url\()['"]([^'"]+)['"]\s*;/g;
    const dependencies = [];

    let match;
    while ((match = importRegex.exec(cssContent)) !== null) {
      const importPath = match[1];

      // Skip URL imports (data:, http:, https:, etc.)
      if (importPath.includes('://') || importPath.startsWith('data:')) {
        continue;
      }

      // Skip if it looks like inline CSS content
      if (importPath.includes('{') || importPath.includes('}')) {
        continue;
      }

      dependencies.push(importPath);
    }

    return dependencies;
  }

  /**
   * Resolve theme from a CSS file
   *
   * @param {string} cssPath - Path to CSS file
   * @returns {Theme} Theme object
   * @throws {Error} If file does not exist
   */
  static resolveTheme(cssPath) {
    if (!fs.existsSync(cssPath)) {
      throw new Error(`CSS file not found: ${cssPath}`);
    }

    const css = fs.readFileSync(cssPath, 'utf-8');
    const filename = path.basename(cssPath);
    const name = this.extractThemeName(css, filename) || filename;
    const dependencies = this.extractDependencies(css);

    return new Theme(name, cssPath, css, dependencies);
  }

  /**
   * Scan directory recursively for CSS theme files
   *
   * @param {string} themesPath - Path to themes directory
   * @returns {Theme[]} Array of Theme objects (empty if directory doesn't exist)
   */
  static scanDirectory(themesPath) {
    if (!fs.existsSync(themesPath)) {
      return [];
    }

    const themes = [];
    const cssFiles = this._findCssFiles(themesPath);

    for (const cssPath of cssFiles) {
      try {
        const theme = this.resolveTheme(cssPath);
        themes.push(theme);
      } catch (error) {
        // Skip files that can't be resolved
        console.warn(`Warning: Could not resolve theme from ${cssPath}: ${error.message}`);
      }
    }

    return themes;
  }

  /**
   * Find all CSS files in directory recursively
   * @private
   */
  static _findCssFiles(dirPath, results = []) {
    const entries = readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        this._findCssFiles(fullPath, results);
      } else if (entry.isFile() && entry.name.endsWith('.css')) {
        results.push(fullPath);
      }
    }

    return results;
  }

  /**
   * Resolve all dependencies for selected themes
   * Returns complete set of themes to copy (including parents)
   * Excludes system themes (default, gaia, uncover)
   *
   * @param {Theme[]} selectedThemes - Themes user selected
   * @param {Theme[]} allThemes - All available themes
   * @returns {Theme[]} Themes to copy (selected + dependencies)
   */
  static resolveDependencies(selectedThemes, allThemes) {
    const toCopy = new Map(); // Use Map for deduplication by name
    const visited = new Set();
    const visiting = new Set();

    // Create a map of all available themes for quick lookup
    // Also include selected themes in case they're not in allThemes
    const allThemesMap = new Map();
    for (const theme of allThemes) {
      allThemesMap.set(theme.name, theme);
    }
    for (const theme of selectedThemes) {
      if (!allThemesMap.has(theme.name)) {
        allThemesMap.set(theme.name, theme);
      }
    }

    const addTheme = (themeName) => {
      if (visited.has(themeName)) {
        return;
      }

      // Check for circular dependency
      if (visiting.has(themeName)) {
        console.warn(`Warning: Circular dependency detected for theme '${themeName}'`);
        return;
      }

      visiting.add(themeName);

      // Find theme in allThemesMap
      const theme = allThemesMap.get(themeName);

      if (!theme) {
        console.warn(`Warning: Dependency '${themeName}' not found in available themes`);
        visiting.delete(themeName);
        return;
      }

      // Skip system themes
      if (theme.isSystem) {
        visiting.delete(themeName);
        return;
      }

      // First resolve dependencies
      for (const depName of theme.dependencies) {
        // Extract just the theme name from path (e.g., "../marpx/marpx.css" -> "marpx")
        const simpleDepName = depName.replace(/\.css$/g, '').split('/').pop();
        addTheme(simpleDepName);
      }

      // Then add this theme
      toCopy.set(theme.name, theme);
      visited.add(theme.name);
      visiting.delete(themeName);
    };

    // Start with selected themes
    for (const theme of selectedThemes) {
      addTheme(theme.name);
    }

    return Array.from(toCopy.values());
  }
}

module.exports = { ThemeResolver, Theme };
