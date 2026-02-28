// lib/frontmatter.js
const matter = require('gray-matter');
const fs = require('fs');
const path = require('path');

/**
 * Frontmatter class for handling Marp presentation frontmatter
 * Uses gray-matter library for parsing and manipulating YAML frontmatter
 */
class Frontmatter {
  /**
   * Parse frontmatter from markdown content
   *
   * @param {string} content - Markdown content with frontmatter
   * @returns {Object} Parsed frontmatter data
   */
  static parse(content) {
    const result = matter(content);
    return result.data;
  }

  /**
   * Extract theme value from frontmatter
   *
   * @param {string} content - Markdown content with frontmatter
   * @returns {string|null} Theme name or null if not found
   */
  static getTheme(content) {
    const data = this.parse(content);
    return data.theme || null;
  }

  /**
   * Set or update theme value in frontmatter
   * Creates frontmatter if it doesn't exist
   *
   * @param {string} content - Markdown content
   * @param {string} themeName - Theme name to set
   * @returns {string} Updated markdown content
   */
  static setTheme(content, themeName) {
    const result = matter(content);

    // Set or update the theme
    result.data.theme = themeName;

    // Rebuild the markdown with updated frontmatter
    return matter.stringify(result.content, result.data);
  }

  /**
   * Write content to a file
   *
   * @param {string} filePath - Path to the file
   * @param {string} content - Content to write
   * @throws {Error} If file path is invalid or write fails
   */
  static writeToFile(filePath, content) {
    const absolutePath = path.resolve(filePath);

    // Ensure parent directory exists
    const dir = path.dirname(absolutePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(absolutePath, content, 'utf-8');
  }
}

module.exports = { Frontmatter };
