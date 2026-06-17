// Моки тяжёлых/побочных зависимостей, чтобы протестировать логику createProject в процессе
jest.mock('../../lib/add-themes-command', () => ({
  AddThemesCommand: jest.fn()
}));
jest.mock('../../lib/prompts', () => ({
  Prompts: {
    promptActiveTheme: jest.fn(),
  }
}));
jest.mock('../../lib/theme-manager', () => {
  // ThemeManager используется и как класс (new), и как статика (ensureThemeSetConfig) — мокаем оба
  const M = jest.fn();
  M.ensureThemeSetConfig = jest.fn(() => true);
  return { ThemeManager: M };
});
jest.mock('child_process', () => ({
  spawnSync: jest.fn()
}));
jest.mock('../../cli/utils/file-utils', () => ({
  copyDir: jest.fn(),
  validateOutputPath: jest.fn(),
}));

const fs = require('fs');
const path = require('path');
const os = require('os');

const { createProject } = require('../../cli/commands/create-project');
const { AddThemesCommand } = require('../../lib/add-themes-command');
const { Prompts } = require('../../lib/prompts');
const { ThemeManager } = require('../../lib/theme-manager');
const { spawnSync } = require('child_process');
const { copyDir } = require('../../cli/utils/file-utils');
const {
  snapshotStdinIsTTY,
  setStdinIsTTY,
  restoreStdinIsTTY
} = require('../helpers/stdin-tty');

describe('createProject (in-process branch coverage)', () => {
  let tmp;
  let ttySnapshot;
  let logSpy;
  let warnSpy;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'create-project-'));
    ttySnapshot = snapshotStdinIsTTY();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.clearAllMocks();
    // npm install по умолчанию успешен
    spawnSync.mockReturnValue({ status: 0 });
  });

  afterEach(() => {
    restoreStdinIsTTY(ttySnapshot);
    logSpy.mockRestore();
    warnSpy.mockRestore();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test('интерактивный режим: темы выбраны -> копируются примеры и ставится активная тема', async () => {
    setStdinIsTTY(true);

    const cmdInstance = {
      execute: jest.fn().mockResolvedValue({ copied: [{ name: 'beam' }] }),
      _promptExamples: jest.fn().mockResolvedValue(['beam-example.md']),
      _copyExamples: jest.fn(),
    };
    AddThemesCommand.mockImplementation(() => cmdInstance);

    Prompts.promptActiveTheme.mockResolvedValue('beam');

    const tmInstance = { setActiveTheme: jest.fn() };
    ThemeManager.mockImplementation(() => tmInstance);

    await createProject('valid-name', {
      outputPath: tmp,
      templatePath: path.join(tmp, 'template'),
      themesLibraryPath: path.join(tmp, 'themes'),
    });

    expect(cmdInstance.execute).toHaveBeenCalled();
    expect(cmdInstance._promptExamples).toHaveBeenCalledWith([{ name: 'beam' }]);
    expect(cmdInstance._copyExamples).toHaveBeenCalled();
    expect(Prompts.promptActiveTheme).toHaveBeenCalledWith(['beam']);
    expect(tmInstance.setActiveTheme).toHaveBeenCalledWith('beam');
  });

  test('интерактивный режим: темы выбраны, но setActiveTheme падает -> warn', async () => {
    setStdinIsTTY(true);
    const cmdInstance = {
      execute: jest.fn().mockResolvedValue({ copied: [{ name: 'beam' }] }),
      _promptExamples: jest.fn().mockResolvedValue([]),
      _copyExamples: jest.fn(),
    };
    AddThemesCommand.mockImplementation(() => cmdInstance);
    Prompts.promptActiveTheme.mockResolvedValue('beam');
    ThemeManager.mockImplementation(() => ({
      setActiveTheme: jest.fn(() => { throw new Error('nope'); }),
    }));

    await createProject('valid-name', {
      outputPath: tmp,
      templatePath: path.join(tmp, 'template'),
      themesLibraryPath: path.join(tmp, 'themes'),
    });

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Could not set active theme'));
  });

  test('неинтерактивный режим (нет TTY): темы не запрашиваются, ставится default', async () => {
    setStdinIsTTY(false);
    const tmInstance = { setActiveTheme: jest.fn() };
    ThemeManager.mockImplementation(() => tmInstance);

    await createProject('valid-name', {
      outputPath: tmp,
      templatePath: path.join(tmp, 'template'),
      themesLibraryPath: path.join(tmp, 'themes'),
    });

    expect(AddThemesCommand).not.toHaveBeenCalled();
    expect(tmInstance.setActiveTheme).toHaveBeenCalledWith('default');
  });

  test('неинтерактивный режим: setActiveTheme(default) падает -> warn', async () => {
    setStdinIsTTY(false);
    ThemeManager.mockImplementation(() => ({
      setActiveTheme: jest.fn(() => { throw new Error('presentation missing'); }),
    }));

    await createProject('valid-name', {
      outputPath: tmp,
      templatePath: path.join(tmp, 'template'),
      themesLibraryPath: path.join(tmp, 'themes'),
    });

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Could not set active theme'));
  });

  test('npm install failed -> бросает "npm install failed"', async () => {
    setStdinIsTTY(false);
    spawnSync.mockReturnValue({ status: 1 });
    ThemeManager.mockImplementation(() => ({ setActiveTheme: jest.fn() }));

    await expect(
      createProject('valid-name', {
        outputPath: tmp,
        templatePath: path.join(tmp, 'template'),
        themesLibraryPath: path.join(tmp, 'themes'),
      })
    ).rejects.toThrow('npm install failed');
  });

  test('invalid project name -> бросает "Invalid project name"', async () => {
    setStdinIsTTY(false);
    await expect(
      createProject('Invalid_Name', { outputPath: tmp })
    ).rejects.toThrow('Invalid project name');
    expect(copyDir).not.toHaveBeenCalled();
  });
});
