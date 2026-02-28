# Conflict Resolution Bug Fix Design

**Date:** 2026-02-28
**Status:** Designed
**Issue:** Dialog repeats when resolving single theme conflict

## Problem Description

When adding themes to an existing project, if a user selects an already existing theme, a conflict dialog appears. However, when the user chooses an action (Skip/Overwrite), the dialog repeats instead of resolving the conflict.

## Root Cause

In `lib/add-themes-command.js`, the `_resolveConflictsInteractive` method doesn't handle the return values `'skip'` and `'overwrite'` from `promptConflictResolution`.

When there's a single conflict:
1. `promptConflictResolution` returns `'skip'`, `'overwrite'`, or `'cancel'`
2. The code only checks for `'skip-all'`, `'overwrite-all'`, and `'cancel'`
3. When result is `'skip'` or `'overwrite'`, none of the conditions match
4. Code falls through to the `for` loop
5. User gets prompted again → **dialog repeats**

## Solution

Add explicit handling for `'skip'` and `'overwrite'` values in `_resolveConflictsInteractive`.

### Code Changes

**File:** `lib/add-themes-command.js`
**Method:** `_resolveConflictsInteractive` (lines 303-333)

Add after line 318 (after `if (result === 'cancel')`):
```javascript
// Handle single conflict responses
if (result === 'skip') return { overwrite: [] };
if (result === 'overwrite') return { overwrite: conflicts };
```

### Updated Logic Flow

| Return Value | Behavior |
|--------------|----------|
| `skip-all` | Skip all conflicts |
| `overwrite-all` | Overwrite all conflicts |
| `cancel` | Cancel operation |
| `skip` | Skip single conflict |
| `overwrite` | Overwrite single conflict |
| `choose-each` | Prompt for each conflict individually |

## Test Scenarios

1. **Single conflict - Skip**: Theme skipped, no dialog repeat
2. **Single conflict - Overwrite**: Theme overwritten, no dialog repeat
3. **Single conflict - Cancel**: Operation cancelled
4. **Multiple conflicts - choose-each**: Individual prompts for each
5. **Multiple conflicts - skip-all/overwrite-all**: Existing behavior verified

## Backward Compatibility

- No changes to public API
- Return values remain consistent
- Existing tests should pass without modification
- Custom prompt handlers still work via `this.options.prompts?.resolveConflicts`
