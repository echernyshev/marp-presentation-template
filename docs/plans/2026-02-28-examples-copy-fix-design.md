# Examples Copy Logic Fix - Design Document

## Date
2026-02-28

## Problem
Current implementation changes the folder structure in the output project's `examples/` directory. Static assets are tied to individual examples, causing duplication or missing files when multiple examples from the same directory are selected.

## Requirements
1. Preserve original folder structure from `examples/` in metaproject
2. Copy only selected `.md` files based on `themes` field in frontmatter
3. If at least one example from a directory is selected, copy ALL non-`.md` files from that directory
4. If no examples from a directory are selected, do not create that directory in output
5. Empty `themes` array or undefined = base example (always copy)
6. Warn when overwriting existing files

## Architecture

### Directory-Based Copying Approach

1. **Discovery Phase**: `ExampleResolver.filterBySelectedThemes()` - already working
2. **Grouping Phase**: New method groups selected examples by parent directory
3. **Copying Phase**: For each directory with selected examples:
   - Create directory structure in target
   - Copy only selected `.md` files
   - Copy ALL non-`.md` files recursively

### Example Flow

Input: User selects themes `default-clean`, `marpx`

```
examples/
├── system/
│   ├── static/
│   │   └── demo-image.png
│   ├── marp-basics.md       (no themes field - base)
│   ├── default-clean.md     (themes: [default-clean]) ✓ SELECTED
│   ├── uncover-minimal.md   (themes: [uncover-minimal])
│   └── gaia-dark.md         (themes: [gaia-dark])
├── beam/
│   └── beam-example.md      (themes: [beam])
└── marpx/
    ├── marpx-demo.md        (themes: [marpx]) ✓ SELECTED
    └── socrates.md          (no themes field)
```

Output:
```
examples/
├── system/
│   ├── default-clean.md     ✓ copied
│   └── static/
│       └── demo-image.png   ✓ copied (all static files)
└── marpx/
    └── marpx-demo.md        ✓ copied
```

Note: `beam/` directory not created (no examples selected)

## Implementation

### Changes to `ExampleResolver` class

**New method: `groupByDirectory(selectedExamples)`**
```javascript
/**
 * Group selected examples by their parent directory
 * @param {Example[]} selectedExamples - Examples to copy
 * @returns {Map<string, {examples: Example[], staticFiles: string[]}>}
 *          Key: relative directory path from examples root
 *          Value: { examples: array of Example objects, staticFiles: array of relative paths to non-md files }
 */
groupByDirectory(selectedExamples) {
  const dirMap = new Map();

  for (const example of selectedExamples) {
    const dir = path.dirname(example.relativePath);

    if (!dirMap.has(dir)) {
      const staticFiles = this._findAllStaticFiles(dir);
      dirMap.set(dir, { examples: [], staticFiles });
    }

    dirMap.get(dir).examples.push(example);
  }

  return dirMap;
}
```

**New method: `_findAllStaticFiles(relativeDir)`**
```javascript
/**
 * Find all non-.md files in a directory recursively
 * @private
 * @param {string} relativeDir - Relative path from examples root
 * @returns {string[]} Array of relative file paths
 */
_findAllStaticFiles(relativeDir) {
  const files = [];
  const absDir = path.join(this.examplesDir, relativeDir);

  if (!fs.existsSync(absDir)) {
    return files;
  }

  const entries = fs.readdirSync(absDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isSymbolicLink()) {
      continue;
    }

    const fullPath = path.join(absDir, entry.name);
    const relativePath = path.join(relativeDir, entry.name);

    if (entry.isFile()) {
      if (!entry.name.endsWith('.md')) {
        files.push(relativePath);
      }
    } else if (entry.isDirectory()) {
      files.push(...this._findAllStaticFiles(relativePath));
    }
  }

  return files;
}
```

**Update `_parseExample` method:**
```javascript
// Change isBase detection
const themes = frontmatterData.themes;
const isBase = !themes || themes.length === 0;  // Include empty array
```

### Changes to `AddThemesCommand._copyExamples` method

```javascript
_copyExamples(examples, projectPath, examplesSourceDir) {
  if (!examples || examples.length === 0) {
    return;
  }

  const resolver = new ExampleResolver(examplesSourceDir);
  const dirMap = resolver.groupByDirectory(examples);

  const targetExamplesDir = path.join(projectPath, 'examples');
  if (!fs.existsSync(targetExamplesDir)) {
    fs.mkdirSync(targetExamplesDir, { recursive: true });
  }

  for (const [relativeDir, {examples: dirExamples, staticFiles}] of dirMap) {
    const targetDir = path.join(targetExamplesDir, relativeDir);
    fs.mkdirSync(targetDir, { recursive: true });

    // Copy only selected .md files
    for (const example of dirExamples) {
      const source = path.join(examplesSourceDir, example.relativePath);
      const target = path.join(targetExamplesDir, example.relativePath);

      if (fs.existsSync(target)) {
        console.warn(`Warning: Overwriting existing file: ${example.relativePath}`);
      }

      if (fs.existsSync(source)) {
        fs.copyFileSync(source, target);
      }
    }

    // Copy ALL static files from this directory
    for (const staticFile of staticFiles) {
      const source = path.join(examplesSourceDir, staticFile);
      const target = path.join(targetExamplesDir, staticFile);

      const fileDir = path.dirname(target);
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }

      if (fs.existsSync(source)) {
        fs.copyFileSync(source, target);
      }
    }
  }
}
```

## Testing

### Unit Tests

1. **`groupByDirectory`**
   - Groups examples by parent directory correctly
   - Includes all static files for each directory
   - Handles examples in root of `examples/`

2. **`_findAllStaticFiles`**
   - Finds all non-md files recursively
   - Excludes markdown files
   - Skips symbolic links

3. **`_copyExamples`**
   - Copies only selected md files but all static files
   - Preserves directory structure
   - Warns when overwriting existing files

### Manual Testing
```bash
node index.js test-copy --path /tmp
node index.js theme:add /tmp/test-copy default-clean marpx
ls -R /tmp/test-copy/examples/
```

## Files to Modify
- `lib/example-resolver.js` - Add new methods
- `lib/add-themes-command.js` - Update `_copyExamples` method
- `tests/unit/example-resolver.test.js` - Add new tests
- `tests/unit/add-themes-command.test.js` - Update tests
