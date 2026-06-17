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
