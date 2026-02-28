# System Themes Disabled in Selection UI

**Date:** 2026-02-28  
**Status:** Design  
**Author:** Claude Code

## Problem Statement

System themes (default, gaia, uncover) are shown as selectable in the theme selection UI with checkboxes, but selecting them does nothing since they're built-in to Marp CLI and not copied to projects. This is confusing for users who may wonder why their selection had no effect.

**Current behavior:**
```
--- default (built-in) ---
  ◯ default              <- Can be selected, but nothing happens
  ◯ ├── beam - ...
```

## Requirements

1. System themes should remain visible in the tree structure (for group headers)
2. System themes should not be selectable in the checkbox UI
3. Users should understand why system themes are not selectable

## Design

### Mark System Themes as Disabled

Use the `disabled` property of inquirer checkbox choices to mark system themes as not selectable.

**In `_addThemeChoices`:**
```javascript
const choice = {
  name: displayName,
  value: theme.name,
  checked: false
};

// Mark system themes as disabled
if (theme.isSystem) {
  choice.disabled = 'Built-in theme (already available in Marp)';
}

choices.push(choice);
```

### UI Result

System themes will be displayed with gray color and cannot be selected:

```
--- default (built-in) ---
  ◯ default (Built-in theme, already available in Marp)  <- Grayed out, not selectable
  ◯ ├── beam - Inspired by / based on LaTeX's beamer class
  ◯ ├── default-clean - A clean, minimal theme based on default
```

## Edge Cases

| Case | Behavior |
|------|----------|
| System theme somehow selected | `ThemeResolver.resolveDependencies()` filters out `isSystem: true` themes, nothing copied |
| Only system themes selected | Returns empty selection, command exits with "Copied themes: none" |
| Mix of system + regular themes | System themes filtered out, only regular themes copied |

## Implementation

**Files to modify:**
1. `lib/prompts.js` — Add `disabled` property to system theme choices
2. `tests/unit/prompts.test.js` — Update tests to expect `disabled` field

**Changes:**
- Modify `_addThemeChoices()` to check `theme.isSystem` and add `disabled` field
- Add test "should mark system themes as disabled"
- Update "should mark system themes as built-in" test to verify `disabled` field

## Testing

- Unit test for `disabled` property on system themes
- Verify regular themes don't have `disabled` field
- Manual test with `theme:add` command to see grayed-out system themes
