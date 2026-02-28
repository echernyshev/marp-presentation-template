const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { getTempDir, cleanupTestOutputDir } = require('../../helpers/test-output');

const {
  validateProjectName,
  parsePathArg,
  createProject
} = require('../../../cli/commands/create-project');

// Mock the dependencies - must be before require
jest.mock('../../../cli/utils/prompt-utils');
jest.mock('child_process', () => ({
  spawnSync: jest.fn(() => ({ status: 0 }))
}));
jest.mock('../../../lib/theme-resolver');
jest.mock('../../../lib/prompts');
jest.mock('../../../lib/add-themes-command');
jest.mock('../../../lib/vscode-integration');
jest.mock('../../../lib/theme-manager');

const { askCreateExamples, askAddThemes } = require('../../../cli/utils/prompt-utils');
const { ThemeResolver } = require('../../../lib/theme-resolver');
const { Prompts } = require('../../../lib/prompts');
const { AddThemesCommand } = require('../../../lib/add-themes-command');
const { VSCodeIntegration } = require('../../../lib/vscode-integration');
const { ThemeManager } = require('../../../lib/theme-manager');

describe('cli/commands/create-project', () => {
  afterAll(() => {
    cleanupTestOutputDir();
  });

  describe('validateProjectName()', () => {
    test('should accept valid single-letter name', () => {
      expect(validateProjectName('a')).toBe(true);
    });

    test('should accept valid single-digit name', () => {
      expect(validateProjectName('1')).toBe(true);
    });

    test('should accept valid multi-letter lowercase name', () => {
      expect(validateProjectName('myproject')).toBe(true);
    });

    test('should accept valid name with numbers', () => {
      expect(validateProjectName('project123')).toBe(true);
    });

    test('should accept valid name with hyphens in middle', () => {
      expect(validateProjectName('my-project')).toBe(true);
      expect(validateProjectName('a-b-c')).toBe(true);
    });

    test('should accept valid name ending with number', () => {
      expect(validateProjectName('project-1')).toBe(true);
    });

    test('should reject name starting with hyphen', () => {
      expect(validateProjectName('-project')).toBe(false);
      expect(validateProjectName('-my-project')).toBe(false);
    });

    test('should reject name ending with hyphen', () => {
      expect(validateProjectName('project-')).toBe(false);
      expect(validateProjectName('my-')).toBe(false);
    });

    test('should reject name with uppercase letters', () => {
      expect(validateProjectName('MyProject')).toBe(false);
      expect(validateProjectName('myProject')).toBe(false);
      expect(validateProjectName('MYPROJECT')).toBe(false);
    });

    test('should reject name with special characters', () => {
      expect(validateProjectName('my_project')).toBe(false);
      expect(validateProjectName('my.project')).toBe(false);
      expect(validateProjectName('my@project')).toBe(false);
      expect(validateProjectName('my project')).toBe(false);
    });

    test('should reject empty string', () => {
      expect(validateProjectName('')).toBe(false);
    });

    test('should reject name with only hyphens', () => {
      expect(validateProjectName('---')).toBe(false);
    });

    test('should accept single character with number', () => {
      expect(validateProjectName('a1')).toBe(true);
    });
  });

  describe('parsePathArg()', () => {
    test('should return current directory when no --path argument', () => {
      const argv = ['node', 'index.js', 'myproject'];
      const result = parsePathArg(argv);
      expect(result.outputPath).toBe(process.cwd());
      expect(result.pathIndex).toBeNull();
    });

    test('should return pathIndex and null outputPath when --path exists', () => {
      const argv = ['node', 'index.js', 'myproject', '--path', '/tmp'];
      const result = parsePathArg(argv);
      expect(result.outputPath).toBeNull();
      expect(result.pathIndex).toBe(3); // Index of --path
    });

    test('should return pathIndex when --path is at position 2', () => {
      const argv = ['myproject', '--path', '/tmp'];
      const result = parsePathArg(argv);
      expect(result.outputPath).toBeNull();
      expect(result.pathIndex).toBe(1);
    });

    test('should return current directory when --path has no following value', () => {
      const argv = ['myproject', '--path'];
      const result = parsePathArg(argv);
      // When --path has no value (at end of argv), it's treated like no --path at all
      expect(result.pathIndex).toBeNull();
      expect(result.outputPath).toBe(process.cwd());
    });

    test('should handle multiple arguments correctly', () => {
      const argv = ['node', 'index.js', 'myproject', '--other', 'value', '--path', '/tmp'];
      const result = parsePathArg(argv);
      expect(result.outputPath).toBeNull();
      expect(result.pathIndex).toBe(5);
    });
  });

  describe('createProject()', () => {
    let tempDirs = [];
    let mockSpawnSync;

    beforeEach(() => {
      // Setup temp directory
      const tempBase = getTempDir('create-project');
      tempDirs.push(tempBase);

      // Reset all mocks
      jest.clearAllMocks();

      // Setup default mock behaviors
      askAddThemes.mockResolvedValue(false);
      askCreateExamples.mockResolvedValue(false);

      ThemeResolver.scanDirectory = jest.fn(() => []);

      // VSCodeIntegration mock
      VSCodeIntegration.mockImplementation(() => ({
        syncThemes: jest.fn()
      }));

      // ThemeManager mock - include static property
      const mockThemeManagerInstance = {
        ensureThemeSetConfig: jest.fn(),
        setActiveTheme: jest.fn(),
        updateVSCodeSettings: jest.fn(),
        listThemes: jest.fn(() => ['default', 'custom'])
      };
      ThemeManager.SYSTEM_THEMES = ['default', 'gaia', 'uncover'];
      ThemeManager.ensureThemeSetConfig = jest.fn();
      ThemeManager.mockImplementation(() => mockThemeManagerInstance);
    });

    afterEach(() => {
      for (const dir of tempDirs) {
        if (fs.existsSync(dir)) {
          fs.rmSync(dir, { recursive: true, force: true });
        }
      }
      tempDirs = [];
    });

    test('should throw error for invalid project name', async () => {
      await expect(createProject('Invalid_Name')).rejects.toThrow('Invalid project name');
    });

    test('should throw error for empty project name', async () => {
      await expect(createProject('')).rejects.toThrow('Invalid project name');
    });

    test('should throw error for existing directory', async () => {
      const existingDir = path.join(getTempDir('existing'), 'myproject');
      fs.mkdirSync(existingDir, { recursive: true });

      await expect(createProject('myproject', {
        outputPath: path.dirname(existingDir)
      })).rejects.toThrow('Project directory already exists');
    });

    test('should create project with valid name', async () => {
      const tempBase = getTempDir('valid-project');
      const projectName = 'test-project';

      // Mock template path
      const templatePath = path.join(__dirname, '..', '..', '..', 'template');

      await createProject(projectName, {
        outputPath: tempBase,
        templatePath
      });

      const projectPath = path.join(tempBase, projectName);
      expect(fs.existsSync(projectPath)).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'package.json'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'presentation.md'))).toBe(true);
    });

    test('should create scripts/lib directory and copy lib files', async () => {
      const tempBase = getTempDir('lib-copy');
      const projectName = 'lib-test';
      const templatePath = path.join(__dirname, '..', '..', '..', 'template');
      const rootLibPath = path.join(__dirname, '..', '..', '..', 'lib');

      await createProject(projectName, {
        outputPath: tempBase,
        templatePath,
        themesLibraryPath: path.join(__dirname, '..', '..', '..', 'themes')
      });

      const projectPath = path.join(tempBase, projectName);
      const projectLibPath = path.join(projectPath, 'scripts', 'lib');
      expect(fs.existsSync(projectLibPath)).toBe(true);
      expect(fs.existsSync(path.join(projectLibPath, 'theme-resolver.js'))).toBe(true);
      expect(fs.existsSync(path.join(projectLibPath, 'theme-manager.js'))).toBe(true);
    });

    test('should call ThemeManager.ensureThemeSetConfig', async () => {
      const tempBase = getTempDir('themeset-test');
      const projectName = 'themeset-test';
      const templatePath = path.join(__dirname, '..', '..', '..', 'template');

      await createProject(projectName, {
        outputPath: tempBase,
        templatePath
      });

      expect(ThemeManager.ensureThemeSetConfig).toHaveBeenCalled();
    });

    test('should set default active theme when no themes selected', async () => {
      const tempBase = getTempDir('default-theme');
      const projectName = 'default-theme';
      const templatePath = path.join(__dirname, '..', '..', '..', 'template');

      const themeManagerMock = {
        ensureThemeSetConfig: jest.fn(),
        setActiveTheme: jest.fn(),
        updateVSCodeSettings: jest.fn()
      };
      ThemeManager.mockImplementation(() => themeManagerMock);

      await createProject(projectName, {
        outputPath: tempBase,
        templatePath
      });

      expect(themeManagerMock.setActiveTheme).toHaveBeenCalledWith('default');
    });

    test('should run npm install after project creation', async () => {
      const tempBase = getTempDir('npm-install');
      const projectName = 'npm-test';
      const templatePath = path.join(__dirname, '..', '..', '..', 'template');

      await createProject(projectName, {
        outputPath: tempBase,
        templatePath
      });

      // Get the mocked spawnSync from child_process module
      const { spawnSync } = require('child_process');
      expect(spawnSync).toHaveBeenCalled();
      const calls = spawnSync.mock.calls;
      const npmCall = calls.find(call => call[0] === 'npm' && call[1]?.includes('install'));
      expect(npmCall).toBeDefined();
      expect(npmCall[2].cwd).toContain('npm-test');
    });

    test('should handle npm install failure gracefully', async () => {
      const tempBase = getTempDir('npm-fail');
      const projectName = 'npm-fail';

      // Override spawnSync to return failure
      const { spawnSync } = require('child_process');
      const originalMock = spawnSync.getMockImplementation();
      spawnSync.mockImplementationOnce(() => ({ status: 1 }));

      await expect(createProject(projectName, {
        outputPath: tempBase,
        templatePath: path.join(__dirname, '..', '..', '..', 'template')
      })).rejects.toThrow('npm install failed');

      // Restore original mock
      spawnSync.mockImplementation(originalMock);
    });

    test('should not create examples directory without themes (new architecture)', async () => {
      const tempBase = getTempDir('examples-test');
      const projectName = 'examples-test';
      const templatePath = path.join(__dirname, '..', '..', '..', 'template');

      await createProject(projectName, {
        outputPath: tempBase,
        templatePath
      });

      const projectPath = path.join(tempBase, projectName);
      // In the new architecture, examples are only created when themes are selected
      // Since no themes are selected in non-interactive mode, no examples directory
      expect(fs.existsSync(path.join(projectPath, 'examples'))).toBe(false);
      // Old examples.md file is gone
      expect(fs.existsSync(path.join(projectPath, 'examples.md'))).toBe(false);
    });
  });
});
