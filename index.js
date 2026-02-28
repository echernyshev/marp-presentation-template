#!/usr/bin/env node

/**
 * create-marp-presentation - CLI entry point
 * Supports dual entry points:
 *   1. npx create-marp-presentation <name> [--path <dir>] - Create new project
 *   2. npx create-marp-presentation theme:add <path> [themes...] - Add themes to existing project
 */

const path = require('path');

const { createProject, validateProjectName, parsePathArg } = require('./cli/commands/create-project');
const { addThemesToExistingProject } = require('./cli/commands/add-themes-cli');
const { validateOutputPath } = require('./cli/utils/file-utils');

// Paths
const templatePath = path.join(__dirname, 'template');
const themesLibraryPath = path.join(__dirname, 'themes');

/**
 * Show usage information
 * @param {boolean} isError - If true, write to stderr and exit with error code
 */
function showUsage(isError = false) {
  const output = isError ? console.error : console.log;
  output('Please provide a project name:');
  output('  npx create-marp-presentation <project-name> [--path <output-dir>]');
  output('');
  output('Or use the theme:add command:');
  output('  npx create-marp-presentation theme:add <project-path> [theme-names...]');
  output('');
  output('Examples:');
  output('  npx create-marp-presentation my-project');
  output('  npx create-marp-presentation my-project --path /tmp');
  output('  npx create-marp-presentation my-project --path ~/projects');
  output('  npx create-marp-presentation theme:add ./my-project');
  output('  npx create-marp-presentation theme:add ./my-project beam marpx');
  output('');

  if (isError) {
    process.exit(1);
  }
}

/**
 * Handle theme:add command
 * @param {string[]} args - Command arguments
 */
async function handleThemeAdd(args) {
  const targetPath = args[0];
  if (!targetPath) {
    console.error('Usage: npx create-marp-presentation theme:add <project-path> [theme-names...]');
    process.exit(1);
  }

  const themeNames = args.slice(1); // Additional arguments are theme names

  try {
    await addThemesToExistingProject(targetPath, {
      themesLibraryPath,
      themeNames: themeNames.length > 0 ? themeNames : null
    });
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Handle project creation command
 * @param {string} projectName - Name of the project
 * @param {string[]} args - Remaining arguments (e.g., --path)
 */
async function handleProjectCreation(projectName, args = []) {
  // Parse --path argument if present
  const { pathIndex } = parsePathArg(args);
  let outputPath = process.cwd();

  if (pathIndex !== null) {
    const pathArg = args[pathIndex + 1];
    const validation = validateOutputPath(pathArg);
    if (!validation.valid) {
      console.error(`Invalid --path: "${pathArg}"`);
      console.error(validation.error);
      process.exit(1);
    }
    outputPath = validation.resolvedPath;
  }

  try {
    await createProject(projectName, {
      outputPath,
      templatePath,
      themesLibraryPath
    });
  } catch (error) {
    if (error.message === 'Invalid project name' || error.message === 'Project directory already exists') {
      process.exit(1);
    }
    console.error('Error creating project:', error.message);
    process.exit(1);
  }
}

/**
 * Main entry point
 */
async function main() {
  const [command, ...args] = process.argv.slice(2);

  switch (command) {
    case 'theme:add':
      await handleThemeAdd(args);
      break;

    case undefined:
      showUsage(true); // Exit with error code 1
      break;

    default:
      // Treat as project name (backward compatible)
      await handleProjectCreation(command, args);
      break;
  }
}

// Run
main().catch(error => {
  console.error('Unexpected error:', error.message);
  process.exit(1);
});
