// tests/integration/theme-cli.test.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { getTempDir } = require('../helpers/test-output');

describe('theme-cli integration tests', () => {
  const tempDir = getTempDir('integration');
  const projectDir = path.join(tempDir, 'test-project');

  beforeEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('theme:list should show themes', () => {
    // Create test project structure
    fs.mkdirSync(projectDir, { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'scripts'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'themes'), { recursive: true });

    // Copy lib files
    const libSource = path.join(__dirname, '..', '..', 'lib');
    const libDest = path.join(projectDir, 'scripts', 'lib');
    fs.cpSync(libSource, libDest, { recursive: true });

    // Copy theme-cli.js from template
    const cliSource = path.join(__dirname, '..', '..', 'template', 'scripts', 'theme-cli.js');
    if (fs.existsSync(cliSource)) {
      fs.copyFileSync(cliSource, path.join(projectDir, 'scripts', 'theme-cli.js'));
    } else {
      console.log('Skipping test: theme-cli.js not found in template');
      return;
    }

    // Create test themes directory structure
    fs.mkdirSync(path.join(projectDir, 'themes', 'test-theme'), { recursive: true });
    fs.writeFileSync(
      path.join(projectDir, 'themes', 'test-theme', 'test-theme.css'),
      '/* @theme test-theme */\n@import "default";'
    );

    // Run theme:list
    const output = execSync('node scripts/theme-cli.js list', {
      cwd: projectDir,
      encoding: 'utf-8'
    });

    expect(output).toContain('test-theme');
  });

  test('theme:switch should update frontmatter', () => {
    // Create test project
    fs.mkdirSync(projectDir, { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'scripts'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'themes'), { recursive: true });

    // Copy lib files and theme-cli
    const libSource = path.join(__dirname, '..', '..', 'lib');
    const libDest = path.join(projectDir, 'scripts', 'lib');
    fs.cpSync(libSource, libDest, { recursive: true });

    const cliSource = path.join(__dirname, '..', '..', 'template', 'scripts', 'theme-cli.js');
    if (fs.existsSync(cliSource)) {
      fs.copyFileSync(cliSource, path.join(projectDir, 'scripts', 'theme-cli.js'));
    } else {
      console.log('Skipping test: theme-cli.js not found in template');
      return;
    }

    // Create presentation.md
    const presentationPath = path.join(projectDir, 'presentation.md');
    fs.writeFileSync(
      presentationPath,
      '---\nmarp: true\ntheme: default\n---\n\n# Test'
    );

    // Create test theme
    fs.mkdirSync(path.join(projectDir, 'themes', 'new-theme'), { recursive: true });
    fs.writeFileSync(
      path.join(projectDir, 'themes', 'new-theme', 'new-theme.css'),
      '/* @theme new-theme */'
    );

    // Run theme:switch (non-interactive)
    execSync('node scripts/theme-cli.js switch new-theme', {
      cwd: projectDir,
      encoding: 'utf-8'
    });

    // Verify presentation.md was updated
    const content = fs.readFileSync(presentationPath, 'utf-8');
    expect(content).toContain('theme: new-theme');
  });

  test('theme:sync should create VSCode settings', () => {
    // Create test project
    fs.mkdirSync(projectDir, { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'scripts'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'themes'), { recursive: true });

    // Copy lib files and theme-cli
    const libSource = path.join(__dirname, '..', '..', 'lib');
    const libDest = path.join(projectDir, 'scripts', 'lib');
    fs.cpSync(libSource, libDest, { recursive: true });

    const cliSource = path.join(__dirname, '..', '..', 'template', 'scripts', 'theme-cli.js');
    if (fs.existsSync(cliSource)) {
      fs.copyFileSync(cliSource, path.join(projectDir, 'scripts', 'theme-cli.js'));
    } else {
      console.log('Skipping test: theme-cli.js not found in template');
      return;
    }

    // Create test themes
    fs.mkdirSync(path.join(projectDir, 'themes', 'test-theme'), { recursive: true });
    fs.writeFileSync(
      path.join(projectDir, 'themes', 'test-theme', 'test-theme.css'),
      '/* @theme test-theme */'
    );

    // Run theme:sync
    const output = execSync('node scripts/theme-cli.js sync', {
      cwd: projectDir,
      encoding: 'utf-8'
    });

    // Verify .vscode/settings.json was created
    const settingsPath = path.join(projectDir, '.vscode', 'settings.json');
    expect(fs.existsSync(settingsPath)).toBe(true);

    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    expect(settings['markdown.marp.themes']).toBeDefined();
    expect(settings['markdown.marp.themes'].length).toBeGreaterThan(0);

    expect(output).toContain('Synced');
  });

  test('theme:list should show dependencies without CSS content', () => {
    // Create test project structure
    fs.mkdirSync(projectDir, { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'scripts'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'themes'), { recursive: true });

    // Copy lib files
    const libSource = path.join(__dirname, '..', '..', 'lib');
    const libDest = path.join(projectDir, 'scripts', 'lib');
    fs.cpSync(libSource, libDest, { recursive: true });

    // Copy theme-cli.js from template
    const cliSource = path.join(__dirname, '..', '..', 'template', 'scripts', 'theme-cli.js');
    if (fs.existsSync(cliSource)) {
      fs.copyFileSync(cliSource, path.join(projectDir, 'scripts', 'theme-cli.js'));
    } else {
      console.log('Skipping test: theme-cli.js not found in template');
      return;
    }

    // Create marpx-like theme with data: URL import
    fs.mkdirSync(path.join(projectDir, 'themes', 'marpx'), { recursive: true });
    fs.writeFileSync(
      path.join(projectDir, 'themes', 'marpx', 'marpx.css'),
      `/* @theme marpx */
@import "default";
@import url("data:text/css, .bespoke-marp-parent { top: 0 !important; } .bespoke-progress-parent { position: absolute; bottom: 0 !important; }");
@import url("https://fonts.googleapis.com/css2?family=Test&display=swap");`
    );

    // Run theme:list
    const output = execSync('node scripts/theme-cli.js list', {
      cwd: projectDir,
      encoding: 'utf-8'
    });

    // Should show theme with dependency, but NOT CSS content
    expect(output).toContain('marpx');
    expect(output).toContain('(depends on: default)');
    expect(output).not.toContain('data:text/css');
    expect(output).not.toContain('bespoke-marp-parent');
    expect(output).not.toContain('top: 0 !important');
  });
});

describe('theme:add command', () => {
  const { spawnSync } = require('child_process');
  const projectRoot = path.resolve(__dirname, '../..');
  const tempDir = getTempDir('theme-add-integration');

  beforeEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('adds themes to generated project using metapackage handler', async () => {
    // Create a temporary project structure
    const testProjectDir = path.join(tempDir, 'test-add-project');
    fs.mkdirSync(testProjectDir, { recursive: true });

    // Create minimal project structure (like after project creation)
    fs.mkdirSync(path.join(testProjectDir, 'themes'), { recursive: true });
    fs.writeFileSync(
      path.join(testProjectDir, 'presentation.md'),
      '---\nmarp: true\ntheme: default\n---\n\n# Test Presentation'
    );
    fs.writeFileSync(
      path.join(testProjectDir, 'package.json'),
      JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        marp: {
          themeSet: './themes'
        }
      }, null, 2)
    );

    // Run theme:add using local metapackage with non-interactive theme selection
    const result = spawnSync(
      'node',
      [path.join(projectRoot, 'index.js'), 'theme:add', testProjectDir, 'beam'],
      {
        cwd: testProjectDir,
        env: { ...process.env, NODE_ENV: 'test' }
      }
    );

    // Command should succeed
    expect(result.status).toBe(0);
    expect(result.stderr.toString()).not.toContain('Error');

    // Theme should be copied
    const themePath = path.join(testProjectDir, 'themes', 'beam', 'beam.css');
    expect(fs.existsSync(themePath)).toBe(true);

    // Verify theme content is valid (not node_modules content)
    const themeContent = fs.readFileSync(themePath, 'utf-8');
    expect(themeContent).toContain('/* @theme beam */');
    expect(themeContent).not.toContain('inquirer');  // Not from node_modules

    // Verify no node_modules files in themes directory
    const allFiles = getAllFiles(path.join(testProjectDir, 'themes'));
    const cssFiles = allFiles.filter(f => f.endsWith('.css'));

    // These files should NOT exist (they're from node_modules)
    const badFiles = cssFiles.filter(f =>
      f.includes('inquirer') ||
      f.includes('picocss') ||
      f.includes('node_modules')
    );

    expect(badFiles).toHaveLength(0);
  });

  function getAllFiles(dirPath, arrayOfFiles = []) {
    const files = fs.readdirSync(dirPath);
    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      if (fs.statSync(filePath).isDirectory()) {
        getAllFiles(filePath, arrayOfFiles);
      } else {
        arrayOfFiles.push(filePath);
      }
    });
    return arrayOfFiles;
  }
});
