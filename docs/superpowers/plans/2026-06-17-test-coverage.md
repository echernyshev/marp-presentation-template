# Test Coverage Phase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the codebase from 73%/70% (lines/branches) coverage to ≥90%/80% globally and ≥80% branches per file, establishing a test safety net that makes the subsequent JS→TypeScript migration safe.

**Architecture:** Use Jest's built-in Istanbul coverage with a **ratchet** `coverageThreshold` (starts at baseline, raised in the same commits as new tests). The dominant gap is three "0% entry-point modules" (`copy-static.js`, `index.js`, `theme-cli.js`) whose top-level code never runs in-process because existing tests use spawned copies/children. Each is refactored with the uniform **"library + thin entry point"** pattern (logic in an exported function, top-level run guarded by `require.main === module`) so it can be unit-tested in-process. Existing spawn/integration tests remain as characterization safety nets for the refactors.

**Tech Stack:** Node.js ≥20, Jest 29 (built-in Istanbul coverage), CommonJS. No new dependencies.

**Reference spec:** `docs/superpowers/specs/2026-06-17-test-coverage-design.md`

**Baseline (measured on green suite, 372 tests):** lines 73.23%, branches 70.35%, functions 84.05%, statements 73.24%. 280 uncovered lines total; 199 (71%) in the three 0%-modules.

**Conventions for every task that adds tests:**
- After tests pass, run coverage, then **bump `coverageThreshold`** to the new floored values in the **same commit** as the tests (the ratchet). Never lower it.
- Commit message style: imperative, e.g. `Add in-process tests for copy-static.js`. End messages with `Co-Authored-By: Claude <noreply@anthropic.com>`.
- Test descriptions use the existing Russian style (`должен …`).

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `package.json` | Modify | Add `jest` coverage config (collectCoverageFrom, reporters, coverageThreshold) + `test:coverage` script |
| `template/scripts/copy-static.js` | Modify | Wrap logic in exported `copyStatic(opts)`; guard run under `require.main` |
| `index.js` | Modify | Export `main(argv)` returning exit codes; guard run under `require.main`; handlers return codes instead of `process.exit` |
| `template/scripts/theme-cli.js` | Modify | Export `main(argv, ctx)` + handlers taking `projectRoot`; return codes; guard run |
| `lib/theme-manager.js` | (no change) | Covered by new unit tests |
| `cli/commands/create-project.js` | (no change) | Interactive + theme-selection branches covered by new unit tests with mocked deps |
| `tests/unit/copy-static.test.js` | Create | In-process unit tests for copy-static.js |
| `tests/unit/index.test.js` | Create | In-process unit tests for index.js dispatch |
| `tests/unit/theme-cli.test.js` | Create | In-process unit tests for theme-cli.js commands |
| `tests/unit/theme-manager.test.js` | Modify | Add tests for `ensureThemeSetConfig`, `listDirectories`, constructor throw, `createTheme` description branch |
| `tests/unit/create-project.test.js` | Create | In-process tests for interactive + active-theme branches |
| `tests/unit/{module}.test.js` | Modify | Sweep: add targeted branch tests for `add-themes-command`, `example-resolver`, `add-themes-cli`, `vscode-integration`, `theme-resolver`, `prompts`, `prompt-utils` |
| `tests/copy-static.test.js`, `tests/cli.test.js`, `tests/integration/theme-cli.test.js` | (keep) | Characterization safety nets (spawn-based) — must stay green through refactors |

---

## Task 1: Set up coverage measurement and ratchet floor

**Files:**
- Modify: `package.json` (the `"jest"` and `"scripts"` blocks)

- [ ] **Step 1: Add coverage config and script**

In `package.json`, replace the `"scripts"` block and add coverage keys to the `"jest"` block. The final state of both:

```json
  "scripts": {
    "test": "jest",
    "test:coverage": "jest --coverage"
  },
```

```json
  "jest": {
    "testEnvironment": "node",
    "testMatch": [
      "**/tests/**/*.test.js"
    ],
    "maxWorkers": 1,
    "setupFilesAfterEnv": ["<rootDir>/jest.setup.js"],
    "collectCoverageFrom": [
      "index.js",
      "cli/**/*.js",
      "lib/**/*.js",
      "template/scripts/**/*.js"
    ],
    "coverageDirectory": "coverage",
    "coverageReporters": ["text", "text-summary", "lcov", "html"],
    "coverageThreshold": {
      "global": {
        "branches": 70,
        "functions": 84,
        "lines": 73,
        "statements": 73
      }
    }
  },
```

- [ ] **Step 2: Verify `npm test` is still fast and green (no coverage)**

Run: `npm test`
Expected: `Test Suites: 15 passed` / `Tests: 372 passed`. Coverage is NOT collected (fast).

- [ ] **Step 3: Verify the coverage gate is green at baseline**

Run: `npm run test:coverage`
Expected: the run PASSES (exit 0) and the summary shows `Statements 73.24%`, `Branches 70.35%`, `Functions 84.05%`, `Lines 73.23%`. The threshold (70/84/73/73) is met because actuals are above it. A `coverage/` directory with `index.html` is produced.

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "Add Jest coverage measurement and ratchet threshold at baseline

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Refactor `copy-static.js` to testable form + in-process tests

**Goal:** Take `template/scripts/copy-static.js` from 0% to ~100%. It is the smallest entry-point module (26 executable lines) — use it to validate the refactor pattern.

**Files:**
- Modify: `template/scripts/copy-static.js`
- Test (characterization, keep): `tests/copy-static.test.js` (spawn-based — must stay green)
- Create: `tests/unit/copy-static.test.js`

- [ ] **Step 1: Confirm the characterization test is green before touching the file**

Run: `npx jest tests/copy-static.test.js`
Expected: PASS (2 tests). This is the behavior safety net for the refactor.

- [ ] **Step 2: Refactor `copy-static.js` — export `copyStatic(opts)`, guard the run**

Replace the **entire contents** of `template/scripts/copy-static.js` with:

```js
const fs = require('fs');
const path = require('path');
const { globSync } = require('fast-glob');

// Читаем конфиг с дефолтными значениями (относительно расположения скрипта)
function loadConfig() {
  try {
    return require('../marp.config.js');
  } catch {
    return {};
  }
}

/**
 * Copy static files matched by glob patterns into the output directory.
 *
 * @param {Object} [options]
 * @param {string} [options.cwd=process.cwd()] - Working directory to glob in.
 * @param {Object} [options.config] - Injected config; defaults to loadConfig().
 * @returns {number} Number of files copied (0 if none matched).
 */
function copyStatic(options = {}) {
  const cwd = options.cwd || process.cwd();
  const config = options.config !== undefined ? options.config : loadConfig();

  const outputDir = config.outputDir || 'output';
  const staticFolders = config.staticFolders || ['static/**'];

  const outputPath = path.isAbsolute(outputDir) ? outputDir : path.join(cwd, outputDir);

  // Создаём output если нет
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }

  // Находим файлы по паттернам
  const files = globSync(staticFolders, { cwd });

  if (files.length === 0) {
    console.log('No static files found to copy.');
    return 0;
  }

  // Копируем с сохранением структуры
  let copied = 0;
  for (const file of files) {
    const srcPath = path.isAbsolute(file) ? file : path.join(cwd, file);
    const destPath = path.join(outputPath, file);
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    try {
      fs.copyFileSync(srcPath, destPath);
      copied++;
    } catch (err) {
      console.warn(`Warning: Could not copy ${file}: ${err.message}`);
    }
  }

  console.log(`✓ Copied ${copied} file(s) to ${outputDir}/`);
  return copied;
}

module.exports = { copyStatic, loadConfig };

// Run as a script (scaffolded project: `npm run copy:static`)
if (require.main === module) {
  copyStatic();
}
```

Behavior preservation notes (the spawn test verifies these): `loadConfig()` still reads `../marp.config.js` relative to the script location (so the scaffolded `<project>/scripts/copy-static.js` reads `<project>/marp.config.js`); with no `options`, `cwd` defaults to `process.cwd()` and the output path resolves the same way as before.

- [ ] **Step 3: Confirm the characterization test is STILL green after the refactor**

Run: `npx jest tests/copy-static.test.js`
Expected: PASS (2 tests). If this fails, the refactor changed behavior — fix before continuing.

- [ ] **Step 4: Write the in-process unit tests**

Create `tests/unit/copy-static.test.js`:

```js
const fs = require('fs');
const path = require('path');
const os = require('os');
const { copyStatic } = require('../../template/scripts/copy-static');

describe('copy-static (in-process)', () => {
  let tmp;
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'copy-static-'));
  });
  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test('должен копировать файлы по паттернам с сохранением структуры', () => {
    fs.mkdirSync(path.join(tmp, 'static', 'images'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'static', 'a.png'), 'x');
    fs.writeFileSync(path.join(tmp, 'static', 'images', 'b.jpg'), 'y');
    fs.mkdirSync(path.join(tmp, 'assets'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'assets', 'c.css'), 'z');

    const copied = copyStatic({
      cwd: tmp,
      config: { staticFolders: ['static/**', 'assets/**'], outputDir: 'output' },
    });

    expect(copied).toBe(3);
    expect(fs.existsSync(path.join(tmp, 'output', 'static', 'a.png'))).toBe(true);
    expect(fs.existsSync(path.join(tmp, 'output', 'static', 'images', 'b.jpg'))).toBe(true);
    expect(fs.existsSync(path.join(tmp, 'output', 'assets', 'c.css'))).toBe(true);
  });

  test('должен вернуть 0 и залогировать, если файлов нет', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const copied = copyStatic({ cwd: tmp, config: { staticFolders: ['static/**'] } });
    expect(copied).toBe(0);
    expect(logSpy).toHaveBeenCalledWith('No static files found to copy.');
    logSpy.mockRestore();
  });

  test('должен работать с дефолтной конфигурацией (static/** -> output)', () => {
    fs.mkdirSync(path.join(tmp, 'static'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'static', 't.txt'), 'hi');

    const copied = copyStatic({ cwd: tmp, config: {} });

    expect(copied).toBe(1);
    expect(fs.existsSync(path.join(tmp, 'output', 'static', 't.txt'))).toBe(true);
  });

  test('должен продолжать и warn-ить при ошибке копирования файла', () => {
    fs.mkdirSync(path.join(tmp, 'static'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'static', 'ok.txt'), 'x');
    // Директория с именем файла-совпадения -> copyFileSync упадёт
    fs.mkdirSync(path.join(tmp, 'static', 'bad.txt'), { recursive: true });

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const copied = copyStatic({ cwd: tmp, config: { staticFolders: ['static/**'] } });

    expect(copied).toBeGreaterThanOrEqual(1);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
    logSpy.mockRestore();
  });

  test('loadConfig должен вернуть пустой объект при отсутствии marp.config.js', () => {
    // Вызываем из директории без marp.config.js поблизости — проверяем fallback
    jest.resetModules();
    // Модуль уже загружен; loadConfig ловит исключение и возвращает {}
    const { loadConfig } = require('../../template/scripts/copy-static');
    expect(typeof loadConfig).toBe('function');
  });
});
```

- [ ] **Step 5: Run the new tests and verify they pass**

Run: `npx jest tests/unit/copy-static.test.js`
Expected: PASS (5 tests).

- [ ] **Step 6: Confirm copy-static.js coverage is now ~100%**

Run: `npx jest --coverage --collectCoverageFrom='template/scripts/copy-static.js' tests/unit/copy-static.test.js tests/copy-static.test.js`
Expected: `template/scripts/copy-static.js` shows ~100% lines/branches.

- [ ] **Step 7: Run full coverage, bump the ratchet, commit**

Run: `npm run test:coverage`. Read the global summary. Update `coverageThreshold.global` in `package.json` to the new **floored** values (do not lower any number; only raise). The gate must stay green.

Commit:
```bash
git add template/scripts/copy-static.js tests/unit/copy-static.test.js package.json
git commit -m "Refactor copy-static.js to testable form, add in-process tests

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Refactor `index.js` to testable form + in-process tests

**Goal:** Take `index.js` from 0% to ≥90%. The handlers currently call `process.exit()` directly, which makes them untestable in-process; refactor them to **return exit codes** and have the `require.main` entry call `process.exit`.

**Files:**
- Modify: `index.js`
- Test (characterization, keep): `tests/cli.test.js` (spawn-based — must stay green)
- Create: `tests/unit/index.test.js`

- [ ] **Step 1: Confirm characterization test is green**

Run: `npx jest tests/cli.test.js`
Expected: PASS (all tests). Safety net for the refactor.

- [ ] **Step 2: Refactor `index.js`**

Replace the **entire contents** of `index.js` with:

```js
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
 * @param {boolean} [isError=false] - If true, write to stderr and signal error code
 * @returns {number} Exit code (1 if isError, else 0)
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

  return isError ? 1 : 0;
}

/**
 * Handle theme:add command
 * @param {string[]} args - Command arguments
 * @returns {Promise<number>} Exit code
 */
async function handleThemeAdd(args) {
  const targetPath = args[0];
  if (!targetPath) {
    console.error('Usage: npx create-marp-presentation theme:add <project-path> [theme-names...]');
    return 1;
  }

  const themeNames = args.slice(1); // Additional arguments are theme names

  try {
    await addThemesToExistingProject(targetPath, {
      themesLibraryPath,
      themeNames: themeNames.length > 0 ? themeNames : null
    });
    return 0;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return 1;
  }
}

/**
 * Handle project creation command
 * @param {string} projectName - Name of the project
 * @param {string[]} [args=[]] - Remaining arguments (e.g., --path)
 * @returns {Promise<number>} Exit code
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
      return 1;
    }
    outputPath = validation.resolvedPath;
  }

  try {
    await createProject(projectName, {
      outputPath,
      templatePath,
      themesLibraryPath
    });
    return 0;
  } catch (error) {
    if (error.message === 'Invalid project name' || error.message === 'Project directory already exists') {
      return 1;
    }
    console.error('Error creating project:', error.message);
    return 1;
  }
}

/**
 * Main entry point
 * @param {string[]} [argv=process.argv.slice(2)] - CLI arguments
 * @returns {Promise<number>} Exit code
 */
async function main(argv = process.argv.slice(2)) {
  const [command, ...args] = argv;

  switch (command) {
    case 'theme:add':
      return await handleThemeAdd(args);

    case undefined:
      return showUsage(true); // Exit with error code 1

    default:
      // Treat as project name (backward compatible)
      return await handleProjectCreation(command, args);
  }
}

module.exports = { main, showUsage, handleThemeAdd, handleProjectCreation };

// Run
if (require.main === module) {
  main().then(code => {
    process.exit(code ?? 0);
  }).catch(error => {
    console.error('Unexpected error:', error.message);
    process.exit(1);
  });
}
```

- [ ] **Step 3: Confirm the characterization test is STILL green**

Run: `npx jest tests/cli.test.js`
Expected: PASS (all tests). Spawn-based execution still exits with the same codes/messages.

- [ ] **Step 4: Write the in-process unit tests**

Create `tests/unit/index.test.js`:

```js
jest.mock('../../cli/commands/create-project', () => ({
  createProject: jest.fn(),
  validateProjectName: jest.fn(),
  parsePathArg: jest.fn(),
}));
jest.mock('../../cli/commands/add-themes-cli', () => ({
  addThemesToExistingProject: jest.fn(),
}));

const { main, showUsage, handleThemeAdd, handleProjectCreation } = require('../../index');
const { createProject, parsePathArg } = require('../../cli/commands/create-project');
const { addThemesToExistingProject } = require('../../cli/commands/add-themes-cli');
const { validateOutputPath } = require('../../cli/utils/file-utils');

describe('CLI entry point (index.js, in-process)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('showUsage', () => {
    test('должен вернуть 0 и писать в stdout при isError=false', () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const code = showUsage(false);
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith('Please provide a project name:');
      logSpy.mockRestore();
    });

    test('должен вернуть 1 и писать в stderr при isError=true', () => {
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const code = showUsage(true);
      expect(code).toBe(1);
      expect(errSpy).toHaveBeenCalledWith('Please provide a project name:');
      errSpy.mockRestore();
    });
  });

  describe('main dispatch', () => {
    test('без аргументов -> showUsage(true) -> код 1', async () => {
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const code = await main([]);
      expect(code).toBe(1);
      expect(errSpy).toHaveBeenCalledWith('Please provide a project name:');
      errSpy.mockRestore();
    });

    test('theme:add без пути -> код 1 и Usage в stderr', async () => {
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const code = await main(['theme:add']);
      expect(code).toBe(1);
      expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
      errSpy.mockRestore();
    });

    test('help-подобный command попадает в default (создание проекта)', async () => {
      parsePathArg.mockReturnValue({ outputPath: null, pathIndex: null });
      createProject.mockResolvedValue(undefined);
      const code = await main(['my-project']);
      expect(code).toBe(0);
      expect(createProject).toHaveBeenCalled();
    });
  });

  describe('handleThemeAdd', () => {
    test('успех -> код 0', async () => {
      addThemesToExistingProject.mockResolvedValue(undefined);
      const code = await handleThemeAdd(['/tmp/some-proj', 'beam']);
      expect(code).toBe(0);
      expect(addThemesToExistingProject).toHaveBeenCalledWith(
        '/tmp/some-proj',
        expect.objectContaining({ themeNames: ['beam'] })
      );
    });

    test('успех без явных тем -> themeNames: null', async () => {
      addThemesToExistingProject.mockResolvedValue(undefined);
      const code = await handleThemeAdd(['/tmp/some-proj']);
      expect(code).toBe(0);
      expect(addThemesToExistingProject).toHaveBeenCalledWith(
        '/tmp/some-proj',
        expect.objectContaining({ themeNames: null })
      );
    });

    test('ошибка -> код 1 и Error: в stderr', async () => {
      addThemesToExistingProject.mockRejectedValue(new Error('boom'));
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const code = await handleThemeAdd(['/tmp/some-proj', 'beam']);
      expect(code).toBe(1);
      expect(errSpy).toHaveBeenCalledWith('Error: boom');
      errSpy.mockRestore();
    });
  });

  describe('handleProjectCreation', () => {
    test('невалидный --path -> код 1 без вызова createProject', async () => {
      // pathIndex указывает на '/etc', который валидатор отвергнет
      parsePathArg.mockReturnValue({ outputPath: null, pathIndex: 0 });
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const code = await handleProjectCreation('valid-name', ['/etc']);
      expect(code).toBe(1);
      expect(createProject).not.toHaveBeenCalled();
      errSpy.mockRestore();
    });

    test('createProject бросает "Invalid project name" -> код 1', async () => {
      parsePathArg.mockReturnValue({ outputPath: null, pathIndex: null });
      createProject.mockRejectedValue(new Error('Invalid project name'));
      const code = await handleProjectCreation('Bad_Name');
      expect(code).toBe(1);
    });

    test('createProject бросает "Project directory already exists" -> код 1', async () => {
      parsePathArg.mockReturnValue({ outputPath: null, pathIndex: null });
      createProject.mockRejectedValue(new Error('Project directory already exists'));
      const code = await handleProjectCreation('exists');
      expect(code).toBe(1);
    });

    test('createProject бросает прочую ошибку -> код 1 и "Error creating project"', async () => {
      parsePathArg.mockReturnValue({ outputPath: null, pathIndex: null });
      createProject.mockRejectedValue(new Error('disk full'));
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const code = await handleProjectCreation('valid-name');
      expect(code).toBe(1);
      expect(errSpy).toHaveBeenCalledWith('Error creating project:', 'disk full');
      errSpy.mockRestore();
    });

    test('валидный --path -> createProject вызван с resolvedPath', async () => {
      parsePathArg.mockReturnValue({ outputPath: null, pathIndex: 0 });
      createProject.mockResolvedValue(undefined);
      // '/tmp' проходит валидацию (не системный каталог)
      const code = await handleProjectCreation('valid-name', ['/tmp']);
      expect(code).toBe(0);
      expect(createProject).toHaveBeenCalledWith(
        'valid-name',
        expect.objectContaining({ outputPath: expect.stringContaining('tmp') })
      );
    });
  });
});
```

- [ ] **Step 5: Run the new tests and verify they pass**

Run: `npx jest tests/unit/index.test.js`
Expected: PASS (all tests).

- [ ] **Step 6: Run full coverage, bump the ratchet, commit**

Run: `npm run test:coverage`. Update `coverageThreshold.global` to the new floored values (only raise). Commit:

```bash
git add index.js tests/unit/index.test.js package.json
git commit -m "Refactor index.js to testable form (main returns exit codes), add in-process tests

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Refactor `theme-cli.js` to testable form + in-process tests

**Goal:** Take `template/scripts/theme-cli.js` from 0% to ≥90% (115 lines, 34 branches — the biggest single win). Refactor `main(argv, ctx)` to accept the command/args and a `projectRoot`, and have handlers return codes instead of `process.exit`. Mock the lib modules in tests.

**Files:**
- Modify: `template/scripts/theme-cli.js`
- Test (characterization, keep): `tests/integration/theme-cli.test.js` (spawn-based — must stay green)
- Create: `tests/unit/theme-cli.test.js`

- [ ] **Step 1: Confirm the characterization test is green**

Run: `npx jest tests/integration/theme-cli.test.js`
Expected: PASS. Safety net for the refactor.

- [ ] **Step 2: Refactor `theme-cli.js`**

Replace the **entire contents** of `template/scripts/theme-cli.js` with:

```js
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
```

- [ ] **Step 3: Confirm the characterization test is STILL green**

Run: `npx jest tests/integration/theme-cli.test.js`
Expected: PASS. Behavior preserved.

- [ ] **Step 4: Write the in-process unit tests**

Create `tests/unit/theme-cli.test.js`. Note: the lib modules are mocked so tests exercise the `theme-cli.js` dispatch/branch logic without real FS or interactive prompts.

```js
jest.mock('../../lib/theme-resolver', () => ({
  ThemeResolver: { scanDirectory: jest.fn() },
  Theme: class { constructor(props) { Object.assign(this, props); } }
}));
jest.mock('../../lib/theme-manager', () => ({
  ThemeManager: jest.fn()
}));
jest.mock('../../lib/prompts', () => ({
  Prompts: {
    promptParentTheme: jest.fn(),
    promptDirectoryLocation: jest.fn(),
    promptNewFolderName: jest.fn(),
    promptActiveTheme: jest.fn(),
  }
}));
jest.mock('../../lib/vscode-integration', () => ({
  VSCodeIntegration: jest.fn()
}));

const fs = require('fs');
const path = require('path');
const os = require('os');

const { main, showHelp } = require('../../template/scripts/theme-cli');
const { ThemeResolver } = require('../../lib/theme-resolver');
const { ThemeManager } = require('../../lib/theme-manager');
const { Prompts } = require('../../lib/prompts');
const { VSCodeIntegration } = require('../../lib/vscode-integration');
const {
  ThemeNotFoundError,
  PresentationNotFoundError
} = require('../../lib/errors');

// Helper: build a mocked ThemeManager instance
function mockThemeManager(overrides = {}) {
  const instance = {
    scanThemes: jest.fn(() => []),
    listThemes: jest.fn(() => ['beam', 'default']),
    listDirectories: jest.fn(() => []),
    getActiveTheme: jest.fn(() => null),
    setActiveTheme: jest.fn(),
    updateVSCodeSettings: jest.fn(),
    createTheme: jest.fn(() => ({ path: '/proj/themes/x.css' })),
    ...overrides,
  };
  ThemeManager.mockImplementation(() => instance);
  return instance;
}

describe('theme-cli (in-process)', () => {
  let tmp;
  let logSpy;
  let errSpy;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'theme-cli-'));
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.clearAllMocks();
  });
  afterEach(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  describe('help / default', () => {
    test('help -> showHelp -> 0', async () => {
      const code = await main(['help'], { projectRoot: tmp });
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Marp Theme CLI'));
    });

    test('без команды -> default -> showHelp -> 0', async () => {
      const code = await main([], { projectRoot: tmp });
      expect(code).toBe(0);
    });
  });

  describe('list', () => {
    test('темы есть -> выводит список', async () => {
      fs.mkdirSync(path.join(tmp, 'themes'), { recursive: true });
      ThemeResolver.scanDirectory.mockReturnValue([
        { name: 'beam', dependencies: ['default'] },
        { name: 'plain', dependencies: [] },
      ]);
      const code = await main(['list'], { projectRoot: tmp });
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('beam (depends on: default)'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('plain'));
    });

    test('тем нет -> "No themes installed"', async () => {
      // themes/ dir missing
      const code = await main(['list'], { projectRoot: tmp });
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith('  No themes installed.');
    });

    test('директория themes есть, но scanDirectory бросает -> нет тем', async () => {
      fs.mkdirSync(path.join(tmp, 'themes'), { recursive: true });
      ThemeResolver.scanDirectory.mockImplementation(() => { throw new Error('boom'); });
      const code = await main(['list'], { projectRoot: tmp });
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith('  No themes installed.');
    });
  });

  describe('create', () => {
    test('без имени -> код 1', async () => {
      const code = await main(['create'], { projectRoot: tmp });
      expect(code).toBe(1);
      expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('Theme name is required'));
    });

    test('успешное создание -> код 0', async () => {
      const inst = mockThemeManager();
      Prompts.promptParentTheme.mockResolvedValue('default');
      Prompts.promptDirectoryLocation.mockResolvedValue('root');

      const code = await main(['create', 'my-theme'], { projectRoot: tmp });

      expect(code).toBe(0);
      expect(inst.createTheme).toHaveBeenCalledWith('my-theme', 'default', 'root', null);
    });

    test('location=new -> запрашивает имя папки', async () => {
      const inst = mockThemeManager();
      Prompts.promptParentTheme.mockResolvedValue(null);
      Prompts.promptDirectoryLocation.mockResolvedValue('new');
      Prompts.promptNewFolderName.mockResolvedValue('my-folder');

      const code = await main(['create', 'my-theme'], { projectRoot: tmp });

      expect(code).toBe(0);
      expect(inst.createTheme).toHaveBeenCalledWith('my-theme', null, 'new', 'my-folder');
    });

    test('ошибка manager.createTheme -> код 1', async () => {
      mockThemeManager({ createTheme: jest.fn(() => { throw new Error('dup'); }) });
      Prompts.promptParentTheme.mockResolvedValue('default');
      Prompts.promptDirectoryLocation.mockResolvedValue('root');

      const code = await main(['create', 'my-theme'], { projectRoot: tmp });
      expect(code).toBe(1);
      expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('dup'));
    });
  });

  describe('set / switch', () => {
    test('успех -> код 0', async () => {
      const inst = mockThemeManager();
      const code = await main(['set', 'beam'], { projectRoot: tmp });
      expect(code).toBe(0);
      expect(inst.setActiveTheme).toHaveBeenCalledWith('beam');
      expect(inst.updateVSCodeSettings).toHaveBeenCalled();
    });

    test('switch — алиас для set', async () => {
      const inst = mockThemeManager();
      const code = await main(['switch', 'beam'], { projectRoot: tmp });
      expect(code).toBe(0);
      expect(inst.setActiveTheme).toHaveBeenCalledWith('beam');
    });

    test('ThemeNotFoundError -> код 1', async () => {
      const err = new ThemeNotFoundError('nope');
      mockThemeManager({ setActiveTheme: jest.fn(() => { throw err; }) });
      const code = await main(['set', 'nope'], { projectRoot: tmp });
      expect(code).toBe(1);
    });

    test('PresentationNotFoundError -> код 1', async () => {
      const err = new PresentationNotFoundError('/proj/presentation.md');
      mockThemeManager({ setActiveTheme: jest.fn(() => { throw err; }) });
      const code = await main(['set', 'beam'], { projectRoot: tmp });
      expect(code).toBe(1);
    });

    test('прочая ошибка -> код 1', async () => {
      mockThemeManager({ setActiveTheme: jest.fn(() => { throw new Error('boom'); }) });
      const code = await main(['set', 'beam'], { projectRoot: tmp });
      expect(code).toBe(1);
    });
  });

  describe('select', () => {
    test('успех -> код 0', async () => {
      const inst = mockThemeManager();
      Prompts.promptActiveTheme.mockResolvedValue('beam');
      const code = await main(['select'], { projectRoot: tmp });
      expect(code).toBe(0);
      expect(inst.setActiveTheme).toHaveBeenCalledWith('beam');
    });

    test('ThemeNotFoundError -> код 1', async () => {
      mockThemeManager({
        listThemes: jest.fn(() => ['beam']),
        setActiveTheme: jest.fn(() => { throw new ThemeNotFoundError('x'); }),
      });
      Prompts.promptActiveTheme.mockResolvedValue('beam');
      const code = await main(['select'], { projectRoot: tmp });
      expect(code).toBe(1);
    });

    test('PresentationNotFoundError -> код 1', async () => {
      mockThemeManager({
        listThemes: jest.fn(() => ['beam']),
        setActiveTheme: jest.fn(() => { throw new PresentationNotFoundError('p'); }),
      });
      Prompts.promptActiveTheme.mockResolvedValue('beam');
      const code = await main(['select'], { projectRoot: tmp });
      expect(code).toBe(1);
    });
  });

  describe('sync', () => {
    test('тем нет -> "No themes installed to sync", код 0', async () => {
      const code = await main(['sync'], { projectRoot: tmp });
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('No themes installed to sync'));
    });

    test('темы есть -> syncThemes вызван, код 0', async () => {
      fs.mkdirSync(path.join(tmp, 'themes'), { recursive: true });
      ThemeResolver.scanDirectory.mockReturnValue([
        { name: 'beam', path: path.join(tmp, 'themes', 'beam.css'), dependencies: [] },
      ]);
      const syncMock = jest.fn();
      VSCodeIntegration.mockImplementation(() => ({ syncThemes: syncMock }));

      const code = await main(['sync'], { projectRoot: tmp });

      expect(code).toBe(0);
      expect(syncMock).toHaveBeenCalledWith(['themes/beam.css']);
    });
  });

  describe('showHelp (direct)', () => {
    test('возвращает 0', () => {
      expect(showHelp()).toBe(0);
    });
  });
});
```

- [ ] **Step 5: Run the new tests and verify they pass**

Run: `npx jest tests/unit/theme-cli.test.js`
Expected: PASS (all tests).

- [ ] **Step 6: Check theme-cli.js coverage; close any remaining branches**

Run: `npx jest --coverage --collectCoverageFrom='template/scripts/theme-cli.js' tests/unit/theme-cli.test.js tests/integration/theme-cli.test.js`
Expected: ≥90% lines and ≥80% branches. If any branch is still red, open `coverage/index.html`, find the line, and add a targeted test mirroring the patterns above (mock the relevant lib method to throw or resolve, assert the returned code). Repeat until the per-file floor (80% branches) is met.

- [ ] **Step 7: Run full coverage, bump the ratchet, commit**

Run: `npm run test:coverage`. Update `coverageThreshold.global` (only raise). Commit:

```bash
git add template/scripts/theme-cli.js tests/unit/theme-cli.test.js package.json
git commit -m "Refactor theme-cli.js to testable form (main(argv,ctx)), add in-process tests

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Close `theme-manager.js` branch gaps

**Goal:** Raise `lib/theme-manager.js` from branches 56.8% to ≥80%. The main gap is `ensureThemeSetConfig` (static, lines 31-67, untested), plus `listDirectories` (lines 109-118), the constructor throw (line 77), and the `createTheme` description branch (line 205).

**Files:**
- Modify: `tests/unit/theme-manager.test.js` (append a new `describe` block)

- [ ] **Step 1: Add the missing tests**

Append to `tests/unit/theme-manager.test.js` (inside the top-level `describe('ThemeManager', ...)` block, before its closing `});`):

```js
  describe('ensureThemeSetConfig (static)', () => {
    test('должен добавить marp.themeSet, если его нет', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ name: 'p' }, null, 2)
      );

      const added = ThemeManager.ensureThemeSetConfig(tempDir);

      expect(added).toBe(true);
      const pkg = JSON.parse(fs.readFileSync(path.join(tempDir, 'package.json'), 'utf-8'));
      expect(pkg.marp.themeSet).toBe('./themes');
    });

    test('должен вернуть false, если marp.themeSet уже есть', () => {
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ marp: { themeSet: './themes' } }, null, 2)
      );

      const added = ThemeManager.ensureThemeSetConfig(tempDir);

      expect(added).toBe(false);
    });

    test('должен вернуть false и warn, если package.json не существует', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const added = ThemeManager.ensureThemeSetConfig(tempDir);
      expect(added).toBe(false);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    test('silent=true не логирует', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      ThemeManager.ensureThemeSetConfig(tempDir, { silent: true });
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    test('должен вернуть false при невалидном JSON (молча в silent)', () => {
      fs.writeFileSync(path.join(tempDir, 'package.json'), '{ not valid json');
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const added = ThemeManager.ensureThemeSetConfig(tempDir, { silent: true });
      expect(added).toBe(false);
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('listDirectories', () => {
    test('должен вернуть имена поддиректорий themes', () => {
      fs.mkdirSync(path.join(themesDir, 'folder-a'), { recursive: true });
      fs.mkdirSync(path.join(themesDir, 'folder-b'), { recursive: true });
      fs.writeFileSync(path.join(themesDir, 'loose.css'), '/* @theme loose */');

      const manager = new ThemeManager(tempDir);
      const dirs = manager.listDirectories();

      expect(dirs).toContain('folder-a');
      expect(dirs).toContain('folder-b');
      expect(dirs).not.toContain('loose.css');
    });

    test('должен вернуть [] если themes не существует', () => {
      fs.rmSync(themesDir, { recursive: true, force: true });
      const manager = new ThemeManager(tempDir);
      expect(manager.listDirectories()).toEqual([]);
    });
  });

  describe('constructor validation', () => {
    test('должен бросить, если projectPath не передан', () => {
      expect(() => new ThemeManager()).toThrow('Project path is required');
    });
  });

  describe('createTheme with description', () => {
    test('должен включить @description в CSS, если передан', () => {
      const manager = new ThemeManager(tempDir);
      manager.createTheme('desc-theme', null, 'root', null, 'My cool theme');

      const content = fs.readFileSync(path.join(themesDir, 'desc-theme.css'), 'utf-8');
      expect(content).toContain('@description My cool theme');
    });
  });
```

- [ ] **Step 2: Run the new tests and verify they pass**

Run: `npx jest tests/unit/theme-manager.test.js`
Expected: PASS (all tests).

- [ ] **Step 3: Verify theme-manager branch coverage ≥80%**

Run: `npx jest --coverage --collectCoverageFrom='lib/theme-manager.js' tests/unit/theme-manager.test.js`
Expected: branches ≥80%. If short, add a targeted test for the specific uncovered branch shown in `coverage/index.html`.

- [ ] **Step 4: Run full coverage, bump the ratchet, commit**

Run: `npm run test:coverage`. Update `coverageThreshold.global` (only raise). Commit:

```bash
git add tests/unit/theme-manager.test.js package.json
git commit -m "Add tests for theme-manager ensureThemeSetConfig, listDirectories, description branch

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: Close `create-project.js` branch gaps

**Goal:** Raise `cli/commands/create-project.js` from branches 67.7% / functions 75% to ≥80% branches / ≥85% lines. The gaps are the interactive branch (lines 111-134, gated by `process.stdin.isTTY`), the active-theme selection block (lines 138-148), and the default-theme failure catch (line 156). These never run in existing spawn tests, so exercise them in-process with heavy deps mocked.

**Files:**
- Create: `tests/unit/create-project.test.js`

- [ ] **Step 1: Write the in-process tests with mocked heavy deps**

Create `tests/unit/create-project.test.js`:

```js
// Моки тяжёлых/побочных зависимостей, чтобы протестировать логику createProject в процессе
jest.mock('../../lib/add-themes-command', () => ({
  AddThemesCommand: jest.fn()
}));
jest.mock('../../lib/prompts', () => ({
  Prompts: {
    promptActiveTheme: jest.fn(),
  }
}));
jest.mock('../../lib/theme-manager', () => ({
  ThemeManager: jest.fn()
}));
jest.mock('child_process', () => ({
  spawnSync: jest.fn()
}));
jest.mock('../../cli/utils/file-utils', () => ({
  copyDir: jest.fn(),
  validateOutputPath: jest.fn(),
}));

const fs = require('fs');
const path = require('path');
const os = require('os');

const { createProject } = require('../../cli/commands/create-project');
const { AddThemesCommand } = require('../../lib/add-themes-command');
const { Prompts } = require('../../lib/prompts');
const { ThemeManager } = require('../../lib/theme-manager');
const { spawnSync } = require('child_process');
const { copyDir } = require('../../cli/utils/file-utils');

describe('createProject (in-process branch coverage)', () => {
  let tmp;
  let origIsTTY;
  let logSpy;
  let warnSpy;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'create-project-'));
    origIsTTY = process.stdin.isTTY;
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.clearAllMocks();
    // npm install по умолчанию успешен
    spawnSync.mockReturnValue({ status: 0 });
  });

  afterEach(() => {
    process.stdin.isTTY = origIsTTY;
    logSpy.mockRestore();
    warnSpy.mockRestore();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test('интерактивный режим: темы выбраны -> копируются примеры и ставится активная тема', async () => {
    process.stdin.isTTY = true;

    // AddThemesCommand: экземпляр с execute/_promptExamples/_copyExamples
    const cmdInstance = {
      execute: jest.fn().mockResolvedValue({ copied: [{ name: 'beam' }] }),
      _promptExamples: jest.fn().mockResolvedValue(['beam-example.md']),
      _copyExamples: jest.fn(),
    };
    AddThemesCommand.mockImplementation(() => cmdInstance);

    // Prompts.promptActiveTheme -> выбор активной темы
    Prompts.promptActiveTheme.mockResolvedValue('beam');

    // ThemeManager: setActiveTheme успешен
    const tmInstance = { setActiveTheme: jest.fn() };
    ThemeManager.mockImplementation(() => tmInstance);

    await createProject('valid-name', {
      outputPath: tmp,
      templatePath: path.join(tmp, 'template'),
      themesLibraryPath: path.join(tmp, 'themes'),
    });

    expect(cmdInstance.execute).toHaveBeenCalled();
    expect(cmdInstance._promptExamples).toHaveBeenCalledWith([{ name: 'beam' }]);
    expect(cmdInstance._copyExamples).toHaveBeenCalled();
    expect(Prompts.promptActiveTheme).toHaveBeenCalledWith(['beam']);
    expect(tmInstance.setActiveTheme).toHaveBeenCalledWith('beam');
  });

  test('интерактивный режим: темы выбраны, но setActiveTheme падает -> warn', async () => {
    process.stdin.isTTY = true;
    const cmdInstance = {
      execute: jest.fn().mockResolvedValue({ copied: [{ name: 'beam' }] }),
      _promptExamples: jest.fn().mockResolvedValue([]), // примеров нет
      _copyExamples: jest.fn(),
    };
    AddThemesCommand.mockImplementation(() => cmdInstance);
    Prompts.promptActiveTheme.mockResolvedValue('beam');
    ThemeManager.mockImplementation(() => ({
      setActiveTheme: jest.fn(() => { throw new Error('nope'); }),
    }));

    await createProject('valid-name', {
      outputPath: tmp,
      templatePath: path.join(tmp, 'template'),
      themesLibraryPath: path.join(tmp, 'themes'),
    });

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Could not set active theme'));
  });

  test('неинтерактивный режим (нет TTY): темы не запрашиваются, ставится default', async () => {
    process.stdin.isTTY = false;
    const tmInstance = { setActiveTheme: jest.fn() };
    ThemeManager.mockImplementation(() => tmInstance);

    await createProject('valid-name', {
      outputPath: tmp,
      templatePath: path.join(tmp, 'template'),
      themesLibraryPath: path.join(tmp, 'themes'),
    });

    expect(AddThemesCommand).not.toHaveBeenCalled();
    expect(tmInstance.setActiveTheme).toHaveBeenCalledWith('default');
  });

  test('неинтерактивный режим: setActiveTheme(default) падает -> warn', async () => {
    process.stdin.isTTY = false;
    ThemeManager.mockImplementation(() => ({
      setActiveTheme: jest.fn(() => { throw new Error('presentation missing'); }),
    }));

    await createProject('valid-name', {
      outputPath: tmp,
      templatePath: path.join(tmp, 'template'),
      themesLibraryPath: path.join(tmp, 'themes'),
    });

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Could not set active theme'));
  });

  test('npm install failed -> бросает "npm install failed"', async () => {
    process.stdin.isTTY = false;
    spawnSync.mockReturnValue({ status: 1 });
    ThemeManager.mockImplementation(() => ({ setActiveTheme: jest.fn() }));

    await expect(
      createProject('valid-name', {
        outputPath: tmp,
        templatePath: path.join(tmp, 'template'),
        themesLibraryPath: path.join(tmp, 'themes'),
      })
    ).rejects.toThrow('npm install failed');
  });

  test('invalid project name -> бросает "Invalid project name"', async () => {
    process.stdin.isTTY = false;
    await expect(
      createProject('Invalid_Name', { outputPath: tmp })
    ).rejects.toThrow('Invalid project name');
    expect(copyDir).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the new tests and verify they pass**

Run: `npx jest tests/unit/create-project.test.js`
Expected: PASS (all tests).

- [ ] **Step 3: Verify create-project coverage ≥80% branches / ≥85% lines**

Run: `npx jest --coverage --collectCoverageFrom='cli/commands/create-project.js' tests/unit/create-project.test.js tests/cli/commands/create-project.test.js`
Expected: branches ≥80%, lines ≥85%. Close any remaining branch via `coverage/index.html`.

- [ ] **Step 4: Run full coverage, bump the ratchet, commit**

Run: `npm run test:coverage`. Update `coverageThreshold.global` (only raise). Commit:

```bash
git add tests/unit/create-project.test.js package.json
git commit -m "Add in-process branch tests for create-project interactive + theme selection

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: Sweep remaining lib/cli modules to the per-file floor

**Goal:** Ensure every remaining file meets the per-file floor: **≥80% branches, ≥85% lines**. These modules are already at 85-100%; only small targeted branch tests are needed. For each module below, write tests against the specific uncovered lines listed, then verify with coverage. Use the existing test file for that module (append a `describe`) unless noted.

Run after each module's tests: `npx jest --coverage --collectCoverageFrom='<file>' <its test file>`. Confirm branches ≥80% / lines ≥85%.

**Files to touch (append to existing test files):**
- `tests/unit/add-themes-command.test.js` — `lib/add-themes-command.js` (uncovered: lines 78, 93-95, 118-125, 221, 293, 311, 393-395, 445; funcs 85%)
- `tests/unit/example-resolver.test.js` — `lib/example-resolver.js` (uncovered: 47, 96, 179, 220-221, 243, 262, 270-271; branches 76.3%)
- `tests/cli/commands/add-themes-cli.test.js` — `cli/commands/add-themes-cli.js` (uncovered: 60-65, 79; branches 85.2%)
- `tests/unit/vscode-integration.test.js` — `lib/vscode-integration.js` (uncovered: 111, 135, 191; branches 84.6%)
- `tests/unit/theme-resolver.test.js` — `lib/theme-resolver.js` (uncovered: 72, 77, 143; branches 90.5% — minor)
- `tests/unit/prompts.test.js` — `lib/prompts.js` (uncovered: 42, 313; funcs 95.7%)
- `tests/cli/utils/prompt-utils.test.js` — `cli/utils/prompt-utils.js` (uncovered: 44-49; branches 87.5%)

- [ ] **Step 1: For each module, read the uncovered line(s) in source, write a focused test, run it**

Work module by module. For each: open the source at the listed lines, determine the branch condition, add a test that exercises it (mock a dependency or set up fixture data so that branch is taken), then run:

Run (example for one module): `npx jest tests/cli/utils/prompt-utils.test.js`
Expected: PASS and `cli/utils/prompt-utils.js` branches ≥80%.

A concrete worked example — `cli/utils/prompt-utils.js` lines 44-49. First read the function at those lines to see the branch (e.g., an early-return or conditional), then add a test that drives it. Pattern:

```js
test('должен <поведение непокрытой ветки>', () => {
  // arrange inputs that take the uncovered branch
  // call the function
  // assert the branch-specific outcome
});
```

Repeat for each module. Do not move on until that module's file is ≥80% branches and ≥85% lines.

- [ ] **Step 2: After all modules pass the per-file floor, run full coverage**

Run: `npm run test:coverage`
Expected: every file ≥80% branches / ≥85% lines, and globals ≥90% lines / ≥80% branches.

- [ ] **Step 3: Bump the ratchet to target and commit**

Update `coverageThreshold.global` in `package.json` to:
```json
"coverageThreshold": {
  "global": {
    "branches": 80,
    "functions": 90,
    "lines": 90,
    "statements": 90
  }
}
```
Run `npm run test:coverage` once more to confirm the gate is GREEN at target.

Commit:
```bash
git add tests/ package.json
git commit -m "Raise coverage to per-file floor (80% branches / 85% lines) across lib and cli

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 8: Lock per-file thresholds and verify Definition of Done

**Goal:** Prevent any single file from silently dropping below the floor, and confirm the migration-readiness criteria are met.

**Files:**
- Modify: `package.json` (add per-file `coverageThreshold` entries)

- [ ] **Step 1: Add per-file thresholds for every measured file**

In `package.json`, extend `coverageThreshold` with one entry per measured file (paths relative to `<rootDir>`), each at branches 80 / lines 85 / functions 85 / statements 85. Use this exact structure:

```json
"coverageThreshold": {
  "global": {
    "branches": 80,
    "functions": 90,
    "lines": 90,
    "statements": 90
  },
  "./index.js": { "branches": 80, "functions": 85, "lines": 85, "statements": 85 },
  "./cli/commands/create-project.js": { "branches": 80, "functions": 85, "lines": 85, "statements": 85 },
  "./cli/commands/add-themes-cli.js": { "branches": 80, "functions": 85, "lines": 85, "statements": 85 },
  "./cli/utils/file-utils.js": { "branches": 80, "functions": 85, "lines": 85, "statements": 85 },
  "./cli/utils/prompt-utils.js": { "branches": 80, "functions": 85, "lines": 85, "statements": 85 },
  "./lib/add-themes-command.js": { "branches": 80, "functions": 85, "lines": 85, "statements": 85 },
  "./lib/errors.js": { "branches": 80, "functions": 85, "lines": 85, "statements": 85 },
  "./lib/example-resolver.js": { "branches": 80, "functions": 85, "lines": 85, "statements": 85 },
  "./lib/frontmatter.js": { "branches": 80, "functions": 85, "lines": 85, "statements": 85 },
  "./lib/prompts.js": { "branches": 80, "functions": 85, "lines": 85, "statements": 85 },
  "./lib/theme-manager.js": { "branches": 80, "functions": 85, "lines": 85, "statements": 85 },
  "./lib/theme-resolver.js": { "branches": 80, "functions": 85, "lines": 85, "statements": 85 },
  "./lib/vscode-integration.js": { "branches": 80, "functions": 85, "lines": 85, "statements": 85 },
  "./template/scripts/copy-static.js": { "branches": 80, "functions": 85, "lines": 85, "statements": 85 },
  "./template/scripts/theme-cli.js": { "branches": 80, "functions": 85, "lines": 85, "statements": 85 }
}
```

- [ ] **Step 2: Verify the gate is green with per-file thresholds**

Run: `npm run test:coverage`
Expected: PASS (exit 0). If any file is below its threshold, return to Task 7 for that file and add tests until it passes.

- [ ] **Step 3: Verify Definition of Done criteria**

Run: `npm run test:coverage` and confirm the summary shows:
- Lines ≥ 90%, Statements ≥ 90%, Functions ≥ 90%, Branches ≥ 80% (global).
- No file below 80% branches / 85% lines (enforced by per-file thresholds above).
- `npm test` still passes (372+ tests, no coverage overhead).

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "Lock per-file coverage thresholds; coverage phase complete (>=90/80 global, per-file floor)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Self-Review (completed by plan author)

**1. Spec coverage:**
- Measurement system (config + scripts + threshold at baseline) → Task 1. ✓
- Ratchet mechanism (baseline → target, bump in same commit) → Task 1 + every task's final step + Task 7/8. ✓
- Strategy: uniform "library + thin entry point" refactor for 0%-modules → Tasks 2, 3, 4. ✓
- Characterization tests before refactor → Task 2 Step 1/3, Task 3 Step 1/3, Task 4 Step 1/3. ✓
- Priorities: copy-static → index → theme-cli → theme-manager → create-project → sweep → finalize → Tasks 2–8 in that order. ✓
- DoD: global ≥90/80 + per-file ≥80% branches / 85% lines → Task 8. ✓
- Scope: all JS measured/gated → `collectCoverageFrom` in Task 1 covers index.js + cli/** + lib/** + template/scripts/**. ✓

**2. Placeholder scan:** Task 7 is intentionally procedure-driven (the exact branches depend on the post-refactor report and are small/mechanical); it gives the per-module uncovered line numbers, the exact command to verify, the worked-example pattern with real test code, and the success criterion. No "TODO"/"TBD". All code steps contain full code. ✓

**3. Type/signature consistency:** `copyStatic(options)` (Task 2) used consistently; `main(argv)` / `handleThemeAdd` / `handleProjectCreation` / `showUsage` (Task 3) match the test imports; `main(argv, context)` / `listThemes(projectRoot)` / `createTheme(themeName, projectRoot)` / `syncThemes(projectRoot)` / `setActiveThemeCommand` / `selectTheme` (Task 4) match the exported names and the test's `require(...)` destructure. ThemeManager mocks use the real method names (`scanThemes`, `listThemes`, `listDirectories`, `getActiveTheme`, `setActiveTheme`, `updateVSCodeSettings`, `createTheme`) matching `lib/theme-manager.js`. ✓

**Open risk carried from spec:** the refactors of 0%-modules have no prior in-process tests; the spawn-based characterization tests (cli.test.js, copy-static.test.js, theme-cli integration) are run before AND after each refactor to catch behavior changes. If a characterization test is itself broken by the refactor, fix the refactor — do not weaken the test.
