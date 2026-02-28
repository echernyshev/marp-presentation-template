# Create Marp Presentation

Create beautiful presentations in Markdown. Zero setup.

## Quick Start

```bash
npx create-marp-presentation my-presentation
cd my-presentation
npm run dev
```

That's it! Edit `presentation.md` and see changes live at `http://localhost:8080`.

## VSCode Setup

For the best editing experience, install [Marp for VSCode](https://marketplace.visualstudio.com/items?itemName=marp-team.marp-vscode):

1. Open VSCode
2. Press `Ctrl+Shift+X` (or `Cmd+Shift+X` on Mac)
3. Search "Marp for VSCode"
4. Click Install

After installing, open any `.md` file and click the **Marp: Preview** button in the top-right corner.

## What You Get

- **Markdown slides** - Write presentations in plain text
- **Live preview** - See changes instantly in browser
- **Export anywhere** - HTML, PDF, PPTX with one command
- **Themes** - Beautiful built-in themes, add more anytime
- **Static files** - Images and assets copied automatically

## Commands

| Command | What it does |
|---------|--------------|
| `npm run dev` | Live preview at http://localhost:8080 |
| `npm run build:all` | Export to HTML, PDF, and PPTX |
| `npm run clean` | Remove output folder |

## Theme Management

Add and switch themes anytime.

### Quick Theme Commands

```bash
npm run theme:add        # Interactive: select themes to add
npm run theme:add beam   # Add specific themes
npm run theme:list       # See what's available
npm run theme:set marpx  # Change active theme
```

When you create a project, you'll be prompted to add themes. Add more later with `npm run theme:add`.

[See full theme documentation →](docs/theme-management.md)

## Local Development

To test without publishing to npm:

```bash
git clone https://github.com/echernyshev/marp-presentation-template.git
cd marp-presentation-template
npm install
npm test
node index.js test-project
```

## Credits

This project includes themes adapted from the following sources:

- **MarpX themes** - [cunhapaulo/MarpX](https://github.com/cunhapaulo/MarpX)
- **beam theme** - [rnd195/my-marp-themes](https://github.com/rnd195/my-marp-themes)

Thank you to the original authors for their excellent work on Marp themes!

## License

MIT
