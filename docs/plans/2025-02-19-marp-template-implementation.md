# Create Marp Presentation Template - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Создать npm-пакет `create-marp-presentation`, который инициализирует готовый шаблон проекта для Marp-презентаций с поддержкой статических файлов и генерацией в HTML/PDF/PPTX.

**Architecture:** Мета-пакет с CLI-скриптом (`index.js`) который копирует шаблон из `template/` в новую папку. Шаблон содержит Marp-конфигурацию, скрипт копирования статики через `fast-glob`, и npm-скрипты для сборки через `@marp-team/marp-cli`.

**Tech Stack:** Node.js, npm, @marp-team/marp-cli v4.1.2, fast-glob v3.3.3, rimraf v6.0.0

---

## Task 1: Создание структуры проекта и базовых файлов

**Files:**
- Create: `template/package.json`
- Create: `template/marp.config.js`
- Create: `template/presentation.md`
- Create: `template/.gitignore`
- Create: `template/README.md`
- Create: `template/static/.gitkeep`

**Step 1: Создать template/package.json**

Создайте файл `template/package.json` с зависимостями и скриптами:

```json
{
  "name": "marp-presentation",
  "version": "1.0.0",
  "description": "Marp presentation",
  "scripts": {
    "dev": "marp -s . --html",
    "build:html": "marp presentation.md -o output/index.html --html && npm run copy:static",
    "build:pdf": "marp presentation.md -o output/presentation.pdf --allow-local-files && npm run copy:static",
    "build:pptx": "marp presentation.md -o output/presentation.pptx --allow-local-files && npm run copy:static",
    "build:all": "npm run build:html && npm run build:pdf && npm run build:pptx",
    "copy:static": "node scripts/copy-static.js",
    "clean": "rimraf output"
  },
  "devDependencies": {
    "@marp-team/marp-cli": "^4.1.2",
    "fast-glob": "^3.3.3",
    "rimraf": "^6.0.0"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

**Step 2: Создать template/marp.config.js**

```javascript
module.exports = {
  staticFolders: ['static/**', 'assets/**'],
  outputDir: 'output',
};
```

**Step 3: Создать template/presentation.md**

```markdown
---
marp: true
theme: default
paginate: true
---

# Моя презентация

Добро пожаловать в вашу новую Marp презентацию!

---

## О Marp

Marp (Markdown Presentation Ecosystem) — это инструмент для создания презентаций на Markdown.

---

## Возможности

- **Простой Markdown** - пишите слайды в привычном формате
- **Темы** - используйте встроенные или создайте свою
- **Экспорт** - HTML, PDF, PowerPoint
- **Live preview** - мгновенный предпросмотр изменений

---

## Код с подсветкой

\`\`\`javascript
function hello() {
  console.log('Hello, Marp!');
}
\`\`\`

---

## Изображения

Поместите изображения в папку `static/` и используйте их:

\`\`\`
![alt text](static/image.png)
\`\`\`

---

# Вопросы?

Документация: https://marp.app/
```

**Step 4: Создать template/.gitignore**

```
node_modules/
output/
.DS_Store
```

**Step 5: Создать template/README.md**

```markdown
# Marp Presentation

Шаблон для создания презентаций с Marp.

## Начало работы

### Live-предпросмотр

\`\`\`bash
npm run dev
\`\`\`

Откроется браузер с автообновлением при изменениях.

### Создание слайдов

Редактируйте `presentation.md` — это главный файл презентации.

## Сборка презентации

\`\`\`bash
npm run build:html    # HTML презентация (интерактивная)
npm run build:pdf     # PDF файл
npm run build:pptx    # PowerPoint
npm run build:all     # Все форматы сразу
\`\`\`

Результат появится в папке `output/`.

## Статические файлы

Поместите изображения и другие файлы в папку, указанную в `marp.config.js`.

По умолчанию: `static/`

Вы можете добавить дополнительные папки в `marp.config.js`:

\`\`\`javascript
module.exports = {
  staticFolders: ['static/**', 'assets/**', 'images/**'],
  outputDir: 'output',
};
\`\`\`

## Очистка

\`\`\`bash
npm run clean
\`\`\`

Удаляет папку `output/`.

## Полезные ссылки

- [Marp Documentation](https://marp.app/)
- [Marp CLI](https://github.com/marp-team/marp-cli)
- [Markdown Guide](https://www.markdownguide.org/)
```

**Step 6: Создать template/static/.gitkeep**

Создайте пустой файл для коммита папки `static/` в git.

**Step 7: Закоммитить структуру шаблона**

```bash
git add template/
git commit -m "feat: add template structure with package.json, config, and example presentation"
```

---

## Task 2: Скрипт копирования статических файлов

**Files:**
- Create: `template/scripts/copy-static.js`

**Step 1: Создать template/scripts/copy-static.js**

```javascript
const fs = require('fs');
const path = require('path');
const { globSync } = require('fast-glob');

// Читаем конфиг с дефолтными значениями
let config;
try {
  config = require('../marp.config.js');
} catch {
  config = {};
}

const outputDir = config.outputDir || 'output';
const staticFolders = config.staticFolders || ['static/**'];

// Создаём output если нет
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Находим файлы по паттернам
const files = globSync(staticFolders);

if (files.length === 0) {
  console.log('No static files found to copy.');
  process.exit(0);
}

// Копируем с сохранением структуры
let copied = 0;
for (const file of files) {
  const relativePath = path.relative(process.cwd(), file);
  const destPath = path.join(outputDir, relativePath);

  const destDir = path.dirname(destPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  try {
    fs.copyFileSync(file, destPath);
    copied++;
  } catch (err) {
    console.warn(`Warning: Could not copy ${file}: ${err.message}`);
  }
}

console.log(`✓ Copied ${copied} file(s) to ${outputDir}/`);
```

**Step 2: Закоммитить скрипт копирования**

```bash
git add template/scripts/copy-static.js
git commit -m "feat: add copy-static script for handling static files"
```

---

## Task 3: CLI инициализатор (index.js)

**Files:**
- Create: `index.js`
- Create: `package.json` (мета-пакета)

**Step 1: Создать index.js**

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectName = process.argv[2];

if (!projectName) {
  console.error('Please provide a project name:');
  console.error('  npx create-marp-presentation <project-name>');
  process.exit(1);
}

// Валидация имени проекта
const validName = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
if (!validName.test(projectName)) {
  console.error(`Invalid project name: "${projectName}"`);
  console.error('Project name must be lowercase, contain only letters, numbers, and hyphens.');
  process.exit(1);
}

const projectPath = path.resolve(projectName);

// Проверка существования папки
if (fs.existsSync(projectPath)) {
  console.error(`Directory "${projectName}" already exists.`);
  process.exit(1);
}

// Получаем путь к template
const templatePath = path.join(__dirname, 'template');

console.log(`Creating Marp presentation: ${projectName}`);
console.log();

try {
  // Создаём папку проекта
  fs.mkdirSync(projectPath, { recursive: true });

  // Рекурсивно копируем template
  const copyDir = (src, dest) => {
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        fs.mkdirSync(destPath, { recursive: true });
        copyDir(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  };

  copyDir(templatePath, projectPath);

  console.log('✓ Project created');
  console.log();

  // Запускаем npm install
  console.log('Installing dependencies...');
  const installResult = spawnSync('npm', ['install'], {
    cwd: projectPath,
    stdio: 'inherit',
    shell: true,
  });

  if (installResult.status !== 0) {
    console.error();
    console.error('Failed to install dependencies.');
    console.error('Please run "cd ' + projectName + ' && npm install" manually.');
    process.exit(1);
  }

  console.log();
  console.log('✓ Dependencies installed');
  console.log();
  console.log('Next steps:');
  console.log(`  cd ${projectName}`);
  console.log('  npm run dev     # Start live preview');
  console.log('  npm run build:all  # Build all formats');
  console.log();

} catch (err) {
  console.error('Error creating project:', err.message);
  process.exit(1);
}
```

**Step 2: Создать package.json мета-пакета**

```json
{
  "name": "create-marp-presentation",
  "version": "1.0.0",
  "description": "Create a new Marp presentation project with one command",
  "bin": "./index.js",
  "files": [
    "index.js",
    "template/"
  ],
  "keywords": [
    "marp",
    "presentation",
    "markdown",
    "slides",
    "template",
    "cli"
  ],
  "author": "",
  "license": "MIT",
  "engines": {
    "node": ">=20.0.0"
  }
}
```

**Step 3: Добавить shebang и сделать index.js исполняемым**

```bash
chmod +x index.js
```

**Step 4: Закоммитить CLI**

```bash
git add index.js package.json
git commit -m "feat: add CLI initializer with project scaffolding"
```

---

## Task 4: Тестирование CLI инициализатора

**Files:**
- Create: `tests/cli.test.js`

**Step 1: Установить зависимости для тестирования**

```bash
npm install --save-dev jest@^29.7.0
```

**Step 2: Создать tests/cli.test.js**

```javascript
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

describe('CLI Initializer', () => {
  const testProjects = [];

  afterEach(() => {
    // Очистка тестовых проектов
    for (const project of testProjects) {
      if (fs.existsSync(project)) {
        fs.rmSync(project, { recursive: true, force: true });
      }
    }
  });

  test('должен создать структуру проекта', () => {
    const projectName = 'test-presentation';
    testProjects.push(projectName);

    const result = spawnSync('node', ['index.js', projectName], {
      cwd: __dirname + '/..',
    });

    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(projectName, 'package.json'))).toBe(true);
    expect(fs.existsSync(path.join(projectName, 'marp.config.js'))).toBe(true);
    expect(fs.existsSync(path.join(projectName, 'presentation.md'))).toBe(true);
    expect(fs.existsSync(path.join(projectName, '.gitignore'))).toBe(true);
    expect(fs.existsSync(path.join(projectName, 'README.md'))).toBe(true);
    expect(fs.existsSync(path.join(projectName, 'static'))).toBe(true);
    expect(fs.existsSync(path.join(projectName, 'scripts', 'copy-static.js'))).toBe(true);
  });

  test('должен отклонить невалидное имя проекта', () => {
    const result = spawnSync('node', ['index.js', 'Invalid_Name'], {
      cwd: __dirname + '/..',
    });

    expect(result.status).toBe(1);
    expect(result.stderr.toString()).toContain('Invalid project name');
  });

  test('должен отклонить существующую папку', () => {
    const projectName = 'existing-project';
    testProjects.push(projectName);
    fs.mkdirSync(projectName);

    const result = spawnSync('node', ['index.js', projectName], {
      cwd: __dirname + '/..',
    });

    expect(result.status).toBe(1);
    expect(result.stderr.toString()).toContain('already exists');
  });

  test('должен требовать имя проекта', () => {
    const result = spawnSync('node', ['index.js'], {
      cwd: __dirname + '/..',
    });

    expect(result.status).toBe(1);
    expect(result.stderr.toString()).toContain('Please provide a project name');
  });
});
```

**Step 3: Добавить jest секцию в package.json**

```json
{
  "scripts": {
    "test": "jest"
  },
  "jest": {
    "testEnvironment": "node",
    "testMatch": ["**/tests/**/*.test.js"]
  }
}
```

**Step 4: Запустить тесты**

```bash
npm test
```

Ожидается: PASS

**Step 5: Закоммитить тесты**

```bash
git add tests/ package.json
git commit -m "test: add CLI initializer tests"
```

---

## Task 5: Тестирование скрипта копирования статики

**Files:**
- Create: `tests/copy-static.test.js`

**Step 1: Создать tests/copy-static.test.js**

```javascript
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

describe('copy-static script', () => {
  const testDir = path.join(__dirname, 'fixtures', 'copy-static');
  const outputDir = path.join(testDir, 'output');

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

    // Запускаем скрипт
    execSync('node scripts/copy-static.js', { cwd: testDir });

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

    // Запускаем
    execSync('node scripts/copy-static.js', { cwd: testDir });

    // Проверяем
    expect(fs.existsSync(path.join(outputDir, 'static', 'test.txt'))).toBe(true);
  });
});
```

**Step 2: Запустить тесты**

```bash
npm test
```

Ожидается: PASS

**Step 3: Закоммитить тесты копирования статики**

```bash
git add tests/copy-static.test.js
git commit -m "test: add copy-static script tests"
```

---

## Task 6: Интеграционное тестирование

**Step 1: Создать тестовый проект через CLI**

```bash
node index.js test-integration
cd test-integration
```

**Step 2: Проверить npm run dev**

Запустить:
```bash
npm run dev
```

Проверить: открывается браузер с live preview

Остановить: Ctrl+C

**Step 3: Создать статический файл для теста**

```bash
echo "test content" > static/test.txt
```

**Step 4: Проверить сборку HTML**

```bash
npm run build:html
```

Проверить:
- `output/index.html` существует
- `output/static/test.txt` скопирован

**Step 5: Проверить сборку всех форматов**

```bash
npm run build:all
```

Проверить:
- `output/index.html` существует
- `output/presentation.pdf` существует
- `output/presentation.pptx` существует
- Статика скопирована

**Step 6: Проверить очистку**

```bash
npm run clean
```

Проверить: `output/` удалена

**Step 7: Удалить тестовый проект**

```bash
cd ..
rm -rf test-integration
```

**Step 8: Закоммитить если были исправления**

```bash
git add -A
git commit -m "fix: fixes from integration testing"
```

---

## Task 7: Подготовка к публикации

**Step 1: Создать README.md для мета-пакета**

```markdown
# Create Marp Presentation

Создайте новую Marp презентацию одной командой.

## Установка

\`\`\`bash
npx create-marp-presentation my-presentation
\`\`\`

## Использование

\`\`\`bash
cd my-presentation
npm run dev     # Live preview
npm run build:all  # Build all formats
\`\`\`

## Возможности

- 🚀 One-command setup
- 📝 Markdown slides
- 🎨 Marp themes
- 📦 HTML, PDF, PPTX export
- 📁 Static files support
- 🔥 Live preview

## Документация

После создания проекта читайте README в папке проекта.

## Лицензия

MIT
```

**Step 2: Создать LICENSE**

```bash
# MIT License

Copyright (c) 2025

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

**Step 3: Обновить package.json с полями для публикации**

```json
{
  "name": "create-marp-presentation",
  "version": "1.0.0",
  "description": "Create a new Marp presentation project with one command",
  "bin": "./index.js",
  "files": [
    "index.js",
    "template/"
  ],
  "keywords": [
    "marp",
    "presentation",
    "markdown",
    "slides",
    "template",
    "cli"
  ],
  "author": "",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/YOUR_USERNAME/create-marp-presentation.git"
  },
  "homepage": "https://github.com/YOUR_USERNAME/create-marp-presentation#readme",
  "bugs": {
    "url": "https://github.com/YOUR_USERNAME/create-marp-presentation/issues"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

**Step 4: Закоммитить финальные файлы**

```bash
git add README.md LICENSE package.json
git commit -m "docs: add README and LICENSE for npm publication"
```

---

## Task 8: Публикация в npm

**Step 1: Проверить версию**

```bash
npm version patch
```

**Step 2: Запустить все тесты**

```bash
npm test
```

**Step 3: Опционально: dry-run публикации**

```bash
npm publish --dry-run
```

**Step 4: Опубликовать в npm**

```bash
npm publish
```

**Step 5: Проверить установку**

```bash
npx create-marp-presentation test-install
```

**Step 6: Закоммитить версию**

```bash
git add package.json package-lock.json
git commit -m "chore: bump version to 1.0.0"
git tag v1.0.0
git push && git push --tags
```
