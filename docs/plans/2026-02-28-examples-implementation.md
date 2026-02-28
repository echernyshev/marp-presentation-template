# Examples System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a theme-specific examples system that copies example presentations and static assets based on user-selected themes.

**Architecture:**
- New `lib/example-resolver.js` module discovers and filters examples by frontmatter metadata
- Integration into `AddThemesCommand` for both create-project and theme:add flows
- Examples stored in `examples/` with base examples in root and theme-specific in subdirectories

**Tech Stack:**
- Node.js fs for file operations
- Existing `Frontmatter` class (gray-matter) for YAML parsing
- Existing `copyDir` utility for directory copying

---

## Task 1: Create ExampleResolver class skeleton

**Files:**
- Create: `lib/example-resolver.js`

**Step 1: Write the failing test**

Create: `tests/unit/example-resolver.test.js`

```javascript
const { ExampleResolver } = require('../../lib/example-resolver');

describe('ExampleResolver', () => {
  describe('constructor', () => {
    test('should set default examples directory', () => {
      const resolver = new ExampleResolver();
      expect(resolver.examplesDir).toBe('examples');
    });

    test('should accept custom examples directory', () => {
      const resolver = new ExampleResolver('/custom/path');
      expect(resolver.examplesDir).toBe('/custom/path');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/example-resolver.test.js`
Expected: FAIL with "ExampleResolver is not defined"

**Step 3: Write minimal implementation**

Create: `lib/example-resolver.js`

```javascript
const fs = require('fs');
const path = require('path');
const { Frontmatter } = require('./frontmatter');

/**
 * Example class representing a discovered example
 */
class Example {
  constructor(data) {
    this.path = data.path;
    this.relativePath = data.relativePath;
    this.themes = data.themes || [];
    this.isBase = data.isBase || false;
    this.staticAssets = data.staticAssets || [];
  }
}

/**
 * Resolver for discovering and filtering presentation examples
 */
class ExampleResolver {
  constructor(examplesDir = 'examples') {
    this.examplesDir = examplesDir;
  }
}

module.exports = { ExampleResolver, Example };
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/example-resolver.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/example-resolver.js tests/unit/example-resolver.test.js
git commit -m "feat: add ExampleResolver class skeleton"
```

---

## Task 2: Implement discoverAll method

**Files:**
- Modify: `lib/example-resolver.js`
- Modify: `tests/unit/example-resolver.test.js`

**Step 1: Write the failing test**

Add to `tests/unit/example-resolver.test.js`:

```javascript
describe('ExampleResolver.discoverAll', () => {
  test('should find all .md files and parse frontmatter', () => {
    // This test assumes examples/ directory structure exists
    // For now, test with empty directory
    const resolver = new ExampleResolver('tests/fixtures/examples');
    const examples = resolver.discoverAll();
    expect(Array.isArray(examples)).toBe(true);
  });

  test('should return empty array if examples directory does not exist', () => {
    const resolver = new ExampleResolver('non-existent-path');
    const examples = resolver.discoverAll();
    expect(examples).toEqual([]);
  });

  test('should mark examples without themes field as base examples', () => {
    // Will be implemented with fixture setup
    const resolver = new ExampleResolver('tests/fixtures/examples');
    const examples = resolver.discoverAll();
    const baseExample = examples.find(e => e.relativePath === 'base-example.md');
    expect(baseExample?.isBase).toBe(true);
  });

  test('should parse themes field from frontmatter', () => {
    const resolver = new ExampleResolver('tests/fixtures/examples');
    const examples = resolver.discoverAll();
    const beamExample = examples.find(e => e.relativePath.includes('beam'));
    expect(beamExample?.themes).toContain('beam');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/example-resolver.test.js`
Expected: FAIL with method not implemented or fixtures missing

**Step 3: Create test fixtures**

Create: `tests/fixtures/examples/base-example.md`

```markdown
---
marp: true
theme: default
paginate: true
---

# Base Example

This is a base Marp example without theme-specific content.
```

Create: `tests/fixtures/examples/beam/beam-example.md`

```markdown
---
marp: true
theme: beam
themes: [beam]
---

# Beam Theme Example

This example demonstrates the Beam theme.
```

Create: `tests/fixtures/examples/marpx/marpx-example.md`

```markdown
---
marp: true
theme: marpx
themes: [marpx, beam]
---

# Multi-Theme Example

Works in both MarpX and Beam themes.
```

Create: `tests/fixtures/examples/beam/static/beam-logo.png` (empty file for testing)

```bash
touch tests/fixtures/examples/beam/static/beam-logo.png
```

**Step 4: Implement discoverAll method**

Add to `lib/example-resolver.js` in ExampleResolver class:

```javascript
  /**
   * Discover all examples and their metadata
   * @returns {Example[]} Array of discovered examples
   */
  discoverAll() {
    const examplesDir = this.examplesDir;

    if (!fs.existsSync(examplesDir)) {
      return [];
    }

    const examples = [];
    const mdFiles = this._findMarkdownFiles(examplesDir);

    for (const mdPath of mdFiles) {
      try {
        const example = this._parseExample(mdPath, examplesDir);
        if (example) {
          examples.push(example);
        }
      } catch (error) {
        console.warn(`Warning: Could not parse example from ${mdPath}: ${error.message}`);
      }
    }

    return examples;
  }

  /**
   * Find all .md files in directory recursively
   * @private
   * @param {string} dir - Directory to scan
   * @returns {string[]} Array of .md file paths
   */
  _findMarkdownFiles(dir) {
    const mdFiles = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip symlinks for security
      if (entry.isSymbolicLink()) {
        continue;
      }

      if (entry.isDirectory()) {
        mdFiles.push(...this._findMarkdownFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        mdFiles.push(fullPath);
      }
    }

    return mdFiles;
  }

  /**
   * Parse a single example file
   * @private
   * @param {string} filePath - Absolute path to example file
   * @param {string} examplesDir - Root examples directory
   * @returns {Example|null} Parsed example or null if invalid
   */
  _parseExample(filePath, examplesDir) {
    const content = fs.readFileSync(filePath, 'utf8');
    const frontmatterData = Frontmatter.parse(content);
    const relativePath = path.relative(examplesDir, filePath);

    // Check if themes field exists
    const themes = frontmatterData.themes;
    const isBase = !themes;

    // Find static assets in same directory
    const staticAssets = this._findStaticAssets(filePath, examplesDir);

    return new Example({
      path: filePath,
      relativePath,
      themes,
      isBase,
      staticAssets
    });
  }

  /**
   * Find static assets for an example
   * @private
   * @param {string} examplePath - Path to example .md file
   * @param {string} examplesDir - Root examples directory
   * @returns {string[]} Array of relative paths to static assets
   */
  _findStaticAssets(examplePath, examplesDir) {
    const exampleDir = path.dirname(examplePath);
    const relativeDir = path.relative(examplesDir, exampleDir);
    const assets = [];

    if (fs.existsSync(exampleDir)) {
      const entries = fs.readdirSync(exampleDir, { withFileTypes: true });

      for (const entry of entries) {
        // Skip symlinks and .md files
        if (entry.isSymbolicLink() || entry.name.endsWith('.md')) {
          continue;
        }

        const fullPath = path.join(exampleDir, entry.name);
        if (entry.isFile()) {
          assets.push(path.join(relativeDir, entry.name));
        } else if (entry.isDirectory()) {
          // Recursively add files in subdirectories
          assets.push(...this._findStaticAssetsInDir(fullPath, relativeDir));
        }
      }
    }

    return assets;
  }

  /**
   * Find static assets in a directory recursively
   * @private
   * @param {string} dir - Directory to scan
   * @param {string} baseRelativeDir - Base relative directory path
   * @returns {string[]} Array of relative paths to static assets
   */
  _findStaticAssetsInDir(dir, baseRelativeDir) {
    const assets = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isSymbolicLink()) {
        continue;
      }

      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(baseRelativeDir, path.basename(dir), entry.name);

      if (entry.isFile()) {
        assets.push(relativePath);
      } else if (entry.isDirectory()) {
        assets.push(...this._findStaticAssetsInDir(fullPath, baseRelativeDir));
      }
    }

    return assets;
  }
```

**Step 5: Run test to verify it passes**

Run: `npm test -- tests/unit/example-resolver.test.js`
Expected: PASS

**Step 6: Commit**

```bash
git add lib/example-resolver.js tests/unit/example-resolver.test.js tests/fixtures/examples/
git commit -m "feat: implement ExampleResolver.discoverAll method"
```

---

## Task 3: Implement filterBySelectedThemes method

**Files:**
- Modify: `lib/example-resolver.js`
- Modify: `tests/unit/example-resolver.test.js`

**Step 1: Write the failing test**

Add to `tests/unit/example-resolver.test.js`:

```javascript
describe('ExampleResolver.filterBySelectedThemes', () => {
  let allExamples;

  beforeEach(() => {
    const resolver = new ExampleResolver('tests/fixtures/examples');
    allExamples = resolver.discoverAll();
  });

  test('should include base examples always', () => {
    const resolver = new ExampleResolver();
    const filtered = resolver.filterBySelectedThemes(allExamples, []);
    const baseExample = filtered.find(e => e.relativePath === 'base-example.md');
    expect(baseExample).toBeDefined();
  });

  test('should filter by partial match of themes', () => {
    const resolver = new ExampleResolver();
    const filtered = resolver.filterBySelectedThemes(allExamples, ['beam']);
    expect(filtered.some(e => e.themes.includes('beam'))).toBe(true);
    expect(filtered.some(e => e.themes.includes('marpx'))).toBe(false);
  });

  test('should include example if any theme matches', () => {
    const resolver = new ExampleResolver();
    // marpx-example.md has themes: [marpx, beam]
    const filtered = resolver.filterBySelectedThemes(allExamples, ['beam']);
    const marpxExample = filtered.find(e => e.relativePath.includes('marpx'));
    expect(marpxExample).toBeDefined(); // Should be included due to partial match
  });

  test('should return empty array if no base examples and no theme match', () => {
    const resolver = new ExampleResolver();
    const noBaseExamples = allExamples.filter(e => !e.isBase);
    const filtered = resolver.filterBySelectedThemes(noBaseExamples, ['non-existent']);
    expect(filtered).toEqual([]);
  });

  test('should include all examples when themes array is empty (base examples only)', () => {
    const resolver = new ExampleResolver();
    const filtered = resolver.filterBySelectedThemes(allExamples, []);
    expect(filtered.every(e => e.isBase)).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/example-resolver.test.js`
Expected: FAIL with method not implemented

**Step 3: Implement filterBySelectedThemes method**

Add to `lib/example-resolver.js` in ExampleResolver class:

```javascript
  /**
   * Filter examples by selected themes
   * @param {Example[]} allExamples - All discovered examples
   * @param {string[]} selectedThemeNames - Names of selected themes
   * @returns {Example[]} Filtered examples to copy
   */
  filterBySelectedThemes(allExamples, selectedThemeNames) {
    const selectedSet = new Set(selectedThemeNames);
    const filtered = [];

    for (const example of allExamples) {
      // Base examples are always included
      if (example.isBase) {
        filtered.push(example);
        continue;
      }

      // Partial match: include if ANY theme matches selected themes
      const hasMatch = example.themes.some(theme => selectedSet.has(theme));
      if (hasMatch) {
        filtered.push(example);
      }
    }

    return filtered;
  }
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/example-resolver.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/example-resolver.js tests/unit/example-resolver.test.js
git commit -m "feat: implement ExampleResolver.filterBySelectedThemes method"
```

---

## Task 4: Add _copyExamples method to AddThemesCommand

**Files:**
- Modify: `lib/add-themes-command.js`
- Modify: `tests/unit/add-themes-command.test.js`

**Step 1: Write the failing test**

Add to `tests/unit/add-themes-command.test.js`:

```javascript
describe('AddThemesCommand._copyExamples', () => {
  test('should copy examples to project directory preserving structure', () => {
    const tempDir = '/tmp/test-examples-copy';
    fs.mkdirSync(tempDir, { recursive: true });

    const examples = [
      {
        path: '/fixtures/examples/base-example.md',
        relativePath: 'base-example.md',
        staticAssets: []
      },
      {
        path: '/fixtures/examples/beam/beam-example.md',
        relativePath: 'beam/beam-example.md',
        staticAssets: ['beam/static/logo.png']
      }
    ];

    const command = new AddThemesCommand();

    // Mock fs operations
    const mockMkdirSync = jest.fn();
    const mockCopyFileSync = jest.fn();

    // This will need the actual implementation first
    // For now, let's test the structure exists
    expect(typeof command._copyExamples).toBe('function');

    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/add-themes-command.test.js`
Expected: FAIL or warning about method not existing

**Step 3: Implement _copyExamples method**

Add to `lib/add-themes-command.js` in AddThemesCommand class (after `_syncVscodeSettings`):

```javascript
  /**
   * Copy examples to project directory
   * @private
   *
   * @param {Example[]} examples - Examples to copy
   * @param {string} projectPath - Path to project directory
   * @param {string} examplesSourceDir - Source examples directory
   */
  _copyExamples(examples, projectPath, examplesSourceDir) {
    if (!examples || examples.length === 0) {
      return;
    }

    // Ensure target examples directory exists
    const targetExamplesDir = path.join(projectPath, 'examples');
    if (!fs.existsSync(targetExamplesDir)) {
      fs.mkdirSync(targetExamplesDir, { recursive: true });
    }

    // Copy each example and its assets
    for (const example of examples) {
      const sourcePath = path.join(examplesSourceDir, example.relativePath);
      const targetPath = path.join(targetExamplesDir, example.relativePath);

      // Ensure target directory exists
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Copy example .md file
      if (fs.existsSync(sourcePath)) {
        fs.copyFileSync(sourcePath, targetPath);
      }

      // Copy static assets
      for (const assetPath of example.staticAssets) {
        const assetSource = path.join(examplesSourceDir, assetPath);
        const assetTarget = path.join(targetExamplesDir, assetPath);

        const assetDir = path.dirname(assetTarget);
        if (!fs.existsSync(assetDir)) {
          fs.mkdirSync(assetDir, { recursive: true });
        }

        if (fs.existsSync(assetSource)) {
          fs.copyFileSync(assetSource, assetTarget);
        }
      }
    }
  }
```

Also add ExampleResolver import at top of `lib/add-themes-command.js`:

```javascript
const { ExampleResolver } = require('./example-resolver');
```

**Step 4: Update test to be more meaningful**

Replace the test in Step 1 with:

```javascript
describe('AddThemesCommand._copyExamples', () => {
  const tempDir = '/tmp/test-examples-copy';
  const fixturesDir = path.join(__dirname, '../fixtures/examples');

  beforeAll(() => {
    // Ensure fixtures exist
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('should copy examples to project directory preserving structure', () => {
    fs.mkdirSync(tempDir, { recursive: true });

    const { ExampleResolver } = require('../../lib/example-resolver');
    const resolver = new ExampleResolver(fixturesDir);
    const allExamples = resolver.discoverAll();

    const command = new AddThemesCommand();
    command._copyExamples(allExamples, tempDir, fixturesDir);

    // Verify examples directory exists
    expect(fs.existsSync(path.join(tempDir, 'examples'))).toBe(true);

    // Verify at least base example was copied
    expect(fs.existsSync(path.join(tempDir, 'examples', 'base-example.md'))).toBe(true);
  });

  test('should do nothing if examples array is empty', () => {
    fs.mkdirSync(tempDir, { recursive: true });

    const command = new AddThemesCommand();
    expect(() => command._copyExamples([], tempDir, fixturesDir)).not.toThrow();
    expect(fs.existsSync(path.join(tempDir, 'examples'))).toBe(false);
  });
});
```

**Step 5: Run test to verify it passes**

Run: `npm test -- tests/unit/add-themes-command.test.js`
Expected: PASS

**Step 6: Commit**

```bash
git add lib/add-themes-command.js tests/unit/add-themes-command.test.js
git commit -m "feat: add _copyExamples method to AddThemesCommand"
```

---

## Task 5: Add _promptExamples method to AddThemesCommand

**Files:**
- Modify: `lib/add-themes-command.js`
- Modify: `tests/unit/add-themes-command.test.js`

**Step 1: Write the failing test**

Add to `tests/unit/add-themes-command.test.js`:

```javascript
describe('AddThemesCommand._promptExamples', () => {
  test('should return empty array when user declines', async () => {
    const command = new AddThemesCommand({
      prompts: {
        copyExamples: async () => false
      }
    });

    const result = await command._promptExamples([]);
    expect(result).toEqual([]);
  });

  test('should return filtered examples when user accepts', async () => {
    const mockExamples = [
      { relativePath: 'base.md', isBase: true, themes: [] },
      { relativePath: 'beam/demo.md', isBase: false, themes: ['beam'] }
    ];

    const command = new AddThemesCommand({
      prompts: {
        copyExamples: async () => true
      }
    });

    const result = await command._promptExamples(mockExamples);
    expect(result.length).toBeGreaterThan(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/add-themes-command.test.js`
Expected: FAIL with method not implemented

**Step 3: Implement _promptExamples method**

Add to `lib/add-themes-command.js` in AddThemesCommand class:

```javascript
  /**
   * Prompt user to copy examples for selected themes
   * @private
   *
   * @param {Theme[]} selectedThemes - Themes that were selected
   * @returns {Promise<Example[]>} Examples to copy
   */
  async _promptExamples(selectedThemes) {
    if (!this.options.interactive) {
      return [];
    }

    // Use custom prompt if provided (for testing)
    if (this.options.prompts?.copyExamples) {
      const shouldCopy = await this.options.prompts.copyExamples();
      if (!shouldCopy) {
        return [];
      }
    } else {
      // Built-in prompt
      const { shouldCopyExamples } = await Prompts.promptCopyExamples();
      if (!shouldCopyExamples) {
        return [];
      }
    }

    // Discover and filter examples
    const examplesDir = path.join(__dirname, '..', 'examples');
    const resolver = new ExampleResolver(examplesDir);
    const allExamples = resolver.discoverAll();

    if (allExamples.length === 0) {
      console.log('No examples available to copy.');
      return [];
    }

    const themeNames = selectedThemes.map(t => t.name);
    return resolver.filterBySelectedThemes(allExamples, themeNames);
  }
```

**Step 4: Add promptCopyExamples to Prompts class**

Add to `lib/prompts.js`:

```javascript
  /**
   * Prompt user to copy examples for selected themes
   * @returns {Promise<{shouldCopyExamples: boolean}>}
   */
  static async promptCopyExamples() {
    const { shouldCopy } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldCopy',
        message: 'Copy examples for selected themes?',
        default: false
      }
    ]);
    return { shouldCopyExamples: shouldCopy };
  }
```

**Step 5: Run test to verify it passes**

Run: `npm test -- tests/unit/add-themes-command.test.js`
Expected: PASS

**Step 6: Commit**

```bash
git add lib/add-themes-command.js lib/prompts.js tests/unit/add-themes-command.test.js
git commit -m "feat: add _promptExamples method and promptCopyExamples prompt"
```

---

## Task 6: Integrate examples flow into create-project command

**Files:**
- Modify: `cli/commands/create-project.js`
- Remove: `cli/utils/prompt-utils.js` (askCreateExamples function)

**Step 1: Remove old askCreateExamples flow**

Remove from `cli/commands/create-project.js`:

```javascript
const { askCreateExamples } = require('../utils/prompt-utils');
```

Remove the usage:
```javascript
  // Ask about example slides
  const createExamples = await askCreateExamples();

  // Copy optional files
  if (createExamples) {
    copyOptionalFiles(projectPath);
    console.log('✓ Example slides added');
    console.log('✓ Demo image added to static/');
  }
```

**Step 2: Add examples flow after theme selection**

Replace the removed code with new flow in `cli/commands/create-project.js`:

Find the theme addition section and modify:

```javascript
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

    // NEW: Prompt for examples after themes are selected
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
```

**Step 3: Update file-utils copyOptionalFiles**

Remove `copyOptionalFiles` function from `cli/utils/file-utils.js` and `cli/utils/prompt-utils.js` since examples are now handled via the new system.

**Step 4: Run integration test**

Run: `node index.js test-project --path /tmp`
Expected: Creates project with new examples prompt

**Step 5: Cleanup test project**

Run: `rm -rf /tmp/test-project`

**Step 6: Commit**

```bash
git add cli/commands/create-project.js cli/utils/
git commit -m "feat: integrate examples flow into create-project command"
```

---

## Task 7: Integrate examples flow into add-themes-cli command

**Files:**
- Modify: `cli/commands/add-themes-cli.js`

**Step 1: Add examples prompt after theme addition**

Modify `cli/commands/add-themes-cli.js`:

```javascript
    // Execute command - pass theme names if provided, otherwise prompt
    const { copied, skipped, conflicts } = await command.execute(resolvedPath, {
      themes: themeNames || undefined
    });

    // NEW: Prompt for examples after themes are added
    let examplesCopied = 0;
    if (copied.length > 0 && process.stdin.isTTY) {
      console.log();
      const examples = await command._promptExamples(copied);
      if (examples.length > 0) {
        const examplesSourceDir = path.join(__dirname, '../..', 'examples');
        command._copyExamples(examples, resolvedPath, examplesSourceDir);
        examplesCopied = examples.length;
      }
    }

    // Show summary
    const copiedNames = copied.map(t => t.name);
    console.log(`\nCopied themes: ${copiedNames.join(', ') || 'none'}`);
    if (skipped.length > 0) {
      console.log(`Skipped: ${skipped.join(', ')}`);
    }
    if (conflicts.length > 0) {
      console.log(`Conflicts: ${conflicts.join(', ')}`);
    }
    if (examplesCopied > 0) {
      console.log(`Examples copied: ${examplesCopied}`);
    }
```

**Step 2: Run integration test**

Run:
```bash
node index.js test-base --path /tmp
cd /tmp/test-base
node ../../index.js theme:add . beam
```

Expected: Prompts for examples after themes are added

**Step 3: Cleanup**

Run: `rm -rf /tmp/test-base /tmp/test-project`

**Step 4: Commit**

```bash
git add cli/commands/add-themes-cli.js
git commit -m "feat: integrate examples flow into add-themes-cli command"
```

---

## Task 8: Migrate template-optional/examples.md to examples/ directory

**Files:**
- Move: `template-optional/examples.md` → `examples/marp-basics.md`
- Delete: `template-optional/examples.md`
- Modify: `package.json`

**Step 1: Create examples/ directory and move file**

Run:
```bash
mkdir -p examples
mv template-optional/examples.md examples/marp-basics.md
```

**Step 2: Add frontmatter to marp-basics.md**

The file should already have frontmatter, but verify it doesn't have `themes` field (base example).

**Step 3: Update package.json files field**

Modify `package.json`:

Add `examples/` to the `files` array, ensure `template-optional/examples.md` is removed:

```json
  "files": [
    "index.js",
    "cli/",
    "lib/",
    "docs/",
    "template/",
    "template-optional/",
    "themes/",
    "examples/"
  ],
```

**Step 4: Remove template-optional if empty**

Check if `template-optional/` is now empty (only .gitkeep):

Run:
```bash
ls template-optional/
```

If only `.gitkeep` remains, you can optionally remove the directory:
```bash
rm -rf template-optional/
```

And update `package.json` to remove `template-optional/` from files array.

**Step 5: Verify npm package contents**

Run:
```bash
npm publish --dry-run
```

Expected: `examples/` directory is included in package preview

**Step 6: Commit**

```bash
git add examples/ package.json
git rm template-optional/examples.md
git commit -m "feat: migrate examples.md to examples/marp-basics.md"
```

---

## Task 9: Create theme-specific example placeholders

**Files:**
- Create: `examples/beam/beam-intro.md`
- Create: `examples/marpx/marpx-demo.md`
- Create: `examples/gaia-dark/gaia-dark-demo.md`
- Create: `examples/default-clean/clean-demo.md`
- Create: `examples/uncover-minimal/minimal-demo.md`

**Step 1: Create beam example**

Create: `examples/beam/beam-intro.md`

```markdown
---
marp: true
theme: beam
themes: [beam]
paginate: true
---

# Beam Theme Introduction

## Welcome to Beam

A clean, modern theme for your presentations.

---

## Features

- Minimalist design
- Clear typography
- Optimized for code slides

---

## Code Example

\`\`\`javascript
function hello() {
  console.log('Hello from Beam!');
}
\`\`\`
```

**Step 2: Create marpx example**

Create: `examples/marpx/marpx-demo.md`

```markdown
---
marp: true
theme: marpx
themes: [marpx]
---

# MarpX Theme Demo

Showcasing the MarpX theme capabilities.
```

**Step 3: Create remaining theme examples**

Create similar placeholder files for:
- `examples/gaia-dark/gaia-dark-demo.md`
- `examples/default-clean/clean-demo.md`
- `examples/uncover-minimal/minimal-demo.md`

**Step 4: Commit**

```bash
git add examples/
git commit -m "feat: add theme-specific example placeholders"
```

---

## Task 10: Run full test suite

**Step 1: Run all tests**

Run:
```bash
npm test
```

Expected: All tests pass

**Step 2: Run integration test**

Run:
```bash
node index.js test-full-flow --path /tmp
cd /tmp/test-full-flow
ls -la examples/
```

Expected: examples/ directory contains marp-basics.md and theme-specific examples

**Step 3: Cleanup**

Run:
```bash
rm -rf /tmp/test-full-flow
```

**Step 4: Commit**

```bash
git commit --allow-empty -m "test: verify full examples system integration"
```

---

## Summary

After completing all tasks:
1. `ExampleResolver` class discovers and filters examples by theme
2. `AddThemesCommand` has `_promptExamples` and `_copyExamples` methods
3. Both `create-project` and `theme:add` flows prompt for examples
4. `examples/` directory replaces `template-optional/examples.md`
5. Each theme has its own example subdirectory

**Total estimated commits:** 10
**New files:** `lib/example-resolver.js`, `tests/unit/example-resolver.test.js`, `examples/` structure
**Modified files:** `lib/add-themes-command.js`, `lib/prompts.js`, `cli/commands/create-project.js`, `cli/commands/add-themes-cli.js`, `package.json`
