# Marp Presentation

Шаблон для создания презентаций с Marp.

## Начало работы

### Live-предпросмотр

```bash
npm run dev
```

Откроется браузер с автообновлением при изменениях.

### Создание слайдов

Редактируйте `presentation.md` — это главный файл презентации.

## Сборка презентации

```bash
npm run build:html    # HTML презентация (интерактивная)
npm run build:pdf     # PDF файл
npm run build:pptx    # PowerPoint
npm run build:all     # Все форматы сразу
```

Результат появится в папке `output/`.

## Статические файлы

Поместите изображения и другие файлы в папку, указанную в `marp.config.js`.

По умолчанию: `static/`

Вы можете добавить дополнительные папки в `marp.config.js`:

```javascript
module.exports = {
  staticFolders: ['static/**', 'assets/**', 'images/**'],
  outputDir: 'output',
};
```

## Очистка

```bash
npm run clean
```

Удаляет папку `output/`.

## Полезные ссылки

- [Marp Documentation](https://marp.app/)
- [Marp CLI](https://github.com/marp-team/marp-cli)
- [Markdown Guide](https://www.markdownguide.org/)
