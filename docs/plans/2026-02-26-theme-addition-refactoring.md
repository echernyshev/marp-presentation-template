# Theme Addition Refactoring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor theme addition code to eliminate duplication by centralizing logic in AddThemesCommand class.

**Architecture:** AddThemesCommand becomes single source of truth for theme selection, conflict resolution, and copying. CLI files become simple wrappers (~10 lines). create-project.js handles active theme selection; add-themes-cli.js does not.

**Tech Stack:** Node.js, inquirer for prompts, jest for testing

**Reference design:** `docs/plans/2026-02-26-theme-addition-refactoring-design.md`

---

## Task 1: Add theme selection prompt to AddThemesCommand

**Files:**
- Modify: `lib/add-themes-command.js`

**Step 1: Read current AddThemesCommand implementation**

Read the file to understand current structure, especially:
- How `selectThemes` prompt is currently handled
- The `execute()` method signature
- How themes are returned

**Step 2: Modify `_promptThemes` method to use Prompts class**

Update the method to use `Prompts.promptThemes()` directly:

```javascript
_promptThemes(availableThemes) {
  if (this.options.themes && this.options.themes.length > 0) {
    return this.options.themes;
  }
  return Prompts.promptThemes(availableThemes);
}
```

**Step 3: Update constructor to remove custom selectThemes prompt option**

Remove `prompts.selectThemes` from the constructor options. Theme selection is now built-in.

**Step 4: Add Prompts import**

Add at top of file:
```javascript
const { Prompts } = require('./prompts');
```

**Step 5: Run tests to verify no regressions**

Run: `npm test -- tests/add-themes-command.test.js`
Expected: All existing tests pass

**Step 6: Commit**

```bash
git add lib/add-themes-command.js
git commit -m "refactor: AddThemesCommand uses built-in theme selection prompt"
```

---

## Task 2: Add conflict resolution prompt to AddThemesCommand

**Files:**
- Modify: `lib/add-themes-command.js`

**Step 1: Create `_resolveConflictsInteractive` method**

Add method to handle conflict resolution using Prompts class:

```javascript
async _resolveConflictsInteractive(conflicts) {
  const result = await Prompts.promptConflictResolution(
    conflicts.map(c => ({ name: c }))
  );

  if (result === 'skip-all') return { overwrite: [] };
  if (result === 'overwrite-all') return { overwrite: conflicts };
  if (result === 'cancel') return { overwrite: [] };

  // Handle 'choose-each' or individual conflicts
  const overwrite = [];
  for (const conflict of conflicts) {
    const choice = await Prompts.promptSingleConflict(conflict);
    if (choice === 'overwrite') {
      overwrite.push(conflict);
    } else if (choice === 'cancel') {
      break;
    }
  }
  return { overwrite };
}
```

**Step 2: Update `_resolveConflicts` to use built-in prompt**

Modify to call `_resolveConflictsInteractive` when no custom prompt provided:

```javascript
async _resolveConflicts(conflicts) {
  if (this.options.prompts?.resolveConflicts) {
    return this.options.prompts.resolveConflicts(conflicts);
  }
  return this._resolveConflictsInteractive(conflicts);
}
```

**Step 3: Update constructor default prompts**

Remove requirement for `resolveConflicts` in prompts object - make it optional.

**Step 4: Run tests**

Run: `npm test -- tests/add-themes-command.test.js`
Expected: All existing tests pass

**Step 5: Commit**

```bash
git add lib/add-themes-command.js
git commit -m "refactor: AddThemesCommand uses built-in conflict resolution prompt"
```

---

## Task 3: Ensure AddThemesCommand returns Theme objects

**Files:**
- Modify: `lib/add-themes-command.js`
- Test: `tests/add-themes-command.test.js`

**Step 1: Read execute() method return value**

Check what is currently returned - ensure `copied` array contains Theme objects with `name` property.

**Step 2: Verify Theme object structure**

Ensure copied themes have:
- `name` property
- Other necessary properties for downstream use

**Step 3: Add test for Theme object return**

```javascript
test('execute returns Theme objects with name property', async () => {
  const command = new AddThemesCommand({
    templatePath: themesPath,
    interactive: false
  });

  const result = await command.execute(projectPath, {
    themes: ['beam']
  });

  expect(result.copied).toHaveLength(1);
  expect(result.copied[0]).toHaveProperty('name');
  expect(result.copied[0].name).toBe('beam');
});
```

**Step 4: Run test to verify it passes**

Run: `npm test -- tests/add-themes-command.test.js -t "returns Theme objects"`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/add-themes-command.js tests/add-themes-command.test.js
git commit -m "test: verify AddThemesCommand returns Theme objects"
```

---

## Task 4: Ensure AddThemesCommand always checks conflicts

**Files:**
- Modify: `lib/add-themes-command.js`

**Step 1: Find _findConflicts usage**

Check where conflict checking happens in execute() method.

**Step 2: Ensure conflict check always runs**

Remove any conditional that skips conflict checking. The method should always run:
- In new projects: finds nothing (harmless)
- In existing projects: finds actual conflicts

**Step 3: Add test for conflict check in empty project**

```javascript
test('execute checks conflicts even in new projects', async () => {
  const command = new AddThemesCommand({
    templatePath: themesPath,
    interactive: false
  });

  // Create empty project (no existing themes)
  const emptyProject = await createTempProject();

  const result = await command.execute(emptyProject, {
    themes: ['beam']
  });

  // Should succeed with no conflicts found
  expect(result.conflicts).toEqual([]);
  expect(result.copied).toHaveLength(1);
});
```

**Step 4: Run test**

Run: `npm test -- tests/add-themes-command.test.js -t "checks conflicts"`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/add-themes-command.js tests/add-themes-command.test.js
git commit -m "refactor: AddThemesCommand always checks for conflicts"
```

---

## Task 5: Simplify create-project.js theme addition

**Files:**
- Modify: `cli/commands/create-project.js`
- Test: `tests/cli.test.js`

**Step 1: Read current create-project.js theme code**

Locate `askAddThemes()` and `addThemesToProject()` functions.

**Step 2: Replace theme addition flow**

Replace entire theme addition section with:

```javascript
// Add themes to project
const command = new AddThemesCommand({
  templatePath: themesLibraryPath
});

const { copied } = await command.execute(projectPath, {
  skipConflictCheck: false
});

// Select active theme from copied themes
const themeNames = copied.map(t => t.name);
const activeTheme = await Prompts.promptActiveTheme(themeNames);
await ThemeManager.setActiveTheme(projectPath, activeTheme);
```

**Step 3: Remove askAddThemes function**

Delete the `askAddThemes()` function - no longer needed.

**Step 4: Remove addThemesToProject function**

Delete the `addThemesToProject()` function - logic now in AddThemesCommand.

**Step 5: Update imports**

Ensure `Prompts` and `ThemeManager` are imported.

**Step 6: Run tests**

Run: `npm test -- tests/cli.test.js`
Expected: All tests pass

**Step 7: Manual test**

Run: `node index.js test-project --path /tmp`
Verify: Theme selection appears, active theme is prompted

**Step 8: Commit**

```bash
git add cli/commands/create-project.js
git commit -m "refactor: simplify create-project theme addition using AddThemesCommand"
```

---

## Task 6: Simplify add-themes-cli.js

**Files:**
- Modify: `cli/commands/add-themes-cli.js`
- Test: `tests/cli.test.js`

**Step 1: Read current add-themes-cli.js**

Locate theme selection and active theme logic.

**Step 2: Replace theme addition flow**

Replace entire theme section with:

```javascript
const command = new AddThemesCommand({
  templatePath: themesLibraryPath
});

const { copied, skipped, conflicts } = await command.execute(projectPath, {
  themes: themeNames || undefined  // Use args if provided
});

// Show summary
console.log(`\nCopied themes: ${copied.map(t => t.name).join(', ') || 'none'}`);
if (skipped.length) console.log(`Skipped: ${skipped.join(', ')}`);
if (conflicts.length) console.log(`Conflicts: ${conflicts.join(', ')}`);
```

**Step 3: Remove active theme prompt**

Delete all code related to `promptActiveTheme` and `ThemeManager.setActiveTheme`.

**Step 4: Remove VSCode settings update**

Delete VSCode settings code - now handled by AddThemesCommand.

**Step 5: Run tests**

Run: `npm test -- tests/cli.test.js`
Expected: All tests pass

**Step 6: Manual test**

```bash
cd /tmp/existing-project
node /stg/git/marp-presentation-template/index.js add-themes beam
```
Verify: Themes added, active theme NOT changed

**Step 7: Commit**

```bash
git add cli/commands/add-themes-cli.js
git commit -m "refactor: simplify add-themes-cli using AddThemesCommand, remove active theme logic"
```

---

## Task 7: Update integration tests

**Files:**
- Modify: `tests/cli.test.js`

**Step 1: Review existing CLI tests**

Check which tests are affected by the refactoring.

**Step 2: Update test expectations**

Ensure tests expect:
- Theme selection to be prompted
- Active theme to be set in create-project
- Active theme NOT to change in add-themes-cli

**Step 3: Add test for active theme preservation**

```javascript
test('add-themes command does not change active theme', async () => {
  const project = await createProjectWithThemes(['beam']);
  await ThemeManager.setActiveTheme(project.path, 'beam');

  // Add more themes
  await addThemesToProject(project.path, ['gaia-dark']);

  const active = await ThemeManager.getActiveTheme(project.path);
  expect(active).toBe('beam');  // Still beam, not changed
});
```

**Step 4: Run all tests**

Run: `npm test`
Expected: All 175+ tests pass

**Step 5: Commit**

```bash
git add tests/cli.test.js
git commit -m "test: update CLI tests for refactored theme addition"
```

---

## Task 8: Final verification and documentation

**Files:**
- Modify: `CLAUDE.md` (if needed)

**Step 1: Run full test suite**

Run: `npm test`
Expected: 100% pass rate

**Step 2: Manual integration test**

```bash
# Test new project creation
node index.js test-new --path /tmp
cd /tmp/test-new
cat .vscode/settings.json  # Verify themes listed
grep "marp.themeSet" marp.config.js  # Verify active theme

# Test adding themes to existing project
node /stg/git/marp-presentation-template/index.js add-themes uncover-minimal
cat .vscode/settings.json  # Verify new theme added
grep "marp.themeSet" marp.config.js  # Verify active theme unchanged
```

**Step 3: Update CLAUDE.md if needed**

Document any API changes to AddThemesCommand.

**Step 4: Final commit**

```bash
git add CLAUDE.md
git commit -m "docs: update AddThemesCommand API documentation"
```

**Step 5: Create summary PR commit**

```bash
git commit --allow-empty -m "refactor: complete theme addition refactoring

- AddThemesCommand now handles all theme addition logic
- create-project.js simplified from ~80 to ~10 lines
- add-themes-cli.js simplified from ~120 to ~10 lines
- Zero code duplication in theme addition
- Active theme selection only in create-project.js
- Conflict resolution always runs (harmless in new projects)
"
```

---

## Verification Checklist

After completing all tasks:

- [ ] All unit tests pass (`npm test`)
- [ ] All integration tests pass
- [ ] Manual test: new project creation works with theme selection
- [ ] Manual test: add-themes adds themes without changing active theme
- [ ] VSCode settings updated correctly
- [ ] No duplicate code in CLI files
- [ ] Code review shows clean, maintainable structure
