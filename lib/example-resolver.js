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

    // Check if themes field exists
    const themes = frontmatterData.themes;
    const isBase = !themes;

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
   * Find static assets for an example
   * @private
   * @param {string} examplePath - Path to example .md file
   * @param {string} examplesDir - Root examples directory
   * @returns {string[]} Array of relative paths to static assets
   */
  _findStaticAssets(examplePath, examplesDir) {
    const exampleDir = path.dirname(examplePath);
    const relativeDir = path.relative(examplesDir, exampleDir);
    const assets = [];

    if (fs.existsSync(exampleDir)) {
      const entries = fs.readdirSync(exampleDir, { withFileTypes: true });

      for (const entry of entries) {
        // Skip symlinks and .md files
        if (entry.isSymbolicLink() || entry.name.endsWith('.md')) {
          continue;
        }

        const fullPath = path.join(exampleDir, entry.name);
        if (entry.isFile()) {
          assets.push(path.join(relativeDir, entry.name));
        } else if (entry.isDirectory()) {
          // Recursively add files in subdirectories
          assets.push(...this._findStaticAssetsInDir(fullPath, relativeDir));
        }
      }
    }

    return assets;
  }

  /**
   * Find static assets in a directory recursively
   * @private
   * @param {string} dir - Directory to scan
   * @param {string} baseRelativeDir - Base relative directory path
   * @returns {string[]} Array of relative paths to static assets
   */
  _findStaticAssetsInDir(dir, baseRelativeDir) {
    const assets = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isSymbolicLink()) {
        continue;
      }

      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(baseRelativeDir, path.basename(dir), entry.name);

      if (entry.isFile()) {
        assets.push(relativePath);
      } else if (entry.isDirectory()) {
        assets.push(...this._findStaticAssetsInDir(fullPath, baseRelativeDir));
      }
    }

    return assets;
  }
}

module.exports = { ExampleResolver, Example };
