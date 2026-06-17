#!/usr/bin/env node

/**
 * theme-cli.js - CLI for managing Marp themes in a project
 *
 * Commands: list, create, set/switch, select, sync, help
 */

const fs = require('fs');
const path = require('path');

// Import lib modules
const {
  ThemeResolver,
  Theme
} = require('./lib/theme-resolver');
const { ThemeManager } = require('./lib/theme-manager');
const { Prompts } = require('./lib/prompts');
const { Frontmatter } = require('./lib/frontmatter');
const { VSCodeIntegration } = require('./lib/vscode-integration');
const {
  ThemeError,
  ThemeNotFoundError,
  ThemeAlreadyExistsError,
  PresentationNotFoundError
} = require('./lib/errors');

/**
 * Show help message
 * @returns {number} 0
 */
function showHelp() {
  console.log(`
Marp Theme CLI

Usage:
  npm run theme <command> [options]

Commands:
  list                 List installed themes
  create <name>        Create a new theme
  set <theme>          Set active theme in presentation.md
  switch <theme>       Alias for 'set' - change active theme
  select               Interactively select and set active theme
  sync                 Sync installed themes to VSCode settings
  help                 Show this help message

Options:
  --force              Overwrite existing themes (for theme:add)

Examples:
  npm run theme list
  npm run theme create my-theme
  npm run theme set beam
  npm run theme sync

Note:
  Run "npm run theme:add" to add themes from the theme library.
`);
  return 0;
}

/**
 * List installed themes
 * @param {string} projectRoot
 * @returns {Promise<number>} 0
 */
async function listThemes(projectRoot) {
  console.log('\n=== Installed Themes ===\n');

  const projectThemesPath = path.join(projectRoot, 'themes');
  let installedThemes = [];

  if (fs.existsSync(projectThemesPath)) {
    try {
      installedThemes = ThemeResolver.scanDirectory(projectThemesPath);
    } catch (error) {
      // Directory exists but no themes
    }
  }

  if (installedThemes.length === 0) {
    console.log('  No themes installed.');
    console.log('  Run "npm run theme:add" to install themes.\n');
  } else {
    for (const theme of installedThemes) {
      const deps = theme.dependencies.length > 0
        ? ` (depends on: ${theme.dependencies.join(', ')})`
        : '';
      console.log(`  ${theme.name}${deps}`);
    }
    console.log();
  }
  return 0;
}

/**
 * Create a new theme
 * @param {string} themeName
 * @param {string} projectRoot
 * @returns {Promise<number>} Exit code
 */
async function createTheme(themeName, projectRoot) {
  if (!themeName) {
    console.error('\nError: Theme name is required.\n');
    console.log('Usage: npm run theme create <theme-name>\n');
    return 1;
  }

  const manager = new ThemeManager(projectRoot);

  try {
    console.log(`\nCreating theme: ${themeName}\n`);

    // Prompt for parent theme - need objects with isSystem property
    const scannedThemes = manager.scanThemes();
    const systemThemeObjects = ThemeManager.SYSTEM_THEMES.map(name => ({
      name,
      isSystem: true
    }));
    const allThemes = [...scannedThemes, ...systemThemeObjects];
    const parentTheme = await Prompts.promptParentTheme(allThemes);

    // Prompt for directory location
    const existingDirs = manager.listDirectories();
    const location = await Prompts.promptDirectoryLocation(existingDirs);

    let newFolderName = null;
    if (location === 'new') {
      newFolderName = await Prompts.promptNewFolderName();
    }

    const result = manager.createTheme(
      themeName,
      parentTheme,
      location,
      newFolderName
    );

    console.log(`\n✓ Theme created: ${result.path}\n`);
    console.log('Next steps:');
    console.log(`  1. Edit ${result.path} to customize the theme`);
    console.log(`  2. Run "npm run theme set ${themeName}" to use it in your presentation\n`);
    return 0;
  } catch (error) {
    console.error(`\nError: ${error.message}\n`);
    return 1;
  }
}

/**
 * Sync VSCode settings with installed themes
 * @param {string} projectRoot
 * @returns {Promise<number>} Exit code
 */
async function syncThemes(projectRoot) {
  const projectThemesPath = path.join(projectRoot, 'themes');
  let installedThemes = [];

  if (fs.existsSync(projectThemesPath)) {
    try {
      installedThemes = ThemeResolver.scanDirectory(projectThemesPath);
    } catch (error) {
      // Directory exists but no themes
    }
  }

  if (installedThemes.length === 0) {
    console.log('\nNo themes installed to sync.\n');
    return 0;
  }

  // Build theme paths for VSCode
  const themePaths = installedThemes.map(theme => {
    // For themes in subdirectories, use themes/subdir/theme.css
    // For themes at root level, use themes/theme.css
    if (theme.path.includes(`${path.sep}themes${path.sep}`)) {
      const relativePath = theme.path.split(`${path.sep}themes${path.sep}`)[1];
      return `themes/${relativePath}`;
    }
    return `themes/${theme.name}.css`;
  });

  // Sync with VSCode
  const vscode = new VSCodeIntegration(projectRoot);
  vscode.syncThemes(themePaths);

  console.log(`\n✓ Synced ${themePaths.length} theme(s) to VSCode settings:`);
  themePaths.forEach(p => console.log(`  - ${p}`));
  console.log();
  return 0;
}

/**
 * Set active theme (set/switch command)
 * @param {string} themeName
 * @param {string} projectRoot
 * @returns {Promise<number>} Exit code
 */
async function setActiveThemeCommand(themeName, projectRoot) {
  try {
    const themeManager = new ThemeManager(projectRoot);
    themeManager.setActiveTheme(themeName);
    console.log(`\n✓ Theme set to "${themeName}" in presentation.md`);

    // VSCode integration - sync ALL themes in project
    themeManager.updateVSCodeSettings();

    console.log('Next steps:');
    console.log('  npm run dev  # Start live preview\n');
    return 0;
  } catch (error) {
    if (error.name === 'ThemeNotFoundError') {
      console.error(`\nError: ${error.message}\n`);
      console.log('Run "npm run theme list" to see available themes.\n');
      return 1;
    }
    if (error.name === 'PresentationNotFoundError') {
      console.error(`\nError: presentation.md not found in ${projectRoot}\n`);
      return 1;
    }
    console.error(`\nError: ${error.message}\n`);
    return 1;
  }
}

/**
 * Interactively select and set active theme
 * @param {string} projectRoot
 * @returns {Promise<number>} Exit code
 */
async function selectTheme(projectRoot) {
  try {
    const manager = new ThemeManager(projectRoot);
    const themes = manager.listThemes();
    const activeTheme = manager.getActiveTheme();
    const selected = await Prompts.promptActiveTheme(themes, activeTheme);
    manager.setActiveTheme(selected);
    manager.updateVSCodeSettings();
    console.log(`\n✓ Theme set to "${selected}" in presentation.md`);
    console.log('Next steps:');
    console.log('  npm run dev  # Start live preview\n');
    return 0;
  } catch (error) {
    if (error.name === 'ThemeNotFoundError') {
      console.error(`\nError: ${error.message}\n`);
      return 1;
    }
    if (error.name === 'PresentationNotFoundError') {
      console.error(`\nError: presentation.md not found in ${projectRoot}\n`);
      return 1;
    }
    console.error(`\nError: ${error.message}\n`);
    return 1;
  }
}

/**
 * Main CLI entry point
 * @param {string[]} [argv=process.argv.slice(2)] - [command, ...args]
 * @param {Object} [context]
 * @param {string} [context.projectRoot=process.cwd()]
 * @returns {Promise<number>} Exit code
 */
async function main(argv = process.argv.slice(2), context = {}) {
  const command = argv[0] || 'help';
  const args = argv.slice(1);
  const projectRoot = context.projectRoot || process.cwd();

  switch (command) {
    case 'list':
      return await listThemes(projectRoot);

    case 'create':
      return await createTheme(args[0], projectRoot);

    case 'set':
    case 'switch':
      return await setActiveThemeCommand(args[0], projectRoot);

    case 'select':
      return await selectTheme(projectRoot);

    case 'sync':
      return await syncThemes(projectRoot);

    case 'help':
    default:
      return showHelp();
  }
}

module.exports = {
  main,
  showHelp,
  listThemes,
  createTheme,
  syncThemes,
  setActiveThemeCommand,
  selectTheme
};

// Run CLI
if (require.main === module) {
  main().then(code => {
    process.exit(code ?? 0);
  }).catch(error => {
    console.error(`\nUnexpected error: ${error.message}\n`);
    process.exit(1);
  });
}
