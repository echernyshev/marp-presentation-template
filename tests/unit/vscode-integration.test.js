// tests/unit/vscode-integration.test.js
const { VSCodeIntegration, VSCodeSettingsDTO } = require('../../lib/vscode-integration');
const { VSCodeIntegrationError } = require('../../lib/errors');
const fs = require('fs');
const path = require('path');

describe('VSCodeIntegration', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = path.join(__dirname, '..', 'temp', 'vscode-integration', `${Date.now()}-${Math.random().toString(36).slice(2)}`);
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
    test('should store project path', () => {
      const integration = new VSCodeIntegration(tempDir);
      expect(integration.projectPath).toBe(tempDir);
    });

    test('should throw when project path is null', () => {
      expect(() => new VSCodeIntegration(null)).toThrow(VSCodeIntegrationError);
    });

    test('should throw when project path is undefined', () => {
      expect(() => new VSCodeIntegration(undefined)).toThrow(VSCodeIntegrationError);
    });

    test('should throw when project path is empty string', () => {
      expect(() => new VSCodeIntegration('')).toThrow(VSCodeIntegrationError);
    });

    test('should accept valid project path', () => {
      const integration = new VSCodeIntegration('/valid/path');
      expect(integration.projectPath).toBe('/valid/path');
    });
  });

  describe('getSettingsPath', () => {
    test('should return correct path to settings.json', () => {
      const integration = new VSCodeIntegration(tempDir);
      const expected = path.join(tempDir, '.vscode', 'settings.json');
      expect(integration.getSettingsPath()).toBe(expected);
    });

    test('should handle absolute paths', () => {
      const integration = new VSCodeIntegration('/absolute/path/to/project');
      const expected = '/absolute/path/to/project/.vscode/settings.json';
      expect(integration.getSettingsPath()).toBe(expected);
    });

    test('should handle relative paths', () => {
      const integration = new VSCodeIntegration('relative/path');
      const expected = path.join('relative/path', '.vscode', 'settings.json');
      expect(integration.getSettingsPath()).toBe(expected);
    });
  });

  describe('readSettings', () => {
    test('should return empty object when settings.json does not exist', () => {
      const integration = new VSCodeIntegration(tempDir);
      const settings = integration.readSettings();
      expect(settings).toEqual({});
    });

    test('should read valid settings.json', () => {
      const vscodeDir = path.join(tempDir, '.vscode');
      fs.mkdirSync(vscodeDir, { recursive: true });

      const settingsPath = path.join(vscodeDir, 'settings.json');
      const expectedSettings = {
        'markdown.marp.enableHtml': true,
        'editor.fontSize': 14
      };
      fs.writeFileSync(settingsPath, JSON.stringify(expectedSettings, null, 2));

      const integration = new VSCodeIntegration(tempDir);
      const settings = integration.readSettings();
      expect(settings).toEqual(expectedSettings);
    });

    test('should return empty object and backup corrupted JSON', () => {
      const vscodeDir = path.join(tempDir, '.vscode');
      fs.mkdirSync(vscodeDir, { recursive: true });

      const settingsPath = path.join(vscodeDir, 'settings.json');
      fs.writeFileSync(settingsPath, '{ invalid json }');

      const integration = new VSCodeIntegration(tempDir);
      const settings = integration.readSettings();

      expect(settings).toEqual({});

      // Check that backup was created
      const backups = fs.readdirSync(vscodeDir).filter(f => f.startsWith('settings.json.corrupted.'));
      expect(backups.length).toBe(1);
    });

    test('should preserve existing settings structure', () => {
      const vscodeDir = path.join(tempDir, '.vscode');
      fs.mkdirSync(vscodeDir, { recursive: true });

      const settingsPath = path.join(vscodeDir, 'settings.json');
      const nestedSettings = {
        'editor': {
          'formatOnSave': true,
          'fontSize': 14
        },
        'markdown': {
          'marp': {
            'themes': ['themes/custom.css']
          }
        }
      };
      fs.writeFileSync(settingsPath, JSON.stringify(nestedSettings, null, 2));

      const integration = new VSCodeIntegration(tempDir);
      const settings = integration.readSettings();
      expect(settings).toEqual(nestedSettings);
    });

    test('should handle empty settings.json file', () => {
      const vscodeDir = path.join(tempDir, '.vscode');
      fs.mkdirSync(vscodeDir, { recursive: true });

      const settingsPath = path.join(vscodeDir, 'settings.json');
      fs.writeFileSync(settingsPath, '{}');

      const integration = new VSCodeIntegration(tempDir);
      const settings = integration.readSettings();
      expect(settings).toEqual({});
    });
  });

  describe('writeSettings', () => {
    test('should create .vscode directory if it does not exist', () => {
      const integration = new VSCodeIntegration(tempDir);
      integration.writeSettings({ 'test': 'value' });

      const vscodeDir = path.join(tempDir, '.vscode');
      expect(fs.existsSync(vscodeDir)).toBe(true);

      const settingsPath = path.join(vscodeDir, 'settings.json');
      expect(fs.existsSync(settingsPath)).toBe(true);
    });

    test('should write settings with proper formatting', () => {
      const integration = new VSCodeIntegration(tempDir);
      const settings = {
        'markdown.marp.themes': ['themes/custom.css'],
        'editor.fontSize': 14
      };
      integration.writeSettings(settings);

      const settingsPath = integration.getSettingsPath();
      const content = fs.readFileSync(settingsPath, 'utf-8');

      // Check for 2-space indentation
      expect(content).toContain('  "markdown.marp.themes"');
      expect(content).toContain('  "editor.fontSize"');
    });

    test('should overwrite existing settings.json', () => {
      const vscodeDir = path.join(tempDir, '.vscode');
      fs.mkdirSync(vscodeDir, { recursive: true });

      const settingsPath = path.join(vscodeDir, 'settings.json');
      fs.writeFileSync(settingsPath, '{"old": "settings"}');

      const integration = new VSCodeIntegration(tempDir);
      const newSettings = { 'new': 'value' };
      integration.writeSettings(newSettings);

      const content = fs.readFileSync(settingsPath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed).toEqual(newSettings);
      expect(parsed).not.toHaveProperty('old');
    });

    test('should preserve existing .vscode directory', () => {
      const vscodeDir = path.join(tempDir, '.vscode');
      fs.mkdirSync(vscodeDir, { recursive: true });

      // Create another file in .vscode
      fs.writeFileSync(path.join(vscodeDir, 'launch.json'), '{"version": "0.2.0"}');

      const integration = new VSCodeIntegration(tempDir);
      integration.writeSettings({ 'test': 'value' });

      // launch.json should still exist
      expect(fs.existsSync(path.join(vscodeDir, 'launch.json'))).toBe(true);
    });
  });

  describe('syncThemes', () => {
    test('should create markdown.marp.themes in new settings', () => {
      const integration = new VSCodeIntegration(tempDir);
      const themes = ['themes/custom.css', 'themes/another.css'];
      integration.syncThemes(themes);

      const settings = integration.readSettings();
      expect(settings['markdown.marp.themes']).toEqual(themes);
    });

    test('should update existing markdown.marp.themes', () => {
      const vscodeDir = path.join(tempDir, '.vscode');
      fs.mkdirSync(vscodeDir, { recursive: true });

      const settingsPath = path.join(vscodeDir, 'settings.json');
      const existingSettings = {
        'markdown.marp.themes': ['themes/old.css']
      };
      fs.writeFileSync(settingsPath, JSON.stringify(existingSettings, null, 2));

      const integration = new VSCodeIntegration(tempDir);
      const newThemes = ['themes/new.css'];
      integration.syncThemes(newThemes);

      const settings = integration.readSettings();
      expect(settings['markdown.marp.themes']).toEqual(newThemes);
    });

    test('should preserve other markdown settings when syncing themes', () => {
      const vscodeDir = path.join(tempDir, '.vscode');
      fs.mkdirSync(vscodeDir, { recursive: true });

      const settingsPath = path.join(vscodeDir, 'settings.json');
      const existingSettings = {
        'markdown.marp.enableHtml': true,
        'editor.fontSize': 14
      };
      fs.writeFileSync(settingsPath, JSON.stringify(existingSettings, null, 2));

      const integration = new VSCodeIntegration(tempDir);
      const themes = ['themes/custom.css'];
      integration.syncThemes(themes);

      const settings = integration.readSettings();
      expect(settings['markdown.marp.enableHtml']).toBe(true);
      expect(settings['editor.fontSize']).toBe(14);
    });

    test('should handle empty themes array', () => {
      const integration = new VSCodeIntegration(tempDir);
      integration.syncThemes([]);

      const settings = integration.readSettings();
      expect(settings['markdown.marp.themes']).toEqual([]);
    });

    test('should handle single theme', () => {
      const integration = new VSCodeIntegration(tempDir);
      const themes = ['themes/only.css'];
      integration.syncThemes(themes);

      const settings = integration.readSettings();
      expect(settings['markdown.marp.themes']).toEqual(['themes/only.css']);
    });

    test('should create markdown.marp.themes if not exists', () => {
      const integration = new VSCodeIntegration(tempDir);
      integration.syncThemes(['themes/test.css']);

      const settings = integration.readSettings();
      expect(settings['markdown.marp.themes']).toBeDefined();
      expect(settings['markdown.marp.themes']).toEqual(['themes/test.css']);
    });
  });

  describe('_backupCorruptedSettings (private method)', () => {
    test('should create backup with timestamp', () => {
      const vscodeDir = path.join(tempDir, '.vscode');
      fs.mkdirSync(vscodeDir, { recursive: true });

      const settingsPath = path.join(vscodeDir, 'settings.json');
      fs.writeFileSync(settingsPath, '{corrupted}');

      const integration = new VSCodeIntegration(tempDir);
      integration.readSettings();

      const backups = fs.readdirSync(vscodeDir).filter(f => f.startsWith('settings.json.corrupted.'));
      expect(backups.length).toBe(1);

      const backupContent = fs.readFileSync(path.join(vscodeDir, backups[0]), 'utf-8');
      expect(backupContent).toBe('{corrupted}');
    });
  });

  describe('createSettingsDTO', () => {
    test('should create DTO from empty settings', () => {
      const integration = new VSCodeIntegration(tempDir);
      const dto = integration.createSettingsDTO();
      expect(dto).toBeInstanceOf(VSCodeSettingsDTO);
      expect(dto.getMarpThemes()).toEqual([]);
    });

    test('should create DTO with existing themes', () => {
      const vscodeDir = path.join(tempDir, '.vscode');
      fs.mkdirSync(vscodeDir, { recursive: true });

      const settingsPath = path.join(vscodeDir, 'settings.json');
      const existingSettings = {
        'markdown.marp.themes': ['themes/first.css', 'themes/second.css']
      };
      fs.writeFileSync(settingsPath, JSON.stringify(existingSettings, null, 2));

      const integration = new VSCodeIntegration(tempDir);
      const dto = integration.createSettingsDTO();
      expect(dto.getMarpThemes()).toEqual(['themes/first.css', 'themes/second.css']);
    });
  });

  describe('readSettingsAsDTO', () => {
    test('should read settings as DTO', () => {
      const vscodeDir = path.join(tempDir, '.vscode');
      fs.mkdirSync(vscodeDir, { recursive: true });

      const settingsPath = path.join(vscodeDir, 'settings.json');
      const existingSettings = {
        'markdown.marp.themes': ['themes/test.css']
      };
      fs.writeFileSync(settingsPath, JSON.stringify(existingSettings, null, 2));

      const integration = new VSCodeIntegration(tempDir);
      const dto = integration.readSettingsAsDTO();
      expect(dto).toBeInstanceOf(VSCodeSettingsDTO);
      expect(dto.getMarpThemes()).toEqual(['themes/test.css']);
    });

    test('should return empty DTO when settings do not exist', () => {
      const integration = new VSCodeIntegration(tempDir);
      const dto = integration.readSettingsAsDTO();
      expect(dto.getMarpThemes()).toEqual([]);
    });
  });
});

describe('VSCodeSettingsDTO', () => {
  describe('getMarpThemes', () => {
    test('should return empty array when no themes', () => {
      const dto = new VSCodeSettingsDTO({});
      expect(dto.getMarpThemes()).toEqual([]);
    });

    test('should read from flat key "markdown.marp.themes"', () => {
      const dto = new VSCodeSettingsDTO({
        'markdown.marp.themes': ['themes/first.css', 'themes/second.css']
      });
      expect(dto.getMarpThemes()).toEqual(['themes/first.css', 'themes/second.css']);
    });

    test('should read from nested structure for backward compatibility', () => {
      const dto = new VSCodeSettingsDTO({
        'markdown': {
          'marp': {
            'themes': ['themes/nested.css']
          }
        }
      });
      expect(dto.getMarpThemes()).toEqual(['themes/nested.css']);
    });

    test('should prefer flat key over nested structure', () => {
      const dto = new VSCodeSettingsDTO({
        'markdown.marp.themes': ['themes/flat.css'],
        'markdown': {
          'marp': {
            'themes': ['themes/nested.css']
          }
        }
      });
      expect(dto.getMarpThemes()).toEqual(['themes/flat.css']);
    });

    test('should return empty array when themes property is undefined', () => {
      const dto = new VSCodeSettingsDTO({
        'markdown': {
          'marp': {}
        }
      });
      expect(dto.getMarpThemes()).toEqual([]);
    });

    test('should handle missing markdown property', () => {
      const dto = new VSCodeSettingsDTO({
        'editor.fontSize': 14
      });
      expect(dto.getMarpThemes()).toEqual([]);
    });
  });

  describe('setMarpThemes', () => {
    test('should set themes using flat key', () => {
      const dto = new VSCodeSettingsDTO({});
      dto.setMarpThemes(['themes/new.css']);
      const result = dto.toObject();
      expect(result['markdown.marp.themes']).toEqual(['themes/new.css']);
    });

    test('should overwrite existing themes', () => {
      const dto = new VSCodeSettingsDTO({
        'markdown.marp.themes': ['themes/old.css']
      });
      dto.setMarpThemes(['themes/new.css']);
      const result = dto.toObject();
      expect(result['markdown.marp.themes']).toEqual(['themes/new.css']);
    });

    test('should handle empty array', () => {
      const dto = new VSCodeSettingsDTO({
        'markdown.marp.themes': ['themes/old.css']
      });
      dto.setMarpThemes([]);
      const result = dto.toObject();
      expect(result['markdown.marp.themes']).toEqual([]);
    });

    test('should preserve other settings', () => {
      const dto = new VSCodeSettingsDTO({
        'editor.fontSize': 14,
        'markdown.marp.enableHtml': true
      });
      dto.setMarpThemes(['themes/test.css']);
      const result = dto.toObject();
      expect(result['editor.fontSize']).toBe(14);
      expect(result['markdown.marp.enableHtml']).toBe(true);
    });
  });

  describe('merge', () => {
    test('should merge themes without duplicates', () => {
      const dto1 = new VSCodeSettingsDTO({
        'markdown.marp.themes': ['themes/first.css', 'themes/second.css']
      });
      const dto2 = new VSCodeSettingsDTO({
        'markdown.marp.themes': ['themes/second.css', 'themes/third.css']
      });
      dto1.merge(dto2);
      expect(dto1.getMarpThemes()).toEqual(['themes/first.css', 'themes/second.css', 'themes/third.css']);
    });

    test('should handle merging with empty DTO', () => {
      const dto1 = new VSCodeSettingsDTO({
        'markdown.marp.themes': ['themes/only.css']
      });
      const dto2 = new VSCodeSettingsDTO({});
      dto1.merge(dto2);
      expect(dto1.getMarpThemes()).toEqual(['themes/only.css']);
    });

    test('should handle merging from empty DTO', () => {
      const dto1 = new VSCodeSettingsDTO({});
      const dto2 = new VSCodeSettingsDTO({
        'markdown.marp.themes': ['themes/new.css']
      });
      dto1.merge(dto2);
      expect(dto1.getMarpThemes()).toEqual(['themes/new.css']);
    });

    test('should handle both DTOs having nested structure', () => {
      const dto1 = new VSCodeSettingsDTO({
        'markdown': {
          'marp': {
            'themes': ['themes/first.css']
          }
        }
      });
      const dto2 = new VSCodeSettingsDTO({
        'markdown': {
          'marp': {
            'themes': ['themes/second.css']
          }
        }
      });
      dto1.merge(dto2);
      expect(dto1.getMarpThemes()).toEqual(['themes/first.css', 'themes/second.css']);
    });
  });

  describe('toObject', () => {
    test('should return plain object with settings', () => {
      const dto = new VSCodeSettingsDTO({
        'editor.fontSize': 14,
        'markdown.marp.themes': ['themes/test.css']
      });
      const result = dto.toObject();
      expect(result).toEqual({
        'editor.fontSize': 14,
        'markdown.marp.themes': ['themes/test.css']
      });
    });

    test('should return a copy, not the internal object', () => {
      const original = { 'test': 'value' };
      const dto = new VSCodeSettingsDTO(original);
      const result = dto.toObject();
      result.test = 'modified';
      expect(original.test).toBe('value');
      expect(dto._settings.test).toBe('value');
    });
  });
});
