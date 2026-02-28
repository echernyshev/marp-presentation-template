const fs = require('fs');
const path = require('path');

const { addThemesToExistingProject } = require('../../../cli/commands/add-themes-cli');
const { ThemeError } = require('../../../lib/errors');

// Mock the dependencies
jest.mock('../../../lib/add-themes-command');

const { AddThemesCommand } = require('../../../lib/add-themes-command');

describe('cli/commands/add-themes-cli', () => {
  let mockExecute;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup AddThemesCommand mock
    mockExecute = jest.fn().mockResolvedValue({
      copied: [{ name: 'beam' }],
      skipped: [],
      conflicts: []
    });

    AddThemesCommand.mockImplementation(() => ({
      execute: mockExecute
    }));
  });

  describe('Path validation', () => {
    test('should throw ThemeError when target path does not exist', async () => {
      await expect(addThemesToExistingProject('/nonexistent/path')).rejects.toThrow(ThemeError);
      await expect(addThemesToExistingProject('/nonexistent/path')).rejects.toThrow('Target path does not exist');
    });

    test('should resolve relative path to absolute', async () => {
      // Create a test directory
      const tempDir = '/tmp/test-add-themes-' + Date.now();
      fs.mkdirSync(tempDir, { recursive: true });

      try {
        await addThemesToExistingProject(tempDir);

        expect(mockExecute).toHaveBeenCalledWith(
          path.resolve(tempDir),
          expect.any(Object)
        );
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test('should show warning when project has no presentation.md or package.json', async () => {
      const tempDir = '/tmp/test-no-files-' + Date.now();
      fs.mkdirSync(tempDir, { recursive: true });

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      try {
        await addThemesToExistingProject(tempDir);

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'Warning: This does not appear to be a Marp presentation project.'
        );
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          '  (no presentation.md or package.json found)'
        );
      } finally {
        consoleWarnSpy.mockRestore();
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test('should not show warning when presentation.md exists', async () => {
      const tempDir = '/tmp/test-has-presentation-' + Date.now();
      fs.mkdirSync(tempDir, { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'presentation.md'), '# Test');

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      try {
        await addThemesToExistingProject(tempDir);

        expect(consoleWarnSpy).not.toHaveBeenCalledWith(
          'Warning: This does not appear to be a Marp presentation project.'
        );
      } finally {
        consoleWarnSpy.mockRestore();
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test('should not show warning when package.json exists', async () => {
      const tempDir = '/tmp/test-has-package-' + Date.now();
      fs.mkdirSync(tempDir, { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'package.json'), '{}');

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      try {
        await addThemesToExistingProject(tempDir);

        expect(consoleWarnSpy).not.toHaveBeenCalledWith(
          'Warning: This does not appear to be a Marp presentation project.'
        );
      } finally {
        consoleWarnSpy.mockRestore();
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('Theme addition', () => {
    test('should pass theme names to AddThemesCommand when provided', async () => {
      const tempDir = '/tmp/test-add-themes-' + Date.now();
      fs.mkdirSync(tempDir, { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'presentation.md'), '# Test');

      try {
        await addThemesToExistingProject(tempDir, { themeNames: ['beam', 'marpx'] });

        expect(mockExecute).toHaveBeenCalledWith(
          path.resolve(tempDir),
          { themes: ['beam', 'marpx'] }
        );
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test('should pass undefined for themes when no theme names provided', async () => {
      const tempDir = '/tmp/test-no-theme-names-' + Date.now();
      fs.mkdirSync(tempDir, { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'presentation.md'), '# Test');

      try {
        await addThemesToExistingProject(tempDir, {});

        expect(mockExecute).toHaveBeenCalledWith(
          path.resolve(tempDir),
          { themes: undefined }
        );
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test('should show summary of copied, skipped, and conflicts', async () => {
      const tempDir = '/tmp/test-summary-' + Date.now();
      fs.mkdirSync(tempDir, { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'presentation.md'), '# Test');

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      mockExecute.mockResolvedValue({
        copied: [{ name: 'beam' }, { name: 'marpx' }],
        skipped: ['gaia-dark'],
        conflicts: ['old-theme']
      });

      try {
        await addThemesToExistingProject(tempDir, {});

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Copied themes: beam, marpx'));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Skipped: gaia-dark'));
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Conflicts: old-theme'));
      } finally {
        consoleLogSpy.mockRestore();
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test('should show "none" when no themes copied', async () => {
      const tempDir = '/tmp/test-none-' + Date.now();
      fs.mkdirSync(tempDir, { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'presentation.md'), '# Test');

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      mockExecute.mockResolvedValue({
        copied: [],
        skipped: [],
        conflicts: []
      });

      try {
        await addThemesToExistingProject(tempDir, {});

        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Copied themes: none'));
      } finally {
        consoleLogSpy.mockRestore();
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('AddThemesCommand configuration', () => {
    test('should create AddThemesCommand with themes library path', async () => {
      const tempDir = '/tmp/test-config-' + Date.now();
      fs.mkdirSync(tempDir, { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'presentation.md'), '# Test');

      const customLibraryPath = '/custom/themes/path';

      try {
        await addThemesToExistingProject(tempDir, { themesLibraryPath: customLibraryPath });

        expect(AddThemesCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            templatePath: customLibraryPath,
            interactive: true
          })
        );
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test('should use default themes library path when not specified', async () => {
      const tempDir = '/tmp/test-default-path-' + Date.now();
      fs.mkdirSync(tempDir, { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'presentation.md'), '# Test');

      try {
        await addThemesToExistingProject(tempDir);

        expect(AddThemesCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            interactive: true
          })
        );
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('Error handling', () => {
    test('should rethrow ThemeError with message', async () => {
      const tempDir = '/tmp/test-error-' + Date.now();
      fs.mkdirSync(tempDir, { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'presentation.md'), '# Test');

      mockExecute.mockRejectedValue(new ThemeError('Custom theme error'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      try {
        await expect(
          addThemesToExistingProject(tempDir, { themeNames: ['beam'] })
        ).rejects.toThrow('Custom theme error');

        expect(consoleErrorSpy).toHaveBeenCalledWith('Error: Custom theme error');
      } finally {
        consoleErrorSpy.mockRestore();
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test('should handle generic errors', async () => {
      const tempDir = '/tmp/test-generic-error-' + Date.now();
      fs.mkdirSync(tempDir, { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'presentation.md'), '# Test');

      mockExecute.mockRejectedValue(new Error('Generic error'));

      await expect(
        addThemesToExistingProject(tempDir, { themeNames: ['beam'] })
      ).rejects.toThrow('Generic error');
    });
  });
});
