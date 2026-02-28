#!/usr/bin/env node

/**
 * theme-cli.js - CLI for managing Marp themes in a project
 *
 * This script provides commands to:
 * - List installed themes
 * - Create new themes
 * - Update presentation.md with selected theme
 * - Sync themes to VSCode settings
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

// Get command from arguments
const command = process.argv[2] || 'help';
const args = process.argv.slice(3);

// Paths
const projectRoot = process.cwd();
const templatePath = path.join(__dirname, '..');

/**
 * Show help message
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
}

/**
 * List installed themes
 */
async function listThemes() {
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
}

/**
 * Create a new theme
 */
async function createTheme(themeName) {
  if (!themeName) {
    console.error('\nError: Theme name is required.\n');
    console.log('Usage: npm run theme create <theme-name>\n');
    process.exit(1);
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
  } catch (error) {
    console.error(`\nError: ${error.message}\n`);
    process.exit(1);
  }
}

/**
 * Sync VSCode settings with installed themes
 */
async function syncThemes() {
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
    return;
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
}

/**
 * Main CLI entry point
 */
async function main() {
  switch (command) {
    case 'list':
      await listThemes();
      break;

    case 'create':
      await createTheme(args[0]);
      break;

    case 'set':
    case 'switch':
      try {
        const themeManager = new ThemeManager(projectRoot);
        themeManager.setActiveTheme(args[0]);
        console.log(`\n✓ Theme set to "${args[0]}" in presentation.md`);

        // VSCode integration - sync ALL themes in project
        themeManager.updateVSCodeSettings();

        console.log('Next steps:');
        console.log('  npm run dev  # Start live preview\n');
      } catch (error) {
        if (error.name === 'ThemeNotFoundError') {
          console.error(`\nError: ${error.message}\n`);
          console.log('Run "npm run theme list" to see available themes.\n');
          process.exit(1);
        }
        if (error.name === 'PresentationNotFoundError') {
          console.error(`\nError: presentation.md not found in ${projectRoot}\n`);
          process.exit(1);
        }
        console.error(`\nError: ${error.message}\n`);
        process.exit(1);
      }
      break;

    case 'sync':
      await syncThemes();
      break;

    case 'help':
    default:
      showHelp();
      break;
  }
}

// Run CLI
main().catch(error => {
  console.error(`\nUnexpected error: ${error.message}\n`);
  process.exit(1);
});
