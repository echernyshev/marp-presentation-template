jest.mock('../../cli/commands/create-project', () => ({
  createProject: jest.fn(),
  validateProjectName: jest.fn(),
  parsePathArg: jest.fn(),
}));
jest.mock('../../cli/commands/add-themes-cli', () => ({
  addThemesToExistingProject: jest.fn(),
}));

const { main, showUsage, handleThemeAdd, handleProjectCreation } = require('../../index');
const { createProject, parsePathArg } = require('../../cli/commands/create-project');
const { addThemesToExistingProject } = require('../../cli/commands/add-themes-cli');
const { validateOutputPath } = require('../../cli/utils/file-utils');

describe('CLI entry point (index.js, in-process)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('showUsage', () => {
    test('должен вернуть 0 и писать в stdout при isError=false', () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const code = showUsage(false);
      expect(code).toBe(0);
      expect(logSpy).toHaveBeenCalledWith('Please provide a project name:');
      logSpy.mockRestore();
    });

    test('должен вернуть 1 и писать в stderr при isError=true', () => {
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const code = showUsage(true);
      expect(code).toBe(1);
      expect(errSpy).toHaveBeenCalledWith('Please provide a project name:');
      errSpy.mockRestore();
    });
  });

  describe('main dispatch', () => {
    test('без аргументов -> showUsage(true) -> код 1', async () => {
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const code = await main([]);
      expect(code).toBe(1);
      expect(errSpy).toHaveBeenCalledWith('Please provide a project name:');
      errSpy.mockRestore();
    });

    test('theme:add без пути -> код 1 и Usage в stderr', async () => {
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const code = await main(['theme:add']);
      expect(code).toBe(1);
      expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('Usage:'));
      errSpy.mockRestore();
    });

    test('help-подобный command попадает в default (создание проекта)', async () => {
      parsePathArg.mockReturnValue({ outputPath: null, pathIndex: null });
      createProject.mockResolvedValue(undefined);
      const code = await main(['my-project']);
      expect(code).toBe(0);
      expect(createProject).toHaveBeenCalled();
    });
  });

  describe('handleThemeAdd', () => {
    test('успех -> код 0', async () => {
      addThemesToExistingProject.mockResolvedValue(undefined);
      const code = await handleThemeAdd(['/tmp/some-proj', 'beam']);
      expect(code).toBe(0);
      expect(addThemesToExistingProject).toHaveBeenCalledWith(
        '/tmp/some-proj',
        expect.objectContaining({ themeNames: ['beam'] })
      );
    });

    test('успех без явных тем -> themeNames: null', async () => {
      addThemesToExistingProject.mockResolvedValue(undefined);
      const code = await handleThemeAdd(['/tmp/some-proj']);
      expect(code).toBe(0);
      expect(addThemesToExistingProject).toHaveBeenCalledWith(
        '/tmp/some-proj',
        expect.objectContaining({ themeNames: null })
      );
    });

    test('ошибка -> код 1 и Error: в stderr', async () => {
      addThemesToExistingProject.mockRejectedValue(new Error('boom'));
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const code = await handleThemeAdd(['/tmp/some-proj', 'beam']);
      expect(code).toBe(1);
      expect(errSpy).toHaveBeenCalledWith('Error: boom');
      errSpy.mockRestore();
    });
  });

  describe('handleProjectCreation', () => {
    test('невалидный --path -> код 1 без вызова createProject', async () => {
      // pathIndex=0 указывает на флаг --path; значение пути находится в args[1].
      // args[1]='/etc' — системный каталог, который валидатор отвергнет.
      parsePathArg.mockReturnValue({ outputPath: null, pathIndex: 0 });
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const code = await handleProjectCreation('valid-name', ['--path', '/etc']);
      expect(code).toBe(1);
      expect(createProject).not.toHaveBeenCalled();
      errSpy.mockRestore();
    });

    test('createProject бросает "Invalid project name" -> код 1', async () => {
      parsePathArg.mockReturnValue({ outputPath: null, pathIndex: null });
      createProject.mockRejectedValue(new Error('Invalid project name'));
      const code = await handleProjectCreation('Bad_Name');
      expect(code).toBe(1);
    });

    test('createProject бросает "Project directory already exists" -> код 1', async () => {
      parsePathArg.mockReturnValue({ outputPath: null, pathIndex: null });
      createProject.mockRejectedValue(new Error('Project directory already exists'));
      const code = await handleProjectCreation('exists');
      expect(code).toBe(1);
    });

    test('createProject бросает прочую ошибку -> код 1 и "Error creating project"', async () => {
      parsePathArg.mockReturnValue({ outputPath: null, pathIndex: null });
      createProject.mockRejectedValue(new Error('disk full'));
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const code = await handleProjectCreation('valid-name');
      expect(code).toBe(1);
      expect(errSpy).toHaveBeenCalledWith('Error creating project:', 'disk full');
      errSpy.mockRestore();
    });

    test('валидный --path -> createProject вызван с resolvedPath', async () => {
      parsePathArg.mockReturnValue({ outputPath: null, pathIndex: 0 });
      createProject.mockResolvedValue(undefined);
      // pathIndex=0 указывает на флаг --path; значение пути находится в args[1].
      // '/tmp' проходит валидацию (не системный каталог), resolvedPath остаётся '/tmp'.
      const code = await handleProjectCreation('valid-name', ['--path', '/tmp']);
      expect(code).toBe(0);
      expect(createProject).toHaveBeenCalledWith(
        'valid-name',
        expect.objectContaining({ outputPath: expect.stringContaining('tmp') })
      );
    });
  });
});
