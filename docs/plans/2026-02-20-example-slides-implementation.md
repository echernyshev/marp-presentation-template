# Optional Example Slides Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add optional example slides demonstrating all Marp capabilities with interactive CLI prompt.

**Architecture:** Separate `template-optional/` folder contains example files that are conditionally copied when user accepts the prompt. CLI uses built-in `readline` for interactive input with non-interactive mode fallback.

**Tech Stack:** Node.js built-in modules (fs, path, readline), Jest for testing

---

## Task 1: Create template-optional directory structure

**Files:**
- Create: `template-optional/.gitkeep`
- Create: `template-optional/static/.gitkeep`

**Step 1: Create template-optional directory**

```bash
mkdir -p template-optional/static
```

**Step 2: Create .gitkeep files**

```bash
touch template-optional/.gitkeep template-optional/static/.gitkeep
```

**Step 3: Verify structure**

Run: `ls -la template-optional/ && ls -la template-optional/static/`
Expected: Both directories exist with .gitkeep files

**Step 4: Commit**

```bash
git add template-optional/
git commit -m "feat: create template-optional directory structure"
```

---

## Task 2: Create demo image for examples

**Files:**
- Create: `template-optional/static/demo-image.png`

**Step 1: Generate minimal SVG**

Create a temporary SVG file with minimalist geometric design:

```bash
cat > /tmp/demo-image.svg << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400">
  <rect width="800" height="400" fill="#f8f9fa"/>
  <circle cx="200" cy="200" r="80" fill="#4a90d9" opacity="0.8"/>
  <rect x="350" y="100" width="150" height="150" fill="#6c5ce7" opacity="0.7"/>
  <polygon points="600,320 700,120 800,320" fill="#00b894" opacity="0.75"/>
  <circle cx="500" cy="280" r="40" fill="#fd79a8" opacity="0.6"/>
  <rect x="100" y="280" width="100" height="60" fill="#ffeaa7" opacity="0.8"/>
</svg>
EOF
```

**Step 2: Convert SVG to PNG (requires ImageMagick or similar)**

If ImageMagick is available:
```bash
convert /tmp/demo-image.svg template-optional/static/demo-image.png
```

Alternative: Create a placeholder PNG using base64:

```bash
# Create a minimal 100x50 PNG placeholder
echo "iVBORw0KGgoAAAANSUhEUgAAAMgAAABkCAYAAADDhn8LAAAACXBIWXMAAAsTAAALEwEAmpwYAAAF" | base64 -d > template-optional/static/demo-image.png 2>/dev/null || \
echo "Note: Demo image will be created manually or use online tool"
```

If no image tool available, note in the file that a real image should be added:

```bash
echo "Demo image placeholder - replace with actual 800x400 PNG" > template-optional/static/README.txt
```

**Step 3: Verify image exists**

Run: `ls -la template-optional/static/`
Expected: demo-image.png exists (or README.txt as fallback)

**Step 4: Commit**

```bash
git add template-optional/static/
git commit -m "feat: add demo image for example slides"
```

---

## Task 3: Create examples.md with all slide types

**Files:**
- Create: `template-optional/examples.md`

**Step 1: Write examples.md**

```markdown
---
marp: true
theme: default
paginate: true
math: katex
---

# Marp Examples

Complete demonstration of Marp presentation capabilities

---

## Table of Contents

<!-- This auto-generates a table of contents -->
1. [Basic Formatting](#basic-formatting)
2. [Lists](#lists)
3. [Quotes and Footnotes](#quotes-and-footnotes)
4. [Code](#code)
5. [Tables](#tables)
6. [LaTeX Formulas](#latex-formulas)
7. [Images](#images)
8. [Multi-column Layouts](#multi-column-layouts)
9. [Backgrounds and Styling](#backgrounds-and-styling)
10. [Fragments (Animations)](#fragments-animations)

---

## Basic Formatting

### Headings work like regular Markdown

This is **bold text** and this is *italic text*.

You can also use ~~strikethrough~~ and `inline code`.

---

## Lists

### Unordered Lists

- First item
- Second item
  - Nested item
  - Another nested item
- Third item

### Ordered Lists

1. First step
2. Second step
3. Third step

---

## Quotes and Footnotes

> This is a blockquote.
> It can span multiple lines.
>
> — Author Name

Here's a sentence with a footnote[^1].

[^1]: This is the footnote content that appears at the bottom.

---

## Code

### JavaScript

```javascript
function greet(name) {
  console.log(`Hello, ${name}!`);
}

greet('Marp');
```

### Python

```python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print(fibonacci(10))
```

### Bash

```bash
#!/bin/bash
echo "Building presentation..."
npx @marp-team/marp-cli presentation.md -o output.html
```

---

## Tables

### Simple Table

| Feature | Status | Notes |
|---------|--------|-------|
| Markdown | ✅ | Full support |
| Code blocks | ✅ | Syntax highlighting |
| Images | ✅ | Local and remote |
| Math | ✅ | KaTeX support |

### Aligned Columns

| Left | Center | Right |
|:-----|:------:|------:|
| Default | Centered | Numbers |
| Text | Text | 1,234 |
| More | Data | 5,678 |

---

## LaTeX Formulas

### Inline and Block Math

Inline formula: $E = mc^2$

Block formula:

$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

### More Examples

Quadratic formula:

$$
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$

Matrix:

$$
\begin{pmatrix}
a & b \\
c & d
\end{pmatrix}
$$

---

## Images

### Basic Image

![Demo image](static/demo-image.png)

### Sized Image

![Width 300px](static/demo-image.png){ width=300px }

---

## Multi-column Layouts

### Using HTML Tables

<table>
<tr>
<td>

**Left Column**

- Point one
- Point two
- Point three

</td>
<td>

**Right Column**

- Another point
- More content
- Final item

</td>
</tr>
</table>

---

## Backgrounds and Styling

<!-- _backgroundColor: #1a1a2e -->
<!-- _color: #eaeaea -->

### Dark Slide

This slide has a custom dark background and light text color.

You can use HTML color codes or named colors.

---

<!-- _backgroundImage: url('static/demo-image.png') -->
<!-- _backgroundOpacity: 0.3 -->

### Image Background

This slide has an image background with reduced opacity.

---

## Fragments (Animations)

Use asterisk `*` for incremental reveal:

- *This appears first
- *This appears second
- *This appears third
- *This appears last

Press space to reveal each item!

---

<!-- _paginate: false -->

# Thank You!

## Questions?

- GitHub: https://github.com/marp-team/marp
- Docs: https://marp.app/

```
Contact: your-email@example.com
```
```

Write this content to `template-optional/examples.md`.

**Step 2: Verify file created**

Run: `wc -l template-optional/examples.md`
Expected: ~200+ lines

**Step 3: Commit**

```bash
git add template-optional/examples.md
git commit -m "feat: add examples.md with 13 slide types demonstrating Marp capabilities"
```

---

## Task 4: Add askCreateExamples function to CLI

**Files:**
- Modify: `index.js`

**Step 1: Add readline import at top of index.js**

After line 5 (`const { spawnSync } = require('child_process');`), add:

```javascript
const readline = require('readline');
```

**Step 2: Add askCreateExamples function**

After the `projectPath` variable (around line 23), add:

```javascript
// Запрос на создание примеров слайдов
async function askCreateExamples() {
  // Неинтерактивный режим — по умолчанию создаём примеры
  if (!process.stdin.isTTY) {
    return true;
  }

  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('Create example slides file? (Y/n) ', (answer) => {
      rl.close();
      const normalized = answer.toLowerCase().trim();
      resolve(normalized !== 'n' && normalized !== 'no');
    });
  });
}
```

**Step 3: Verify syntax**

Run: `node -c index.js`
Expected: No syntax errors

**Step 4: Commit**

```bash
git add index.js
git commit -m "feat: add askCreateExamples function for interactive prompt"
```

---

## Task 5: Add optional files copying logic to CLI

**Files:**
- Modify: `index.js`

**Step 1: Add copyOptionalFiles function**

After `copyDir` function (around line 63), add:

```javascript
// Копирование опциональных файлов
const copyOptionalFiles = (destPath) => {
  const optionalPath = path.join(__dirname, 'template-optional');

  // Копируем examples.md
  const examplesSrc = path.join(optionalPath, 'examples.md');
  const examplesDest = path.join(destPath, 'examples.md');
  if (fs.existsSync(examplesSrc)) {
    fs.copyFileSync(examplesSrc, examplesDest);
  }

  // Копируем демо-изображение
  const demoImageSrc = path.join(optionalPath, 'static', 'demo-image.png');
  const demoImageDest = path.join(destPath, 'static', 'demo-image.png');
  if (fs.existsSync(demoImageSrc)) {
    fs.copyFileSync(demoImageSrc, demoImageDest);
  }
};
```

**Step 2: Verify syntax**

Run: `node -c index.js`
Expected: No syntax errors

**Step 3: Commit**

```bash
git add index.js
git commit -m "feat: add copyOptionalFiles function"
```

---

## Task 6: Integrate async flow into main CLI

**Files:**
- Modify: `index.js`

**Step 1: Wrap main logic in async IIFE**

Replace the main try block (lines 44-92) with async flow:

```javascript
// Получаем путь к template
const templatePath = path.join(__dirname, 'template');

console.log(`Creating Marp presentation: ${projectName}`);
console.log();

// Основной async flow
(async () => {
  try {
    // Запрашиваем создание примеров
    const createExamples = await askCreateExamples();

    // Создаём папку проекта
    fs.mkdirSync(projectPath, { recursive: true });

    // Рекурсивно копируем template
    copyDir(templatePath, projectPath);

    console.log('✓ Project created');

    // Копируем опциональные файлы
    if (createExamples) {
      copyOptionalFiles(projectPath);
      console.log('✓ Example slides added');
      console.log('✓ Demo image added to static/');
    }
    console.log();

    // Запускаем npm install
    console.log('Installing dependencies...');
    const installResult = spawnSync('npm', ['install'], {
      cwd: projectPath,
      stdio: 'inherit',
    });

    if (installResult.status !== 0) {
      console.error();
      console.error('Failed to install dependencies.');
      console.error('Please run "cd ' + projectName + ' && npm install" manually.');
      process.exit(1);
    }

    console.log();
    console.log('✓ Dependencies installed');
    console.log();
    console.log('Next steps:');
    console.log(`  cd ${projectName}`);
    console.log('  npm run dev        # Start live preview');
    if (createExamples) {
      console.log('  marp examples.md   # Preview example slides');
    }
    console.log('  npm run build:all  # Build all formats');
    console.log();

  } catch (err) {
    console.error('Error creating project:', err.message);
    process.exit(1);
  }
})();
```

**Step 2: Verify syntax**

Run: `node -c index.js`
Expected: No syntax errors

**Step 3: Commit**

```bash
git add index.js
git commit -m "feat: integrate interactive prompt and optional files into CLI flow"
```

---

## Task 7: Update package.json files field

**Files:**
- Modify: `package.json`

**Step 1: Update files array**

Change the `files` field from:

```json
"files": [
  "index.js",
  "template/"
],
```

To:

```json
"files": [
  "index.js",
  "template/",
  "template-optional/"
],
```

**Step 2: Verify package.json is valid**

Run: `node -e "console.log(JSON.parse(require('fs').readFileSync('package.json')).files)"`
Expected: `['index.js', 'template/', 'template-optional/']`

**Step 3: Commit**

```bash
git add package.json
git commit -m "feat: add template-optional to npm package files"
```

---

## Task 8: Write tests for new CLI functionality

**Files:**
- Modify: `tests/cli.test.js`

**Step 1: Add test for examples.md creation**

Add this test to the existing test file:

```javascript
describe('CLI with examples', () => {
  const projectRoot = path.resolve(__dirname, '..');
  const testProjects = [];

  afterEach(() => {
    for (const project of testProjects) {
      if (fs.existsSync(project)) {
        fs.rmSync(project, { recursive: true, force: true });
      }
    }
  });

  test('should create examples.md in non-interactive mode', () => {
    const projectName = 'test-examples-auto';
    const projectPath = path.join(projectRoot, projectName);
    testProjects.push(projectPath);

    // stdin is not a TTY in test environment, so examples should be created
    const result = spawnSync('node', ['index.js', projectName], {
      cwd: projectRoot,
    });

    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(projectPath, 'examples.md'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'static', 'demo-image.png'))).toBe(true);
  });

  test('should not create examples.md when user declines', () => {
    const projectName = 'test-no-examples';
    const projectPath = path.join(projectRoot, projectName);
    testProjects.push(projectPath);

    const result = spawnSync('node', ['index.js', projectName], {
      cwd: projectRoot,
      input: 'n\n',
    });

    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(projectPath, 'examples.md'))).toBe(false);
  });
});
```

**Step 2: Run tests**

Run: `npm test`
Expected: All tests pass

**Step 3: Commit**

```bash
git add tests/cli.test.js
git commit -m "test: add tests for optional examples feature"
```

---

## Task 9: Manual integration testing

**Files:**
- None (manual testing)

**Step 1: Test interactive mode with examples**

```bash
node index.js test-manual-with-examples
# When prompted: Press Enter or type 'y'
cd test-manual-with-examples
ls -la
# Verify: examples.md exists, static/demo-image.png exists
npm run dev
# Verify: presentation.md loads in browser
# Then: marp examples.md
# Verify: examples.md renders correctly
```

**Step 2: Test interactive mode without examples**

```bash
cd ..
node index.js test-manual-no-examples
# When prompted: type 'n'
cd test-manual-no-examples
ls -la
# Verify: examples.md does NOT exist, static/ exists but no demo-image.png
```

**Step 3: Test non-interactive mode**

```bash
cd ..
echo "" | node index.js test-piped-input
cd test-piped-input
ls -la
# Verify: examples.md exists (piped empty input = default yes)
```

**Step 4: Clean up test projects**

```bash
cd ..
rm -rf test-manual-with-examples test-manual-no-examples test-piped-input
```

---

## Task 10: Update CLAUDE.md documentation

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Add documentation for template-optional**

Add this section after "## Architecture":

```markdown
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
```

**Step 2: Update Key Files table**

Add to the Key Files table:

```markdown
| `template-optional/examples.md` | Comprehensive Marp capabilities demo (13 slide types) |
| `template-optional/static/demo-image.png` | Demo image for image insertion examples |
```

**Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with template-optional documentation"
```

---

## Task 11: Final verification and version bump

**Files:**
- Modify: `package.json`

**Step 1: Run all tests**

```bash
npm test
```
Expected: All tests pass

**Step 2: Test dry-run publish**

```bash
npm publish --dry-run
```
Expected: Package includes template-optional/ files

**Step 3: Bump version**

```bash
# Update version in package.json from 1.0.1 to 1.1.0
npm version minor --no-git-tag-version
```

**Step 4: Final commit**

```bash
git add package.json
git commit -m "chore: bump version to 1.1.0 for optional examples feature"
```

**Step 5: Push to remote**

```bash
git push origin template-slides
```

---

## Summary

| Task | Description | Files Changed |
|------|-------------|---------------|
| 1 | Create template-optional structure | `template-optional/.gitkeep`, `template-optional/static/.gitkeep` |
| 2 | Create demo image | `template-optional/static/demo-image.png` |
| 3 | Create examples.md | `template-optional/examples.md` |
| 4 | Add askCreateExamples function | `index.js` |
| 5 | Add copyOptionalFiles function | `index.js` |
| 6 | Integrate async flow | `index.js` |
| 7 | Update package.json files | `package.json` |
| 8 | Add tests | `tests/cli.test.js` |
| 9 | Manual testing | - |
| 10 | Update docs | `CLAUDE.md` |
| 11 | Final verification | `package.json` |
