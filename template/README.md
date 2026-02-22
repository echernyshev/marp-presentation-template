# Marp Presentation

A template for creating presentations with Marp.

## Getting Started

### Live Preview

```bash
npm run dev
```

Opens a browser with auto-reload on changes.

### Creating Slides

Edit `presentation.md` — this is the main presentation file.

## Building the Presentation

```bash
npm run build:html    # HTML presentation (interactive)
npm run build:pdf     # PDF file
npm run build:pptx    # PowerPoint
npm run build:all     # All formats at once
```

The output will appear in the `output/` folder.

## Static Files

Place images and other files in the folder specified in `marp.config.js`.

Default: `static/`

You can add additional folders in `marp.config.js`:

```javascript
module.exports = {
  staticFolders: ['static/**', 'assets/**', 'images/**'],
  outputDir: 'output',
};
```

## Cleaning Up

```bash
npm run clean
```

Removes the `output/` folder.

## Useful Links

- [Marp Documentation](https://marp.app/)
- [Marp CLI](https://github.com/marp-team/marp-cli)
- [Markdown Guide](https://www.markdownguide.org/)
