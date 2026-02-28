// cli/commands/add-themes-cli.js
/**
 * Add themes to existing project command for meta-package CLI
 * This file is NOT copied to generated projects
 */
const fs = require('fs');
const path = require('path');

const { AddThemesCommand } = require('../../lib/add-themes-command');
const { ThemeError } = require('../../lib/errors');

/**
 * Add themes to an existing project
 * @param {string} targetPath - Path to the target project
 * @param {Object} options - Configuration options
 * @param {string} options.themesLibraryPath - Path to themes library
 * @param {string[]} options.themeNames - Specific theme names to add (optional)
 * @returns {Promise<void>}
 */
async function addThemesToExistingProject(targetPath, options = {}) {
  const {
    themesLibraryPath = path.join(__dirname, '../..', 'themes'),
    themeNames = null
  } = options;

  // Validate target path exists
  const resolvedPath = path.resolve(targetPath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`Error: Directory does not exist: ${targetPath}`);
    throw new ThemeError(`Target path does not exist: ${targetPath}`);
  }

  // Check if it's a valid Marp project (has presentation.md or package.json)
  const hasPresentation = fs.existsSync(path.join(resolvedPath, 'presentation.md'));
  const hasPackageJson = fs.existsSync(path.join(resolvedPath, 'package.json'));

  if (!hasPresentation && !hasPackageJson) {
    console.warn('Warning: This does not appear to be a Marp presentation project.');
    console.warn('  (no presentation.md or package.json found)');
  }

  // Create AddThemesCommand with themes library path
  const command = new AddThemesCommand({
    templatePath: themesLibraryPath,
    interactive: true
  });

  try {
    console.log(`Adding themes to: ${resolvedPath}`);
    console.log();

    // Execute command - pass theme names if provided, otherwise prompt
    const { copied, skipped, conflicts } = await command.execute(resolvedPath, {
      themes: themeNames || undefined
    });

    // Show summary
    const copiedNames = copied.map(t => t.name);
    console.log(`\nCopied themes: ${copiedNames.join(', ') || 'none'}`);
    if (skipped.length > 0) {
      console.log(`Skipped: ${skipped.join(', ')}`);
    }
    if (conflicts.length > 0) {
      console.log(`Conflicts: ${conflicts.join(', ')}`);
    }

    console.log();
    console.log('Themes added successfully!');
    console.log(`\nNext steps in ${targetPath}:`);
    console.log('  npm run theme:list # List available themes');
    console.log('  npm run theme:set <theme>  # Set active theme');
    console.log();

  } catch (error) {
    if (error instanceof ThemeError) {
      console.error(`Error: ${error.message}`);
      throw error;
    }
    throw error;
  }
}

module.exports = {
  addThemesToExistingProject
};
