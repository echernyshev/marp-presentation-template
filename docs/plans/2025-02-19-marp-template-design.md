# Marp Presentation Template - Design Document

**Дата:** 2025-02-19
**Статус:** Draft

## Обзор

npm-пакет `create-marp-presentation` для создания готовых шаблонов Marp-презентаций. Установка через npx одной командой, поддержка статических файлов, генерация в HTML/PDF/PPTX.

## Архитектура и структура

### Структура инициализируемого проекта

```
my-presentation/
├── presentation.md      # Главный файл презентации
├── marp.config.js       # Конфигурация (статические папки, output директория)
├── package.json         # Зависимости и npm-скрипты
├── .gitignore           # Исключает output/ и node_modules/
├── README.md            # Инструкции по использованию
├── output/              # Сгенерированные файлы (создаётся при сборке)
├── static/              # Статические файлы по умолчанию
└── scripts/
    └── copy-static.js   # Скрипт копирования статики
```

### Структура npm-пакета

```
create-marp-presentation/
├── package.json           # Meta-package с bin полем
├── index.js               # Точка входа для CLI
├── template/              # Шаблон проекта
│   ├── package.json       # Шаблон package.json
│   ├── marp.config.js     # Шаблон конфига
│   ├── presentation.md    # Пример презентации
│   ├── .gitignore         # Шаблон gitignore
│   ├── README.md          # Шаблон README
│   ├── static/            # Пустая папка с .gitkeep
│   └── scripts/
│       └── copy-static.js # Скрипт копирования статики
```

## Конфигурация

### marp.config.js

```javascript
module.exports = {
  staticFolders: ['static/**', 'assets/**'],  // glob-паттерны для копирования
  outputDir: 'output',                         // папка для генерации
}
```

- `staticFolders` - массив glob-паттернов для поиска статических файлов
- `outputDir` - папка для генерации (по умолчанию `output`)

## Команды и скрипты

### package.json скрипты

```json
{
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

| Команда | Описание |
|---------|----------|
| `npm run dev` | Live-предпросмотр с hot-reload |
| `npm run build:html` | Генерация HTML с встроенным viewer |
| `npm run build:pdf` | Генерация PDF |
| `npm run build:pptx` | Генерация PowerPoint |
| `npm run build:all` | Все форматы подряд |
| `npm run clean` | Очистка output/ |

## Скрипт копирования статики

### scripts/copy-static.js

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

// Копируем с сохранением структуры
for (const file of files) {
  const relativePath = path.relative(process.cwd(), file);
  const destPath = path.join(outputDir, relativePath);

  const destDir = path.dirname(destPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  fs.copyFileSync(file, destPath);
}

console.log(`✓ Copied ${files.length} files to ${outputDir}/`);
```

## Обработка ошибок

### Что обрабатываем

1. **Отсутствие `marp.config.js`** - использовать дефолтные значения
2. **Несуществующие папки в staticFolders** - пропускать молча
3. **Пустая staticFolders** - не копировать ничего, не падать
4. **Конфликт имён файлов** - перезаписывать с предупреждением
5. **Ошибки копирования** - логировать и продолжать

### Валидация в CLI

- Проверять, что папка для проекта не существует
- Валидировать имя проекта (нет спецсимволов)
- Проверять успешность `npm install`

## Использование

### Инициализация

```bash
npx create-marp-presentation my-presentation
```

### Редактирование

Откройте `presentation.md` и пишите слайды в Markdown.

### Live-предпросмотр

```bash
npm run dev
```

### Сборка

```bash
npm run build:html    # HTML
npm run build:pdf     # PDF
npm run build:pptx    # PowerPoint
npm run build:all     # Все форматы
```

### Очистка

```bash
npm run clean
```

## Зависимости

| Пакет | Версия | Описание |
|-------|--------|----------|
| `@marp-team/marp-cli` | ^4.1.2 | CLI для Marp (требует Node.js 18+) |
| `fast-glob` | ^3.3.3 | Быстрый glob для поиска файлов |
| `rimraf` | ^6.0.0 | Кроссплатформенное удаление папок (требует Node.js 20+) |

### Требования к Node.js

**Node.js >= 20.0.0** - обусловлено версией rimraf v6

### Источники

- [@marp-team/marp-cli на npm](https://www.npmjs.com/package/@marp-team/marp-cli)
- [fast-glob на npm](https://www.npmjs.com/package/fast-glob)

## Тестирование

- Юнит-тесты для copy-static.js
- Интеграционные тесты для CLI инициализатора
- Тесты обработки ошибок
