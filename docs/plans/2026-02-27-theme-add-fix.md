# Theme Add Command Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix `npm run theme:add` showing node_modules CSS files instead of valid themes by delegating to metapackage handler.

**Architecture:** Replace local `theme:add` implementation with `npx create-marp-presentation theme:add .` command that uses metapackage's correct theme library path.

**Tech Stack:** Node.js, npm scripts, jest for testing

**Reference design:** `docs/plans/2026-02-27-theme-add-fix-design.md`

---

## Task 1: Add theme:add script to template/package.json

**Files:**
- Modify: `template/package.json`

**Step 1: Read current template/package.json**

Read the file to understand current script structure.

**Step 2: Add theme:add script**

Add the new script to the scripts section:

```json
{
  "scripts": {
    "theme:add": "npx create-marp-presentation theme:add .",
    "theme": "node scripts/theme-cli.js",
    "dev": "marp --server --html",
    "build:html": "marp --html --allow-local-files",
    "build:pdf": "marp --pdf --allow-local-files && npm run copy:static",
    "build:pptx": "marp --pptx --allow-local-files && npm run copy:static",
    "build:all": "npm run build:html && npm run build:pdf && npm run build:pptx",
    "copy:static": "node scripts/copy-static.js",
    "clean": "rimraf output"
  }
}
```

**Step 3: Verify JSON syntax**

Run: `node -e "JSON.parse(require('fs').readFileSync('template/package.json'))"`
Expected: No syntax errors

**Step 4: Commit**

```bash
git add template/package.json
git commit -m "feat: add theme:add script to template package.json"
```

---

## Task 2: Remove add command from template/scripts/theme-cli.js

**Files:**
- Modify: `template/scripts/theme-cli.js`

**Step 1: Read theme-cli.js**

Read the file to locate:
- `addThemes()` function (around line 80-160)
- `case 'add':` in switch statement (around line 240)
- Help message

**Step 2: Remove addThemes() function**

Delete the entire `async function addThemes()` function.

**Step 3: Remove add case from switch**

Find and remove from the switch statement:
```javascript
case 'add':
  await addThemes(args.filter(a => !a.startsWith('--')));
  break;
```

**Step 4: Update help message**

Remove `add [theme...]` from the help output. Updated help should show:

```
Commands:
  list                 List installed themes
  create <name>        Create a new theme
  set <theme>          Set active theme in presentation.md
  switch <theme>       Alias for 'set' - change active theme
  sync                 Sync installed themes to VSCode settings
  help                 Show this help message
```

**Step 5: Update usage examples**

Remove examples showing `theme add` and add note about `theme:add`:

```
Run "npm run theme:add" to add themes from the theme library.
```

**Step 6: Verify syntax**

Run: `node template/scripts/theme-cli.js`
Expected: Shows help (no errors)

**Step 7: Commit**

```bash
git add template/scripts/theme-cli.js
git commit -m "refactor: remove add command from theme-cli.js, use metapackage handler"
```

---

## Task 3: Add integration test for theme:add command

**Files:**
- Modify: `tests/integration/theme-cli.test.js`

**Step 1: Read existing integration test file**

Understand test patterns and fixtures used.

**Step 2: Write failing test**

Add to `tests/integration/theme-cli.test.js`:

```javascript
describe('theme:add command', () => {
  test('adds themes to generated project using metapackage handler', async () => {
    const { createTempProject } = require('../helpers/temp-project');
    const { spawnSync } = require('child_process');
    const path = require('path');
    const fs = require('fs');

    const localPackagePath = path.join(__dirname, '../..');

    // Create a temporary project
    const project = await createTempProject();

    // Run theme:add using local metapackage
    const result = spawnSync(
      'node',
      [path.join(localPackagePath, 'index.js'), 'theme:add', project.path, 'beam'],
      { cwd: project.path }
    );

    // Command should succeed
    expect(result.status).toBe(0);
    expect(result.stderr.toString()).toBe('');

    // Theme should be copied
    const themePath = path.join(project.path, 'themes', 'beam', 'beam.css');
    expect(fs.existsSync(themePath)).toBe(true);

    // Verify no node_modules files in themes directory
    const themesDir = path.join(project.path, 'themes');
    const allFiles = getAllFiles(themesDir);
    const cssFiles = allFiles.filter(f => f.endsWith('.css'));

    // These files should NOT exist (they're from node_modules)
    const badFiles = cssFiles.filter(f =>
      f.includes('inquirer') ||
      f.includes('picocss') ||
      f.includes('node_modules')
    );

    expect(badFiles).toHaveLength(0);

    // Clean up
    fs.rmSync(project.path, { recursive: true, force: true });
  });

  function getAllFiles(dirPath, arrayOfFiles = []) {
    const files = fs.readdirSync(dirPath);
    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      if (fs.statSync(filePath).isDirectory()) {
        getAllFiles(filePath, arrayOfFiles);
      } else {
        arrayOfFiles.push(filePath);
      }
    });
    return arrayOfFiles;
  }
});
```

**Step 3: Run test to verify it fails (theme:add not yet working)**

Run: `npm test -- tests/integration/theme-cli.test.js -t "theme:add command"`
Expected: May fail or pass depending on current state

**Step 4: If test passes due to Tasks 1-2, commit test**

```bash
git add tests/integration/theme-cli.test.js
git commit -m "test: add integration test for theme:add command"
```

**Step 5: If test fails, debug and fix**

Check:
- Is `npx` available?
- Is `theme:add` script in package.json?
- Is the project path correct?

---

## Task 4: Manual verification test

**Files:**
- None (manual testing)

**Step 1: Create a test project**

Run: `node index.js test-theme-add --path /tmp`

**Step 2: Navigate to project**

Run: `cd /tmp/test-theme-add`

**Step 3: Run theme:add interactively**

Run: `npm run theme:add`

Expected:
- Prompts with theme list (beam, default-clean, etc.)
- NOT showing node_modules files
- Selected theme copies to themes/

**Step 4: Verify theme was added**

Run: `cat themes/beam/beam.css | head -5`
Expected: CSS file with `/* @theme beam */` comment

**Step 5: Run theme:add with specific theme**

Run: `npm run theme:add marpx`

Expected: marpx theme added

**Step 6: Clean up**

Run: `rm -rf /tmp/test-theme-add`

**Step 7: Document findings**

If tests pass, no commit needed. If issues found, create fix commits.

---

## Task 5: Update CLAUDE.md documentation

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Read current CLAUDE.md**

Find sections about theme management.

**Step 2: Update theme:add documentation**

Add note about new implementation:

```markdown
### Theme Management in Generated Projects

Generated projects use `npm run theme:add` to add themes:

\`\`\`bash
npm run theme:add              # Interactive theme selection
npm run theme:add beam marpx   # Add specific themes
\`\`\`

This delegates to the metapackage's `theme:add` handler, which has access
to the full theme library.
```

**Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update theme:add documentation"
```

---

## Task 6: Full test suite verification

**Files:**
- None (verification)

**Step 1: Run all tests**

Run: `npm test`

Expected: All tests pass

**Step 2: Run integration tests specifically**

Run: `npm test -- tests/integration/`

Expected: All integration tests pass

**Step 3: Run CLI tests**

Run: `npm test -- tests/cli.test.js`

Expected: All CLI tests pass

**Step 4: If any test fails, debug and fix**

Use `superpowers:systematic-debugging` skill if needed.

**Step 5: Final summary commit**

```bash
git commit --allow-empty -m "fix: theme:add command now uses metapackage handler

- Fixes theme list showing node_modules CSS files
- template/package.json: add theme:add script using npx
- template/scripts/theme-cli.js: remove local add command
- Integration test verifies only valid themes are shown
"
```

---

## Verification Checklist

After completing all tasks:

- [ ] `npm run theme:add` works in generated project
- [ ] Theme list shows only valid themes (beam, marpx, etc.)
- [ ] No files from node_modules appear in theme list
- [ ] Selected themes are copied to project/themes/
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] CLAUDE.md documentation updated
- [ ] Manual testing confirms fix works

---

## Notes

- The metapackage's `index.js` already has `theme:add` handler - no changes needed there
- This fix ensures consistency between project creation and theme addition
- The `npx` command uses the published version; for development testing, the integration test uses the local index.js
