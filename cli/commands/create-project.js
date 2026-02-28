// cli/commands/create-project.js
/**
 * Project creation command for meta-package CLI
 * This file is NOT copied to generated projects
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const { AddThemesCommand } = require('../../lib/add-themes-command');
const { Prompts } = require('../../lib/prompts');
const { ThemeManager } = require('../../lib/theme-manager');

const { copyDir } = require('../utils/file-utils');

/**
 * Validate project name
 * @param {string} name - Project name to validate
 * @returns {boolean} True if valid
 */
function validateProjectName(name) {
  const validName = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
  return validName.test(name);
}

/**
 * Parse --path argument from argv
 * @param {string[]} argv - Process argv (should start from index 2)
 * @returns {{outputPath: string, pathIndex: number|null}} Parsed arguments
 */
function parsePathArg(argv) {
  let outputPath = process.cwd();
  const pathIndex = argv.indexOf('--path');
  if (pathIndex !== -1 && pathIndex + 1 < argv.length) {
    return { outputPath: null, pathIndex }; // Signal that validation is needed
  }
  return { outputPath, pathIndex: null };
}

/**
 * Create a new Marp presentation project
 * @param {string} projectName - Name of the project
 * @param {Object} options - Configuration options
 * @param {string} options.outputPath - Output directory path (default: current directory)
 * @param {string} options.templatePath - Path to template directory
 * @param {string} options.themesLibraryPath - Path to themes library
 * @param {Function} options.validatePath - Path validation function
 * @returns {Promise<void>}
 */
async function createProject(projectName, options = {}) {
  const {
    outputPath: providedOutputPath,
    templatePath = path.join(__dirname, '../..', 'template'),
    themesLibraryPath = path.join(__dirname, '../..', 'themes'),
    validatePath
  } = options;

  // Validate project name
  if (!validateProjectName(projectName)) {
    console.error(`Invalid project name: "${projectName}"`);
    console.error('Project name must be lowercase, contain only letters, numbers, and hyphens.');
    throw new Error('Invalid project name');
  }

  // Determine output path
  let outputPath = providedOutputPath || process.cwd();

  // Build final project path
  const projectPath = path.join(outputPath, projectName);

  // Check if project already exists
  if (fs.existsSync(projectPath)) {
    console.error(`Directory "${projectName}" already exists.`);
    throw new Error('Project directory already exists');
  }

  console.log(`Creating Marp presentation: ${projectName}`);
  if (outputPath !== process.cwd()) {
    console.log(`  Location: ${projectPath}`);
  }
  console.log();

  // Create project directory
  fs.mkdirSync(projectPath, { recursive: true });

  // Copy template completely
  copyDir(templatePath, projectPath);

  // Copy lib scripts to project
  const rootLibPath = path.join(__dirname, '../..', 'lib');
  const projectScriptsLibPath = path.join(projectPath, 'scripts', 'lib');
  fs.mkdirSync(projectScriptsLibPath, { recursive: true });
  copyDir(rootLibPath, projectScriptsLibPath);

  // Verify marp.themeSet configuration exists in package.json
  ThemeManager.ensureThemeSetConfig(projectPath);

  console.log('✓ Project created');

  // Copy theme management documentation
  const themeDocsSource = path.join(__dirname, '../..', 'docs', 'theme-management.md');
  const themeDocsDest = path.join(projectPath, 'docs', 'theme-management.md');
  if (fs.existsSync(themeDocsSource)) {
    fs.mkdirSync(path.dirname(themeDocsDest), { recursive: true });
    fs.copyFileSync(themeDocsSource, themeDocsDest);
    console.log('✓ Theme management guide added');
  }

  // Add themes to project (prompts user interactively if TTY)
  let copied = [];
  if (process.stdin.isTTY) {
    // Interactive mode - prompt for themes
    console.log();
    const command = new AddThemesCommand({
      templatePath: themesLibraryPath,
      interactive: true
    });

    const result = await command.execute(projectPath, {
      themes: null  // Triggers built-in prompt
    });
    copied = result.copied;

    // Prompt for examples after themes are selected
    if (copied.length > 0) {
      console.log();
      const examples = await command._promptExamples(copied);
      if (examples.length > 0) {
        const examplesSourceDir = path.join(__dirname, '../..', 'examples');
        command._copyExamples(examples, projectPath, examplesSourceDir);
        console.log('✓ Example slides added');
      }
    }
  }
  // Non-interactive mode: skip theme addition entirely

  // Select and set active theme from copied themes
  if (copied && copied.length > 0) {
    console.log();
    const themeNames = copied.map(t => t.name);
    const activeTheme = await Prompts.promptActiveTheme(themeNames);
    const themeManager = new ThemeManager(projectPath);
    try {
      themeManager.setActiveTheme(activeTheme);
      console.log(`✓ Set active theme to "${activeTheme}"`);
    } catch (error) {
      console.warn(`  Warning: Could not set active theme: ${error.message}`);
    }
  } else {
    // No themes copied, set default active theme
    const themeManager = new ThemeManager(projectPath);
    try {
      themeManager.setActiveTheme('default');
      console.log(`✓ Set active theme to "default"`);
    } catch (error) {
      console.warn(`  Warning: Could not set active theme: ${error.message}`);
    }
  }

  console.log();

  // Run npm install
  console.log('Installing dependencies...');
  const installResult = spawnSync('npm', ['install'], {
    cwd: projectPath,
    stdio: 'inherit',
  });

  if (installResult.status !== 0) {
    console.error();
    console.error('Failed to install dependencies.');
    console.error('Please run "cd ' + projectName + ' && npm install" manually.');
    throw new Error('npm install failed');
  }

  console.log();
  console.log('✓ Dependencies installed');
  console.log();
  console.log('Next steps:');
  const cwdRelativePath = path.relative(process.cwd(), projectPath);
  const cdPath = cwdRelativePath.startsWith('..') ? projectPath : cwdRelativePath;
  const readmePath = path.join(cdPath, 'README.md');
  console.log(`  cd ${cdPath}`);
  console.log('  npm run dev        # Start live preview');
  console.log('  npm run theme:list # List available themes');
  console.log('  npm run theme:set <theme-name> # Set active theme');
  console.log('  npm run theme:add  # Add more themes to the project');
  console.log('  npm run build:all  # Build all formats');
  console.log('  Open project folder in vscode with Marp extension for editing your presentation');
  console.log(`  Read ${readmePath} for more information`);
  console.log('  Enjoy!');
  console.log();
}

module.exports = {
  createProject,
  validateProjectName,
  parsePathArg
};
