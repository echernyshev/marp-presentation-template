# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is `create-marp-presentation` - an npm meta-package that scaffolds new Marp presentation projects. Users run `npx create-marp-presentation <name>` to create a ready-to-use presentation project with Marp CLI, static file handling, and multi-format export (HTML/PDF/PPTX).

## Architecture

### Project Structure

```
/stg/git/marp-presentation-template/
├── index.js                 # CLI entry point
├── lib/                     # Theme management libraries
│   ├── add-themes-command.js
│   ├── theme-resolver.js
│   ├── theme-manager.js
│   └── vscode-integration.js
├── template/                # Mandatory project files only
│   ├── scripts/
│   ├── static/
│   ├── marp.config.js
│   ├── package.json
│   └── presentation.md
├── template-optional/       # Optional demo files
│   └── examples.md
└── themes/                  # Theme library (separate from template)
    ├── beam/
    ├── default-clean/
    ├── gaia-dark/
    ├── marpx/
    └── uncover-minimal/
```

### Optional Template Files

The `template-optional/` folder contains files that are conditionally copied based on user preference:

- `examples.md` - Comprehensive demonstration of Marp capabilities (13 slides)
- `static/demo-image.png` - Demo image for image insertion examples

When users run `npx create-marp-presentation <name>`, they are prompted:
```
Create example slides file? (Y/n)
```

- Yes (default): Both `presentation.md` and `examples.md` are created
- No: Only `presentation.md` is created

In non-interactive mode (CI/CD), examples are created by default.

### Meta-Package Structure

The repository contains two distinct package.json files with different purposes:

1. **Root package.json** - The meta-package published to npm
   - `bin` field points to `index.js` (CLI entry point)
   - `files` field includes `index.js`, `lib/`, `template/`, `template-optional/`, and `themes/`
   - No runtime dependencies - only devDependencies (jest, fast-glob) for testing

2. **template/package.json** - The scaffolded project's package.json
   - Contains Marp CLI dependencies and build scripts
   - Copied to user's project during scaffolding

### CLI Flow (index.js)

1. Validates project name (lowercase, alphanumeric + hyphens)
2. Parses optional `--path` argument for output directory
3. Checks for existing directory
4. Recursively copies `template/` to new project directory (complete copy, no exclusions)
5. If user selected themes: copies selected themes + dependencies from `themes/` using `ThemeResolver.resolveDependencies()`
6. Runs `npm install` in the created project

### Path Argument Support

The CLI supports an optional `--path` argument to specify the output directory:

**Default behavior (current directory):**
- `npx create-marp-presentation my-project` -> Creates in current directory

**With --path argument:**
- `npx create-marp-presentation my-project --path /tmp` -> Creates in /tmp
- `npx create-marp-presentation my-project --path ~/projects` -> Creates in ~/projects
- `npx create-marp-presentation my-project --path ../output` -> Creates in ../output

**Security restrictions:**
- Cannot create in system directories: `/etc`, `/sys`, `/proc`, `/root`, `/boot`
- Cannot create inside `node_modules` directories

### Theme Management Architecture

Themes are stored separately from the template in the root `themes/` directory. This separation allows:

- **Clean template copying**: No need for exclusion logic during template copy
- **Dependency resolution**: `ThemeResolver.resolveDependencies()` automatically includes theme dependencies
- **Selective copying**: Only user-selected themes (and their dependencies) are copied to the project

When adding themes:
1. User selects themes from the library
2. `ThemeResolver.resolveDependencies()` resolves the full dependency chain
3. Selected themes + dependencies are copied to `project/themes/`
4. VSCode settings are updated with correct theme paths (e.g., `themes/beam/beam.css`)

### Theme Management in Generated Projects

Generated projects use `npm run theme:add` to add themes from the metapackage:

```bash
npm run theme:add              # Interactive theme selection
npm run theme:add beam marpx   # Add specific themes
```

This delegates to the metapackage's `theme:add` handler, which has access
to the full theme library. The metapackage scans only the `themes/` directory,
not `node_modules/`, ensuring only valid themes are shown.

**Note:** This requires the metapackage version that includes the `theme:add`
command support (to be published separately).

Local theme management commands:
- `npm run theme:list` - List installed themes in the project
- `npm run theme:create <name>` - Create a new custom theme
- `npm run theme:set <theme>` - Set active theme in presentation.md

### Custom Configuration System

The project uses a custom `marp.config.js` (NOT Marp CLI's config format). This config is read by `scripts/copy-static.js`:

```javascript
{
  staticFolders: ['static/**', 'assets/**'],  // glob patterns for fast-glob
  outputDir: 'output',                         // where generated files go
}
```

The build chain in template/package.json ties this together:
- `npm run build:html/pdf/pptx` → runs marp-cli → then `npm run copy:static`
- `copy:static` → reads marp.config.js → copies files to output/

## Commands

### Testing

```bash
npm test                    # Run all jest tests
npm test -- tests/cli.test.js           # Run specific test file
npm test -- --testNamePattern="test name"  # Run specific test by name
```

### Manual Testing (Integration)

```bash
# IMPORTANT: Always use --path /tmp for testing to avoid cluttering workspace
node index.js test-project --path /tmp
cd /tmp/test-project
npm run dev                           # Start Marp dev server (Ctrl+C to stop)
npm run build:all                     # Build all formats
npm run clean                         # Remove output/
rm -rf /tmp/test-project             # Clean up
```

### Before Publishing

```bash
npm publish --dry-run         # Validate package without publishing
```

## Key Files

| File | Purpose |
|------|---------|
| `index.js` | CLI initializer - validates input, copies template, manages themes |
| `lib/add-themes-command.js` | **Theme addition command** - handles theme selection prompts, conflict resolution, dependency resolution, copying, and VSCode sync. Returns Theme objects in result.copied array. |
| `lib/theme-resolver.js` | Scans themes and resolves @import dependencies |
| `lib/theme-manager.js` | Project theme management (list, add, set, create) - **canonical setActiveTheme implementation** |
| `lib/vscode-integration.js` | VSCode settings.json management for themes |
| `template/scripts/copy-static.js` | Reads marp.config.js, copies static files via fast-glob |
| `template/marp.config.js` | Custom config for static file patterns (NOT Marp CLI config) |
| `template/package.json` | Scaffolded project's dependencies and scripts |
| `themes/` | Theme library - separate from template for cleaner copying |
| `tests/cli.test.js` | CLI tests (creates real projects, slow due to npm install) |
| `tests/copy-static.test.js` | Static file copying tests (uses fixtures) |
| `template-optional/examples.md` | Comprehensive Marp capabilities demo (13 slide types) |
| `template-optional/static/demo-image.png` | Demo image for image insertion examples |

## Important Constraints

- **Node.js >= 20.0.0** required (rimraf v6, engines field)
- **Security**: `index.js` uses `path.join(process.cwd(), projectName)` instead of `path.resolve()` to prevent path traversal
- **No shell:true**: `spawnSync` for npm install deliberately avoids `shell: true` for security
- **Template files only**: Root package.json `files` field excludes tests/ from npm publication

## Dependencies

- **@marp-team/marp-cli** ^4.1.2 - Marp CLI for presentation generation
- **fast-glob** ^3.3.3 - Pattern matching for static file discovery
- **rimraf** ^6.0.0 - Cross-platform rm -rf for clean command
- **jest** ^29.7.0 - Test framework (dev dependency, not published)
