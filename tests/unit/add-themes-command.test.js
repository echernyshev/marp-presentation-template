// tests/unit/add-themes-command.test.js
const { AddThemesCommand, addThemesCommand } = require('../../lib/add-themes-command');
const { ThemeResolver, Theme } = require('../../lib/theme-resolver');
const { ThemeNotFoundError, ThemeError } = require('../../lib/errors');
const fs = require('fs');
const path = require('path');

// Helper to extract theme names from Theme objects
const getThemeNames = (themes) => Array.isArray(themes) ? themes.map(t => t.name) : [];

describe('AddThemesCommand', () => {
  let tempDir;
  let themesLibraryDir;
  let targetDir;

  beforeEach(() => {
    // Create unique temp directories for each test
    const timestamp = Date.now() + Math.random().toString(36).slice(2);
    tempDir = path.join(__dirname, '..', 'temp', 'add-themes-command', timestamp);
    themesLibraryDir = path.join(tempDir, 'themes');
    targetDir = path.join(tempDir, 'target');

    // Create directories
    fs.mkdirSync(themesLibraryDir, { recursive: true });
    fs.mkdirSync(targetDir, { recursive: true });

    // Create sample theme files in subdirectories (matching real structure)
    const gaiaDir = path.join(themesLibraryDir, 'gaia');
    const marpxDir = path.join(themesLibraryDir, 'marpx');
    const customDir = path.join(themesLibraryDir, 'custom');
    fs.mkdirSync(gaiaDir, { recursive: true });
    fs.mkdirSync(marpxDir, { recursive: true });
    fs.mkdirSync(customDir, { recursive: true });

    fs.writeFileSync(
      path.join(gaiaDir, 'gaia.css'),
      '/* @theme gaia */\n@import "default";'
    );
    fs.writeFileSync(
      path.join(marpxDir, 'marpx.css'),
      '/* @theme marpx */\n@import "default";'
    );
    fs.writeFileSync(
      path.join(customDir, 'custom.css'),
      '/* @theme custom */\n:root { }'
    );
  });

  afterEach(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    test('should create instance with default options', () => {
      const command = new AddThemesCommand();
      expect(command.options.interactive).toBe(true);
      expect(command.options.templatePath).toContain('themes');
    });

    test('should accept custom template path', () => {
      const customPath = '/custom/themes/path';
      const command = new AddThemesCommand({ templatePath: customPath });
      expect(command.options.templatePath).toBe(customPath);
    });

    test('should accept interactive mode setting', () => {
      const command = new AddThemesCommand({ interactive: false });
      expect(command.options.interactive).toBe(false);
    });

    test('should accept custom prompt functions', () => {
      const prompts = { selectThemes: jest.fn() };
      const command = new AddThemesCommand({ prompts });
      expect(command.options.prompts).toBe(prompts);
    });
  });

  describe('getTemplateThemesPath', () => {
    test('should return path to themes library directory', () => {
      const command = new AddThemesCommand({ templatePath: themesLibraryDir });
      expect(command.getTemplateThemesPath()).toBe(themesLibraryDir);
    });

    test('should use default themes path when not specified', () => {
      const command = new AddThemesCommand();
      const result = command.getTemplateThemesPath();
      expect(result).toContain('themes');
    });
  });

  describe('execute', () => {
    test('execute checks conflicts even in new projects', async () => {
      const command = new AddThemesCommand({
        templatePath: themesLibraryDir,
        interactive: false
      });

      // Empty project (no existing themes)
      const emptyProject = path.join(tempDir, 'empty-project');
      fs.mkdirSync(emptyProject, { recursive: true });

      const result = await command.execute(emptyProject, {
        themes: ['custom']
      });

      // Should succeed with no conflicts found
      expect(result.conflicts).toEqual([]);
      expect(result.copied).toHaveLength(1);
    });

    test('should copy all themes when no specific themes provided', async () => {
      const command = new AddThemesCommand({
        templatePath: themesLibraryDir,
        interactive: false
      });

      const result = await command.execute(targetDir);
      const copiedNames = getThemeNames(result.copied);

      // Should skip system themes (default, gaia)
      expect(copiedNames).toContain('marpx');
      expect(copiedNames).toContain('custom');
      expect(result.skipped).toEqual([]);
    });

    test('should copy only specified themes', async () => {
      const command = new AddThemesCommand({
        templatePath: themesLibraryDir,
        interactive: false
      });

      const result = await command.execute(targetDir, { themes: ['custom'] });
      const copiedNames = getThemeNames(result.copied);

      expect(copiedNames).toContain('custom');
      expect(copiedNames).not.toContain('marpx');
      expect(copiedNames).not.toContain('gaia'); // system theme
    });

    test('should copy no themes when empty array is provided', async () => {
      const command = new AddThemesCommand({
        templatePath: themesLibraryDir,
        interactive: false
      });

      const result = await command.execute(targetDir, { themes: [] });

      // Empty array means user explicitly chose no themes
      expect(result.copied).toEqual([]);
      expect(result.skipped).toEqual([]);
    });

    test('should copy only selected themes when specific themes provided', async () => {
      const command = new AddThemesCommand({
        templatePath: themesLibraryDir,
        interactive: false
      });

      const result = await command.execute(targetDir, { themes: ['marpx'] });
      const copiedNames = getThemeNames(result.copied);

      expect(copiedNames).toContain('marpx');
      expect(copiedNames).not.toContain('custom');
      expect(result.copied.length).toBe(1); // Only marpx (plus any dependencies)
    });

    test('should resolve dependencies for selected themes', async () => {
      // Create a theme that depends on another
      const parentDir = path.join(themesLibraryDir, 'parent');
      fs.mkdirSync(parentDir, { recursive: true });
      fs.writeFileSync(
        path.join(parentDir, 'parent.css'),
        '/* @theme parent */\n@import "custom";'
      );

      const command = new AddThemesCommand({
        templatePath: themesLibraryDir,
        interactive: false
      });

      const result = await command.execute(targetDir, { themes: ['parent'] });
      const copiedNames = getThemeNames(result.copied);

      expect(copiedNames).toContain('parent');
      expect(copiedNames).toContain('custom');
    });

    test('should skip conflicting themes when force is false', async () => {
      // Create existing theme in target
      const targetThemesDir = path.join(targetDir, 'themes');
      fs.mkdirSync(targetThemesDir, { recursive: true });
      fs.writeFileSync(
        path.join(targetThemesDir, 'custom.css'),
        '/* @theme custom */\n:root { color: red; }'
      );

      const command = new AddThemesCommand({
        templatePath: themesLibraryDir,
        interactive: false
      });

      const result = await command.execute(targetDir, { force: false });
      const copiedNames = getThemeNames(result.copied);

      expect(copiedNames).not.toContain('custom');
      expect(result.skipped).toContain('custom');
    });

    test('should overwrite themes when force is true', async () => {
      // Create existing theme in target
      const targetThemesDir = path.join(targetDir, 'themes');
      const customDir = path.join(targetThemesDir, 'custom');
      fs.mkdirSync(customDir, { recursive: true });
      const existingPath = path.join(customDir, 'custom.css');
      fs.writeFileSync(existingPath, '/* @theme custom */\n:root { color: red; }');

      const command = new AddThemesCommand({
        templatePath: themesLibraryDir,
        interactive: false
      });

      const result = await command.execute(targetDir, { force: true });
      const copiedNames = getThemeNames(result.copied);

      expect(copiedNames).toContain('custom');
      expect(result.skipped).not.toContain('custom');

      // Verify file was overwritten
      const content = fs.readFileSync(existingPath, 'utf-8');
      expect(content).toContain(':root { }'); // New content
    });

    test('should sync VSCode settings by default', async () => {
      const command = new AddThemesCommand({
        templatePath: themesLibraryDir,
        interactive: false
      });

      await command.execute(targetDir);

      const vscodeDir = path.join(targetDir, '.vscode');
      expect(fs.existsSync(vscodeDir)).toBe(true);

      const settingsPath = path.join(vscodeDir, 'settings.json');
      expect(fs.existsSync(settingsPath)).toBe(true);

      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      expect(settings['markdown.marp.themes']).toContain('themes/marpx/marpx.css');
      expect(settings['markdown.marp.themes']).toContain('themes/custom/custom.css');
    });

    test('should skip VSCode sync when noVscode is true', async () => {
      const command = new AddThemesCommand({
        templatePath: themesLibraryDir,
        interactive: false
      });

      await command.execute(targetDir, { noVscode: true });

      const vscodeDir = path.join(targetDir, '.vscode');
      expect(fs.existsSync(vscodeDir)).toBe(false);
    });

    test('should respect skip list from options', async () => {
      const command = new AddThemesCommand({
        templatePath: themesLibraryDir,
        interactive: false
      });

      const result = await command.execute(targetDir, { skip: ['custom'] });
      const copiedNames = getThemeNames(result.copied);

      expect(copiedNames).not.toContain('custom');
      expect(result.skipped).toContain('custom');
    });

    test('should throw for non-existent target path', async () => {
      const command = new AddThemesCommand({
        templatePath: themesLibraryDir,
        interactive: false
      });

      await expect(command.execute('/non/existent/path'))
        .rejects.toThrow(ThemeError);
    });

    test('should throw when template themes directory does not exist', async () => {
      const command = new AddThemesCommand({
        templatePath: '/non/existent/themes',
        interactive: false
      });

      await expect(command.execute(targetDir))
        .rejects.toThrow(ThemeError);
    });

    test('should throw when specified theme not found', async () => {
      const command = new AddThemesCommand({
        templatePath: themesLibraryDir,
        interactive: false
      });

      await expect(command.execute(targetDir, { themes: ['non-existent'] }))
        .rejects.toThrow(ThemeNotFoundError);
    });
  });

  describe('copyThemes', () => {
    test('should copy themes to target directory', () => {
      const command = new AddThemesCommand({ templatePath: themesLibraryDir });
      const customDir = path.join(themesLibraryDir, 'custom');

      const themes = [
        ThemeResolver.resolveTheme(path.join(customDir, 'custom.css'))
      ];

      const result = command.copyThemes(
        themes,
        themesLibraryDir,
        targetDir,
        []
      );

      expect(getThemeNames(result.copied)).toContain('custom');
      expect(result.skipped).toEqual([]);

      // Verify file was copied
      const targetFile = path.join(targetDir, 'themes', 'custom', 'custom.css');
      expect(fs.existsSync(targetFile)).toBe(true);
    });

    test('should skip themes in skip list', () => {
      const command = new AddThemesCommand({ templatePath: themesLibraryDir });
      const customDir = path.join(themesLibraryDir, 'custom');

      const themes = [
        ThemeResolver.resolveTheme(path.join(customDir, 'custom.css'))
      ];

      const result = command.copyThemes(
        themes,
        themesLibraryDir,
        targetDir,
        ['custom']
      );

      expect(result.copied).toEqual([]);
      expect(result.skipped).toContain('custom');
    });

    test('should create target themes directory if it does not exist', () => {
      const command = new AddThemesCommand({ templatePath: themesLibraryDir });
      const customDir = path.join(themesLibraryDir, 'custom');

      const themes = [
        ThemeResolver.resolveTheme(path.join(customDir, 'custom.css'))
      ];

      const targetWithoutThemes = path.join(tempDir, 'no-themes');

      command.copyThemes(
        themes,
        themesLibraryDir,
        targetWithoutThemes,
        []
      );

      expect(fs.existsSync(path.join(targetWithoutThemes, 'themes'))).toBe(true);
    });
  });

  describe('_scanProjectThemes', () => {
    test('should return empty array when themes directory does not exist', () => {
      const command = new AddThemesCommand();
      const noThemesDir = path.join(tempDir, 'no-themes');

      const themes = command._scanProjectThemes(noThemesDir);

      expect(themes).toEqual([]);
    });

    test('should scan and return existing themes', () => {
      const command = new AddThemesCommand();

      // Create themes directory with a theme
      const targetThemesDir = path.join(targetDir, 'themes');
      fs.mkdirSync(targetThemesDir, { recursive: true });
      fs.writeFileSync(
        path.join(targetThemesDir, 'existing.css'),
        '/* @theme existing */'
      );

      const themes = command._scanProjectThemes(targetDir);

      expect(themes).toHaveLength(1);
      expect(themes[0].name).toBe('existing');
    });
  });

  describe('_findConflicts', () => {
    test('should return empty array when no conflicts', () => {
      const command = new AddThemesCommand();

      const themesToCopy = [
        new Theme('new', '/path/new.css', 'css', [])
      ];
      const existingThemes = [
        new Theme('existing', '/path/existing.css', 'css', [])
      ];

      const conflicts = command._findConflicts(themesToCopy, existingThemes);

      expect(conflicts).toEqual([]);
    });

    test('should detect conflicting theme names', () => {
      const command = new AddThemesCommand();

      const themesToCopy = [
        new Theme('conflict', '/path/new.css', 'css', [])
      ];
      const existingThemes = [
        new Theme('conflict', '/path/existing.css', 'css', [])
      ];

      const conflicts = command._findConflicts(themesToCopy, existingThemes);

      expect(conflicts).toEqual(['conflict']);
    });

    test('should detect multiple conflicts', () => {
      const command = new AddThemesCommand();

      const themesToCopy = [
        new Theme('a', '/path/a.css', 'css', []),
        new Theme('b', '/path/b.css', 'css', []),
        new Theme('c', '/path/c.css', 'css', [])
      ];
      const existingThemes = [
        new Theme('a', '/path/existing-a.css', 'css', []),
        new Theme('b', '/path/existing-b.css', 'css', [])
      ];

      const conflicts = command._findConflicts(themesToCopy, existingThemes);

      expect(conflicts.sort()).toEqual(['a', 'b']);
    });
  });

  describe('addThemesCommand convenience function', () => {
    test('should create and execute AddThemesCommand', async () => {
      const result = await addThemesCommand(targetDir, {
        templatePath: themesLibraryDir,
        interactive: false
      });
      const copiedNames = getThemeNames(result.copied);

      expect(copiedNames).toContain('marpx');
      expect(copiedNames).toContain('custom');
    });

    test('should pass options to AddThemesCommand', async () => {
      const result = await addThemesCommand(targetDir, {
        templatePath: themesLibraryDir,
        themes: ['custom'],
        interactive: false
      });
      const copiedNames = getThemeNames(result.copied);

      expect(copiedNames).toEqual(['custom']);
    });
  });

  describe('Theme object return values', () => {
    test('execute returns Theme objects with name property', async () => {
      const command = new AddThemesCommand({
        templatePath: themesLibraryDir,
        interactive: false
      });

      const result = await command.execute(targetDir, {
        themes: ['custom']
      });

      expect(result.copied).toHaveLength(1);
      expect(result.copied[0]).toHaveProperty('name');
      expect(result.copied[0].name).toBe('custom');
    });

    test('execute returns Theme objects with all required properties', async () => {
      const command = new AddThemesCommand({
        templatePath: themesLibraryDir,
        interactive: false
      });

      const result = await command.execute(targetDir, {
        themes: ['custom']
      });

      expect(result.copied).toHaveLength(1);
      const theme = result.copied[0];

      // Verify all Theme properties are present
      expect(theme).toHaveProperty('name');
      expect(theme).toHaveProperty('path');
      expect(theme).toHaveProperty('css');
      expect(theme).toHaveProperty('dependencies');
      expect(theme).toHaveProperty('isSystem');

      // Verify property types
      expect(typeof theme.name).toBe('string');
      expect(typeof theme.path).toBe('string');
      expect(typeof theme.css).toBe('string');
      expect(Array.isArray(theme.dependencies)).toBe(true);
      expect(typeof theme.isSystem).toBe('boolean');
    });

    test('execute returns Theme objects for multiple themes', async () => {
      const command = new AddThemesCommand({
        templatePath: themesLibraryDir,
        interactive: false
      });

      const result = await command.execute(targetDir, {
        themes: ['custom', 'marpx']
      });

      expect(result.copied.length).toBeGreaterThanOrEqual(2);

      // Verify all copied items are Theme objects
      for (const theme of result.copied) {
        expect(theme).toHaveProperty('name');
        expect(theme).toHaveProperty('path');
        expect(theme).toHaveProperty('css');
      }
    });

    test('copyThemes returns Theme objects in copied array', () => {
      const command = new AddThemesCommand({ templatePath: themesLibraryDir });
      const customDir = path.join(themesLibraryDir, 'custom');

      const themes = [
        ThemeResolver.resolveTheme(path.join(customDir, 'custom.css'))
      ];

      const result = command.copyThemes(
        themes,
        themesLibraryDir,
        targetDir,
        []
      );

      expect(result.copied).toHaveLength(1);
      expect(result.copied[0]).toBeInstanceOf(Theme);
      expect(result.copied[0].name).toBe('custom');
    });
  });
});
