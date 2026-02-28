// tests/unit/prompts.test.js
const { Prompts } = require('../../lib/prompts');

// Mock @inquirer/prompts
jest.mock('@inquirer/prompts', () => ({
  checkbox: jest.fn(),
  select: jest.fn(),
  input: jest.fn(),
  confirm: jest.fn(),
  prompt: jest.fn(),
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
          { name: 'beam - Beamer theme', value: 'beam', checked: false },
          { name: 'gaia-dark - Dark gaia', value: 'gaia-dark', checked: false }
        ]
      });
    });

    test('should return empty array for no available themes', async () => {
      const result = await Prompts.promptThemes([]);
      expect(result).toEqual([]);
      expect(inquirer.checkbox).not.toHaveBeenCalled();
    });

    test('should include descriptions in choices', async () => {
      const availableThemes = [
        { name: 'beam', description: 'Beamer theme' }
      ];
      inquirer.checkbox.mockResolvedValue(['beam']);

      await Prompts.promptThemes(availableThemes);
      expect(inquirer.checkbox).toHaveBeenCalledWith({
        message: 'Select themes to add:',
        choices: [
          { name: 'beam - Beamer theme', value: 'beam', checked: false }
        ]
      });
    });

    test('should show just theme name when no description', async () => {
      const availableThemes = [
        { name: 'no-desc-theme', description: null }
      ];
      inquirer.checkbox.mockResolvedValue(['no-desc-theme']);

      await Prompts.promptThemes(availableThemes);
      expect(inquirer.checkbox).toHaveBeenCalledWith({
        message: 'Select themes to add:',
        choices: [
          { name: 'no-desc-theme', value: 'no-desc-theme', checked: false }
        ]
      });
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
      expect(inquirer.select).toHaveBeenCalledWith({
        message: 'Select active theme:',
        choices: ['theme-a', 'theme-b']
      });
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

    test('should reject empty theme name', async () => {
      inquirer.input.mockImplementation(({ validate }) => {
        const empty = validate('');
        expect(empty).toBe('Theme name is required');
        const whitespace = validate('   ');
        expect(whitespace).toBe('Theme name is required');
        return Promise.resolve('valid-name');
      });

      await Prompts.promptNewThemeName();
    });

    test('should reject invalid characters', async () => {
      inquirer.input.mockImplementation(({ validate }) => {
        const uppercase = validate('MyTheme');
        expect(uppercase).toContain('lowercase letters');
        const underscore = validate('my_theme');
        expect(underscore).toContain('lowercase letters');
        return Promise.resolve('valid-theme');
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

      const callArgs = inquirer.select.mock.calls[0][0];
      expect(callArgs.choices[0]).toEqual({ name: 'none (create from scratch)', value: null });
      // Check that custom themes are included (after separators)
      expect(callArgs.choices).toContainEqual({ name: 'marpx', value: 'marpx' });
      expect(callArgs.choices).toContainEqual({ name: 'beam', value: 'beam' });
    });

    test('should return null for "none" option', async () => {
      inquirer.select.mockResolvedValue(null);
      const result = await Prompts.promptParentTheme([]);
      expect(result).toBeNull();
    });

    test('should include built-in system themes', async () => {
      inquirer.select.mockResolvedValue('gaia');
      await Prompts.promptParentTheme([]);

      const callArgs = inquirer.select.mock.calls[0][0];
      expect(callArgs.choices).toContainEqual({ name: 'default (system built-in)', value: 'default' });
      expect(callArgs.choices).toContainEqual({ name: 'gaia (system built-in)', value: 'gaia' });
      expect(callArgs.choices).toContainEqual({ name: 'uncover (system built-in)', value: 'uncover' });
    });
  });

  describe('promptDirectoryLocation', () => {
    test('should show root option', async () => {
      inquirer.select.mockResolvedValue('root');
      const result = await Prompts.promptDirectoryLocation([]);
      expect(result).toBe('root');

      const callArgs = inquirer.select.mock.calls[0][0];
      expect(callArgs.choices[0]).toEqual({ name: 'In root (themes/<name>.css)', value: 'root' });
    });

    test('should show existing directories', async () => {
      const existingDirs = ['custom', 'my-folder'];
      inquirer.select.mockResolvedValue('custom');
      const result = await Prompts.promptDirectoryLocation(existingDirs);
      expect(result).toBe('custom');

      const callArgs = inquirer.select.mock.calls[0][0];
      expect(callArgs.choices).toContainEqual({
        name: 'In existing folder: themes/custom/',
        value: 'custom'
      });
    });

    test('should show new folder option', async () => {
      inquirer.select.mockResolvedValue('new');
      const result = await Prompts.promptDirectoryLocation([]);
      expect(result).toBe('new');

      const callArgs = inquirer.select.mock.calls[0][0];
      expect(callArgs.choices[callArgs.choices.length - 1]).toEqual({ name: 'In new folder (enter name)', value: 'new' });
    });
  });

  describe('promptNewFolderName', () => {
    test('should return validated folder name', async () => {
      inquirer.input.mockResolvedValue('my-folder');
      const result = await Prompts.promptNewFolderName();
      expect(result).toBe('my-folder');
    });

    test('should validate folder name format', async () => {
      inquirer.input.mockImplementation(({ validate }) => {
        const invalid = validate('Invalid Folder!');
        expect(invalid).toBeTruthy();
        const valid = validate('valid-folder');
        expect(valid).toBe(true);
        return Promise.resolve('valid-folder');
      });

      await Prompts.promptNewFolderName();
    });

    test('should reject empty folder name', async () => {
      inquirer.input.mockImplementation(({ validate }) => {
        const empty = validate('');
        expect(empty).toBe('Folder name is required');
        return Promise.resolve('valid-folder');
      });

      await Prompts.promptNewFolderName();
    });
  });

  describe('promptConflictResolution', () => {
    beforeEach(() => {
      jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      console.log.mockRestore();
    });

    test('should prompt for single conflict', async () => {
      const conflicts = [{ name: 'existing-theme' }];
      inquirer.select.mockResolvedValue('skip');

      const result = await Prompts.promptConflictResolution(conflicts);
      expect(result).toBe('skip');
      expect(inquirer.select).toHaveBeenCalledWith({
        message: 'Theme "existing-theme" already exists. What would you like to do?',
        choices: expect.arrayContaining([
          { name: 'Skip (keep existing)', value: 'skip' },
          { name: 'Overwrite (replace with template version)', value: 'overwrite' },
          { name: 'Cancel (stop adding themes)', value: 'cancel' }
        ])
      });
    });

    test('should prompt for multiple conflicts with apply-to-all options', async () => {
      const conflicts = [
        { name: 'theme-a' },
        { name: 'theme-b' }
      ];
      inquirer.select.mockResolvedValue('skip-all');

      const result = await Prompts.promptConflictResolution(conflicts);
      expect(result).toBe('skip-all');
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('2 themes already exist'));
      expect(inquirer.select).toHaveBeenCalledWith({
        message: 'Apply to all conflicts?',
        choices: expect.arrayContaining([
          { name: 'Skip all', value: 'skip-all' },
          { name: 'Overwrite all', value: 'overwrite-all' },
          { name: 'Choose for each', value: 'choose-each' },
          { name: 'Cancel', value: 'cancel' }
        ])
      });
    });
  });

  describe('promptSingleConflict', () => {
    test('should prompt for single theme conflict', async () => {
      inquirer.select.mockResolvedValue('overwrite');

      const result = await Prompts.promptSingleConflict('my-theme');
      expect(result).toBe('overwrite');
      expect(inquirer.select).toHaveBeenCalledWith({
        message: 'Theme "my-theme" already exists. What would you like to do?',
        choices: [
          { name: 'Skip (keep existing)', value: 'skip' },
          { name: 'Overwrite (replace with template version)', value: 'overwrite' },
          { name: 'Cancel (stop adding themes)', value: 'cancel' }
        ]
      });
    });
  });

  describe('confirm', () => {
    test('should return boolean choice with true default', async () => {
      inquirer.confirm.mockResolvedValue(true);
      const result = await Prompts.confirm('Continue?');
      expect(result).toBe(true);
      expect(inquirer.confirm).toHaveBeenCalledWith({
        message: 'Continue?',
        default: true
      });
    });

    test('should return boolean choice with false default', async () => {
      inquirer.confirm.mockResolvedValue(false);
      const result = await Prompts.confirm('Continue?', false);
      expect(result).toBe(false);
      expect(inquirer.confirm).toHaveBeenCalledWith({
        message: 'Continue?',
        default: false
      });
    });

    test('should return user selection', async () => {
      inquirer.confirm.mockResolvedValue(true);
      const result = await Prompts.confirm('Proceed?', false);
      expect(result).toBe(true);
    });
  });

  describe('promptCopyExamples', () => {
    test('should prompt user to copy examples with default false', async () => {
      inquirer.prompt = jest.fn().mockResolvedValue({ shouldCopy: false });

      const result = await Prompts.promptCopyExamples();
      expect(result).toEqual({ shouldCopyExamples: false });
      expect(inquirer.prompt).toHaveBeenCalledWith([
        {
          type: 'confirm',
          name: 'shouldCopy',
          message: 'Copy examples for selected themes?',
          default: false
        }
      ]);
    });

    test('should return true when user accepts', async () => {
      inquirer.prompt = jest.fn().mockResolvedValue({ shouldCopy: true });

      const result = await Prompts.promptCopyExamples();
      expect(result).toEqual({ shouldCopyExamples: true });
    });
  });
});
