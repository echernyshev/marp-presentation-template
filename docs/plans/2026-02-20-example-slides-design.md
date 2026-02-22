# Design: Опциональные примеры слайдов для Marp-шаблона

**Дата:** 2026-02-20
**Статус:** Approved

## Обзор

Добавить опциональный файл с примерами слайдов, демонстрирующими все возможности Marp. Пользователь выбирает при создании проекта — создавать ли файл с примерами.

## Архитектура

### Структура файлов

```
marp-presentation-template/
├── index.js                    # + интерактивный запрос + условное копирование
├── template/                   # базовый шаблон (копируется всегда)
│   ├── presentation.md
│   ├── marp.config.js
│   ├── package.json
│   ├── static/
│   └── scripts/
├── template-optional/          # опциональные файлы
│   ├── examples.md             # копируется при запросе
│   └── static/                 # демо-изображения для examples
│       └── demo-image.png      # минималистичное демо-изображение
└── package.json                # files: ["index.js", "template/", "template-optional/"]
```

### Принцип

- `template/` — базовый шаблон, копируется всегда
- `template-optional/` — опциональные файлы, копируются только при согласии пользователя
- Масштабируемо: в будущем можно добавить другие опциональные файлы

## CLI изменения (index.js)

### Новый flow

```
валидация имени → запрос примеров → создание папки
                                    → копирование template/
                                    → (если да) копирование template-optional/
                                    → npm install
```

### Реализация запроса

```javascript
const readline = require('readline');

async function askCreateExamples() {
  // Неинтерактивный режим — по умолчанию создаём примеры
  if (!process.stdin.isTTY) {
    return true;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('Create example slides file? (Y/n) ', (answer) => {
      rl.close();
      const normalized = answer.toLowerCase().trim();
      resolve(normalized !== 'n' && normalized !== 'no');
    });
  });
}
```

### Копирование опциональных файлов

```javascript
if (createExamples) {
  // Копируем examples.md
  fs.copyFileSync(
    path.join(__dirname, 'template-optional', 'examples.md'),
    path.join(projectPath, 'examples.md')
  );

  // Копируем демо-изображение в static/
  const demoImageSrc = path.join(__dirname, 'template-optional', 'static', 'demo-image.png');
  const demoImageDest = path.join(projectPath, 'static', 'demo-image.png');
  fs.copyFileSync(demoImageSrc, demoImageDest);
}
```

### Вывод в консоль

```
Creating Marp presentation: my-project

Create example slides file? (Y/n) y

✓ Project created
✓ Example slides added
✓ Demo image added to static/

Installing dependencies...
✓ Dependencies installed

Next steps:
  cd my-slides
  npm run dev        # preview presentation.md
  marp examples.md   # preview examples.md
```

## Структура examples.md

**13 слайдов-примеров:**

| # | Слайд | Демонстрирует |
|---|-------|---------------|
| 1 | Титульный | Титульный слайд, theme, paginate |
| 2 | Оглавление | Автоматическое оглавление Marp |
| 3 | Базовое форматирование | Заголовки, **жирный**, *курсив*, ~~зачёркнутый~~, `inline code` |
| 4 | Списки | Маркированные, нумерованные, вложенные |
| 5 | Цитаты и сноски | > Блок-цитаты, [^1] сноски |
| 6 | Код | Блоки кода с подсветкой (JS, Python, Bash) |
| 7 | Таблицы | Простая и сложная таблица |
| 8 | Формулы LaTeX | Inline `$...$`, блоки `$$...$$`, уравнения |
| 9 | Изображения | Вставка, размеры, позиционирование |
| 10 | Многоколоночный layout | `<div class="columns">` или HTML-таблицы |
| 11 | Фоны и стилизация | `<!-- _backgroundColor: -->`, gradient, background-image |
| 12 | Фрагменты (анимация) | `* item` — пошаговое появление |
| 13 | Контакты / Q&A | Финальный слайд |

## Демо-изображение

- Минималистичная графика (геометрические фигуры, абстрактный паттерн)
- Размер: ~800x400px, оптимизированный PNG
- Назначение: демонстрация вставки изображений в слайдах

## Обработка ошибок

### Неинтерактивный режим (CI/CD, скрипты)

- Если `process.stdin.isTTY === false` — создаём примеры по умолчанию
- Это позволяет использовать CLI в пайплайнах без зависания

### Пользовательский ввод

- `y`, `Y`, `yes`, `YES`, пустой ввод (Enter) → создаём примеры
- `n`, `N`, `no`, `NO` → пропускаем примеры
- Любой другой ввод → создаём примеры (безопасное значение по умолчанию)

### Обработка отсутствия файла

- Если `template-optional/examples.md` не найден — предупреждение, но продолжаем без краха
- Логируем ошибку, но не прерываем создание проекта

## Итоговая структура проекта пользователя

```
my-slides/
├── presentation.md      # рабочий шаблон
├── examples.md          # справочник возможностей Marp
├── static/
│   ├── .gitkeep
│   └── demo-image.png   # для демонстрации изображений
├── marp.config.js
├── package.json
└── scripts/
```

## Файлы для изменения

1. **Создать:**
   - `template-optional/examples.md` — примеры слайдов
   - `template-optional/static/demo-image.png` — демо-изображение

2. **Изменить:**
   - `index.js` — добавить интерактивный запрос и условное копирование
   - `package.json` — обновить поле `files`

3. **Не изменять:**
   - `template/` — остаётся без изменений
