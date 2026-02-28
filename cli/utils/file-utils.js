// cli/utils/file-utils.js
/**
 * File and directory utilities for meta-package CLI commands
 * These functions are NOT copied to generated projects
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

/**
 * Expand ~ to home directory
 * @param {string} input - Path that may start with ~
 * @returns {string} Expanded path
 */
function expandHomePath(input) {
  if (input.startsWith('~')) {
    return path.join(os.homedir(), input.slice(1));
  }
  return input;
}

/**
 * Validate and normalize an output directory path
 * @param {string} inputPath - Path to validate
 * @returns {{valid: boolean, error?: string, resolvedPath?: string}} Validation result
 */
function validateOutputPath(inputPath) {
  if (!inputPath || inputPath.trim() === '') {
    return { valid: false, error: 'Path cannot be empty' };
  }

  // Check for null bytes (security)
  if (inputPath.includes('\0')) {
    return { valid: false, error: 'Path contains null bytes' };
  }

  const expanded = expandHomePath(inputPath);
  const resolved = path.resolve(expanded);
  const normalizedResolved = resolved.toLowerCase();

  // Block system-sensitive directories
  const sensitiveDirs = ['/etc', '/sys', '/proc', '/root', '/boot'];
  for (const sensitive of sensitiveDirs) {
    if (normalizedResolved.startsWith(sensitive.toLowerCase() + path.sep) ||
        normalizedResolved === sensitive.toLowerCase()) {
      return { valid: false, error: `Cannot create project in system directory: ${sensitive}` };
    }
  }

  // Don't allow creation inside node_modules
  if (normalizedResolved.includes('node_modules')) {
    return { valid: false, error: 'Cannot create project inside node_modules directory' };
  }

  return { valid: true, resolvedPath: resolved };
}

/**
 * Recursively copy a directory
 * @param {string} src - Source directory path
 * @param {string} dest - Destination directory path
 */
function copyDir(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Copy optional template files to destination
 * @param {string} destPath - Destination project path
 */
function copyOptionalFiles(destPath) {
  const optionalPath = path.join(__dirname, '..', '..', 'template-optional');

  // Copy examples.md
  const examplesSrc = path.join(optionalPath, 'examples.md');
  const examplesDest = path.join(destPath, 'examples.md');
  if (fs.existsSync(examplesSrc)) {
    fs.copyFileSync(examplesSrc, examplesDest);
  }

  // Copy demo image
  const demoImageSrc = path.join(optionalPath, 'static', 'demo-image.png');
  const demoImageDest = path.join(destPath, 'static', 'demo-image.png');
  if (fs.existsSync(demoImageSrc)) {
    fs.copyFileSync(demoImageSrc, demoImageDest);
  }
}

module.exports = {
  expandHomePath,
  validateOutputPath,
  copyDir,
  copyOptionalFiles
};
