# Theme Addition Refactoring Design

**Date:** 2026-02-26
**Status:** Approved
**Author:** Claude Code

## Problem

The theme addition code is duplicated between `create-project.js` (~80 lines) and `add-themes-cli.js` (~120 lines):
- Identical conflict resolution logic (~30 lines)
- Similar theme selection patterns
- VSCode settings handling in both files
- Active theme selection duplicated

This creates maintenance burden and potential for inconsistencies.

## Solution

Centralize all theme addition logic in `AddThemesCommand` class, making CLI files simple wrappers.

## Architecture

### Responsibilities

| Component | Responsibilities |
|-----------|------------------|
| **AddThemesCommand** | Theme selection prompt, conflict detection/resolution, theme copying, VSCode sync |
| **create-project.js** | Call AddThemesCommand, select active theme from copied themes |
| **add-themes-cli.js** | Call AddThemesCommand, show summary (no active theme logic) |

### Why This Split

- **New project**: User expects to choose which theme to use → create-project.js handles active theme
- **Existing project**: Adding themes shouldn't change active theme → add-themes-cli.js doesn't touch it

## AddThemesCommand API

### Constructor

```javascript
new AddThemesCommand({
  templatePath,      // Path to themes library
  interactive: true  // Always true for theme selection
})
```

### Execute Method

```javascript
async execute(projectPath, options = {}) {
  // Options:
  // - themes: string[] (optional - skip selection prompt if provided)
  // - skipConflictCheck: boolean (default: false)

  // Returns:
  return {
    copied: [Theme, ...],   // Theme objects that were copied
    skipped: ['theme1'],    // Theme names that were skipped
    conflicts: ['theme2']   // Theme names with conflicts
  }
}
```

### Internal Flow

1. Scan available themes from `templatePath`
2. If `themes` not provided: prompt user to select themes (using `Prompts.promptThemes()`)
3. Resolve dependencies via `ThemeResolver.resolveDependencies()`
4. Check for file conflicts (always runs, finds nothing in new projects)
5. If conflicts found: prompt for resolution (using `Prompts.promptConflictResolution()`)
6. Copy themes to project
7. Update VSCode settings.json with theme paths
8. Return result

## CLI File Usage

### create-project.js

```javascript
const command = new AddThemesCommand({
  templatePath: themesLibraryPath
});

const { copied } = await command.execute(projectPath);

// Select active theme from copied themes
const themeNames = copied.map(t => t.name);
const activeTheme = await Prompts.promptActiveTheme(themeNames);
await ThemeManager.setActiveTheme(projectPath, activeTheme);
```

### add-themes-cli.js

```javascript
const command = new AddThemesCommand({
  templatePath: themesLibraryPath
});

const { copied, skipped, conflicts } = await command.execute(projectPath);

// Show summary
console.log(`Copied: ${copied.map(t => t.name).join(', ')}`);
if (skipped.length) console.log(`Skipped: ${skipped.join(', ')}`);
if (conflicts.length) console.log(`Conflicts: ${conflicts.join(', ')}`);
```

## Files to Modify

1. **lib/add-themes-command.js** - Add built-in prompts, return Theme objects
2. **cli/commands/create-project.js** - Remove duplicated code, simplify to ~10 lines
3. **cli/commands/add-themes-cli.js** - Remove duplicated code and active theme logic

## Key Changes

### AddThemesCommand

- ✅ Built-in theme selection (uses `Prompts.promptThemes()`)
- ✅ Built-in conflict resolution (uses `Prompts.promptConflictResolution()`)
- ✅ Always runs conflict checking (harmless in new projects)
- ✅ Returns Theme objects (not names)
- ✅ Handles VSCode settings internally

### create-project.js

- ❌ Remove `askAddThemes()` prompt
- ❌ Remove `addThemesToProject()` function
- ❌ Remove VSCode settings update
- ✅ Keep active theme selection

### add-themes-cli.js

- ❌ Remove theme selection prompt logic
- ❌ Remove active theme prompt and setting
- ❌ Remove VSCode settings update
- ✅ Keep summary output

## Error Handling

| Scenario | Behavior |
|----------|----------|
| No themes available | Show message, return empty result |
| User cancels selection | Return empty result |
| User cancels conflict resolution | Stop, return what was copied so far |
| Copy errors | Collect and continue, report at end |

## Testing

### Unit Tests (AddThemesCommand)

- Theme selection prompt is called when themes not provided
- Conflict resolution prompt is called when conflicts exist
- Returns correct Theme objects
- VSCode settings updated correctly
- Empty result returned when user cancels

### Integration Tests

- create-project: themes added, active theme set correctly
- add-themes: themes added, active theme NOT changed
- Both: conflict resolution works correctly

## User Impact

**Zero breaking changes** - CLI behavior remains identical from user perspective.

## Code Reduction

| File | Before | After |
|------|--------|-------|
| create-project.js | ~80 lines | ~10 lines |
| add-themes-cli.js | ~120 lines | ~10 lines |
| **Total duplication** | ~30 lines | 0 lines |
