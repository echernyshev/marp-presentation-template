# Theme Add Command Fix Design

**Date:** 2026-02-27
**Status:** Approved
**Author:** Claude Code

## Problem

When running `npm run theme:add` in a generated project, the theme list shows hundreds of CSS files from `node_modules` instead of only valid themes. This happens because:

1. `template/scripts/theme-cli.js` uses `templatePath = path.join(__dirname, '..')` which includes `node_modules/`
2. `ThemeResolver._findCssFiles()` recursively finds ALL `.css` files without filtering
3. Files from packages like `@inquirer`, `picocss` appear as "themes"

## Root Cause

The generated project's `theme:add` command tries to scan themes from the template directory, which includes `node_modules/`. The metapackage has the correct theme library at `themes/` but the local script doesn't know about it.

## Solution

Use the metapackage's existing `theme:add` handler instead of local implementation. The metapackage already has:
- Correct `themesLibraryPath` pointing to the theme library
- `AddThemesCommand` that properly scans only theme files
- Working conflict resolution and VSCode integration

## Architecture

### Before

```
Generated Project
  └─ npm run theme:add
      └─ template/scripts/theme-cli.js (add command)
          └─ templatePath = ../ (includes node_modules!)
              └─ ThemeResolver scans ALL CSS files ❌
```

### After

```
Generated Project
  └─ npm run theme:add
      └─ npx create-marp-presentation theme:add .
          └─ index.js → handleThemeAdd()
              └─ themesLibraryPath = /path/to/metapackage/themes ✓
                  └─ AddThemesCommand scans only themes ✓
```

## Implementation

### 1. template/package.json

Add new script:

```json
{
  "scripts": {
    "theme:add": "npx create-marp-presentation theme:add .",
    "theme": "node scripts/theme-cli.js"
  }
}
```

### 2. template/scripts/theme-cli.js

Remove the `add` command:

```javascript
// DELETE: addThemes() function
// DELETE: case 'add': from switch statement
// UPDATE: help message (remove theme:add from local commands)
```

### 3. index.js (metapackage)

No changes needed - `theme:add` handler already exists and works correctly.

### 4. tests/integration/theme-cli.test.js

Add integration test:

```javascript
test('theme:add command works in generated project', async () => {
  const localPackagePath = path.join(__dirname, '../..');

  const project = await createTempProject();

  const result = spawnSync(
    'node',
    [path.join(localPackagePath, 'index.js'), 'theme:add', project.path, 'beam'],
    { cwd: project.path }
  );

  expect(result.status).toBe(0);

  const themePath = path.join(project.path, 'themes', 'beam', 'beam.css');
  expect(fs.existsSync(themePath)).toBe(true);

  // Verify no node_modules files in themes/
  const themes = fs.readdirSync(path.join(project.path, 'themes'), { recursive: true });
  const cssFiles = themes.filter(f => f.endsWith('.css'));
  expect(cssFiles).not.toContain('inquirer.css');
  expect(cssFiles).not.toContain('picocss.min.css');
});
```

## Why This Works

1. **Correct theme source**: Metapackage's `themesLibraryPath` points to the isolated `themes/` folder
2. **No node_modules scanning**: Theme files are separate from dependencies
3. **Consistent behavior**: Same code path as project creation
4. **No code duplication**: Single implementation in metapackage

## Error Handling

| Scenario | Behavior |
|----------|----------|
| npx not available | Error: "Node.js required to run this command" |
| Metapackage unreachable | Error: "Unable to reach create-marp-presentation. Check your internet connection." |
| Not a Marp project | Error: "Run this command from a Marp project directory" |
| No themes available | Message: "No themes available to add" |

## Files to Modify

1. `template/package.json` - Add `theme:add` script
2. `template/scripts/theme-cli.js` - Remove `add` command
3. `tests/integration/theme-cli.test.js` - Add integration test

## User Impact

**Breaking change:** None - users get the same functionality, but it actually works correctly now.

**Benefits:**
- Theme list shows only valid themes
- Faster (no scanning thousands of irrelevant files)
- Consistent with project creation flow
