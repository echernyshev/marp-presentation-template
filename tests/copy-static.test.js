const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

describe('copy-static script', () => {
  const testDir = path.join(__dirname, 'fixtures', 'copy-static');
  const outputDir = path.join(testDir, 'output');
  const projectRoot = path.resolve(__dirname, '..');

  beforeEach(() => {
    // Создаём тестовую структуру
    fs.mkdirSync(testDir, { recursive: true });
    fs.mkdirSync(path.join(testDir, 'static', 'images'), { recursive: true });
    fs.mkdirSync(path.join(testDir, 'assets'), { recursive: true });

    // Создаём тестовые файлы
    fs.writeFileSync(path.join(testDir, 'static', 'image.png'), 'fake png');
    fs.writeFileSync(path.join(testDir, 'static', 'images', 'photo.jpg'), 'fake jpg');
    fs.writeFileSync(path.join(testDir, 'assets', 'style.css'), 'body {}');

    // Создаём marp.config.js
    fs.writeFileSync(
      path.join(testDir, 'marp.config.js'),
      `module.exports = {
  staticFolders: ['static/**', 'assets/**'],
  outputDir: 'output',
};`
    );
  });

  afterEach(() => {
    // Очистка
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('должен копировать файлы по паттернам', () => {
    // Копируем скрипт в тестовую директорию
    fs.mkdirSync(path.join(testDir, 'scripts'), { recursive: true });
    fs.copyFileSync(
      path.join(__dirname, '..', 'template', 'scripts', 'copy-static.js'),
      path.join(testDir, 'scripts', 'copy-static.js')
    );

    // Запускаем скрипт с доступом к node_modules родительского проекта
    const nodeModulesPath = path.join(projectRoot, 'node_modules');
    execSync('node scripts/copy-static.js', {
      cwd: testDir,
      env: { ...process.env, NODE_PATH: nodeModulesPath }
    });

    // Проверяем результат
    expect(fs.existsSync(outputDir)).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'static', 'image.png'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'static', 'images', 'photo.jpg'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'assets', 'style.css'))).toBe(true);
  });

  test('должен работать с дефолтной конфигурацией без marp.config.js', () => {
    // Удаляем marp.config.js для проверки дефолтных значений
    fs.unlinkSync(path.join(testDir, 'marp.config.js'));

    // Создаём static папку (дефолт)
    fs.mkdirSync(path.join(testDir, 'static'), { recursive: true });
    fs.writeFileSync(path.join(testDir, 'static', 'test.txt'), 'content');

    // Копируем скрипт
    fs.mkdirSync(path.join(testDir, 'scripts'), { recursive: true });
    fs.copyFileSync(
      path.join(__dirname, '..', 'template', 'scripts', 'copy-static.js'),
      path.join(testDir, 'scripts', 'copy-static.js')
    );

    // Запускаем с доступом к node_modules родительского проекта
    const nodeModulesPath = path.join(projectRoot, 'node_modules');
    execSync('node scripts/copy-static.js', {
      cwd: testDir,
      env: { ...process.env, NODE_PATH: nodeModulesPath }
    });

    // Проверяем
    expect(fs.existsSync(path.join(outputDir, 'static', 'test.txt'))).toBe(true);
  });
});
