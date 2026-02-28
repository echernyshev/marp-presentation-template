# Marp Presentation

A template for creating presentations with Marp.

## Quick Start

```bash
npm run dev
```

Opens a browser with live preview and auto-reload on changes.

Edit `presentation.md` to create your slides.

## Building

```bash
npm run build:html   # HTML presentation (interactive)
npm run build:pdf    # PDF file
npm run build:pptx   # PowerPoint
npm run build:all    # All formats at once
```

The output appears in the `output/` folder.

## Theme Management

```bash
npm run theme:add        # Add themes from library
npm run theme:list       # List available/installed themes
npm run theme:set <name> # Set active theme
npm run theme:create     # Create custom theme
```

For detailed theme management guide, see [docs/theme-management.md](docs/theme-management.md).

## VSCode Setup

1. Install [Marp for VSCode](https://marketplace.visualstudio.com/items?itemName=marp-team.marp-vscode)
2. Open this project in VSCode
3. Click "Marp: Open Preview" in the editor toolbar

## Static Files

Place images and other files in `static/` folder.

You can add additional folders in `marp.config.js`:

```javascript
module.exports = {
  staticFolders: ['static/**', 'assets/**', 'images/**'],
  outputDir: 'output',
};
```

## Cleaning

```bash
npm run clean
```

Removes the `output/` folder.

## Useful Links

- [Marp Documentation](https://marp.app/)
- [Marp CLI](https://github.com/marp-team/marp-cli)
- [Theme Management Guide](docs/theme-management.md)
