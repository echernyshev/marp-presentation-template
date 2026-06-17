// theme-cli.js is at template/scripts/theme-cli.js and requires './lib/...'.
// That resolves to template/scripts/lib/..., which only exists inside a
// scaffolded project (the integration test copies lib/ there). For in-process
// unit tests we mock the modules at the resolved absolute paths so require
// succeeds without the physical files. We use jest.doMock (not hoisted) so the
// absolute path computed from __dirname is already initialized when the mocks
// run, and require the module-under-test afterwards.
const fs = require('fs');
const path = require('path');
const os = require('os');

const SCRIPTS_DIR = path.join(__dirname, '..', '..', 'template', 'scripts');
const resolverPath = path.join(SCRIPTS_DIR, 'lib', 'theme-resolver');
const managerPath = path.join(SCRIPTS_DIR, 'lib', 'theme-manager');
const promptsPath = path.join(SCRIPTS_DIR, 'lib', 'prompts');
const vscodePath = path.join(SCRIPTS_DIR, 'lib', 'vscode-integration');
const frontmatterPath = path.join(SCRIPTS_DIR, 'lib', 'frontmatter');
const errorsPath = path.join(SCRIPTS_DIR, 'lib', 'errors');

// Re-export the real error classes so .name checks in the handlers match.
const realErrors = require('../../lib/errors');

jest.doMock(resolverPath, () => ({
  ThemeResolver: { scanDirectory: jest.fn() },
  Theme: class { constructor(props) { Object.assign(this, props); } }
}), { virtual: true });
jest.doMock(managerPath, () => ({
  ThemeManager: jest.fn()
}), { virtual: true });
jest.doMock(promptsPath, () => ({
  Prompts: {
    promptParentTheme: jest.fn(),
    promptDirectoryLocation: jest.fn(),
    promptNewFolderName: jest.fn(),
    promptActiveTheme: jest.fn(),
  }
}), { virtual: true });
jest.doMock(vscodePath, () => ({
  VSCodeIntegration: jest.fn()
}), { virtual: true });
jest.doMock(frontmatterPath, () => ({
  Frontmatter: { parse: jest.fn(), stringify: jest.fn() }
}), { virtual: true });
jest.doMock(errorsPath, () => realErrors, { virtual: true });

const { main, showHelp } = require('../../template/scripts/theme-cli');
const { ThemeResolver } = require(resolverPath);
const { ThemeManager } = require(managerPath);
const { Prompts } = require(promptsPath);
const { VSCodeIntegration } = require(vscodePath);
const {
  ThemeNotFoundError,
  PresentationNotFoundError
} = require('../../lib/errors');

// Helper: build a mocked ThemeManager instance
function mockThemeManager(overrides = {}) {
  const instance = {
    scanThemes: jest.fn(() => []),
    listThemes: jest.fn(() => ['beam', 'default']),
    listDirectories: jest.fn(() => []),
    getActiveTheme: jest.fn(() => null),
    setActiveTheme: jest.fn(),
    updateVSCodeSettings: jest.fn(),
    createTheme: jest.fn(() => ({ path: '/proj/themes/x.css' })),
    ...overrides,
  };
  ThemeManager.mockImplementation(() => instance);
  // createTheme handler reads ThemeManager.SYSTEM_THEMES (static prop).
  ThemeManager.SYSTEM_THEMES = ['default', 'gaia', 'uncover'];
  return instance;
}

describe('theme-cli (in-process)', () => {
  let tmp;
  let logSpy;
  let errSpy;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'theme-cli-'));
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.clearAllMocks();
  });
  afterEach(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  describe('help / default', () => {
    test('help -> showHelp -> 0', async () => {
      const code = await main(['help'], { projectRoot: tmp });
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Marp Theme CLI'));
    });

    test('без команды -> default -> showHelp -> 0', async () => {
      const code = await main([], { projectRoot: tmp });
      expect(code).toBe(0);
    });
  });

  describe('list', () => {
    test('темы есть -> выводит список', async () => {
      fs.mkdirSync(path.join(tmp, 'themes'), { recursive: true });
      ThemeResolver.scanDirectory.mockReturnValue([
        { name: 'beam', dependencies: ['default'] },
        { name: 'plain', dependencies: [] },
      ]);
      const code = await main(['list'], { projectRoot: tmp });
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('beam (depends on: default)'));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('plain'));
    });

    test('тем нет -> "No themes installed"', async () => {
      // themes/ dir missing
      const code = await main(['list'], { projectRoot: tmp });
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith('  No themes installed.');
    });

    test('директория themes есть, но scanDirectory бросает -> нет тем', async () => {
      fs.mkdirSync(path.join(tmp, 'themes'), { recursive: true });
      ThemeResolver.scanDirectory.mockImplementation(() => { throw new Error('boom'); });
      const code = await main(['list'], { projectRoot: tmp });
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith('  No themes installed.');
    });
  });

  describe('create', () => {
    test('без имени -> код 1', async () => {
      const code = await main(['create'], { projectRoot: tmp });
      expect(code).toBe(1);
      expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('Theme name is required'));
    });

    test('успешное создание -> код 0', async () => {
      const inst = mockThemeManager();
      Prompts.promptParentTheme.mockResolvedValue('default');
      Prompts.promptDirectoryLocation.mockResolvedValue('root');

      const code = await main(['create', 'my-theme'], { projectRoot: tmp });

      expect(code).toBe(0);
      expect(inst.createTheme).toHaveBeenCalledWith('my-theme', 'default', 'root', null);
    });

    test('location=new -> запрашивает имя папки', async () => {
      const inst = mockThemeManager();
      Prompts.promptParentTheme.mockResolvedValue(null);
      Prompts.promptDirectoryLocation.mockResolvedValue('new');
      Prompts.promptNewFolderName.mockResolvedValue('my-folder');

      const code = await main(['create', 'my-theme'], { projectRoot: tmp });

      expect(code).toBe(0);
      expect(inst.createTheme).toHaveBeenCalledWith('my-theme', null, 'new', 'my-folder');
    });

    test('ошибка manager.createTheme -> код 1', async () => {
      mockThemeManager({ createTheme: jest.fn(() => { throw new Error('dup'); }) });
      Prompts.promptParentTheme.mockResolvedValue('default');
      Prompts.promptDirectoryLocation.mockResolvedValue('root');

      const code = await main(['create', 'my-theme'], { projectRoot: tmp });
      expect(code).toBe(1);
      expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('dup'));
    });
  });

  describe('set / switch', () => {
    test('успех -> код 0', async () => {
      const inst = mockThemeManager();
      const code = await main(['set', 'beam'], { projectRoot: tmp });
      expect(code).toBe(0);
      expect(inst.setActiveTheme).toHaveBeenCalledWith('beam');
      expect(inst.updateVSCodeSettings).toHaveBeenCalled();
    });

    test('switch — алиас для set', async () => {
      const inst = mockThemeManager();
      const code = await main(['switch', 'beam'], { projectRoot: tmp });
      expect(code).toBe(0);
      expect(inst.setActiveTheme).toHaveBeenCalledWith('beam');
    });

    test('ThemeNotFoundError -> код 1', async () => {
      const err = new ThemeNotFoundError('nope');
      mockThemeManager({ setActiveTheme: jest.fn(() => { throw err; }) });
      const code = await main(['set', 'nope'], { projectRoot: tmp });
      expect(code).toBe(1);
    });

    test('PresentationNotFoundError -> код 1', async () => {
      const err = new PresentationNotFoundError('/proj/presentation.md');
      mockThemeManager({ setActiveTheme: jest.fn(() => { throw err; }) });
      const code = await main(['set', 'beam'], { projectRoot: tmp });
      expect(code).toBe(1);
    });

    test('прочая ошибка -> код 1', async () => {
      mockThemeManager({ setActiveTheme: jest.fn(() => { throw new Error('boom'); }) });
      const code = await main(['set', 'beam'], { projectRoot: tmp });
      expect(code).toBe(1);
    });
  });

  describe('select', () => {
    test('успех -> код 0', async () => {
      const inst = mockThemeManager();
      Prompts.promptActiveTheme.mockResolvedValue('beam');
      const code = await main(['select'], { projectRoot: tmp });
      expect(code).toBe(0);
      expect(inst.setActiveTheme).toHaveBeenCalledWith('beam');
    });

    test('ThemeNotFoundError -> код 1', async () => {
      mockThemeManager({
        listThemes: jest.fn(() => ['beam']),
        setActiveTheme: jest.fn(() => { throw new ThemeNotFoundError('x'); }),
      });
      Prompts.promptActiveTheme.mockResolvedValue('beam');
      const code = await main(['select'], { projectRoot: tmp });
      expect(code).toBe(1);
    });

    test('PresentationNotFoundError -> код 1', async () => {
      mockThemeManager({
        listThemes: jest.fn(() => ['beam']),
        setActiveTheme: jest.fn(() => { throw new PresentationNotFoundError('p'); }),
      });
      Prompts.promptActiveTheme.mockResolvedValue('beam');
      const code = await main(['select'], { projectRoot: tmp });
      expect(code).toBe(1);
    });

    test('прочая ошибка -> код 1', async () => {
      mockThemeManager({
        listThemes: jest.fn(() => ['beam']),
        setActiveTheme: jest.fn(() => { throw new Error('boom'); }),
      });
      Prompts.promptActiveTheme.mockResolvedValue('beam');
      const code = await main(['select'], { projectRoot: tmp });
      expect(code).toBe(1);
      expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('boom'));
    });
  });

  describe('sync', () => {
    test('тем нет -> "No themes installed to sync", код 0', async () => {
      const code = await main(['sync'], { projectRoot: tmp });
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('No themes installed to sync'));
    });

    test('темы есть -> syncThemes вызван, код 0', async () => {
      fs.mkdirSync(path.join(tmp, 'themes'), { recursive: true });
      ThemeResolver.scanDirectory.mockReturnValue([
        { name: 'beam', path: path.join(tmp, 'themes', 'beam.css'), dependencies: [] },
      ]);
      const syncMock = jest.fn();
      VSCodeIntegration.mockImplementation(() => ({ syncThemes: syncMock }));

      const code = await main(['sync'], { projectRoot: tmp });

      expect(code).toBe(0);
      expect(syncMock).toHaveBeenCalledWith(['themes/beam.css']);
    });

    test('тема без themes в пути -> fallback themes/<name>.css', async () => {
      fs.mkdirSync(path.join(tmp, 'themes'), { recursive: true });
      ThemeResolver.scanDirectory.mockReturnValue([
        { name: 'beam', path: path.join(tmp, 'beam.css'), dependencies: [] },
      ]);
      const syncMock = jest.fn();
      VSCodeIntegration.mockImplementation(() => ({ syncThemes: syncMock }));

      const code = await main(['sync'], { projectRoot: tmp });

      expect(code).toBe(0);
      expect(syncMock).toHaveBeenCalledWith(['themes/beam.css']);
    });
  });

  describe('showHelp (direct)', () => {
    test('возвращает 0', () => {
      expect(showHelp()).toBe(0);
    });
  });
});
