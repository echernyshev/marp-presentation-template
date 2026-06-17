const fs = require('fs');
const path = require('path');

const { addThemesToExistingProject } = require('../../../cli/commands/add-themes-cli');
const { ThemeError } = require('../../../lib/errors');
const {
  snapshotStdinIsTTY,
  setStdinIsTTY,
  restoreStdinIsTTY
} = require('../../helpers/stdin-tty');

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

  describe('Interactive examples prompt (TTY)', () => {
    let ttySnapshot;

    beforeEach(() => {
      ttySnapshot = snapshotStdinIsTTY();
      // Force the interactive examples branch to execute
      setStdinIsTTY(true);
    });

    afterEach(() => {
      restoreStdinIsTTY(ttySnapshot);
    });

    test('should prompt for and copy examples when stdin is a TTY and themes were copied', async () => {
      const tempDir = '/tmp/test-tty-examples-' + Date.now();
      fs.mkdirSync(tempDir, { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'presentation.md'), '# Test');

      const mockPromptExamples = jest.fn().mockResolvedValue([
        { relativePath: 'example.md', themes: ['beam'] }
      ]);
      const mockCopyExamples = jest.fn();

      AddThemesCommand.mockImplementation(() => ({
        execute: mockExecute,
        _promptExamples: mockPromptExamples,
        _copyExamples: mockCopyExamples
      }));

      mockExecute.mockResolvedValue({
        copied: [{ name: 'beam' }],
        skipped: [],
        conflicts: []
      });

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      try {
        await addThemesToExistingProject(tempDir, { themeNames: ['beam'] });

        expect(mockPromptExamples).toHaveBeenCalledWith([{ name: 'beam' }]);
        expect(mockCopyExamples).toHaveBeenCalledWith(
          expect.any(Array),
          path.resolve(tempDir),
          expect.stringContaining('examples')
        );
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Examples copied: 1')
        );
      } finally {
        consoleLogSpy.mockRestore();
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test('should not copy examples when prompt returns no examples', async () => {
      const tempDir = '/tmp/test-tty-no-examples-' + Date.now();
      fs.mkdirSync(tempDir, { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'presentation.md'), '# Test');

      const mockPromptExamples = jest.fn().mockResolvedValue([]);
      const mockCopyExamples = jest.fn();

      AddThemesCommand.mockImplementation(() => ({
        execute: mockExecute,
        _promptExamples: mockPromptExamples,
        _copyExamples: mockCopyExamples
      }));

      mockExecute.mockResolvedValue({
        copied: [{ name: 'beam' }],
        skipped: [],
        conflicts: []
      });

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      try {
        await addThemesToExistingProject(tempDir, { themeNames: ['beam'] });

        expect(mockPromptExamples).toHaveBeenCalled();
        expect(mockCopyExamples).not.toHaveBeenCalled();
        expect(consoleLogSpy).not.toHaveBeenCalledWith(
          expect.stringContaining('Examples copied')
        );
      } finally {
        consoleLogSpy.mockRestore();
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test('should not prompt for examples when no themes were copied', async () => {
      const tempDir = '/tmp/test-tty-empty-' + Date.now();
      fs.mkdirSync(tempDir, { recursive: true });
      fs.writeFileSync(path.join(tempDir, 'presentation.md'), '# Test');

      const mockPromptExamples = jest.fn();
      const mockCopyExamples = jest.fn();

      AddThemesCommand.mockImplementation(() => ({
        execute: mockExecute,
        _promptExamples: mockPromptExamples,
        _copyExamples: mockCopyExamples
      }));

      mockExecute.mockResolvedValue({
        copied: [],
        skipped: [],
        conflicts: []
      });

      try {
        await addThemesToExistingProject(tempDir, { themeNames: ['beam'] });

        // No copied themes -> the TTY branch is skipped entirely
        expect(mockPromptExamples).not.toHaveBeenCalled();
        expect(mockCopyExamples).not.toHaveBeenCalled();
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });
});
