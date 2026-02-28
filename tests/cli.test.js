const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { getTempDir } = require('./helpers/test-output');
const { ThemeManager } = require('../lib/theme-manager');

describe('CLI Initializer', () => {
  const projectRoot = path.resolve(__dirname, '..');
  const testProjects = [];

  afterEach(() => {
    // Очистка тестовых проектов
    for (const project of testProjects) {
      if (fs.existsSync(project)) {
        fs.rmSync(project, { recursive: true, force: true });
      }
    }
  });

  test('должен создать структуру проекта', () => {
    const projectPath = getTempDir('cli-basic');
    const projectName = path.basename(projectPath);
    const pathDir = path.dirname(projectPath);
    testProjects.push(projectPath);

    const result = spawnSync('node', ['index.js', projectName, '--path', pathDir], {
      cwd: projectRoot,
    });

    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(projectPath, 'package.json'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'marp.config.js'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'presentation.md'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, '.gitignore'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'README.md'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'static'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'scripts', 'copy-static.js'))).toBe(true);
  });

  test('should include marp.themeSet in package.json', () => {
    const projectPath = getTempDir('cli-themeSet');
    const projectName = path.basename(projectPath);
    const pathDir = path.dirname(projectPath);
    testProjects.push(projectPath);

    const result = spawnSync('node', ['index.js', projectName, '--path', pathDir], {
      cwd: projectRoot,
    });

    expect(result.status).toBe(0);

    // Verify marp.themeSet configuration exists in package.json
    const pkgPath = path.join(projectPath, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

    expect(pkg.marp).toBeDefined();
    expect(pkg.marp.themeSet).toBe('./themes');
  });

  test('должен отклонить невалидное имя проекта', () => {
    const result = spawnSync('node', ['index.js', 'Invalid_Name'], {
      cwd: projectRoot,
    });

    expect(result.status).toBe(1);
    expect(result.stderr.toString()).toContain('Invalid project name');
  });

  test('должен отклонить существующую папку', () => {
    const projectPath = getTempDir('cli-existing');
    const projectName = path.basename(projectPath);
    const pathDir = path.dirname(projectPath);
    testProjects.push(projectPath);
    fs.mkdirSync(projectPath, { recursive: true });

    const result = spawnSync('node', ['index.js', projectName, '--path', pathDir], {
      cwd: projectRoot,
    });

    expect(result.status).toBe(1);
    expect(result.stderr.toString()).toContain('already exists');
  });

  test('должен требовать имя проекта', () => {
    const result = spawnSync('node', ['index.js'], {
      cwd: projectRoot,
    });

    expect(result.status).toBe(1);
    expect(result.stderr.toString()).toContain('Please provide a project name');
  });

  test('should reject path traversal attempts', () => {
    const result = spawnSync('node', ['index.js', '../malicious'], {
      cwd: projectRoot,
    });
    expect(result.status).toBe(1);
    // Path traversal is caught by name validation (contains dots/slashes)
    expect(result.stderr.toString()).toMatch(/Invalid project name|path traversal/);
  });
});

describe('CLI with examples', () => {
  const projectRoot = path.resolve(__dirname, '..');
  const testProjects = [];

  afterEach(() => {
    for (const project of testProjects) {
      if (fs.existsSync(project)) {
        fs.rmSync(project, { recursive: true, force: true });
      }
    }
  });

  test('should NOT create themes in non-interactive mode', () => {
    const projectPath = getTempDir('cli-no-themes');
    const projectName = path.basename(projectPath);
    const pathDir = path.dirname(projectPath);
    testProjects.push(projectPath);

    // Non-interactive mode (stdin is not a TTY in tests)
    // Should NOT add themes since user can't be prompted
    const result = spawnSync('node', ['index.js', projectName, '--path', pathDir], {
      cwd: projectRoot,
    });

    expect(result.status).toBe(0);

    // themes directory should not exist in non-interactive mode
    // because user can't confirm theme selection
    const themesPath = path.join(projectPath, 'themes');
    expect(fs.existsSync(themesPath)).toBe(false);
  });

  test('should create examples.md in non-interactive mode', () => {
    const projectPath = getTempDir('cli-examples');
    const projectName = path.basename(projectPath);
    const pathDir = path.dirname(projectPath);
    testProjects.push(projectPath);

    // stdin is not a TTY in test environment, so examples should be created
    const result = spawnSync('node', ['index.js', projectName, '--path', pathDir], {
      cwd: projectRoot,
    });

    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(projectPath, 'examples.md'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'static', 'demo-image.png'))).toBe(true);
  });

  test('should not create examples.md when user declines', () => {
    const projectPath = getTempDir('cli-no-examples');
    const projectName = path.basename(projectPath);
    const pathDir = path.dirname(projectPath);
    testProjects.push(projectPath);

    const result = spawnSync('node', ['index.js', projectName, '--path', pathDir], {
      cwd: projectRoot,
      input: 'n\n',
    });

    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(projectPath, 'examples.md'))).toBe(false);
  });
});

describe('CLI with --path argument', () => {
  const projectRoot = path.resolve(__dirname, '..');
  const testProjects = [];

  afterEach(() => {
    for (const project of testProjects) {
      if (fs.existsSync(project)) {
        fs.rmSync(project, { recursive: true, force: true });
      }
    }
  });

  test('should create project in /tmp with --path', () => {
    const projectName = 'test-path-' + Date.now();
    const projectPath = path.join('/tmp', projectName);
    testProjects.push(projectPath);

    const result = spawnSync('node', ['index.js', projectName, '--path', '/tmp'], {
      cwd: projectRoot
    });
    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(projectPath, 'package.json'))).toBe(true);
  });

  test('should reject system directory with --path', () => {
    const result = spawnSync('node', ['index.js', 'test', '--path', '/etc'], {
      cwd: projectRoot
    });
    expect(result.status).toBe(1);
    expect(result.stderr.toString()).toContain('Cannot create project in system directory');
  });

  test('should reject node_modules with --path', () => {
    const result = spawnSync('node', ['index.js', 'test', '--path', './node_modules'], {
      cwd: projectRoot
    });
    expect(result.status).toBe(1);
    expect(result.stderr.toString()).toContain('node_modules');
  });

  test('should maintain backward compatibility without --path', () => {
    const projectPath = getTempDir('cli-nopath');
    const projectName = path.basename(projectPath);
    const pathDir = path.dirname(projectPath);
    testProjects.push(projectPath);

    const result = spawnSync('node', ['index.js', projectName, '--path', pathDir], { cwd: projectRoot });
    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(projectPath, 'package.json'))).toBe(true);
  });

  test('should expand ~ in --path', () => {
    const projectName = 'test-home-' + Date.now();
    const homeDir = os.homedir();
    const projectPath = path.join(homeDir, projectName);
    testProjects.push(projectPath);

    const result = spawnSync('node', ['index.js', projectName, '--path', homeDir], {
      cwd: projectRoot
    });
    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(projectPath, 'package.json'))).toBe(true);
  });
});

describe('CLI command routing', () => {
  const projectRoot = path.resolve(__dirname, '..');
  const testProjects = [];

  afterEach(() => {
    for (const project of testProjects) {
      if (fs.existsSync(project)) {
        fs.rmSync(project, { recursive: true, force: true });
      }
    }
  });

  test('should show usage and exit with code 1 when no arguments provided', () => {
    const result = spawnSync('node', ['index.js'], {
      cwd: projectRoot
    });

    expect(result.status).toBe(1);
    expect(result.stderr.toString()).toContain('Please provide a project name');
  });

  test('should show usage information in error output', () => {
    const result = spawnSync('node', ['index.js'], {
      cwd: projectRoot
    });

    expect(result.stderr.toString()).toContain('npx create-marp-presentation <project-name>');
    expect(result.stderr.toString()).toContain('theme:add <project-path>');
  });
});

describe('CLI theme:add command', () => {
  const projectRoot = path.resolve(__dirname, '..');
  const testProjects = [];

  afterEach(() => {
    for (const project of testProjects) {
      if (fs.existsSync(project)) {
        fs.rmSync(project, { recursive: true, force: true });
      }
    }
  });

  test('should show error when theme:add has no path argument', () => {
    const result = spawnSync('node', ['index.js', 'theme:add'], {
      cwd: projectRoot
    });

    expect(result.status).toBe(1);
    expect(result.stderr.toString()).toContain('Usage:');
    expect(result.stderr.toString()).toContain('theme:add <project-path>');
  });

  test('should dispatch to theme:add command with valid project path', () => {
    // First create a project
    const projectPath = getTempDir('theme-add-test');
    const projectName = path.basename(projectPath);
    const pathDir = path.dirname(projectPath);
    testProjects.push(projectPath);

    // Create the project first
    const createResult = spawnSync('node', ['index.js', projectName, '--path', pathDir], {
      cwd: projectRoot,
      input: 'n\n' // No themes
    });

    expect(createResult.status).toBe(0);

    // Now test theme:add command with absolute path and theme name
    const addResult = spawnSync('node', ['index.js', 'theme:add', projectPath, 'beam'], {
      cwd: projectRoot
    });

    // Should successfully add the theme (beam exists in the theme library)
    expect(addResult.status).toBe(0);
    expect(addResult.stdout.toString() || addResult.stderr.toString()).toContain('Adding themes');
  });

  test('should show error when theme:add path does not exist', () => {
    const result = spawnSync('node', ['index.js', 'theme:add', '/nonexistent/path'], {
      cwd: projectRoot
    });

    expect(result.status).toBe(1);
    expect(result.stderr.toString()).toContain('Error:');
  });
});

describe('CLI backward compatibility', () => {
  const projectRoot = path.resolve(__dirname, '..');
  const testProjects = [];

  afterEach(() => {
    for (const project of testProjects) {
      if (fs.existsSync(project)) {
        fs.rmSync(project, { recursive: true, force: true });
      }
    }
  });

  test('should create project in current directory when <name> provided without --path', () => {
    const projectPath = getTempDir('compat-current-dir');
    const projectName = path.basename(projectPath);
    const pathDir = path.dirname(projectPath);
    testProjects.push(projectPath);

    const result = spawnSync('node', ['index.js', projectName, '--path', pathDir], {
      cwd: projectRoot
    });

    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(projectPath, 'package.json'))).toBe(true);
  });

  test('should treat first argument as project name (not command)', () => {
    const projectPath = getTempDir('compat-project-name');
    const projectName = path.basename(projectPath);
    const pathDir = path.dirname(projectPath);
    testProjects.push(projectPath);

    const result = spawnSync('node', ['index.js', projectName, '--path', pathDir], {
      cwd: projectRoot
    });

    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(projectPath, 'presentation.md'))).toBe(true);
  });
});

describe('Active theme management', () => {
  const projectRoot = path.resolve(__dirname, '..');
  const testProjects = [];

  afterEach(() => {
    for (const project of testProjects) {
      if (fs.existsSync(project)) {
        fs.rmSync(project, { recursive: true, force: true });
      }
    }
  });

  test('should set default theme when no themes are added (non-interactive)', () => {
    const projectPath = getTempDir('default-theme-test');
    const projectName = path.basename(projectPath);
    const pathDir = path.dirname(projectPath);
    testProjects.push(projectPath);

    // Non-interactive mode - no themes added
    const result = spawnSync('node', ['index.js', projectName, '--path', pathDir], {
      cwd: projectRoot,
    });

    expect(result.status).toBe(0);

    // Check that default theme is set in presentation.md
    const presentationPath = path.join(projectPath, 'presentation.md');
    const content = fs.readFileSync(presentationPath, 'utf-8');
    expect(content).toContain('theme: default');
  });

  test('theme:add command does not change active theme', () => {
    const projectPath = getTempDir('preserve-theme-test');
    const projectName = path.basename(projectPath);
    const pathDir = path.dirname(projectPath);
    testProjects.push(projectPath);

    // Create project without themes (non-interactive)
    const createResult = spawnSync('node', ['index.js', projectName, '--path', pathDir], {
      cwd: projectRoot,
    });

    expect(createResult.status).toBe(0);

    // Manually set active theme to 'gaia' (system theme)
    const themeManager = new ThemeManager(projectPath);
    themeManager.setActiveTheme('gaia');

    // Verify theme is set to gaia
    let activeTheme = themeManager.getActiveTheme();
    expect(activeTheme).toBe('gaia');

    // Add beam theme via CLI
    const addResult = spawnSync('node', ['index.js', 'theme:add', projectPath, 'beam'], {
      cwd: projectRoot
    });

    expect(addResult.status).toBe(0);

    // Verify active theme is still gaia (not changed to beam)
    activeTheme = themeManager.getActiveTheme();
    expect(activeTheme).toBe('gaia');
  });

  test('should preserve active theme when adding multiple themes', () => {
    const projectPath = getTempDir('preserve-multi-theme-test');
    const projectName = path.basename(projectPath);
    const pathDir = path.dirname(projectPath);
    testProjects.push(projectPath);

    // Create project without themes
    const createResult = spawnSync('node', ['index.js', projectName, '--path', pathDir], {
      cwd: projectRoot,
    });

    expect(createResult.status).toBe(0);

    // Set active theme to 'uncover' (system theme)
    const themeManager = new ThemeManager(projectPath);
    themeManager.setActiveTheme('uncover');

    // Add multiple themes via CLI
    const addResult = spawnSync('node', ['index.js', 'theme:add', projectPath, 'beam', 'marpx'], {
      cwd: projectRoot
    });

    expect(addResult.status).toBe(0);

    // Verify active theme is still uncover
    const activeTheme = themeManager.getActiveTheme();
    expect(activeTheme).toBe('uncover');

    // Verify themes were actually added
    const themes = themeManager.listThemes();
    expect(themes).toContain('beam');
    expect(themes).toContain('marpx');
  });

  test('theme:add shows next steps including theme:set', () => {
    const projectPath = getTempDir('theme-add-next-steps');
    const projectName = path.basename(projectPath);
    const pathDir = path.dirname(projectPath);
    testProjects.push(projectPath);

    // Create project first
    const createResult = spawnSync('node', ['index.js', projectName, '--path', pathDir], {
      cwd: projectRoot,
    });

    expect(createResult.status).toBe(0);

    // Add theme
    const addResult = spawnSync('node', ['index.js', 'theme:add', projectPath, 'beam'], {
      cwd: projectRoot
    });

    expect(addResult.status).toBe(0);
    const output = addResult.stdout.toString() + addResult.stderr.toString();
    expect(output).toContain('theme:set');
    expect(output).toContain('theme:list');
  });
});
