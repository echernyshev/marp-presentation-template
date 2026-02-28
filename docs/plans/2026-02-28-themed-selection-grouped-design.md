# Grouped Theme Selection Design

**Date:** 2026-02-28  
**Status:** Design  
**Author:** Claude Code

## Problem Statement

Current theme selection (`create-marp-presentation theme:add`) displays all themes in a flat list. With 20+ themes (especially in the marpx family), the list is hard to navigate and themes appear mixed without clear structure.

**Current state:**
```
? Select themes to add:
◯ beam - Clean and minimal
◯ cantor - Set theory themed
◯ church - Lambda calculus themed
◯ default-clean - Minimal variation
◯ einstein - Physics themed
◯ gaia-dark - Dark variation
... (20 more)
```

## Requirements

1. Group themes by their base/parent theme
2. Display hierarchy using tree indentation (├──, └──, │)
3. Show system themes (default, gaia, uncover) as groups with "(built-in)" marker
4. All themes (nodes and leaves) must be selectable independently

## Design

### Theme Tree Structure

Build a tree from `@import` dependencies:

```javascript
{
  themeName: {
    theme: Theme,      // Theme object
    parent: string,    // Parent theme name or null
    children: string[] // Child theme names
  }
}
```

**Current theme hierarchy:**
```
default (system)
├── beam
├── default-clean
└── marpx
    ├── cantor
    ├── church
    ├── einstein
    ├── galileo
    ├── gauss
    ├── gödel
    ├── gropius
    ├── haskell
    ├── hobbes
    ├── lorca
    ├── newton
    ├── sparta
    ├── copernicus
    └── frankfurt

gaia (system)
└── gaia-dark

uncover (system)
└── uncover-minimal
```

### Algorithm

1. Scan all themes via `ThemeResolver.scanDirectory()`
2. Add system themes (default, gaia, uncover) as root nodes
3. For each theme, find parent from `theme.dependencies[0]`
4. Build tree: each theme knows its parent and children
5. Root themes = system themes + themes without `@import`

### Display Format

Use `inquirer.Separator` for group headers and tree prefixes for hierarchy:

```
? Select themes to add:
--- default (built-in) ---
  ◯ beam - Clean and minimal
  ◯ default-clean - Minimal variation
  ◯ marpx - Academic presentation theme
      ◯ cantor - Set theory themed
      ◯ church - Lambda calculus themed
      ◯ einstein - Physics themed
      ...

--- gaia (built-in) ---
  ◯ gaia-dark - Dark variation

--- uncover (built-in) ---
  ◯ uncover-minimal - Minimal variation
```

**Key behaviors:**
- All themes (nodes + leaves) are selectable
- Independent selection: can choose `marpx` without `einstein`, or vice versa
- Groups and themes sorted alphabetically
- System themes marked "(built-in)"

## Implementation

### Files to Modify

1. **`lib/prompts.js`**
   - Modify `promptThemes()` to build tree and format with grouping
   - Add helper functions: `buildThemeTree()`, `addThemeChoices()`

2. **`tests/unit/prompts.test.js`**
   - Update tests for new grouped output format
   - Add tests for tree building edge cases

### Key Functions

```javascript
// Build tree from themes
function buildThemeTree(themes) {
  const tree = {};
  // Add system themes as roots
  // Link each theme to its parent
  // Populate children arrays
  return tree;
}

// Recursively add theme choices with tree formatting
function addThemeChoices(themeName, tree, choices, prefix) {
  // Add current theme as choice
  // Recursively add children with tree prefixes (├──, └──)
}

// Main prompt function
static async promptThemes(availableThemes) {
  const tree = buildThemeTree(availableThemes);
  const choices = buildGroupedChoices(tree);
  return await inquirer.checkbox({ message: 'Select themes:', choices });
}
```

### Edge Cases

| Case | Handling |
|------|----------|
| Empty theme list | Return empty array (existing behavior) |
| Single theme, no children | Display without tree prefixes |
| Missing parent dependency | Theme becomes root node |
| Circular dependencies | Already handled by ThemeResolver |

## Testing

- Unit tests for `buildThemeTree()` with various hierarchies
- Unit tests for `addThemeChoices()` formatting
- Integration test with real themes from `themes/`
- Verify selection works for: root only, children only, both

## Future Considerations

- Support for themes with multiple parent levels (deeper than marpx → einstein)
- Collapse/expand groups if theme list grows significantly (>50 themes)
- Search/filter functionality for large theme libraries
