const fs = require('fs');
const path = require('path');

/**
 * Get the test output directory path
 * @returns {string} Absolute path to tests/output/
 */
function getTestOutputDir() {
  return path.join(__dirname, '..', 'output');
}

/**
 * Ensure test output directory exists
 */
function ensureTestOutputDir() {
  const dir = getTestOutputDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Clean up the test output directory completely
 */
function cleanupTestOutputDir() {
  const dir = getTestOutputDir();
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Get a unique temporary directory path for a test
 * @param {string} testName - Name identifier for the test
 * @returns {string} Unique temp directory path
 */
function getTempDir(testName) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return path.join(getTestOutputDir(), testName, `${timestamp}-${random}`);
}

module.exports = {
  getTestOutputDir,
  ensureTestOutputDir,
  cleanupTestOutputDir,
  getTempDir,
};
