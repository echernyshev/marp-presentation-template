# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is `create-marp-presentation` - an npm meta-package that scaffolds new Marp presentation projects. Users run `npx create-marp-presentation <name>` to create a ready-to-use presentation project with Marp CLI, static file handling, and multi-format export (HTML/PDF/PPTX).

The CLI also supports a secondary mode: `npx create-marp-presentation theme:add <path> [themes...]` to add themes to existing projects.

## Architecture

### Project Structure

```
/stg/git/marp-presentation-template/
├── index.js                 # CLI entry point (dual-mode dispatcher)
├── cli/                     # CLI command modules
│   ├── commands/
│   │   ├── create-project.js    # Project creation logic
│   │   └── add-themes-cli.js    # Theme addition CLI entry point
│   └── utils/
│       ├── file-utils.js        # Path validation, directory operations
│       └── prompt-utils.js      # Shared prompt utilities
├── lib/                     # Theme management libraries
│   ├── add-themes-command.js    # Theme selection, conflict resolution
│   ├── theme-resolver.js        # Scans themes, resolves @import dependencies
│   ├── theme-manager.js         # Project theme management (list, set, create)
│   ├── vscode-integration.js    # VSCode settings.json management
│   ├── prompts.js               # Interactive prompt definitions
│   ├── errors.js                # Custom error types
│   └── frontmatter.js           # Frontmatter parsing utilities
├── template/                # Mandatory project files only
│   ├── scripts/
│   ├── static/
│   ├── marp.config.js
│   ├── package.json
│   └── presentation.md
├── template-optional/       # Optional demo files
│   └── examples.md
├── themes/                  # Theme library (separate from template)
│   ├── beam/
│   ├── default-clean/
│   ├── gaia-dark/
│   ├── marpx/
│   └── uncover-minimal/
├── docs/                    # Documentation
│   ├── plans/               # Design and implementation plans
│   ├── reqs/                # Requirements documents
│   └── theme-management.md  # Theme management guide
└── tests/                   # Test suites
    ├── cli.test.js          # CLI integration tests
    ├── unit/                # Unit tests by module
    ├── integration/         # Integration test scenarios
    ├── fixtures/            # Test fixtures
    └── helpers/             # Test utilities
```

### CLI Architecture (Dual Entry Points)

The `index.js` file dispatches to two primary modes:

**1. Project Creation Mode** (default):
```bash
npx create-marp-presentation <name> [--path <dir>]
```
- Calls `createProject()` from `cli/commands/create-project.js`
- Validates project name, parses --path argument
- Copies template/, optionally adds themes
- Runs npm install in created project

**2. Theme Addition Mode**:
```bash
npx create-marp-presentation theme:add <project-path> [theme-names...]
```
- Calls `addThemesToExistingProject()` from `cli/commands/add-themes-cli.js`
- Resolves themes from the meta-package's theme library
- Copies selected themes + dependencies to target project
- Updates target project's VSCode settings

### Meta-Package Structure

The repository contains two distinct package.json files:

1. **Root package.json** - The meta-package published to npm
   - `bin` field: `"create-marp-presentation": "index.js"`
   - `files` field: `index.js`, `cli/`, `lib/`, `docs/`, `template/`, `template-optional/`, `themes/`
   - Dependencies: `@inquirer/prompts`, `fast-glob`, `gray-matter` (all runtime, no devDependencies published)
   - DevDependencies: `jest` for testing only

2. **template/package.json** - The scaffolded project's package.json
   - Contains Marp CLI dependencies and build scripts
   - Copied to user's project during scaffolding

### Theme Management Architecture

Themes are stored in `themes/` at the root, separate from template:

**Key Classes:**
- `ThemeResolver` (lib/theme-resolver.js) - Scans themes, extracts metadata, resolves @import chains
- `ThemeManager` (lib/theme-manager.js) - Manages themes in existing projects (list, add, set, create)
- `Theme` class - Represents a theme with name, path, css, dependencies, isSystem flag

**Theme Addition Flow:**
1. User selects themes via `AddThemesCommand._promptSelection()`
2. `ThemeResolver.resolveDependencies()` resolves full dependency chain
3. Conflict resolution via `AddThemesCommand._resolveConflictsInteractive()`
4. Selected themes + dependencies copied to `project/themes/`
5. `VSCodeIntegration.syncSettings()` updates VSCode settings.json

**Theme Metadata in CSS:**
- `/* @theme name */` - Theme name declaration
- `/* @description text */` - Description (optional, used in CLI wizard)
- `@import "./other-theme/theme.css";` - Theme dependencies

### Optional Template Files

The `template-optional/` folder contains files conditionally copied based on user preference:
- `examples.md` - 13-slide Marp capabilities demo
- `static/demo-image.png` - Demo image for examples

User prompt: "Create example slides file? (Y/n)"
- Yes (default): Copies both `presentation.md` and `examples.md`
- No: Copies only `presentation.md`

In non-interactive mode (CI/CD), examples are created by default.

### Custom Configuration System

Projects use a custom `marp.config.js` (NOT Marp CLI's config format), read by `scripts/copy-static.js`:

```javascript
{
  staticFolders: ['static/**', 'assets/**'],  // glob patterns for fast-glob
  outputDir: 'output',                         // where generated files go
}
```

Build chain in template/package.json:
- `npm run build:html/pdf/pptx` → runs marp-cli → then `npm run copy:static`
- `copy:static` → reads marp.config.js → copies matched files to output/

## Commands

### Testing

```bash
npm test                          # Run all jest tests
npm test -- tests/cli.test.js    # Run specific test file
npm test -- --testNamePattern="test name"  # Run specific test by name
npm test -- --coverage           # Generate coverage report (outputs to coverage/)
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

### Testing Theme Addition

```bash
# Create a test project first
node index.js test-base --path /tmp

# Test interactive theme selection
node index.js theme:add /tmp/test-base

# Test direct theme specification
node index.js theme:add /tmp/test-base beam marpx

# Verify themes were copied
ls /tmp/test-base/themes/
```

### Before Publishing

```bash
npm publish --dry-run         # Validate package without publishing
```

## Key Files

| File | Purpose |
|------|---------|
| `index.js` | CLI dispatcher - routes to create-project or theme:add |
| `cli/commands/create-project.js` | Project creation: validation, template copy, theme selection, npm install |
| `cli/commands/add-themes-cli.js` | Theme addition to existing projects |
| `cli/utils/file-utils.js` | Path validation, security checks, directory operations |
| `lib/add-themes-command.js` | Theme selection wizard, conflict resolution, dependency resolution |
| `lib/theme-resolver.js` | Theme scanning, metadata extraction, @import dependency resolution |
| `lib/theme-manager.js` | Project theme management: list, set, create, setActiveTheme (canonical) |
| `lib/prompts.js` | @inquirer prompt definitions (theme selection, conflict resolution) |
| `lib/vscode-integration.js` | VSCode settings.json management for theme paths |
| `lib/errors.js` | Custom error types (ThemeError, ProjectExistsError, etc.) |
| `lib/frontmatter.js` | Frontmatter parsing utilities for presentation.md |
| `template/marp.config.js` | Custom static file configuration (NOT Marp CLI format) |
| `template/scripts/copy-static.js` | Reads marp.config.js, copies static files via fast-glob |
| `template/package.json` | Scaffolded project's dependencies and scripts |
| `docs/theme-management.md` | User-facing theme management documentation |
| `tests/cli.test.js` | CLI integration tests (slow, creates real projects) |
| `tests/unit/` | Unit tests by module (fast, no file system side effects) |

## Important Constraints

- **Node.js >= 20.0.0** required (engines field)
- **Security**: `cli/utils/file-utils.js` validates paths to prevent:
  - Path traversal attacks
  - Creation in system directories (`/etc`, `/sys`, `/proc`, `/root`, `/boot`)
  - Creation inside `node_modules` directories
- **No shell:true**: `spawnSync` for npm install avoids `shell: true` for security
- **Template files only**: Root package.json `files` field excludes `tests/` from npm publication
- **Jest maxWorkers: 1**: Prevents race conditions in file-based integration tests

## Dependencies

**Runtime (published to npm):**
- `@inquirer/prompts` ^7.10.1 - Interactive CLI prompts (checkbox, confirm, select)
- `fast-glob` ^3.3.3 - Pattern matching for static file discovery
- `gray-matter` ^4.0.3 - Frontmatter parsing for presentation.md

**Development (not published):**
- `jest` ^29.7.0 - Test framework

**In scaffolded projects (template/package.json):**
- `@marp-team/marp-cli` ^4.1.2 - Marp CLI for presentation generation
- `rimraf` ^6.0.0 - Cross-platform rm -rf for clean command
