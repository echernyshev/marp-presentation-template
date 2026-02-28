# Design: Examples System for Themes

**Date:** 2026-02-28
**Status:** Design
**Author:** Claude + User

## Overview

Redesign the presentation examples mechanism to support theme-specific examples. Each theme can have unique slide types that are not relevant to other themes. Base Marp functionality examples are also covered.

## Requirements

- Examples stored in `examples/` directory
- Base Marp examples (theme-agnostic) in root of `examples/`
- Theme-specific examples in `examples/<theme-name>/`
- Maximum 2 levels of nesting
- Each theme can have 0, 1, or multiple examples
- Theme addition wizard copies only examples for selected themes
- Static assets copied with examples, preserving folder structure

## Directory Structure

```
examples/
├── marp-basics.md              # Base Marp examples (always copied)
├── marp-advanced.md            # Advanced Marp features
├── beam/
│   ├── beam-intro.md
│   ├── beam-layouts.md
│   └── static/
│       └── beam-logo.png
├── gaia-dark/
│   └── dark-mode-demo.md
├── marpx/
│   └── marpx-features.md
├── default-clean/
│   └── clean-theme-demo.md
└── uncover-minimal/
    └── minimal-demo.md
```

## Frontmatter Format

### Base Examples (root `examples/`)

No `themes` field — this marks them as base examples:

```markdown
---
marp: true
theme: default
paginate: true
---

# Marp Basics
...
```

### Theme-Specific Examples

Single theme:

```markdown
---
marp: true
theme: beam
themes: [beam]
---

# Beam Theme Introduction
...
```

Multi-theme example:

```markdown
---
marp: true
theme: beam
themes: [beam, marpx]
---

# Layout Patterns (works in Beam & MarpX)
...
```

**Note:** Field `themes` (plural) does NOT conflict with Marp, which uses `theme` (singular).

## ExampleResolver Class

New module: `lib/example-resolver.js`

```javascript
class ExampleResolver {
  constructor(examplesDir = 'examples') {
    this.examplesDir = examplesDir;
  }

  // Discover all examples and their metadata
  async discoverAll() {
    // Recursively scan examples/
    // Parse frontmatter of each .md file
    // Returns: [{ path, themes: [], isBase: true/false, staticAssets: [] }]
  }

  // Filter examples by selected themes
  filterBySelectedThemes(allExamples, selectedThemeNames) {
    // 1. Base examples (isBase: true) → always included
    // 2. Theme examples → partial match:
    //    if example.themes intersects selectedThemeNames → included
    // Returns array of examples to copy
  }

  // Find static assets for an example
  findStaticAssets(examplePath) {
    // Returns list of non-.md files in same directory
    // Example: examples/beam/static/logo.png → ['static/logo.png']
  }
}
```

### Copy Logic

**Partial match:** If ANY theme in example's `themes` matches a selected theme, the example is copied.

Example:
- User selects: `beam`
- Example has `themes: [beam, marpx]` → **Copied** (partial match)

## Integration Points

### Changes to `lib/add-themes-command.js`

```javascript
class AddThemesCommand {
  async _promptExamples(selectedThemes) {
    const { copyExamples } = await inquirer.prompt([{
      type: 'confirm',
      name: 'copyExamples',
      message: 'Copy examples for selected themes?',
      default: false
    }]);

    if (copyExamples) {
      const resolver = new ExampleResolver();
      const allExamples = await resolver.discoverAll();
      const themeNames = selectedThemes.map(t => t.name);
      return resolver.filterBySelectedThemes(allExamples, themeNames);
    }
    return [];
  }

  async _copyExamples(examples, projectDir) {
    // Copy examples/ → project/examples/ preserving structure
    // Including static assets
  }
}
```

### Changes to `cli/commands/create-project.js`

After theme selection:
```javascript
const examples = await addThemesCommand._promptExamples(selectedThemes);
if (examples.length > 0) {
  await addThemesCommand._copyExamples(examples, projectPath);
}
```

### Changes to `cli/commands/add-themes-cli.js`

Same example prompt after theme selection for existing projects.

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    User runs CLI                                   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  create-project / theme:add                                          │
│  1. Theme selection (existing flow)                                  │
│  2. ExampleResolver.discoverAll() — scans examples/                 │
│  3. ExampleResolver.filterBySelectedThemes() — filters              │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
            ┌─────────────┐                 ┌─────────────┐
            │  No         │                 │  Yes        │
            │  examples   │                 │  copy       │
            └─────────────┘                 └─────────────┘
                    │                               │
                    ▼                               ▼
            ┌─────────────┐         ┌───────────────────────────────┐
            │  Finish     │         │  _copyExamples():             │
            └─────────────┘         │  examples/ → project/examples/│
                                    │  + preserve folder structure  │
                                    └───────────────────────────────┘
                                                    │
                                                    ▼
                                    ┌───────────────────────────────┐
                                    │  project/examples/            │
                                    │  ├── marp-basics.md           │
                                    │  └── beam/                    │
                                    │      ├── beam-intro.md        │
                                    │      └── static/logo.png      │
                                    └───────────────────────────────┘
```

## Error Handling & Edge Cases

1. **Empty `examples/` directory:**
   - `ExampleResolver.discoverAll()` returns empty array
   - Copy examples question not asked (or "No examples available")

2. **Example without `themes` in theme subdirectory:**
   - Examples in `examples/<theme>/` MUST have `themes` field
   - If missing: warning logged, example not copied

3. **Name conflict when copying:**
   - `examples/beam/demo.md` and `examples/marpx/demo.md` → preserve structure
   - Result: `project/examples/beam/demo.md`, `project/examples/marpx/demo.md`

4. **Non-existent theme in `themes`:**
   - `themes: [non-existent]`
   - Warning logged, example ignored (partial match never succeeds)

5. **Symlinks in `examples/`:**
   - **Ignore symlinks**, do not follow them (security)

## Testing Strategy

### Unit Tests (`tests/unit/example-resolver.test.js`)

```javascript
describe('ExampleResolver', () => {
  test('discoverAll() finds all .md files and parses frontmatter');
  test('filterBySelectedThemes() includes base examples always');
  test('filterBySelectedThemes() partial match works correctly');
  test('filterBySelectedThemes() returns empty array if no matches');
  test('findStaticAssets() finds non-.md files in example directory');
  test('ignores symbolic links');
});
```

### Integration Tests (`tests/integration/examples.test.js`)

```javascript
describe('Examples Integration', () => {
  test('copies base examples when user agrees');
  test('copies only examples of selected themes');
  test('preserves directory structure');
  test('copies static assets');
  test('does not copy examples if user declines');
});
```

### Test Fixtures (`tests/fixtures/examples/`)

```
tests/fixtures/examples/
├── base-example.md
├── beam/
│   └── beam-example.md
└── marpx/
    └── marpx-example.md
```

## Migration Plan

**Clean transition to new system:**

1. **Delete `template-optional/examples.md`**
2. **Create `examples/marp-basics.md`** with content from deleted file
3. **Update `cli/commands/create-project.js`:**
   - Remove old "Create example slides?" question
   - Replace with: "Copy examples for selected themes?" after theme selection

4. **Create example structure for themes:**
   ```
   examples/
   ├── marp-basics.md          # Former template-optional/examples.md
   ├── beam/
   │   └── beam-intro.md       # Placeholder or real example
   ├── marpx/
   │   └── marpx-demo.md       # Placeholder or real example
   └── ... (for remaining themes)
   ```

5. **Update `package.json`:**
   - Add `examples/` to `files` field
   - `template-optional/examples.md` already removed

6. **Remove `template-optional/` entirely** (if empty after examples.md removal)

## Summary

| Aspect | Decision |
|--------|----------|
| **Location** | `examples/` with `examples/<theme>/` subdirs |
| **Metadata** | Frontmatter `themes` field, base examples have no `themes` |
| **Copy logic** | Partial match (any theme match = copy) |
| **UX** | Single confirm question |
| **Static assets** | Preserve folder structure |
| **Symlinks** | Ignore (security) |
| **Backward compat** | None — clean break from `template-optional/examples.md` |
