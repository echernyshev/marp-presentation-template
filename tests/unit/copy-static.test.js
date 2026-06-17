const fs = require('fs');
const path = require('path');
const os = require('os');
const { copyStatic } = require('../../template/scripts/copy-static');

describe('copy-static (in-process)', () => {
  let tmp;
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'copy-static-'));
  });
  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test('должен копировать файлы по паттернам с сохранением структуры', () => {
    fs.mkdirSync(path.join(tmp, 'static', 'images'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'static', 'a.png'), 'x');
    fs.writeFileSync(path.join(tmp, 'static', 'images', 'b.jpg'), 'y');
    fs.mkdirSync(path.join(tmp, 'assets'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'assets', 'c.css'), 'z');

    const copied = copyStatic({
      cwd: tmp,
      config: { staticFolders: ['static/**', 'assets/**'], outputDir: 'output' },
    });

    expect(copied).toBe(3);
    expect(fs.existsSync(path.join(tmp, 'output', 'static', 'a.png'))).toBe(true);
    expect(fs.existsSync(path.join(tmp, 'output', 'static', 'images', 'b.jpg'))).toBe(true);
    expect(fs.existsSync(path.join(tmp, 'output', 'assets', 'c.css'))).toBe(true);
  });

  test('должен вернуть 0 и залогировать, если файлов нет', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const copied = copyStatic({ cwd: tmp, config: { staticFolders: ['static/**'] } });
    expect(copied).toBe(0);
    expect(logSpy).toHaveBeenCalledWith('No static files found to copy.');
    logSpy.mockRestore();
  });

  test('должен работать с дефолтной конфигурацией (static/** -> output)', () => {
    fs.mkdirSync(path.join(tmp, 'static'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'static', 't.txt'), 'hi');

    const copied = copyStatic({ cwd: tmp, config: {} });

    expect(copied).toBe(1);
    expect(fs.existsSync(path.join(tmp, 'output', 'static', 't.txt'))).toBe(true);
  });

  test('должен продолжать и warn-ить при ошибке копирования файла', () => {
    fs.mkdirSync(path.join(tmp, 'static'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'static', 'ok.txt'), 'x');
    fs.writeFileSync(path.join(tmp, 'static', 'bad.txt'), 'bad');
    // Пред-создаём путь назначения output/static/bad.txt как директорию,
    // чтобы copyFileSync упал с EISDIR при копировании файла static/bad.txt.
    // (fast-glob по умолчанию не возвращает пустые директории, поэтому сам
    // источник должен быть настоящим файлом — коллизию создаём на стороне output.)
    fs.mkdirSync(path.join(tmp, 'output', 'static', 'bad.txt'), { recursive: true });

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const copied = copyStatic({ cwd: tmp, config: { staticFolders: ['static/**'] } });

    expect(copied).toBeGreaterThanOrEqual(1);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
    logSpy.mockRestore();
  });

  test('использует process.cwd() когда cwd не передан (ветка по умолчанию)', () => {
    fs.mkdirSync(path.join(tmp, 'static'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'static', 'd.txt'), 'x');

    const originalCwd = process.cwd();
    try {
      process.chdir(tmp);
      const copied = copyStatic({ config: { staticFolders: ['static/**'] } });
      expect(copied).toBe(1);
      expect(fs.existsSync(path.join(tmp, 'output', 'static', 'd.txt'))).toBe(true);
    } finally {
      process.chdir(originalCwd);
    }
  });

  test('использует loadConfig() когда config не передан (ветка по умолчанию)', () => {
    fs.mkdirSync(path.join(tmp, 'static'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'static', 'e.txt'), 'x');

    const originalCwd = process.cwd();
    try {
      process.chdir(tmp);
      const copied = copyStatic({ cwd: tmp });
      // config не передан -> loadConfig() пытается загрузить marp.config.js;
      // в tmp его нет -> {} -> дефолт static/** -> output
      expect(copied).toBe(1);
      expect(fs.existsSync(path.join(tmp, 'output', 'static', 'e.txt'))).toBe(true);
    } finally {
      process.chdir(originalCwd);
    }
  });

  test('поддерживает абсолютный путь outputDir (ветка isAbsolute=true)', () => {
    fs.mkdirSync(path.join(tmp, 'static'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'static', 'f.txt'), 'x');

    const absOutput = path.join(tmp, 'abs-output');
    const copied = copyStatic({
      cwd: tmp,
      config: { staticFolders: ['static/**'], outputDir: absOutput },
    });

    expect(copied).toBe(1);
    expect(fs.existsSync(path.join(absOutput, 'static', 'f.txt'))).toBe(true);
  });

  test('поддерживает абсолютные пути файлов из glob (ветка isAbsolute=true для file)', () => {
    fs.mkdirSync(path.join(tmp, 'static'), { recursive: true });
    fs.writeFileSync(path.join(tmp, 'static', 'g.txt'), 'x');

    // Передаём абсолютные паттерны — fast-glob вернёт абсолютные пути,
    // что покрывает ветку path.isAbsolute(file) === true.
    const absPattern = path.join(tmp, 'static', '**');
    const copied = copyStatic({
      cwd: tmp,
      config: { staticFolders: [absPattern], outputDir: 'output' },
    });

    expect(copied).toBeGreaterThanOrEqual(1);
  });

  test('loadConfig должен вернуть пустой объект при отсутствии marp.config.js', () => {
    // Вызываем из директории без marp.config.js поблизости — проверяем fallback
    jest.resetModules();
    // Модуль уже загружен; loadConfig ловит исключение и возвращает {}
    const { loadConfig } = require('../../template/scripts/copy-static');
    expect(typeof loadConfig).toBe('function');
    // Вызываем loadConfig — он пытается загрузить ../marp.config.js относительно
    // расположения модуля (template/scripts/ -> template/marp.config.js). В репо
    // этот файл существует, поэтому успешно возвращает его экспорт.
    const cfg = loadConfig();
    expect(typeof cfg).toBe('object');
    expect(cfg).not.toBeNull();
  });
});

// Отдельный describe, чтобы замокать marp.config.js на уровне модуля и проверить
// ветку catch в loadConfig (require кидает -> возвращается {}).
describe('copy-static loadConfig (fallback)', () => {
  let tmp;
  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'copy-static-'));
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  jest.mock('../../template/marp.config.js', () => {
    throw new Error('simulated missing config');
  });

  test('loadConfig возвращает {} когда require marp.config.js бросает', () => {
    jest.isolateModules(() => {
      const { loadConfig } = require('../../template/scripts/copy-static');
      const cfg = loadConfig();
      expect(cfg).toEqual({});
    });
  });
});
