const fs = require('fs');
const path = require('path');
const { Frontmatter } = require('./frontmatter');

/**
 * Example class representing a discovered example
 */
class Example {
  constructor(data) {
    this.path = data.path;
    this.relativePath = data.relativePath;
    this.themes = data.themes || [];
    this.isBase = data.isBase || false;
    this.staticAssets = data.staticAssets || [];
  }
}

/**
 * Resolver for discovering and filtering presentation examples
 */
class ExampleResolver {
  constructor(examplesDir = 'examples') {
    this.examplesDir = examplesDir;
  }

  /**
   * Discover all examples and their metadata
   * @returns {Example[]} Array of discovered examples
   */
  discoverAll() {
    const examplesDir = this.examplesDir;

    if (!fs.existsSync(examplesDir)) {
      return [];
    }

    const examples = [];
    const mdFiles = this._findMarkdownFiles(examplesDir);

    for (const mdPath of mdFiles) {
      try {
        const example = this._parseExample(mdPath, examplesDir);
        if (example) {
          examples.push(example);
        }
      } catch (error) {
        console.warn(`Warning: Could not parse example from ${mdPath}: ${error.message}`);
      }
    }

    return examples;
  }

  /**
   * Filter examples by selected themes
   * @param {Example[]} allExamples - All discovered examples
   * @param {string[]} selectedThemeNames - Names of selected themes
   * @returns {Example[]} Filtered examples to copy
   */
  filterBySelectedThemes(allExamples, selectedThemeNames) {
    const selectedSet = new Set(selectedThemeNames);
    const filtered = [];

    for (const example of allExamples) {
      // Base examples are always included
      if (example.isBase) {
        filtered.push(example);
        continue;
      }

      // Partial match: include if ANY theme matches selected themes
      const hasMatch = example.themes.some(theme => selectedSet.has(theme));
      if (hasMatch) {
        filtered.push(example);
      }
    }

    return filtered;
  }

  /**
   * Find all .md files in directory recursively
   * @private
   * @param {string} dir - Directory to scan
   * @returns {string[]} Array of .md file paths
   */
  _findMarkdownFiles(dir) {
    const mdFiles = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip symlinks for security
      if (entry.isSymbolicLink()) {
        continue;
      }

      if (entry.isDirectory()) {
        mdFiles.push(...this._findMarkdownFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        mdFiles.push(fullPath);
      }
    }

    return mdFiles;
  }

  /**
   * Parse a single example file
   * @private
   * @param {string} filePath - Absolute path to example file
   * @param {string} examplesDir - Root examples directory
   * @returns {Example|null} Parsed example or null if invalid
   */
  _parseExample(filePath, examplesDir) {
    const content = fs.readFileSync(filePath, 'utf8');
    const frontmatterData = Frontmatter.parse(content);
    const relativePath = path.relative(examplesDir, filePath);

    // Check if themes field exists (undefined or empty array = base example)
    const themes = frontmatterData.themes;
    const isBase = !themes || themes.length === 0;

    // Find static assets in same directory
    const staticAssets = this._findStaticAssets(filePath, examplesDir);

    return new Example({
      path: filePath,
      relativePath,
      themes,
      isBase,
      staticAssets
    });
  }

  /**
   * Group selected examples by their parent directory
   * @param {Example[]} selectedExamples - Examples to copy
   * @returns {Map<string, {examples: Example[], staticFiles: string[]}>}
   *          Key: relative directory path from examples root
   *          Value: { examples: array of Example objects, staticFiles: array of relative paths to non-md files }
   */
  groupByDirectory(selectedExamples) {
    const dirMap = new Map();

    for (const example of selectedExamples) {
      const dir = path.dirname(example.relativePath);

      if (!dirMap.has(dir)) {
        const staticFiles = this._findAllStaticFiles(dir);
        dirMap.set(dir, { examples: [], staticFiles });
      }

      dirMap.get(dir).examples.push(example);
    }

    return dirMap;
  }

  /**
   * Find all non-.md files in a directory recursively
   * @private
   * @param {string} relativeDir - Relative path from examples root
   * @returns {string[]} Array of relative file paths
   */
  _findAllStaticFiles(relativeDir) {
    const files = [];
    const absDir = path.join(this.examplesDir, relativeDir);

    if (!fs.existsSync(absDir)) {
      return files;
    }

    const entries = fs.readdirSync(absDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isSymbolicLink()) {
        continue;
      }

      const fullPath = path.join(absDir, entry.name);
      const relPath = path.join(relativeDir, entry.name);

      if (entry.isFile()) {
        if (!entry.name.endsWith('.md')) {
          files.push(relPath);
        }
      } else if (entry.isDirectory()) {
        files.push(...this._findAllStaticFiles(relPath));
      }
    }

    return files;
  }

  /**
   * Find static assets for an example
   * Only looks within the same directory as the example file
   * @private
   * @param {string} examplePath - Path to example .md file
   * @param {string} examplesDir - Root examples directory
   * @returns {string[]} Array of relative paths to static assets
   */
  _findStaticAssets(examplePath, examplesDir) {
    const exampleDir = path.dirname(examplePath);
    const assets = [];

    if (fs.existsSync(exampleDir)) {
      const entries = fs.readdirSync(exampleDir, { withFileTypes: true });

      for (const entry of entries) {
        // Skip symlinks, the example file itself, and other .md files
        if (entry.isSymbolicLink() || entry.name.endsWith('.md')) {
          continue;
        }

        const fullPath = path.join(exampleDir, entry.name);
        if (entry.isFile()) {
          const relativePath = path.relative(examplesDir, fullPath);
          assets.push(relativePath);
        } else if (entry.isDirectory()) {
          // Only scan subdirectories that don't contain .md files
          // (subdirectories with .md files are likely other examples)
          if (!this._directoryContainsMarkdown(fullPath)) {
            assets.push(...this._findStaticAssetsInDir(fullPath, examplesDir));
          }
        }
      }
    }

    return assets;
  }

  /**
   * Check if a directory contains any .md files
   * @private
   * @param {string} dir - Directory to check
   * @returns {boolean} True if directory contains .md files
   */
  _directoryContainsMarkdown(dir) {
    if (!fs.existsSync(dir)) {
      return false;
    }
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return entries.some(entry => entry.isFile() && entry.name.endsWith('.md'));
  }

  /**
   * Find static assets in a directory recursively
   * @private
   * @param {string} dir - Directory to scan
   * @param {string} examplesDir - Root examples directory for computing relative paths
   * @returns {string[]} Array of relative paths to static assets
   */
  _findStaticAssetsInDir(dir, examplesDir) {
    const assets = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isSymbolicLink()) {
        continue;
      }

      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(examplesDir, fullPath);

      if (entry.isFile()) {
        assets.push(relativePath);
      } else if (entry.isDirectory()) {
        assets.push(...this._findStaticAssetsInDir(fullPath, examplesDir));
      }
    }

    return assets;
  }
}

module.exports = { ExampleResolver, Example };
