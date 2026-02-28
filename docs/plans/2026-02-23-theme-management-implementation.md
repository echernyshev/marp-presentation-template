# Theme Management System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a complete theme management system for Marp presentations with CLI commands, VSCode integration, and interactive theme selection.

**Architecture:** Monolithic ThemeManager class delegating to focused helper classes (ThemeResolver, VSCodeIntegration, Prompts). Shared addThemesCommand function used by both project creation and post-creation theme addition. Template themes copied to project, lib/ modules duplicated to scripts/lib/ for standalone project CLI.

**Tech Stack:** Node.js >=20.0.0, @inquirer/prompts ^7.0.0 (interactive prompts), gray-matter ^4.0.3 (frontmatter parsing), Jest ^29.7.0 (testing), fs.cpSync (file copying)

---

## Task 1: Create lib/ directory structure and errors.js

**Files:**
- Create: `lib/errors.js`
- Test: `tests/unit/errors.test.js`

**Step 1: Write the failing test**

```javascript
// tests/unit/errors.test.js
const {
  ThemeError,
  ThemeNotFoundError,
  ThemeAlreadyExistsError,
  PresentationNotFoundError,
  InvalidCSSError,
  VSCodeIntegrationError
} = require('../../lib/errors');

describe('ThemeError classes', () => {
  test('ThemeError should be instance of Error', () => {
    const error = new ThemeError('test message');
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('test message');
    expect(error.name).toBe('ThemeError');
  });

  test('ThemeNotFoundError should have correct name', () => {
    const error = new ThemeNotFoundError('my-theme');
    expect(error.name).toBe('ThemeNotFoundError');
    expect(error.message).toContain('my-theme');
  });

  test('ThemeAlreadyExistsError should have correct name', () => {
    const error = new ThemeAlreadyExistsError('my-theme');
    expect(error.name).toBe('ThemeAlreadyExistsError');
    expect(error.message).toContain('my-theme');
  });

  test('PresentationNotFoundError should have correct name', () => {
    const error = new PresentationNotFoundError('/path/to/presentation.md');
    expect(error.name).toBe('PresentationNotFoundError');
    expect(error.message).toContain('/path/to/presentation.md');
  });

  test('InvalidCSSError should have correct name', () => {
    const error = new InvalidCSSError('/path/to/theme.css', 'syntax error');
    expect(error.name).toBe('InvalidCSSError');
    expect(error.message).toContain('/path/to/theme.css');
  });

  test('VSCodeIntegrationError should have correct name', () => {
    const error = new VSCodeIntegrationError('Failed to update settings');
    expect(error.name).toBe('VSCodeIntegrationError');
    expect(error.message).toBe('Failed to update settings');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/errors.test.js`
Expected: FAIL with "Cannot find module '../../lib/errors'"

**Step 3: Write minimal implementation**

```javascript
// lib/errors.js
class ThemeError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ThemeError';
  }
}

class ThemeNotFoundError extends ThemeError {
  constructor(themeName) {
    super(`Theme '${themeName}' not found`);
    this.name = 'ThemeNotFoundError';
    this.themeName = themeName;
  }
}

class ThemeAlreadyExistsError extends ThemeError {
  constructor(themeName) {
    super(`Theme '${themeName}' already exists`);
    this.name = 'ThemeAlreadyExistsError';
    this.themeName = themeName;
  }
}

class PresentationNotFoundError extends ThemeError {
  constructor(presentationPath) {
    super(`Presentation file not found: ${presentationPath}`);
    this.name = 'PresentationNotFoundError';
    this.presentationPath = presentationPath;
  }
}

class InvalidCSSError extends ThemeError {
  constructor(cssPath, reason) {
    super(`Invalid CSS file '${cssPath}': ${reason}`);
    this.name = 'InvalidCSSError';
    this.cssPath = cssPath;
    this.reason = reason;
  }
}

class VSCodeIntegrationError extends ThemeError {
  constructor(message) {
    super(message);
    this.name = 'VSCodeIntegrationError';
  }
}

module.exports = {
  ThemeError,
  ThemeNotFoundError,
  ThemeAlreadyExistsError,
  PresentationNotFoundError,
  InvalidCSSError,
  VSCodeIntegrationError
};
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/errors.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/errors.js tests/unit/errors.test.js
git commit -m "feat: add custom error classes for theme management"
```

---

## Task 2: Create Theme class and ThemeResolver.extractThemeName

**Files:**
- Create: `lib/theme-resolver.js`
- Test: `tests/unit/theme-resolver.test.js`

**Step 1: Write the failing test**

```javascript
// tests/unit/theme-resolver.test.js
const { ThemeResolver, Theme } = require('../../lib/theme-resolver');
const fs = require('fs');
const path = require('path');

describe('ThemeResolver.extractThemeName', () => {
  test('should extract theme name from CSS comment directive', () => {
    const css = '/* @theme my-custom-theme */\n:root { color: red; }';
    const result = ThemeResolver.extractThemeName(css);
    expect(result).toBe('my-custom-theme');
  });

  test('should handle theme directive with extra spaces', () => {
    const css = '/*  @theme   spaced-theme  */\n:root { }';
    const result = ThemeResolver.extractThemeName(css);
    expect(result).toBe('spaced-theme');
  });

  test('should handle theme directive on multiple lines', () => {
    const css = `/*
      * @theme multi-line-theme
      */\n:root { }`;
    const result = ThemeResolver.extractThemeName(css);
    expect(result).toBe('multi-line-theme');
  });

  test('should return null when no theme directive found', () => {
    const css = ':root { color: red; }';
    const result = ThemeResolver.extractThemeName(css);
    expect(result).toBeNull();
  });

  test('should extract theme name from filename as fallback', () => {
    const result = ThemeResolver.extractThemeName(
      ':root { color: red; }',
      'my-theme.css'
    );
    expect(result).toBe('my-theme');
  });

  test('should handle filename without .css extension', () => {
    const result = ThemeResolver.extractThemeName(
      ':root { color: red; }',
      'my-theme'
    );
    expect(result).toBe('my-theme');
  });

  test('should return null when no directive and no filename provided', () => {
    const result = ThemeResolver.extractThemeName(':root { }');
    expect(result).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/theme-resolver.test.js -t "extractThemeName"`
Expected: FAIL with "Cannot find module '../../lib/theme-resolver'"

**Step 3: Write minimal implementation**

```javascript
// lib/theme-resolver.js
const fs = require('fs');
const path = require('path');

/**
 * Represents a Marp theme
 */
class Theme {
  constructor(name, cssPath, css, dependencies = []) {
    this.name = name;
    this.path = cssPath;
    this.css = css;
    this.dependencies = dependencies;
    this.isSystem = ['default', 'gaia', 'uncover'].includes(name);
  }
}

/**
 * Resolves theme information from CSS files
 */
class ThemeResolver {
  static SYSTEM_THEMES = ['default', 'gaia', 'uncover'];

  /**
   * Extract theme name from CSS comment directive
   * Pattern: /* @theme name *\/
   *
   * @param {string} cssContent - CSS file content
   * @param {string} fallbackFilename - Filename to use as fallback
   * @returns {string|null} Theme name or null if not found
   */
  static extractThemeName(cssContent, fallbackFilename = null) {
    // Match /* @theme name */ - supports multi-line comments
    const themeDirectiveRegex = /\/\*\s*@theme\s+([\w-]+)\s*\*\//;
    const match = cssContent.match(themeDirectiveRegex);

    if (match && match[1]) {
      return match[1].trim();
    }

    // Fallback to filename (with or without .css extension)
    if (fallbackFilename) {
      const basename = path.basename(fallbackFilename, '.css');
      return basename;
    }

    return null;
  }
}

module.exports = { ThemeResolver, Theme };
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/theme-resolver.test.js -t "extractThemeName"`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/theme-resolver.js tests/unit/theme-resolver.test.js
git commit -m "feat: add Theme class and extractThemeName method"
```

---

## Task 3: Implement ThemeResolver.extractDependencies

**Files:**
- Modify: `lib/theme-resolver.js`
- Modify: `tests/unit/theme-resolver.test.js`

**Step 1: Write the failing test**

Add to `tests/unit/theme-resolver.test.js`:

```javascript
describe('ThemeResolver.extractDependencies', () => {
  test('should extract single @import dependency', () => {
    const css = '/* @theme my-theme */\n@import "gaia";';
    const result = ThemeResolver.extractDependencies(css);
    expect(result).toEqual(['gaia']);
  });

  test('should extract multiple @import dependencies', () => {
    const css = `/* @theme my-theme */
@import "default";
@import "marpx";`;
    const result = ThemeResolver.extractDependencies(css);
    expect(result).toEqual(['default', 'marpx']);
  });

  test('should ignore url() imports', () => {
    const css = `/* @theme my-theme */
@import "gaia";
@import url("https://example.com/style.css");`;
    const result = ThemeResolver.extractDependencies(css);
    expect(result).toEqual(['gaia']);
  });

  test('should handle @import with single quotes', () => {
    const css = `@import 'default';`;
    const result = ThemeResolver.extractDependencies(css);
    expect(result).toEqual(['default']);
  });

  test('should handle @import with extra whitespace', () => {
    const css = `@import  "gaia"  ;`;
    const result = ThemeResolver.extractDependencies(css);
    expect(result).toEqual(['gaia']);
  });

  test('should return empty array when no dependencies', () => {
    const css = '/* @theme standalone */\n:root { }';
    const result = ThemeResolver.extractDependencies(css);
    expect(result).toEqual([]);
  });

  test('should handle relative path imports', () => {
    const css = `@import "../marpx/marpx.css";`;
    const result = ThemeResolver.extractDependencies(css);
    expect(result).toEqual(['../marpx/marpx.css']);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/theme-resolver.test.js -t "extractDependencies"`
Expected: FAIL with "ThemeResolver.extractDependencies is not a function"

**Step 3: Write minimal implementation**

Add to `lib/theme-resolver.js` in ThemeResolver class:

```javascript
/**
 * Extract @import dependencies from CSS
 * Ignores url() imports
 *
 * @param {string} cssContent - CSS file content
 * @returns {string[]} Array of theme names from @import statements
 */
static extractDependencies(cssContent) {
  // Match @import "theme" or @import 'theme' - ignore url()
  // This regex matches non-url imports
  const importRegex = /@import\s+(?:url\()?['"]([^'"]+)['"]\)?\s*;/g;
  const dependencies = [];

  let match;
  while ((match = importRegex.exec(cssContent)) !== null) {
    const importPath = match[1];

    // Skip if it's clearly a url() import (contains :// or starts with http)
    if (!importPath.match(/^https?:\/\//)) {
      dependencies.push(importPath);
    }
  }

  return dependencies;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/theme-resolver.test.js -t "extractDependencies"`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/theme-resolver.js tests/unit/theme-resolver.test.js
git commit -m "feat: add extractDependencies method for @import parsing"
```

---

## Task 4: Implement ThemeResolver.resolveTheme

**Files:**
- Modify: `lib/theme-resolver.js`
- Modify: `tests/unit/theme-resolver.test.js`

**Step 1: Write the failing test**

Add to `tests/unit/theme-resolver.test.js`:

```javascript
describe('ThemeResolver.resolveTheme', () => {
  const fixturesDir = path.join(__dirname, '..', 'fixtures', 'themes');
  const tempDir = path.join(__dirname, '..', 'temp');

  beforeEach(() => {
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('should resolve theme from CSS file with directive', () => {
    const cssPath = path.join(tempDir, 'test-theme.css');
    fs.writeFileSync(cssPath, '/* @theme test */\n@import "gaia";');

    const theme = ThemeResolver.resolveTheme(cssPath);
    expect(theme.name).toBe('test');
    expect(theme.path).toBe(cssPath);
    expect(theme.dependencies).toEqual(['gaia']);
    expect(theme.isSystem).toBe(false);
  });

  test('should resolve theme using filename fallback', () => {
    const cssPath = path.join(tempDir, 'fallback.css');
    fs.writeFileSync(cssPath, ':root { }');

    const theme = ThemeResolver.resolveTheme(cssPath);
    expect(theme.name).toBe('fallback');
    expect(theme.dependencies).toEqual([]);
  });

  test('should mark system themes correctly', () => {
    const cssPath = path.join(tempDir, 'gaia.css');
    fs.writeFileSync(cssPath, '/* @theme gaia */');

    const theme = ThemeResolver.resolveTheme(cssPath);
    expect(theme.isSystem).toBe(true);
  });

  test('should throw for non-existent file', () => {
    const cssPath = path.join(tempDir, 'non-existent.css');
    expect(() => ThemeResolver.resolveTheme(cssPath)).toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/theme-resolver.test.js -t "resolveTheme"`
Expected: FAIL with "ThemeResolver.resolveTheme is not a function"

**Step 3: Write minimal implementation**

Add to `lib/theme-resolver.js` in ThemeResolver class:

```javascript
/**
 * Resolve theme from a CSS file
 *
 * @param {string} cssPath - Path to CSS file
 * @returns {Theme} Theme object
 * @throws {Error} If file does not exist
 */
static resolveTheme(cssPath) {
  if (!fs.existsSync(cssPath)) {
    throw new Error(`CSS file not found: ${cssPath}`);
  }

  const css = fs.readFileSync(cssPath, 'utf-8');
  const filename = path.basename(cssPath);
  const name = this.extractThemeName(css, filename) || filename;
  const dependencies = this.extractDependencies(css);

  return new Theme(name, cssPath, css, dependencies);
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/theme-resolver.test.js -t "resolveTheme"`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/theme-resolver.js tests/unit/theme-resolver.test.js
git commit -m "feat: add resolveTheme method for single file resolution"
```

---

## Task 5: Implement ThemeResolver.scanDirectory

**Files:**
- Modify: `lib/theme-resolver.js`
- Modify: `tests/unit/theme-resolver.test.js`

**Step 1: Write the failing test**

Add to `tests/unit/theme-resolver.test.js`:

```javascript
describe('ThemeResolver.scanDirectory', () => {
  const fixturesDir = path.join(__dirname, '..', 'fixtures', 'themes');
  const tempDir = path.join(__dirname, '..', 'temp');

  beforeEach(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('should scan single CSS file in flat directory', () => {
    fs.writeFileSync(path.join(tempDir, 'theme1.css'), '/* @theme theme1 */');
    const themes = ThemeResolver.scanDirectory(tempDir);
    expect(themes).toHaveLength(1);
    expect(themes[0].name).toBe('theme1');
  });

  test('should scan nested CSS files recursively', () => {
    fs.mkdirSync(path.join(tempDir, 'subfolder'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'root.css'), '/* @theme root */');
    fs.writeFileSync(path.join(tempDir, 'subfolder', 'nested.css'), '/* @theme nested */');

    const themes = ThemeResolver.scanDirectory(tempDir);
    expect(themes).toHaveLength(2);
    const themeNames = themes.map(t => t.name).sort();
    expect(themeNames).toEqual(['nested', 'root']);
  });

  test('should return empty array for empty directory', () => {
    const emptyDir = path.join(tempDir, 'empty');
    fs.mkdirSync(emptyDir, { recursive: true });

    const themes = ThemeResolver.scanDirectory(emptyDir);
    expect(themes).toEqual([]);
  });

  test('should handle directory with non-CSS files', () => {
    fs.writeFileSync(path.join(tempDir, 'readme.md'), '# README');
    fs.writeFileSync(path.join(tempDir, 'theme.css'), '/* @theme theme */');

    const themes = ThemeResolver.scanDirectory(tempDir);
    expect(themes).toHaveLength(1);
    expect(themes[0].name).toBe('theme');
  });

  test('should throw for non-existent directory', () => {
    const nonExistent = path.join(tempDir, 'does-not-exist');
    expect(() => ThemeResolver.scanDirectory(nonExistent)).toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/theme-resolver.test.js -t "scanDirectory"`
Expected: FAIL with "ThemeResolver.scanDirectory is not a function"

**Step 3: Write minimal implementation**

Add to `lib/theme-resolver.js`:

```javascript
const { readdirSync, statSync } = require('fs');
```

Add to ThemeResolver class:

```javascript
/**
 * Scan directory recursively for CSS theme files
 *
 * @param {string} themesPath - Path to themes directory
 * @returns {Theme[]} Array of Theme objects
 * @throws {Error} If directory does not exist
 */
static scanDirectory(themesPath) {
  if (!fs.existsSync(themesPath)) {
    throw new Error(`Themes directory not found: ${themesPath}`);
  }

  const themes = [];
  const cssFiles = this._findCssFiles(themesPath);

  for (const cssPath of cssFiles) {
    try {
      const theme = this.resolveTheme(cssPath);
      themes.push(theme);
    } catch (error) {
      // Skip files that can't be resolved
      console.warn(`Warning: Could not resolve theme from ${cssPath}: ${error.message}`);
    }
  }

  return themes;
}

/**
 * Find all CSS files in directory recursively
 * @private
 */
static _findCssFiles(dirPath, results = []) {
  const entries = readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      this._findCssFiles(fullPath, results);
    } else if (entry.isFile() && entry.name.endsWith('.css')) {
      results.push(fullPath);
    }
  }

  return results;
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/theme-resolver.test.js -t "scanDirectory"`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/theme-resolver.js tests/unit/theme-resolver.test.js
git commit -m "feat: add scanDirectory method for recursive theme discovery"
```

---

## Task 6: Implement ThemeResolver.resolveDependencies

**Files:**
- Modify: `lib/theme-resolver.js`
- Modify: `tests/unit/theme-resolver.test.js`

**Step 1: Write the failing test**

Add to `tests/unit/theme-resolver.test.js`:

```javascript
describe('ThemeResolver.resolveDependencies', () => {
  test('should return only selected themes with no dependencies', () => {
    const selectedThemes = [
      new Theme('standalone', '/path/standalone.css', ':root {}', [])
    ];

    const result = ThemeResolver.resolveDependencies(selectedThemes, []);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('standalone');
  });

  test('should include parent themes from dependencies', () => {
    const allThemes = [
      new Theme('default', '/path/default.css', 'css', [], true),
      new Theme('marpx', '/path/marpx.css', 'css', ['default']),
      new Theme('socrates', '/path/socrates.css', 'css', ['marpx'])
    ];

    const selectedThemes = [allThemes[2]]; // socrates
    const result = ThemeResolver.resolveDependencies(selectedThemes, allThemes);

    const names = result.map(t => t.name);
    expect(names).toContain('socrates');
    expect(names).toContain('marpx');
    expect(names).not.toContain('default'); // system theme excluded
  });

  test('should exclude system themes from result', () => {
    const allThemes = [
      new Theme('gaia', '/path/gaia.css', 'css', [], true),
      new Theme('my-theme', '/path/my.css', 'css', ['gaia'])
    ];

    const selectedThemes = [allThemes[1]];
    const result = ThemeResolver.resolveDependencies(selectedThemes, allThemes);

    expect(result.map(t => t.name)).toEqual(['my-theme']);
  });

  test('should handle multiple selected themes with shared dependencies', () => {
    const allThemes = [
      new Theme('default', '/path/default.css', 'css', [], true),
      new Theme('base', '/path/base.css', 'css', ['default']),
      new Theme('theme1', '/path/t1.css', 'css', ['base']),
      new Theme('theme2', '/path/t2.css', 'css', ['base'])
    ];

    const selectedThemes = [allThemes[2], allThemes[3]];
    const result = ThemeResolver.resolveDependencies(selectedThemes, allThemes);

    const names = result.map(t => t.name);
    expect(names).toContain('theme1');
    expect(names).toContain('theme2');
    expect(names).toContain('base');
    expect(names).not.toContain('default');
    // base should appear only once
    expect(names.filter(n => n === 'base')).toHaveLength(1);
  });

  test('should handle circular dependencies gracefully', () => {
    const allThemes = [
      new Theme('a', '/path/a.css', 'css', ['b']),
      new Theme('b', '/path/b.css', 'css', ['a'])
    ];

    const selectedThemes = [allThemes[0]];
    const result = ThemeResolver.resolveDependencies(selectedThemes, allThemes);

    // Should include both a and b without infinite loop
    expect(result.map(t => t.name).sort()).toEqual(['a', 'b']);
  });

  test('should handle missing parent themes', () => {
    const selectedThemes = [
      new Theme('orphan', '/path/orphan.css', 'css', ['missing-parent'])
    ];

    const result = ThemeResolver.resolveDependencies(selectedThemes, []);
    expect(result.map(t => t.name)).toEqual(['orphan']);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/theme-resolver.test.js -t "resolveDependencies"`
Expected: FAIL with "ThemeResolver.resolveDependencies is not a function"

**Step 3: Write minimal implementation**

Add to `lib/theme-resolver.js` in ThemeResolver class:

```javascript
/**
 * Resolve all dependencies for selected themes
 * Returns complete set of themes to copy (including parents)
 * Excludes system themes (default, gaia, uncover)
 *
 * @param {Theme[]} selectedThemes - Themes user selected
 * @param {Theme[]} allThemes - All available themes
 * @returns {Theme[]} Themes to copy (selected + dependencies)
 */
static resolveDependencies(selectedThemes, allThemes) {
  const toCopy = new Map(); // Use Map for deduplication by name
  const visited = new Set();
  const visiting = new Set();

  const addTheme = (themeName) => {
    if (visited.has(themeName)) {
      return;
    }

    // Check for circular dependency
    if (visiting.has(themeName)) {
      console.warn(`Warning: Circular dependency detected for theme '${themeName}'`);
      return;
    }

    visiting.add(themeName);

    // Find theme in allThemes
    const theme = allThemes.find(t => t.name === themeName);

    if (!theme) {
      console.warn(`Warning: Dependency '${themeName}' not found in available themes`);
      visiting.delete(themeName);
      return;
    }

    // Skip system themes
    if (theme.isSystem) {
      visiting.delete(themeName);
      return;
    }

    // First resolve dependencies
    for (const depName of theme.dependencies) {
      // Extract just the theme name from path (e.g., "../marpx/marpx.css" -> "marpx")
      const simpleDepName = depName.replace(/\.(css)?$/g, '').split('/').pop();
      addTheme(simpleDepName);
    }

    // Then add this theme
    toCopy.set(theme.name, theme);
    visited.add(theme.name);
    visiting.delete(themeName);
  };

  // Start with selected themes
  for (const theme of selectedThemes) {
    addTheme(theme.name);
  }

  return Array.from(toCopy.values());
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/theme-resolver.test.js -t "resolveDependencies"`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/theme-resolver.js tests/unit/theme-resolver.test.js
git commit -m "feat: add resolveDependencies method with circular dependency handling"
```

---

## Task 7: Implement VSCodeIntegration class

**Files:**
- Create: `lib/vscode-integration.js`
- Test: `tests/unit/vscode-integration.test.js`

**Step 1: Write the failing test**

```javascript
// tests/unit/vscode-integration.test.js
const fs = require('fs');
const path = require('path');
const { VSCodeIntegration } = require('../../lib/vscode-integration');
const { Theme } = require('../../lib/theme-resolver');

describe('VSCodeIntegration', () => {
  const tempDir = path.join(__dirname, '..', 'temp');
  const vscodeDir = path.join(tempDir, '.vscode');

  beforeEach(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    test('should create instance with project path', () => {
      const integration = new VSCodeIntegration(tempDir);
      expect(integration.projectPath).toBe(tempDir);
    });
  });

  describe('getSettingsPath', () => {
    test('should return path to settings.json', () => {
      const integration = new VSCodeIntegration(tempDir);
      const settingsPath = integration.getSettingsPath();
      expect(settingsPath).toBe(path.join(vscodeDir, 'settings.json'));
    });
  });

  describe('readSettings', () => {
    test('should return empty object when settings.json does not exist', () => {
      const integration = new VSCodeIntegration(tempDir);
      const settings = integration.readSettings();
      expect(settings).toEqual({});
    });

    test('should read existing settings.json', () => {
      fs.mkdirSync(vscodeDir, { recursive: true });
      const existingSettings = {
        'editor.tabSize': 2,
        'other.setting': true
      };
      fs.writeFileSync(
        path.join(vscodeDir, 'settings.json'),
        JSON.stringify(existingSettings, null, 2)
      );

      const integration = new VSCodeIntegration(tempDir);
      const settings = integration.readSettings();
      expect(settings).toEqual(existingSettings);
    });

    test('should handle corrupted JSON by backing up and returning empty', () => {
      fs.mkdirSync(vscodeDir, { recursive: true });
      const settingsPath = path.join(vscodeDir, 'settings.json');
      fs.writeFileSync(settingsPath, '{ invalid json }');

      const integration = new VSCodeIntegration(tempDir);
      const settings = integration.readSettings();

      // Should backup the corrupted file
      expect(fs.existsSync(settingsPath + '.backup')).toBe(true);
      expect(settings).toEqual({});
    });
  });

  describe('writeSettings', () => {
    test('should create .vscode directory and settings.json', () => {
      const integration = new VSCodeIntegration(tempDir);
      integration.writeSettings({ 'test.key': 'value' });

      expect(fs.existsSync(path.join(vscodeDir, 'settings.json'))).toBe(true);
    });

    test('should write settings with proper formatting', () => {
      const integration = new VSCodeIntegration(tempDir);
      const settings = { 'markdown.marp.themes': ['themes/test.css'] };
      integration.writeSettings(settings);

      const content = fs.readFileSync(path.join(vscodeDir, 'settings.json'), 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();
      expect(JSON.parse(content)).toEqual(settings);
    });
  });

  describe('syncThemes', () => {
    test('should create settings.json with theme paths', () => {
      const themes = [
        new Theme('beam', '/path/beam/beam.css', 'css', []),
        new Theme('marpx', '/path/marpx/marpx.css', 'css', [])
      ];

      const integration = new VSCodeIntegration(tempDir);
      integration.syncThemes(themes);

      const settings = integration.readSettings();
      expect(settings['markdown.marp.themes']).toEqual([
        'themes/beam/beam.css',
        'themes/marpx/marpx.css'
      ]);
    });

    test('should merge with existing settings', () => {
      fs.mkdirSync(vscodeDir, { recursive: true });
      const existingSettings = {
        'editor.tabSize': 2,
        'markdown.marp.themes': ['themes/old.css']
      };
      fs.writeFileSync(
        path.join(vscodeDir, 'settings.json'),
        JSON.stringify(existingSettings, null, 2)
      );

      const themes = [
        new Theme('new', '/path/new/new.css', 'css', [])
      ];

      const integration = new VSCodeIntegration(tempDir);
      integration.syncThemes(themes);

      const settings = integration.readSettings();
      expect(settings['editor.tabSize']).toBe(2);
      expect(settings['markdown.marp.themes']).toEqual(['themes/new/new.css']);
    });

    test('should handle empty themes array', () => {
      const integration = new VSCodeIntegration(tempDir);
      integration.syncThemes([]);

      const settings = integration.readSettings();
      expect(settings['markdown.marp.themes']).toEqual([]);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/vscode-integration.test.js`
Expected: FAIL with "Cannot find module '../../lib/vscode-integration'"

**Step 3: Write minimal implementation**

```javascript
// lib/vscode-integration.js
const fs = require('fs');
const path = require('path');

/**
 * Manages VSCode settings for Marp extension integration
 */
class VSCodeIntegration {
  constructor(projectPath) {
    this.projectPath = projectPath;
  }

  /**
   * Get path to .vscode/settings.json
   */
  getSettingsPath() {
    return path.join(this.projectPath, '.vscode', 'settings.json');
  }

  /**
   * Read VSCode settings
   * Returns empty object if file doesn't exist
   * Backs up corrupted JSON and returns empty object
   */
  readSettings() {
    const settingsPath = this.getSettingsPath();

    if (!fs.existsSync(settingsPath)) {
      return {};
    }

    try {
      const content = fs.readFileSync(settingsPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      // Backup corrupted file
      const backupPath = settingsPath + '.backup';
      fs.copyFileSync(settingsPath, backupPath);
      console.warn(`Warning: Corrupted settings.json backed up to ${backupPath}`);
      return {};
    }
  }

  /**
   * Write VSCode settings
   * Creates .vscode directory if it doesn't exist
   */
  writeSettings(settings) {
    const settingsPath = this.getSettingsPath();
    const vscodeDir = path.dirname(settingsPath);

    if (!fs.existsSync(vscodeDir)) {
      fs.mkdirSync(vscodeDir, { recursive: true });
    }

    fs.writeFileSync(
      settingsPath,
      JSON.stringify(settings, null, 2) + '\n'
    );
  }

  /**
   * Sync themes to markdown.marp.themes in settings.json
   * Creates settings.json if not exists
   * Merges with existing settings
   */
  syncThemes(themes) {
    const settings = this.readSettings();

    // Convert themes to relative paths for VSCode
    const themePaths = themes.map(theme => {
      // Get relative path from project root
      const relativePath = path.relative(this.projectPath, theme.path);
      // Use forward slashes for cross-platform compatibility
      return relativePath.split(path.sep).join('/');
    });

    settings['markdown.marp.themes'] = themePaths;
    this.writeSettings(settings);
  }
}

module.exports = { VSCodeIntegration };
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/vscode-integration.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/vscode-integration.js tests/unit/vscode-integration.test.js
git commit -m "feat: add VSCodeIntegration class for settings management"
```

---

## Task 8: Create frontmatter.js using gray-matter library

**Files:**
- Create: `lib/frontmatter.js`
- Test: `tests/unit/frontmatter.test.js`

**Step 1: Write the failing test**

```javascript
// tests/unit/frontmatter.test.js
const fs = require('fs');
const path = require('path');
const { Frontmatter } = require('../../lib/frontmatter');

describe('Frontmatter', () => {
  const tempDir = path.join(__dirname, '..', 'temp');

  beforeEach(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('parse', () => {
    test('should parse frontmatter from markdown file', () => {
      const content = `---
marp: true
theme: default
---

# Slide Content`;
      const result = Frontmatter.parse(content);
      expect(result.marp).toBe(true);
      expect(result.theme).toBe('default');
    });

    test('should return empty object for file without frontmatter', () => {
      const content = '# Just markdown content';
      const result = Frontmatter.parse(content);
      expect(result).toEqual({});
    });

    test('should handle frontmatter with various data types', () => {
      const content = `---
string: value
number: 42
boolean: true
array:
  - one
  - two
---

Content`;
      const result = Frontmatter.parse(content);
      expect(result.string).toBe('value');
      expect(result.number).toBe(42);
      expect(result.boolean).toBe(true);
      expect(result.array).toEqual(['one', 'two']);
    });
  });

  describe('getTheme', () => {
    test('should extract theme value from frontmatter', () => {
      const content = `---
theme: gaia
---

Content`;
      expect(Frontmatter.getTheme(content)).toBe('gaia');
    });

    test('should return null if no theme in frontmatter', () => {
      const content = `---
marp: true
---

Content`;
      expect(Frontmatter.getTheme(content)).toBeNull();
    });

    test('should return null for content without frontmatter', () => {
      expect(Frontmatter.getTheme('# No frontmatter')).toBeNull();
    });
  });

  describe('setTheme', () => {
    test('should update existing theme in frontmatter', () => {
      const content = `---
theme: default
---

# Content`;
      const result = Frontmatter.setTheme(content, 'gaia');
      expect(result).toContain('theme: gaia');
      expect(result).toContain('# Content');
    });

    test('should add theme to existing frontmatter', () => {
      const content = `---
marp: true
---

# Content`;
      const result = Frontmatter.setTheme(content, 'beam');
      expect(result).toContain('marp: true');
      expect(result).toContain('theme: beam');
    });

    test('should create frontmatter if it does not exist', () => {
      const content = '# Content without frontmatter';
      const result = Frontmatter.setTheme(content, 'marpx');
      expect(result).toMatch(/^---\ntheme: marpx\n---/);
      expect(result).toContain('# Content');
    });

    test('should preserve other frontmatter attributes', () => {
      const content = `---
theme: default
paginate: true
---

Content`;
      const result = Frontmatter.setTheme(content, 'new-theme');
      expect(result).toContain('theme: new-theme');
      expect(result).toContain('paginate: true');
    });
  });

  describe('writeToFile', () => {
    test('should write content to file', () => {
      const filePath = path.join(tempDir, 'test.md');
      const content = '# Test Content';

      Frontmatter.writeToFile(filePath, content);
      expect(fs.readFileSync(filePath, 'utf-8')).toBe(content);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/frontmatter.test.js`
Expected: FAIL with "Cannot find module '../../lib/frontmatter'"

**Step 3: Add gray-matter dependency and write implementation**

First, add dependency to root package.json:

```bash
npm install --save-dev gray-matter@^4.0.3
```

Then create `lib/frontmatter.js`:

```javascript
// lib/frontmatter.js
const fs = require('fs');
const matter = require('gray-matter');

/**
 * Parse and manipulate markdown frontmatter
 */
class Frontmatter {
  /**
   * Parse frontmatter from markdown content
   *
   * @param {string} content - Markdown content
   * @returns {object} Parsed frontmatter data
   */
  static parse(content) {
    const { data } = matter(content);
    return data;
  }

  /**
   * Extract theme value from frontmatter
   *
   * @param {string} content - Markdown content
   * @returns {string|null} Theme name or null if not found
   */
  static getTheme(content) {
    const data = this.parse(content);
    return data.theme || null;
  }

  /**
   * Set or update theme in frontmatter
   * Preserves all other attributes and content
   *
   * @param {string} content - Markdown content
   * @param {string} themeName - New theme name
   * @returns {string} Updated markdown content
   */
  static setTheme(content, themeName) {
    const { data, content: body } = matter(content);

    // Update theme
    data.theme = themeName;

    // Reconstruct with gray-matter
    return matter.stringify(body, data);
  }

  /**
   * Write content to file
   *
   * @param {string} filePath - Path to file
   * @param {string} content - Content to write
   */
  static writeToFile(filePath, content) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }
}

module.exports = { Frontmatter };
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/frontmatter.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/frontmatter.js tests/unit/frontmatter.test.js package.json package-lock.json
git commit -m "feat: add Frontmatter class using gray-matter library"
```

---

## Task 9: Implement prompts.js using @inquirer/prompts

**Files:**
- Create: `lib/prompts.js`
- Test: `tests/unit/prompts.test.js` (mock tests only)

**Step 1: Add @inquirer/prompts dependency**

```bash
npm install @inquirer/prompts@^7.0.0
```

**Step 2: Write the implementation**

```javascript
// lib/prompts.js
const inquirer = require('@inquirer/prompts');
const { THEME_NOT_FOUND } = require('./errors');

/**
 * Interactive prompts for theme management
 */
class Prompts {
  /**
   * Prompt user to select themes from available options
   *
   * @param {Array} availableThemes - Array of {name, description} objects
   * @returns {Promise<string[]>} Array of selected theme names
   */
  static async promptThemes(availableThemes) {
    if (availableThemes.length === 0) {
      return [];
    }

    const choices = availableThemes.map(theme => ({
      name: theme.name,
      value: theme.name,
      checked: false
    }));

    return await inquirer.checkbox({
      message: 'Select themes to add:',
      choices
    });
  }

  /**
   * Prompt user to select active theme from selected themes
   *
   * @param {Array} selectedThemes - Array of theme names
   * @returns {Promise<string>} Selected theme name
   */
  static async promptActiveTheme(selectedThemes) {
    if (selectedThemes.length === 0) {
      throw new Error('No themes available to select');
    }

    if (selectedThemes.length === 1) {
      return selectedThemes[0];
    }

    return await inquirer.select({
      message: 'Select active theme:',
      choices: selectedThemes
    });
  }

  /**
   * Prompt user for new theme name with validation
   *
   * @returns {Promise<string>} Validated theme name
   */
  static async promptNewThemeName() {
    return await inquirer.input({
      message: 'Theme name:',
      validate: (input) => {
        if (!input || input.trim().length === 0) {
          return 'Theme name is required';
        }
        if (!/^[a-z0-9-]+$/.test(input)) {
          return 'Theme name must contain only lowercase letters, numbers, and hyphens';
        }
        return true;
      }
    });
  }

  /**
   * Prompt user to select parent theme
   *
   * @param {Array} existingThemes - Array of {name, isSystem} objects
   * @returns {Promise<string|null>} Selected parent theme name or null for none
   */
  static async promptParentTheme(existingThemes) {
    const choices = [
      { name: 'none (create from scratch)', value: null },
      new inquirer.Separator('--- System Themes ---'),
      { name: 'default (system built-in)', value: 'default' },
      { name: 'gaia (system built-in)', value: 'gaia' },
      { name: 'uncover (system built-in)', value: 'uncover' }
    ];

    // Add custom themes
    const customThemes = existingThemes.filter(t => !t.isSystem);
    if (customThemes.length > 0) {
      choices.push(new inquirer.Separator('--- Custom Themes ---'));
      customThemes.forEach(theme => {
        choices.push({ name: theme.name, value: theme.name });
      });
    }

    return await inquirer.select({
      message: 'Parent theme:',
      choices
    });
  }

  /**
   * Prompt user for directory location for new theme
   *
   * @param {Array} existingDirs - Array of existing directory names
   * @returns {Promise<string>} Selected option: 'root', 'existing', or 'new'
   */
  static async promptDirectoryLocation(existingDirs) {
    const choices = [
      { name: 'In root (themes/<name>.css)', value: 'root' }
    ];

    if (existingDirs.length > 0) {
      choices.push(new inquirer.Separator('--- Existing Folders ---'));
      existingDirs.forEach(dir => {
        choices.push({
          name: `In existing folder: themes/${dir}/`,
          value: dir
        });
      });
    }

    choices.push(new inquirer.Separator('--- New Folder ---'));
    choices.push({ name: 'In new folder (enter name)', value: 'new' });

    return await inquirer.select({
      message: 'Where to create the theme CSS file?',
      choices
    });
  }

  /**
   * Prompt user for new folder name
   *
   * @returns {Promise<string>} Folder name
   */
  static async promptNewFolderName() {
    return await inquirer.input({
      message: 'Folder name:',
      validate: (input) => {
        if (!input || input.trim().length === 0) {
          return 'Folder name is required';
        }
        if (!/^[a-z0-9-]+$/.test(input)) {
          return 'Folder name must contain only lowercase letters, numbers, and hyphens';
        }
        return true;
      }
    });
  }

  /**
   * Prompt user for conflict resolution
   *
   * @param {Array} conflicts - Array of conflicting theme names
   * @returns {Promise<string>} Selected action: 'skip', 'overwrite', 'skip-all', 'overwrite-all', or 'cancel'
   */
  static async promptConflictResolution(conflicts) {
    const isMultiple = conflicts.length > 1;

    if (isMultiple) {
      const conflictList = conflicts.map(c => `  - ${c.name}`).join('\n');
      console.log(`\n${conflicts.length} themes already exist in your project:\n${conflictList}\n`);

      return await inquirer.select({
        message: 'Apply to all conflicts?',
        choices: [
          { name: 'Skip all', value: 'skip-all' },
          { name: 'Overwrite all', value: 'overwrite-all' },
          { name: 'Choose for each', value: 'choose-each' },
          { name: 'Cancel', value: 'cancel' }
        ]
      });
    }

    const conflict = conflicts[0];
    return await inquirer.select({
      message: `Theme "${conflict.name}" already exists. What would you like to do?`,
      choices: [
        { name: 'Skip (keep existing)', value: 'skip' },
        { name: 'Overwrite (replace with template version)', value: 'overwrite' },
        { name: 'Cancel (stop adding themes)', value: 'cancel' }
      ]
    });
  }

  /**
   * Prompt user for single theme conflict resolution
   *
   * @param {string} themeName - Name of conflicting theme
   * @returns {Promise<string>} Selected action: 'skip', 'overwrite', or 'cancel'
   */
  static async promptSingleConflict(themeName) {
    return await inquirer.select({
      message: `Theme "${themeName}" already exists. What would you like to do?`,
      choices: [
        { name: 'Skip (keep existing)', value: 'skip' },
        { name: 'Overwrite (replace with template version)', value: 'overwrite' },
        { name: 'Cancel (stop adding themes)', value: 'cancel' }
      ]
    });
  }

  /**
   * Confirm action with user
   *
   * @param {string} message - Confirmation message
   * @param {boolean} defaultValue - Default value (true: yes, false: no)
   * @returns {Promise<boolean>} User's choice
   */
  static async confirm(message, defaultValue = true) {
    return await inquirer.confirm({
      message,
      default: defaultValue
    });
  }
}

module.exports = { Prompts };
```

**Step 3: Write mock-based tests**

```javascript
// tests/unit/prompts.test.js
const { Prompts } = require('../../lib/prompts');

// Mock @inquirer/prompts
jest.mock('@inquirer/prompts', () => ({
  checkbox: jest.fn(),
  select: jest.fn(),
  input: jest.fn(),
  confirm: jest.fn(),
  Separator: class Separator {}
}));

const inquirer = require('@inquirer/prompts');

describe('Prompts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('promptThemes', () => {
    test('should return selected themes', async () => {
      const availableThemes = [
        { name: 'beam', description: 'Beamer theme' },
        { name: 'gaia-dark', description: 'Dark gaia' }
      ];
      inquirer.checkbox.mockResolvedValue(['beam']);

      const result = await Prompts.promptThemes(availableThemes);
      expect(result).toEqual(['beam']);
      expect(inquirer.checkbox).toHaveBeenCalledWith({
        message: 'Select themes to add:',
        choices: [
          { name: 'beam', value: 'beam', checked: false },
          { name: 'gaia-dark', value: 'gaia-dark', checked: false }
        ]
      });
    });

    test('should return empty array for no available themes', async () => {
      const result = await Prompts.promptThemes([]);
      expect(result).toEqual([]);
      expect(inquirer.checkbox).not.toHaveBeenCalled();
    });
  });

  describe('promptActiveTheme', () => {
    test('should return single theme if only one available', async () => {
      const result = await Prompts.promptActiveTheme(['only-theme']);
      expect(result).toBe('only-theme');
      expect(inquirer.select).not.toHaveBeenCalled();
    });

    test('should prompt user if multiple themes', async () => {
      inquirer.select.mockResolvedValue('theme-a');
      const result = await Prompts.promptActiveTheme(['theme-a', 'theme-b']);
      expect(result).toBe('theme-a');
    });

    test('should throw if no themes available', async () => {
      await expect(Prompts.promptActiveTheme([])).rejects.toThrow('No themes available');
    });
  });

  describe('promptNewThemeName', () => {
    test('should return validated theme name', async () => {
      inquirer.input.mockResolvedValue('my-theme');
      const result = await Prompts.promptNewThemeName();
      expect(result).toBe('my-theme');
    });

    test('should validate theme name format', async () => {
      inquirer.input.mockImplementation(({ validate }) => {
        const invalid = validate('Invalid Name!');
        expect(invalid).toBeTruthy();
        const valid = validate('valid-name');
        expect(valid).toBe(true);
        return Promise.resolve('valid-name');
      });

      await Prompts.promptNewThemeName();
    });
  });

  describe('promptParentTheme', () => {
    test('should show system and custom themes', async () => {
      const existingThemes = [
        { name: 'marpx', isSystem: false },
        { name: 'beam', isSystem: false }
      ];
      inquirer.select.mockResolvedValue('marpx');

      const result = await Prompts.promptParentTheme(existingThemes);
      expect(result).toBe('marpx');
    });

    test('should return null for "none" option', async () => {
      inquirer.select.mockResolvedValue(null);
      const result = await Prompts.promptParentTheme([]);
      expect(result).toBeNull();
    });
  });

  describe('confirm', () => {
    test('should return boolean choice', async () => {
      inquirer.confirm.mockResolvedValue(true);
      const result = await Prompts.confirm('Continue?', false);
      expect(result).toBe(true);
      expect(inquirer.confirm).toHaveBeenCalledWith({
        message: 'Continue?',
        default: false
      });
    });
  });
});
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/prompts.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/prompts.js tests/unit/prompts.test.js package.json package-lock.json
git commit -m "feat: add Prompts class using @inquirer/prompts"
```

---

## Task 10: Implement ThemeManager class

**Files:**
- Create: `lib/theme-manager.js`
- Test: `tests/unit/theme-manager.test.js`

**Step 1: Write the failing test**

```javascript
// tests/unit/theme-manager.test.js
const fs = require('fs');
const path = require('path');
const { ThemeManager } = require('../../lib/theme-manager');
const { ThemeResolver, Theme } = require('../../lib/theme-resolver');
const { VSCodeIntegration } = require('../../lib/vscode-integration');
const { Frontmatter } = require('../../lib/frontmatter');
const { ThemeNotFoundError, PresentationNotFoundError } = require('../../lib/errors');

describe('ThemeManager', () => {
  const tempDir = path.join(__dirname, '..', 'temp');
  const themesDir = path.join(tempDir, 'themes');
  const presentationPath = path.join(tempDir, 'presentation.md');

  beforeEach(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    if (!fs.existsSync(themesDir)) {
      fs.mkdirSync(themesDir, { recursive: true });
    }
    // Create default presentation
    fs.writeFileSync(presentationPath, `---
marp: true
theme: default
---

# Presentation`);
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    test('should create instance with project path', () => {
      const manager = new ThemeManager(tempDir);
      expect(manager.projectPath).toBe(tempDir);
      expect(manager.themesPath).toBe(themesDir);
    });
  });

  describe('scanThemes', () => {
    test('should delegate to ThemeResolver.scanDirectory', () => {
      jest.spyOn(ThemeResolver, 'scanDirectory').mockReturnValue([]);

      const manager = new ThemeManager(tempDir);
      const themes = manager.scanThemes();

      expect(ThemeResolver.scanDirectory).toHaveBeenCalledWith(themesDir);
      expect(themes).toEqual([]);
    });

    test('should return themes from directory', () => {
      fs.writeFileSync(path.join(themesDir, 'test.css'), '/* @theme test */');

      const manager = new ThemeManager(tempDir);
      const themes = manager.scanThemes();

      expect(themes).toHaveLength(1);
      expect(themes[0].name).toBe('test');
    });
  });

  describe('getTheme', () => {
    test('should return theme by name', () => {
      fs.writeFileSync(path.join(themesDir, 'my-theme.css'), '/* @theme my-theme */');

      const manager = new ThemeManager(tempDir);
      const theme = manager.getTheme('my-theme');

      expect(theme).toBeInstanceOf(Theme);
      expect(theme.name).toBe('my-theme');
    });

    test('should return null for non-existent theme', () => {
      const manager = new ThemeManager(tempDir);
      const theme = manager.getTheme('non-existent');
      expect(theme).toBeNull();
    });
  });

  describe('getActiveTheme', () => {
    test('should return theme from presentation frontmatter', () => {
      const manager = new ThemeManager(tempDir);
      const theme = manager.getActiveTheme();
      expect(theme).toBe('default');
    });

    test('should return null if no theme in frontmatter', () => {
      fs.writeFileSync(presentationPath, '# No frontmatter');
      const manager = new ThemeManager(tempDir);
      const theme = manager.getActiveTheme();
      expect(theme).toBeNull();
    });

    test('should return null if presentation does not exist', () => {
      fs.unlinkSync(presentationPath);
      const manager = new ThemeManager(tempDir);
      const theme = manager.getActiveTheme();
      expect(theme).toBeNull();
    });
  });

  describe('setActiveTheme', () => {
    test('should update theme in presentation frontmatter', () => {
      const manager = new ThemeManager(tempDir);
      manager.setActiveTheme('gaia');

      const content = fs.readFileSync(presentationPath, 'utf-8');
      expect(content).toContain('theme: gaia');
      expect(content).not.toContain('theme: default');
    });

    test('should throw ThemeNotFoundError for non-existent theme', () => {
      fs.writeFileSync(path.join(themesDir, 'available.css'), '/* @theme available */');

      const manager = new ThemeManager(tempDir);
      expect(() => manager.setActiveTheme('non-existent')).toThrow(ThemeNotFoundError);
    });

    test('should throw PresentationNotFoundError if presentation missing', () => {
      fs.unlinkSync(presentationPath);
      const manager = new ThemeManager(tempDir);
      expect(() => manager.setActiveTheme('default')).toThrow(PresentationNotFoundError);
    });
  });

  describe('createTheme', () => {
    test('should create theme CSS file in root', () => {
      const manager = new ThemeManager(tempDir);
      manager.createTheme('new-theme', null, 'root');

      const themePath = path.join(themesDir, 'new-theme.css');
      expect(fs.existsSync(themePath)).toBe(true);

      const content = fs.readFileSync(themePath, 'utf-8');
      expect(content).toContain('/* @theme new-theme */');
    });

    test('should create theme with parent import', () => {
      const manager = new ThemeManager(tempDir);
      manager.createTheme('child', 'gaia', 'root');

      const content = fs.readFileSync(path.join(themesDir, 'child.css'), 'utf-8');
      expect(content).toContain('@import "gaia"');
    });

    test('should create theme in new folder', () => {
      const manager = new ThemeManager(tempDir);
      manager.createTheme('foldered', null, 'new', 'my-folder');

      const themePath = path.join(themesDir, 'my-folder', 'foldered.css');
      expect(fs.existsSync(themePath)).toBe(true);
    });

    test('should throw for duplicate theme name', () => {
      fs.writeFileSync(path.join(themesDir, 'existing.css'), '/* @theme existing */');

      const manager = new ThemeManager(tempDir);
      expect(() => manager.createTheme('existing', null, 'root')).toThrow();
    });
  });

  describe('updateVSCodeSettings', () => {
    test('should sync themes to VSCode settings', () => {
      fs.writeFileSync(path.join(themesDir, 'theme1.css'), '/* @theme theme1 */');
      fs.writeFileSync(path.join(themesDir, 'theme2.css'), '/* @theme theme2 */');

      const manager = new ThemeManager(tempDir);
      manager.updateVSCodeSettings();

      const settingsPath = path.join(tempDir, '.vscode', 'settings.json');
      expect(fs.existsSync(settingsPath)).toBe(true);

      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      expect(settings['markdown.marp.themes']).toContain('themes/theme1.css');
      expect(settings['markdown.marp.themes']).toContain('themes/theme2.css');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/theme-manager.test.js`
Expected: FAIL with "Cannot find module '../../lib/theme-manager'"

**Step 3: Write minimal implementation**

```javascript
// lib/theme-manager.js
const fs = require('fs');
const path = require('path');
const { ThemeResolver } = require('./theme-resolver');
const { VSCodeIntegration } = require('./vscode-integration');
const { Frontmatter } = require('./frontmatter');
const {
  ThemeNotFoundError,
  ThemeAlreadyExistsError,
  PresentationNotFoundError
} = require('./errors');

/**
 * Main class for theme operations
 */
class ThemeManager {
  constructor(projectPath) {
    this.projectPath = projectPath;
    this.themesPath = path.join(projectPath, 'themes');
    this.presentationPath = path.join(projectPath, 'presentation.md');
  }

  /**
   * Scan themes in project
   * IMPLEMENTATION: delegates to ThemeResolver.scanDirectory(this.themesPath)
   */
  scanThemes() {
    return ThemeResolver.scanDirectory(this.themesPath);
  }

  /**
   * Get theme by name
   *
   * @param {string} name - Theme name
   * @returns {Theme|null} Theme object or null if not found
   */
  getTheme(name) {
    const themes = this.scanThemes();
    return themes.find(theme => theme.name === name) || null;
  }

  /**
   * Get active theme from presentation.md
   *
   * @returns {string|null} Theme name or null if not found
   */
  getActiveTheme() {
    if (!fs.existsSync(this.presentationPath)) {
      return null;
    }

    const content = fs.readFileSync(this.presentationPath, 'utf-8');
    return Frontmatter.getTheme(content);
  }

  /**
   * Set active theme in presentation.md
   *
   * @param {string} themeName - Theme name to set
   * @throws {ThemeNotFoundError} If theme does not exist
   * @throws {PresentationNotFoundError} If presentation.md does not exist
   */
  setActiveTheme(themeName) {
    if (!fs.existsSync(this.presentationPath)) {
      throw new PresentationNotFoundError(this.presentationPath);
    }

    // Validate theme exists
    const availableThemes = this.scanThemes().map(t => t.name);
    const systemThemes = ['default', 'gaia', 'uncover'];
    const allThemes = [...availableThemes, ...systemThemes];

    if (!allThemes.includes(themeName)) {
      throw new ThemeNotFoundError(themeName);
    }

    const content = fs.readFileSync(this.presentationPath, 'utf-8');
    const updated = Frontmatter.setTheme(content, themeName);
    Frontmatter.writeToFile(this.presentationPath, updated);
  }

  /**
   * Create new theme
   *
   * @param {string} name - Theme name
   * @param {string|null} parent - Parent theme name or null
   * @param {string} location - 'root', 'existing' folder name, or 'new'
   * @param {string} newFolderName - Required if location is 'new'
   */
  createTheme(name, parent, location, newFolderName = null) {
    // Check for duplicate
    if (this.getTheme(name)) {
      throw new ThemeAlreadyExistsError(name);
    }

    let cssPath;
    if (location === 'root') {
      cssPath = path.join(this.themesPath, `${name}.css`);
    } else if (location === 'new') {
      if (!newFolderName) {
        throw new Error('newFolderName required when location is "new"');
      }
      const folderPath = path.join(this.themesPath, newFolderName);
      fs.mkdirSync(folderPath, { recursive: true });
      cssPath = path.join(folderPath, `${name}.css`);
    } else {
      // Existing folder
      cssPath = path.join(this.themesPath, location, `${name}.css`);
    }

    // Generate CSS content
    let css = `/* @theme ${name} */\n\n`;

    if (parent) {
      css += `@import "${parent}";\n\n`;
    }

    css += `:root {\n  /* Your theme variables */\n}\n`;

    fs.writeFileSync(cssPath, css, 'utf-8');

    // Update VSCode settings
    this.updateVSCodeSettings();
  }

  /**
   * Update VSCode settings with current themes
   */
  updateVSCodeSettings() {
    const themes = this.scanThemes();
    const vscode = new VSCodeIntegration(this.projectPath);
    vscode.syncThemes(themes);
  }
}

module.exports = { ThemeManager };
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/theme-manager.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/theme-manager.js tests/unit/theme-manager.test.js
git commit -m "feat: add ThemeManager class with theme operations"
```

---

## Task 11: Implement addThemesCommand shared function

**Files:**
- Create: `lib/add-themes-command.js`
- Test: `tests/unit/add-themes-command.test.js`

**Step 1: Write the failing test**

```javascript
// tests/unit/add-themes-command.test.js
const fs = require('fs');
const path = require('path');
const { addThemesCommand } = require('../../lib/add-themes-command');
const { ThemeResolver } = require('../../lib/theme-resolver');
const { VSCodeIntegration } = require('../../lib/vscode-integration');
const { Prompts } = require('../../lib/prompts');

describe('addThemesCommand', () => {
  const tempDir = path.join(__dirname, '..', 'temp');
  const templateThemesDir = path.join(__dirname, '..', 'fixtures', 'template-themes');
  const projectThemesDir = path.join(tempDir, 'themes');

  beforeEach(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    if (!fs.existsSync(projectThemesDir)) {
      fs.mkdirSync(projectThemesDir, { recursive: true });
    }
    // Create template themes fixtures
    if (!fs.existsSync(templateThemesDir)) {
      fs.mkdirSync(templateThemesDir, { recursive: true });
      fs.writeFileSync(
        path.join(templateThemesDir, 'theme1.css'),
        '/* @theme theme1 */\n@import "default";'
      );
      fs.mkdirSync(path.join(templateThemesDir, 'folder'));
      fs.writeFileSync(
        path.join(templateThemesDir, 'folder', 'theme2.css'),
        '/* @theme theme2 */'
      );
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('getTemplateThemesPath', () => {
    test('should return path to template themes directory', () => {
      const result = addThemesCommand.getTemplateThemesPath();
      expect(result).toBeTruthy();
      expect(fs.existsSync(result)).toBe(true);
    });
  });

  describe('execute', () => {
    test('should copy selected themes to project', async () => {
      jest.spyOn(Prompts, 'promptThemes').mockResolvedValue(['theme1']);
      jest.spyOn(ThemeResolver, 'scanDirectory').mockImplementation((dir) => {
        if (dir.includes('template-themes')) {
          return [
            new Theme('theme1', path.join(templateThemesDir, 'theme1.css'), 'css', ['default'])
          ];
        }
        return [];
      });

      const result = await addThemesCommand.execute(tempDir);

      expect(result.added).toHaveLength(1);
      expect(result.added[0].name).toBe('theme1');
    });

    test('should resolve dependencies', async () => {
      jest.spyOn(Prompts, 'promptThemes').mockResolvedValue(['child']);
      jest.spyOn(ThemeResolver, 'scanDirectory').mockImplementation((dir) => {
        if (dir.includes('template-themes')) {
          return [
            new Theme('parent', path.join(templateThemesDir, 'parent.css'), 'css', ['default']),
            new Theme('child', path.join(templateThemesDir, 'child.css'), 'css', ['parent'])
          ];
        }
        return [];
      });

      const result = await addThemesCommand.execute(tempDir);

      expect(result.added.map(t => t.name)).toContain('parent');
      expect(result.added.map(t => t.name)).toContain('child');
    });

    test('should skip system themes', async () => {
      jest.spyOn(Prompts, 'promptThemes').mockResolvedValue(['uses-gaia']);
      jest.spyOn(ThemeResolver, 'scanDirectory').mockReturnValue([
        new Theme('uses-gaia', path.join(templateThemesDir, 'uses.css'), 'css', ['gaia'])
      ]);

      const result = await addThemesCommand.execute(tempDir);

      expect(result.added.map(t => t.name)).toContain('uses-gaia');
      expect(result.added.map(t => t.name)).not.toContain('gaia');
    });

    test('should use options.themes if provided (non-interactive)', async () => {
      jest.spyOn(Prompts, 'promptThemes').mockImplementation(() => {
        throw new Error('Should not prompt in non-interactive mode');
      });

      const result = await addThemesCommand.execute(tempDir, { themes: ['theme1'] });

      // Verify prompt was not called
      expect(Prompts.promptThemes).not.toHaveBeenCalled();
    });
  });

  describe('copyThemes', () => {
    test('should copy themes preserving structure', () => {
      const themes = [
        new Theme('theme1', path.join(templateThemesDir, 'theme1.css'), 'css', []),
        new Theme('theme2', path.join(templateThemesDir, 'folder', 'theme2.css'), 'css', [])
      ];

      addThemesCommand.copyThemes(themes, templateThemesDir, tempDir);

      expect(fs.existsSync(path.join(projectThemesDir, 'theme1.css'))).toBe(true);
      expect(fs.existsSync(path.join(projectThemesDir, 'folder', 'theme2.css'))).toBe(true);
    });

    test('should skip existing themes if specified', () => {
      const themes = [
        new Theme('theme1', path.join(templateThemesDir, 'theme1.css'), 'css', [])
      ];

      // Create existing theme
      fs.writeFileSync(path.join(projectThemesDir, 'theme1.css'), '/* @theme theme1 */ old content');

      const skipList = ['theme1'];
      addThemesCommand.copyThemes(themes, templateThemesDir, tempDir, skipList);

      const content = fs.readFileSync(path.join(projectThemesDir, 'theme1.css'), 'utf-8');
      expect(content).toContain('old content');
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/add-themes-command.test.js`
Expected: FAIL with "Cannot find module '../../lib/add-themes-command'"

**Step 3: Write minimal implementation**

```javascript
// lib/add-themes-command.js
const fs = require('fs');
const path = require('path');
const { ThemeResolver } = require('./theme-resolver');
const { VSCodeIntegration } = require('./vscode-integration');
const { Prompts } = require('./prompts');

/**
 * Shared function for adding themes from template
 * Used by both project creation and theme:add-from-template command
 */
class AddThemesCommand {
  /**
   * Get path to template themes directory
   * Works both when running from source and from installed npm package
   */
  static getTemplateThemesPath() {
    // Try multiple possible paths
    const candidates = [
      // When running from source (development)
      path.join(__dirname, '..', 'template', 'themes'),
      // When installed as npm package
      path.join(__dirname, 'template', 'themes'),
      // When running from installed package's lib directory
      path.join(__dirname, '..', '..', 'template', 'themes'),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    throw new Error('Template themes directory not found');
  }

  /**
   * Execute the add-themes command
   *
   * @param {string} targetPath - Target project path
   * @param {object} options - Options
   * @param {string[]} options.themes - Pre-selected themes (non-interactive mode)
   * @returns {Promise<object>} Result with { added, skipped, dependencies }
   */
  static async execute(targetPath, options = {}) {
    const templatePath = this.getTemplateThemesPath();

    // Scan available themes in template
    const allThemes = ThemeResolver.scanDirectory(templatePath);

    if (allThemes.length === 0) {
      console.log('No themes available in template');
      return { added: [], skipped: [], dependencies: [] };
    }

    // Select themes
    let selectedThemes;
    if (options.themes && options.themes.length > 0) {
      // Non-interactive mode
      selectedThemes = allThemes.filter(t => options.themes.includes(t.name));
    } else {
      // Interactive mode
      const themeChoices = allThemes.map(t => ({
        name: t.name,
        description: `Extends: ${t.dependencies.join(', ') || 'none'}`
      }));
      const selectedNames = await Prompts.promptThemes(themeChoices);
      selectedThemes = allThemes.filter(t => selectedNames.includes(t.name));
    }

    if (selectedThemes.length === 0) {
      console.log('No themes selected');
      return { added: [], skipped: [], dependencies: [] };
    }

    // Resolve dependencies
    const themesToCopy = ThemeResolver.resolveDependencies(selectedThemes, allThemes);

    // Check for conflicts
    const existingThemes = this._scanProjectThemes(targetPath);
    const conflicts = this._findConflicts(themesToCopy, existingThemes);

    let skipList = [];
    if (conflicts.length > 0) {
      const resolution = await Prompts.promptConflictResolution(conflicts);

      if (resolution === 'cancel') {
        console.log('Operation cancelled');
        return { added: [], skipped: [], dependencies: [] };
      } else if (resolution === 'skip-all') {
        skipList = conflicts.map(c => c.name);
      } else if (resolution === 'overwrite-all') {
        // No skipping
      } else if (resolution === 'choose-each') {
        // Handle each conflict individually
        for (const conflict of conflicts) {
          const action = await Prompts.promptSingleConflict(conflict.name);
          if (action === 'skip') {
            skipList.push(conflict.name);
          } else if (action === 'cancel') {
            console.log('Operation cancelled');
            return { added: [], skipped: [], dependencies: [] };
          }
        }
      }
    }

    // Filter out skipped themes
    const finalThemes = themesToCopy.filter(t => !skipList.includes(t.name));

    // Copy themes
    this.copyThemes(finalThemes, templatePath, targetPath, skipList);

    // Update VSCode settings
    const allProjectThemes = this._scanProjectThemes(targetPath);
    const vscode = new VSCodeIntegration(targetPath);
    vscode.syncThemes(allProjectThemes);

    // Calculate result
    const added = finalThemes;
    const skipped = themesToCopy.filter(t => skipList.includes(t.name));
    const dependencies = themesToCopy.filter(t => !selectedThemes.find(st => st.name === t.name));

    console.log(`✓ Added ${added.length} theme${added.length !== 1 ? 's' : ''} with dependencies`);
    added.forEach(theme => {
      const relPath = path.relative(targetPath, theme.path);
      console.log(`  - ${theme.name} (${relPath})`);
    });

    if (skipped.length > 0) {
      console.log(`✓ Skipped ${skipped.length} theme${skipped.length !== 1 ? 's' : ''}`);
      skipped.forEach(theme => {
        console.log(`  - ${theme.name} (already exists)`);
      });
    }

    console.log('✓ VSCode settings updated');

    return { added, skipped, dependencies };
  }

  /**
   * Copy themes to project directory
   *
   * @param {Theme[]} themes - Themes to copy
   * @param {string} templatePath - Template themes path
   * @param {string} targetPath - Target project path
   * @param {string[]} skipList - Theme names to skip
   */
  static copyThemes(themes, templatePath, targetPath, skipList = []) {
    const themesPath = path.join(targetPath, 'themes');

    for (const theme of themes) {
      if (skipList.includes(theme.name)) {
        continue;
      }

      const relativePath = path.relative(templatePath, theme.path);
      const targetFilePath = path.join(themesPath, relativePath);
      const targetDir = path.dirname(targetFilePath);

      // Create directory if needed
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Copy file
      fs.copyFileSync(theme.path, targetFilePath);
    }
  }

  /**
   * Scan themes in project directory
   * @private
   */
  static _scanProjectThemes(projectPath) {
    const themesPath = path.join(projectPath, 'themes');
    if (!fs.existsSync(themesPath)) {
      return [];
    }
    return ThemeResolver.scanDirectory(themesPath);
  }

  /**
   * Find conflicts between themes to copy and existing themes
   * @private
   */
  static _findConflicts(themesToCopy, existingThemes) {
    const existingNames = new Set(existingThemes.map(t => t.name));
    return themesToCopy.filter(t => existingNames.has(t.name));
  }
}

// Export both class and convenience function
const addThemesCommand = {
  execute: (targetPath, options) => AddThemesCommand.execute(targetPath, options),
  getTemplateThemesPath: () => AddThemesCommand.getTemplateThemesPath(),
  copyThemes: (themes, templatePath, targetPath, skipList) =>
    AddThemesCommand.copyThemes(themes, templatePath, targetPath, skipList)
};

module.exports = { AddThemesCommand, addThemesCommand };
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/add-themes-command.test.js`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/add-themes-command.js tests/unit/add-themes-command.test.js
git commit -m "feat: add addThemesCommand shared function"
```

---

## Task 12: Create template/themes directory and copy theme templates

**Files:**
- Create: `template/themes/beam/beam.css`
- Create: `template/themes/marpx/marpx.css`
- Create: `template/themes/marpx/socrates.css`
- Create: `template/themes/gaia-dark/dark.css`
- Create: `template/themes/uncover-minimal/minimal.css`
- Create: `template/themes/default-clean/clean.css`

**Step 1: Create theme directories**

```bash
mkdir -p template/themes/beam
mkdir -p template/themes/marpx
mkdir -p template/themes/gaia-dark
mkdir -p template/themes/uncover-minimal
mkdir -p template/themes/default-clean
```

**Step 2: Copy theme CSS files from docs/reqs/theme-templates**

```bash
# Copy beam theme
cp docs/reqs/theme-templates/beam/beam.css template/themes/beam/

# Copy marpx themes
cp docs/reqs/theme-templates/marpx/marpx.css template/themes/marpx/
cp docs/reqs/theme-templates/marpx/socrates.css template/themes/marpx/

# For gaia-dark, uncover-minimal, default-clean - create simple variants
```

**Step 3: Create gaia-dark theme**

```css
/* @theme gaia-dark */

@import "gaia";

:root {
  --marp-theme-gradient: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  --marp-theme-color: #eee;
  --marp-heading-color: #4ecca3;
  --marp-text-color: #ddd;
  --marp-background-color: #0f0f1a;
}
```

**Step 4: Create uncover-minimal theme**

```css
/* @theme uncover-minimal */

@import "uncover";

:root {
  --marp-uncover-color: #333;
  --marp-uncover-background: #fff;
  --marp-uncover-highlight: #007acc;
}
```

**Step 5: Create default-clean theme**

```css
/* @theme default-clean */

@import "default";

:root {
  --color-background: #ffffff;
  --color-text: #333333;
  --color-heading: #1a1a1a;
  --color-link: #0066cc;
  --font-family: "Inter", -apple-system, sans-serif;
}
```

**Step 6: Verify themes are parseable**

```javascript
// Quick verification
const { ThemeResolver } = require('./lib/theme-resolver');
const themes = ThemeResolver.scanDirectory('template/themes');
console.log('Found themes:', themes.map(t => t.name));
```

**Step 7: Commit**

```bash
git add template/themes/
git commit -m "feat: add initial theme templates from docs/reqs"
```

---

## Task 13: Create template/scripts/lib/ directory

**Files:**
- Copy: `lib/theme-resolver.js` → `template/scripts/lib/theme-resolver.js`
- Copy: `lib/theme-manager.js` → `template/scripts/lib/theme-manager.js`
- Copy: `lib/vscode-integration.js` → `template/scripts/lib/vscode-integration.js`
- Copy: `lib/frontmatter.js` → `template/scripts/lib/frontmatter.js`
- Copy: `lib/prompts.js` → `template/scripts/lib/prompts.js`
- Copy: `lib/errors.js` → `template/scripts/lib/errors.js`

**Step 1: Create scripts/lib directory**

```bash
mkdir -p template/scripts/lib
```

**Step 2: Copy lib files to template/scripts/lib**

```bash
cp lib/errors.js template/scripts/lib/
cp lib/theme-resolver.js template/scripts/lib/
cp lib/theme-manager.js template/scripts/lib/
cp lib/vscode-integration.js template/scripts/lib/
cp lib/frontmatter.js template/scripts/lib/
cp lib/prompts.js template/scripts/lib/
```

**Step 3: Verify files were copied correctly**

```bash
ls -la template/scripts/lib/
# Should see: errors.js, theme-resolver.js, theme-manager.js, vscode-integration.js, frontmatter.js, prompts.js
```

**Step 4: Update root package.json files field to include template/scripts/lib**

```json
{
  "files": [
    "index.js",
    "template",
    "lib"
  ]
}
```

**Step 5: Commit**

```bash
git add template/scripts/lib/ package.json
git commit -m "feat: copy lib modules to template/scripts/lib for project CLI"
```

---

## Task 14: Create theme-cli.js entry point

**Files:**
- Create: `template/scripts/theme-cli.js`

**Step 1: Write the implementation**

```javascript
// template/scripts/theme-cli.js
#!/usr/bin/env node

const { ThemeManager } = require('./lib/theme-manager');
const { Prompts } = require('./lib/prompts');
const { execSync } = require('child_process');

const command = process.argv[2];
const args = process.argv.slice(3);

async function main() {
  const projectPath = process.cwd();
  const manager = new ThemeManager(projectPath);

  try {
    switch (command) {
      case 'list': {
        await cmdList(manager);
        break;
      }

      case 'add': {
        await cmdAdd(manager);
        break;
      }

      case 'add-from-template': {
        await cmdAddFromTemplate(projectPath);
        break;
      }

      case 'switch': {
        await cmdSwitch(manager, args);
        break;
      }

      default:
        console.log(`Unknown command: ${command}`);
        console.log('');
        console.log('Available commands:');
        console.log('  list                - List all themes in project');
        console.log('  add                 - Create new theme');
        console.log('  add-from-template   - Add themes from template');
        console.log('  switch [<name>]     - Switch active theme');
        process.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

async function cmdList(manager) {
  const themes = manager.scanThemes();

  if (themes.length === 0) {
    console.log('No themes found in project');
    return;
  }

  console.log('Themes in project:');
  for (const theme of themes) {
    const deps = theme.dependencies.length > 0
      ? ` extends: ${theme.dependencies.join(', ')}`
      : '';
    const relPath = theme.path.replace(process.cwd() + '/', '');
    console.log(`  ✓ ${theme.name.padEnd(20)} (${relPath})${deps}`);
  }

  const activeTheme = manager.getActiveTheme();
  if (activeTheme) {
    console.log(`\nActive theme: ${activeTheme}`);
  }
}

async function cmdAdd(manager) {
  const themes = manager.scanThemes();

  // Prompt for theme name
  const name = await Prompts.promptNewThemeName();

  // Check if already exists
  if (manager.getTheme(name)) {
    console.error(`Theme '${name}' already exists`);
    process.exit(1);
  }

  // Select parent theme
  const parent = await Prompts.promptParentTheme(themes);

  // Get existing directories
  const fs = require('fs');
  const themesPath = manager.themesPath;
  let existingDirs = [];
  if (fs.existsSync(themesPath)) {
    const entries = fs.readdirSync(themesPath, { withFileTypes: true });
    existingDirs = entries
      .filter(e => e.isDirectory() && !e.name.startsWith('.'))
      .map(e => e.name);
  }

  // Prompt for location
  const location = await Prompts.promptDirectoryLocation(existingDirs);
  let newFolderName = null;

  if (location === 'new') {
    newFolderName = await Prompts.promptNewFolderName();
  }

  // Create theme
  manager.createTheme(name, parent, location, newFolderName);

  console.log(`✓ Created theme '${name}'`);
  console.log(`✓ Theme registered in VSCode settings`);
}

async function cmdAddFromTemplate(projectPath) {
  // Delegate to npx command
  try {
    execSync(`npx create-marp-presentation add-themes "${projectPath}"`, {
      stdio: 'inherit'
    });
  } catch (error) {
    console.error('Failed to add themes from template');
    throw error;
  }
}

async function cmdSwitch(manager, args) {
  const themes = manager.scanThemes();
  const availableThemes = [
    ...new Set([
      'default',
      'gaia',
      'uncover',
      ...themes.map(t => t.name)
    ])
  ];

  let themeName;

  if (args.length > 0) {
    // Command line argument provided
    themeName = args[0];
  } else {
    // Interactive prompt
    themeName = await Prompts.promptActiveTheme(availableThemes);
  }

  manager.setActiveTheme(themeName);
  console.log(`✓ Active theme changed to '${themeName}'`);
  console.log(`  Updated presentation.md frontmatter`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
```

**Step 2: Make executable**

```bash
chmod +x template/scripts/theme-cli.js
```

**Step 3: Update template/package.json with theme scripts**

Add to template/package.json:

```json
{
  "scripts": {
    "dev": "marp -s . --html --allow-local-files",
    "build:html": "marp presentation.md -o output/index.html --html && npm run copy:static",
    "build:pdf": "marp presentation.md -o output/presentation.pdf --allow-local-files && npm run copy:static",
    "build:pptx": "marp presentation.md -o output/presentation.pptx --allow-local-files && npm run copy:static",
    "build:all": "npm run build:html && npm run build:pdf && npm run build:pptx",
    "copy:static": "node scripts/copy-static.js",
    "clean": "rimraf output",
    "theme:list": "node scripts/theme-cli.js list",
    "theme:add": "node scripts/theme-cli.js add",
    "theme:add-from-template": "node scripts/theme-cli.js add-from-template",
    "theme:switch": "node scripts/theme-cli.js switch"
  }
}
```

**Step 4: Add dependencies to template/package.json**

```json
{
  "dependencies": {
    "@inquirer/prompts": "^7.0.0",
    "gray-matter": "^4.0.3"
  }
}
```

**Step 5: Commit**

```bash
git add template/scripts/theme-cli.js template/package.json
git commit -m "feat: add theme-cli.js entry point with npm scripts"
```

---

## Task 15: Update root index.js to integrate addThemesCommand

**Files:**
- Modify: `index.js`

**Step 1: Read current index.js to understand structure**

```javascript
// Current index.js handles project creation
```

**Step 2: Modify index.js to add theme selection**

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { addThemesCommand } = require('./lib/add-themes-command');
const { Prompts } = require('./lib/prompts');
const { ThemeManager } = require('./lib/theme-manager');

function validateProjectName(name) {
  if (!name) {
    throw new Error('Project name is required');
  }
  if (!/^[a-z0-9-]+$/.test(name)) {
    throw new Error('Project name must contain only lowercase letters, numbers, and hyphens');
  }
}

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

async function createProject(projectName, options = {}) {
  validateProjectName(projectName);

  const targetDir = path.join(process.cwd(), projectName);

  if (fs.existsSync(targetDir)) {
    throw new Error(`Directory '${projectName}' already exists`);
  }

  // Create project directory
  fs.mkdirSync(targetDir, { recursive: true });

  // Copy template (excluding themes initially)
  const templateDir = path.join(__dirname, 'template');

  // Copy everything except themes (we'll add those via addThemesCommand)
  const entries = fs.readdirSync(templateDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'themes') continue; // Skip themes, add via command
    const srcPath = path.join(templateDir, entry.name);
    const destPath = path.join(targetDir, entry.name);
    copyRecursiveSync(srcPath, destPath);
  }

  // Copy scripts/lib to project/scripts/lib
  const libSource = path.join(__dirname, 'lib');
  const libDest = path.join(targetDir, 'scripts', 'lib');
  fs.mkdirSync(libDest, { recursive: true });
  const libFiles = fs.readdirSync(libSource);
  for (const file of libFiles) {
    fs.copyFileSync(path.join(libSource, file), path.join(libDest, file));
  }

  // Add themes via addThemesCommand
  console.log('\nSelect themes for your project:');
  await addThemesCommand.execute(targetDir, options);

  // Select active theme
  const manager = new ThemeManager(targetDir);
  const themes = manager.scanThemes();
  const availableThemes = [
    ...new Set([
      'default',
      'gaia',
      'uncover',
      ...themes.map(t => t.name)
    ])
  ];

  const activeTheme = await Prompts.promptActiveTheme(availableThemes);
  manager.setActiveTheme(activeTheme);

  console.log(`\n✓ Active theme set to '${activeTheme}'`);

  // Install dependencies
  console.log('\nInstalling dependencies...');
  spawnSync('npm', ['install'], {
    cwd: targetDir,
    stdio: 'inherit'
  });

  console.log(`\n✓ Project '${projectName}' created successfully!`);
  console.log(`\n  cd ${projectName}`);
  console.log('  npm run dev');
}

// Handle CLI args
const args = process.argv.slice(2);

if (args[0] === 'add-themes') {
  // Handle add-themes command
  const targetPath = args[1];
  if (!targetPath) {
    console.error('Usage: create-marp-presentation add-themes <target-dir> [--themes=name1,name2]');
    process.exit(1);
  }

  const themeOptions = {};
  const themeIndex = args.findIndex(a => a.startsWith('--themes='));
  if (themeIndex !== -1) {
    themeOptions.themes = args[themeIndex].split('=')[1].split(',');
  }

  addThemesCommand.execute(targetPath, themeOptions).catch(error => {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  });
} else {
  // Create project
  const projectName = args[0];
  createProject(projectName).catch(error => {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  });
}
```

**Step 3: Commit**

```bash
git add index.js
git commit -m "feat: integrate addThemesCommand into project creation flow"
```

---

## Task 16: Update root package.json with dependencies

**Files:**
- Modify: `package.json`

**Step 1: Add dependencies**

```json
{
  "name": "create-marp-presentation",
  "version": "1.0.0",
  "description": "Create a new Marp presentation",
  "bin": "./index.js",
  "files": [
    "index.js",
    "template",
    "lib"
  ],
  "dependencies": {
    "@inquirer/prompts": "^7.0.0"
  },
  "devDependencies": {
    "gray-matter": "^4.0.3",
    "jest": "^29.7.0"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add dependencies to root package.json"
```

---

## Task 17: Write integration tests for theme-cli

**Files:**
- Create: `tests/integration/theme-cli.test.js`

**Step 1: Write the integration test**

```javascript
// tests/integration/theme-cli.test.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

describe('theme-cli integration tests', () => {
  const tempDir = path.join(__dirname, '..', 'temp-integration');
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

    // Create theme-cli.js
    const cliSource = path.join(__dirname, '..', '..', 'template', 'scripts', 'theme-cli.js');
    fs.copyFileSync(cliSource, path.join(projectDir, 'scripts', 'theme-cli.js'));

    // Create test themes
    fs.writeFileSync(
      path.join(projectDir, 'themes', 'test.css'),
      '/* @theme test */\n@import "default";'
    );

    // Run theme:list
    const output = execSync('node scripts/theme-cli.js list', {
      cwd: projectDir,
      encoding: 'utf-8'
    });

    expect(output).toContain('test');
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
    fs.copyFileSync(cliSource, path.join(projectDir, 'scripts', 'theme-cli.js'));

    // Create presentation.md
    const presentationPath = path.join(projectDir, 'presentation.md');
    fs.writeFileSync(
      presentationPath,
      '---\nmarp: true\ntheme: default\n---\n\n# Test'
    );

    // Create test theme
    fs.writeFileSync(
      path.join(projectDir, 'themes', 'new.css'),
      '/* @theme new */'
    );

    // Run theme:switch (non-interactive)
    execSync('node scripts/theme-cli.js switch new', {
      cwd: projectDir,
      encoding: 'utf-8'
    });

    // Verify presentation.md was updated
    const content = fs.readFileSync(presentationPath, 'utf-8');
    expect(content).toContain('theme: new');
  });
});
```

**Step 2: Run integration tests**

Run: `npm test -- tests/integration/theme-cli.test.js`
Expected: PASS

**Step 3: Commit**

```bash
git add tests/integration/theme-cli.test.js
git commit -m "test: add integration tests for theme-cli"
```

---

## Task 18: Update root package.json files field

**Files:**
- Modify: `package.json`

**Step 1: Update files field to include lib/ directory**

```json
{
  "files": [
    "index.js",
    "template",
    "lib"
  ]
}
```

**Step 2: Verify package contents**

```bash
npm pack --dry-run
```

Expected output should show files from lib/, template/, and index.js only.

**Step 3: Commit**

```bash
git add package.json
git commit -m "chore: include lib/ in published package files"
```

---

## Task 19: End-to-end testing of complete flow

**Files:**
- No file creation - verification task

**Step 1: Test project creation with theme selection**

```bash
# Clean up any previous test
rm -rf test-theme-project

# Create new project (this will be interactive)
node index.js test-theme-project

# In the interactive prompts:
# - Select a few themes (e.g., beam, marpx)
# - Select an active theme

# Verify project was created
cd test-theme-project
ls themes/  # Should show selected themes
cat .vscode/settings.json  # Should show themes
cat presentation.md  # Should show selected active theme
```

**Step 2: Test theme:add command**

```bash
npm run theme:add

# In prompts:
# - Enter theme name: my-custom
# - Select parent: none
# - Select location: root

# Verify theme was created
ls themes/my-custom.css
```

**Step 3: Test theme:list command**

```bash
npm run theme:list

# Should show all themes including my-custom
```

**Step 4: Test theme:switch command**

```bash
npm run theme:switch my-custom

# Verify presentation.md was updated
grep "theme: my-custom" presentation.md
```

**Step 5: Test theme:add-from-template command**

```bash
# First remove a theme to test adding it back
rm -rf themes/beam

npm run theme:add-from-template

# In prompts, select beam

# Verify beam was restored
ls themes/beam/
```

**Step 6: Test VSCode integration**

```bash
# Check that .vscode/settings.json contains all themes
cat .vscode/settings.json | grep "markdown.marp.themes"
```

**Step 7: Clean up**

```bash
cd ..
rm -rf test-theme-project
```

**Step 8: Document any issues found**

If any issues discovered, create tasks to fix them.

---

## Task 20: Update documentation

**Files:**
- Update: `README.md`
- Create: `docs/theme-management.md`

**Step 1: Update README.md with theme management section**

Add to README.md:

```markdown
## Theme Management

This template includes a powerful theme management system that lets you:

- **Select themes during project creation** - Choose from pre-built themes
- **Manage themes after creation** - Add, list, and switch themes via CLI
- **Create custom themes** - Build on top of existing themes or from scratch
- **Automatic VSCode integration** - Themes are automatically registered with the Marp VSCode extension

### Available Commands

```bash
# List all themes in project
npm run theme:list

# Create a new theme
npm run theme:add

# Add themes from template
npm run theme:add-from-template

# Switch active theme
npm run theme:switch [theme-name]

# Or interactively
npm run theme:switch
```

### Theme Structure

Themes are stored in the `themes/` directory:

```
themes/
├── beam/
│   └── beam.css
├── marpx/
│   ├── marpx.css
│   └── socrates.css
└── your-theme/
    └── your-theme.css
```

### Creating a Custom Theme

Run `npm run theme:add` and follow the prompts:

1. Enter a theme name (lowercase letters, numbers, hyphens only)
2. Optionally select a parent theme to extend
3. Choose where to create the theme file

The theme CSS will be created with the appropriate `@theme` directive and `@import` statement if a parent was selected.

### Adding Themes from Template

If you didn't select a theme during project creation, you can add it later:

```bash
npm run theme:add-from-template
```

### System Themes

Marp includes three built-in themes:
- **default** - Clean, minimal design
- **gaia** - Modern gradient themes
- **uncover** - Progressive reveal animations

These can be used as parents for custom themes but don't need to be copied to your project.
```

**Step 2: Create comprehensive theme management docs**

```markdown
# docs/theme-management.md

# Theme Management Guide

## Overview

The theme management system provides a complete solution for managing Marp themes in your presentation project.

## Architecture

### Components

- **ThemeResolver** - Parses CSS files to extract theme metadata and dependencies
- **ThemeManager** - Main class for theme operations in a project
- **VSCodeIntegration** - Manages VSCode settings for Marp extension
- **Prompts** - Interactive CLI prompts using @inquirer/prompts
- **Frontmatter** - Parses/edits markdown frontmatter using gray-matter

### Theme Format

Themes are CSS files with a `/* @theme name */` directive:

```css
/* @theme my-theme */

@import "parent-theme";

:root {
  /* Your theme variables */
}
```

## Commands Reference

### theme:list

Lists all themes in the project with their dependencies.

```bash
npm run theme:list
```

Output:
```
Themes in project:
  ✓ beam              (themes/beam/beam.css) extends: default
  ✓ marpx             (themes/marpx/marpx.css) extends: default
  ✓ socrates          (themes/marpx/socrates.css) extends: marpx

Active theme: beam
```

### theme:add

Creates a new theme interactively.

```bash
npm run theme:add
```

Prompts:
1. Theme name (validation: lowercase, numbers, hyphens only)
2. Parent theme selection (none, system, or custom)
3. File location (root, existing folder, or new folder)

### theme:add-from-template

Adds themes from the create-marp-presentation template.

```bash
npm run theme:add-from-template
```

### theme:switch

Changes the active theme in presentation.md.

```bash
# Direct
npm run theme:switch -- beam

# Interactive
npm run theme:switch
```

## Advanced Usage

### Manual Theme Management

You can manually add CSS files to the `themes/` directory. Any CSS file with a `/* @theme */` directive will be automatically discovered.

### VSCode Integration

The system automatically updates `.vscode/settings.json` with theme paths:

```json
{
  "markdown.marp.themes": [
    "themes/beam/beam.css",
    "themes/marpx/marpx.css"
  ]
}
```

This enables the Marp VSCode extension to provide live preview with your custom themes.

### Theme Dependencies

Themes can import other themes using `@import`:

```css
/* @theme child-theme */

@import "parent-theme";
```

The system automatically resolves dependencies when copying themes.
```

**Step 3: Commit**

```bash
git add README.md docs/theme-management.md
git commit -m "docs: add theme management documentation"
```

---

## Task 21: Final verification and test coverage check

**Files:**
- No file creation - verification task

**Step 1: Run all tests**

```bash
npm test
```

Expected: All tests pass

**Step 2: Check test coverage**

```bash
npm test -- --coverage
```

Expected:
- ThemeResolver: 90%+
- VSCodeIntegration: 85%+
- ThemeManager: 90%+
- Overall: 85%+

**Step 3: Verify package contents**

```bash
npm pack --dry-run
```

Verify only necessary files are included:
- index.js
- lib/
- template/ (including scripts/lib/)
- No tests or docs

**Step 4: Test installation from local tarball**

```bash
# Create tarball
npm pack

# Install globally for testing
npm install -g create-marp-presentation-1.0.0.tgz

# Test creating a project
create-marp-presentation test-from-npm

# Clean up
npm uninstall -g create-marp-presentation
rm -rf test-from-npm
rm create-marp-presentation-1.0.0.tgz
```

**Step 5: Verify git status**

```bash
git status
```

Expected: Clean working tree (all changes committed)

**Step 6: Create summary documentation**

Create a brief summary of what was implemented:

```markdown
## Implementation Summary

### Components Implemented

1. **lib/errors.js** - Custom error classes
2. **lib/theme-resolver.js** - CSS parsing and theme discovery
3. **lib/vscode-integration.js** - VSCode settings management
4. **lib/frontmatter.js** - Markdown frontmatter parsing/editing
5. **lib/prompts.js** - Interactive CLI prompts
6. **lib/theme-manager.js** - Main theme operations class
7. **lib/add-themes-command.js** - Shared theme addition logic
8. **template/scripts/theme-cli.js** - CLI entry point for projects
9. **template/themes/** - Initial theme templates

### Features

- Interactive theme selection during project creation
- Post-creation theme management via npm scripts
- Automatic VSCode integration
- Dependency resolution for theme imports
- Conflict handling when adding existing themes
- Support for system themes (default, gaia, uncover)

### Tests

- Unit tests for all components
- Integration tests for CLI commands
- Test coverage: 85%+

### Documentation

- README.md updated with theme management section
- docs/theme-management.md with comprehensive guide
```

---

## Completion Checklist

- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Test coverage meets targets (85%+)
- [ ] package.json files field correct
- [ ] Template themes copied and verified
- [ ] lib/ copied to template/scripts/lib/
- [ ] theme-cli.js created and functional
- [ ] index.js updated with theme selection
- [ ] Documentation updated
- [ ] No sensitive files in package (tests, docs excluded)
- [ ] npm pack --dry-run verifies correct contents

---

**Plan complete and saved to `docs/plans/2026-02-23-theme-management-implementation.md`**

Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
