// tests/unit/theme-manager.test.js
const fs = require('fs');
const path = require('path');
const { ThemeManager } = require('../../lib/theme-manager');
const { ThemeResolver, Theme } = require('../../lib/theme-resolver');
const { VSCodeIntegration } = require('../../lib/vscode-integration');
const { Frontmatter } = require('../../lib/frontmatter');
const {
  ThemeNotFoundError,
  ThemeAlreadyExistsError,
  PresentationNotFoundError
} = require('../../lib/errors');

describe('ThemeManager', () => {
  const tempDir = path.join(__dirname, '..', 'temp');
  const themesDir = path.join(tempDir, 'themes');
  const presentationPath = path.join(tempDir, 'presentation.md');

  beforeEach(() => {
    // Ensure clean state before each test
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });
    fs.mkdirSync(themesDir, { recursive: true });
    // Create default presentation
    fs.writeFileSync(
      presentationPath,
      `---
marp: true
theme: default
---

# Presentation`
    );
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
      expect(manager.presentationPath).toBe(presentationPath);
    });
  });

  describe('scanThemes', () => {
    test('should delegate to ThemeResolver.scanDirectory', () => {
      const spy = jest.spyOn(ThemeResolver, 'scanDirectory').mockReturnValue([]);

      const manager = new ThemeManager(tempDir);
      const themes = manager.scanThemes();

      expect(ThemeResolver.scanDirectory).toHaveBeenCalledWith(themesDir);
      expect(themes).toEqual([]);

      spy.mockRestore();
    });

    test('should return themes from directory', () => {
      fs.writeFileSync(
        path.join(themesDir, 'test.css'),
        '/* @theme test */'
      );

      const manager = new ThemeManager(tempDir);
      const themes = manager.scanThemes();

      expect(themes).toHaveLength(1);
      expect(themes[0].name).toBe('test');
    });
  });

  describe('getTheme', () => {
    test('should return theme by name', () => {
      fs.writeFileSync(
        path.join(themesDir, 'my-theme.css'),
        '/* @theme my-theme */'
      );

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

    test('should accept system theme', () => {
      const manager = new ThemeManager(tempDir);
      manager.setActiveTheme('uncover');

      const content = fs.readFileSync(presentationPath, 'utf-8');
      expect(content).toContain('theme: uncover');
    });

    test('should throw ThemeNotFoundError for non-existent theme', () => {
      fs.writeFileSync(
        path.join(themesDir, 'available.css'),
        '/* @theme available */'
      );

      const manager = new ThemeManager(tempDir);
      expect(() => manager.setActiveTheme('non-existent')).toThrow(
        ThemeNotFoundError
      );
    });

    test('should throw PresentationNotFoundError if presentation missing', () => {
      fs.unlinkSync(presentationPath);
      const manager = new ThemeManager(tempDir);
      expect(() => manager.setActiveTheme('default')).toThrow(
        PresentationNotFoundError
      );
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

      const content = fs.readFileSync(
        path.join(themesDir, 'child.css'),
        'utf-8'
      );
      expect(content).toContain('@import "gaia"');
    });

    test('should create theme in existing folder', () => {
      const folderPath = path.join(themesDir, 'existing-folder');
      fs.mkdirSync(folderPath, { recursive: true });

      const manager = new ThemeManager(tempDir);
      manager.createTheme('foldered', null, 'existing-folder');

      const themePath = path.join(folderPath, 'foldered.css');
      expect(fs.existsSync(themePath)).toBe(true);
    });

    test('should create theme in new folder', () => {
      const manager = new ThemeManager(tempDir);
      manager.createTheme('foldered', null, 'new', 'my-folder');

      const themePath = path.join(themesDir, 'my-folder', 'foldered.css');
      expect(fs.existsSync(themePath)).toBe(true);
    });

    test('should throw when creating in new folder without folder name', () => {
      const manager = new ThemeManager(tempDir);
      expect(() => manager.createTheme('test', null, 'new')).toThrow(
        'newFolderName required when location is "new"'
      );
    });

    test('should throw for duplicate theme name', () => {
      fs.writeFileSync(
        path.join(themesDir, 'existing.css'),
        '/* @theme existing */'
      );

      const manager = new ThemeManager(tempDir);
      expect(() => manager.createTheme('existing', null, 'root')).toThrow(
        ThemeAlreadyExistsError
      );
    });

    test('should update VSCode settings after creating theme', () => {
      const spy = jest.spyOn(VSCodeIntegration.prototype, 'syncThemes');

      const manager = new ThemeManager(tempDir);
      manager.createTheme('new-theme', null, 'root');

      expect(
        VSCodeIntegration.prototype.syncThemes
      ).toHaveBeenCalled();

      spy.mockRestore();
    });

    test('should include system themes in VSCode sync', () => {
      const syncSpy = jest.spyOn(VSCodeIntegration.prototype, 'syncThemes');

      const manager = new ThemeManager(tempDir);
      manager.updateVSCodeSettings();

      expect(syncSpy).toHaveBeenCalled();
      const callArgs = syncSpy.mock.calls[0][0];

      // System themes should be included
      expect(callArgs).toContain('themes/default.css');
      expect(callArgs).toContain('themes/gaia.css');
      expect(callArgs).toContain('themes/uncover.css');

      syncSpy.mockRestore();
    });

    test('should include filesystem and system themes in VSCode sync', () => {
      fs.writeFileSync(
        path.join(themesDir, 'custom.css'),
        '/* @theme custom */'
      );

      const manager = new ThemeManager(tempDir);
      manager.updateVSCodeSettings();

      const settingsPath = path.join(tempDir, '.vscode', 'settings.json');
      const settings = JSON.parse(
        fs.readFileSync(settingsPath, 'utf-8')
      );

      // Should include custom theme
      expect(settings['markdown.marp.themes']).toContain('themes/custom.css');

      // Should also include system themes
      expect(settings['markdown.marp.themes']).toContain('themes/default.css');
      expect(settings['markdown.marp.themes']).toContain('themes/gaia.css');
      expect(settings['markdown.marp.themes']).toContain('themes/uncover.css');
    });
  });

  describe('updateVSCodeSettings', () => {
    test('should sync themes to VSCode settings', () => {
      fs.writeFileSync(
        path.join(themesDir, 'theme1.css'),
        '/* @theme theme1 */'
      );
      fs.writeFileSync(
        path.join(themesDir, 'theme2.css'),
        '/* @theme theme2 */'
      );

      const manager = new ThemeManager(tempDir);
      manager.updateVSCodeSettings();

      const settingsPath = path.join(tempDir, '.vscode', 'settings.json');
      expect(fs.existsSync(settingsPath)).toBe(true);

      const settings = JSON.parse(
        fs.readFileSync(settingsPath, 'utf-8')
      );
      expect(settings['markdown.marp.themes']).toContain('themes/theme1.css');
      expect(settings['markdown.marp.themes']).toContain('themes/theme2.css');
    });

    test('should create .vscode directory if it does not exist', () => {
      const manager = new ThemeManager(tempDir);
      manager.updateVSCodeSettings();

      const vscodeDir = path.join(tempDir, '.vscode');
      expect(fs.existsSync(vscodeDir)).toBe(true);
    });
  });
});
