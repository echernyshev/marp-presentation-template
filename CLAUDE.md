# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is `create-marp-presentation` - an npm meta-package that scaffolds new Marp presentation projects. Users run `npx create-marp-presentation <name>` to create a ready-to-use presentation project with Marp CLI, static file handling, and multi-format export (HTML/PDF/PPTX).

## Architecture

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
   - `files` field includes only `index.js` and `template/` for minimal published size
   - No runtime dependencies - only devDependencies (jest, fast-glob) for testing

2. **template/package.json** - The scaffolded project's package.json
   - Contains Marp CLI dependencies and build scripts
   - Copied to user's project during scaffolding

### CLI Flow (index.js)

1. Validates project name (lowercase, alphanumeric + hyphens)
2. Prevents path traversal attacks (resolves path against CWD)
3. Checks for existing directory
4. Recursively copies `template/` to new project directory
5. Runs `npm install` in the created project

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
node index.js test-project    # Create a test project
cd test-project
npm run dev                   # Start Marp dev server (Ctrl+C to stop)
npm run build:all             # Build all formats
npm run clean                 # Remove output/
```

### Before Publishing

```bash
npm publish --dry-run         # Validate package without publishing
```

## Key Files

| File | Purpose |
|------|---------|
| `index.js` | CLI initializer - validates input, copies template, runs npm install |
| `template/scripts/copy-static.js` | Reads marp.config.js, copies static files via fast-glob |
| `template/marp.config.js` | Custom config for static file patterns (NOT Marp CLI config) |
| `template/package.json` | Scaffolded project's dependencies and scripts |
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
