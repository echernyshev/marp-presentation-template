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

  test('should ignore data: URLs and CSS content in imports', () => {
    const css = `/* @theme marpx */
@import "default";
@import url("data:text/css, .bespoke-marp-parent { top: 0 !important; } .bespoke-progress-parent { position: absolute; bottom: 0 !important; z-index:100; background:none !important; height:3px !important; }");
@import url("https://fonts.googleapis.com/css2?family=Test&display=swap");`;
    const result = ThemeResolver.extractDependencies(css);
    expect(result).toEqual(['default']);
  });
});

describe('ThemeResolver.extractDescription', () => {
  test('should extract description from CSS comment directive', () => {
    const css = '/* @theme my-custom-theme */\n/* @description A cool theme */\n:root { color: red; }';
    const result = ThemeResolver.extractDescription(css);
    expect(result).toBe('A cool theme');
  });

  test('should extract description with @theme in same comment block', () => {
    const css = `/*
      * @theme my-theme
      * @description My awesome theme description
      */\n:root { }`;
    const result = ThemeResolver.extractDescription(css);
    expect(result).toBe('My awesome theme description');
  });

  test('should trim whitespace from description', () => {
    const css = '/* @theme test */\n/* @description   A theme with spaces   */\n:root { }';
    const result = ThemeResolver.extractDescription(css);
    expect(result).toBe('A theme with spaces');
  });

  test('should return null when no description directive found', () => {
    const css = '/* @theme my-theme */\n:root { color: red; }';
    const result = ThemeResolver.extractDescription(css);
    expect(result).toBeNull();
  });

  test('should extract description from multi-line comment with other content', () => {
    const css = `/*
 * @theme complex
 * Author: Test Author
 * @description A theme with a longer description
 * License: MIT
 */`;
    const result = ThemeResolver.extractDescription(css);
    expect(result).toBe('A theme with a longer description');
  });

  test('should handle description with special characters', () => {
    const css = '/* @theme special */\n/* @description A theme with dashes, dots, and (parentheses) */';
    const result = ThemeResolver.extractDescription(css);
    expect(result).toBe('A theme with dashes, dots, and (parentheses)');
  });
});

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

  test('should extract description when present', () => {
    const cssPath = path.join(tempDir, 'described.css');
    fs.writeFileSync(cssPath, '/* @theme described */\n/* @description A theme with description */\n:root { }');

    const theme = ThemeResolver.resolveTheme(cssPath);
    expect(theme.name).toBe('described');
    expect(theme.description).toBe('A theme with description');
  });

  test('should have null description when not present', () => {
    const cssPath = path.join(tempDir, 'no-desc.css');
    fs.writeFileSync(cssPath, '/* @theme no-desc */\n:root { }');

    const theme = ThemeResolver.resolveTheme(cssPath);
    expect(theme.name).toBe('no-desc');
    expect(theme.description).toBeNull();
  });

  test('should extract description from multi-line comment block', () => {
    const cssPath = path.join(tempDir, 'multi-line.css');
    fs.writeFileSync(cssPath, `/*
      * @theme multi-line
      * @description Multi-line description here
      */\n:root { }`);

    const theme = ThemeResolver.resolveTheme(cssPath);
    expect(theme.description).toBe('Multi-line description here');
  });
});

describe('ThemeResolver.scanDirectory', () => {
  const fixturesDir = path.join(__dirname, '..', 'fixtures', 'themes');
  const tempDir = path.join(__dirname, '..', 'temp', 'scan');

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

  test('should return empty array for non-existent directory', () => {
    const nonExistent = path.join(tempDir, 'does-not-exist');
    const themes = ThemeResolver.scanDirectory(nonExistent);
    expect(themes).toEqual([]);
  });
});

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
