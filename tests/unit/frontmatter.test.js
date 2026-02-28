// tests/unit/frontmatter.test.js
const { Frontmatter } = require('../../lib/frontmatter');
const fs = require('fs');
const path = require('path');

describe('Frontmatter.parse', () => {
  test('should parse frontmatter with theme key', () => {
    const content = `---
theme: gaia
---

# My Presentation`;
    const result = Frontmatter.parse(content);
    expect(result).toEqual({ theme: 'gaia' });
  });

  test('should parse frontmatter with multiple keys', () => {
    const content = `---
theme: marpx
paginate: true
style: |
  section {
    font-size: 24px;
  }
---

# Slide Title`;
    const result = Frontmatter.parse(content);
    expect(result.theme).toBe('marpx');
    expect(result.paginate).toBe(true);
    expect(result.style).toContain('font-size: 24px');
  });

  test('should return empty object when no frontmatter exists', () => {
    const content = `# My Presentation

No frontmatter here.`;
    const result = Frontmatter.parse(content);
    expect(result).toEqual({});
  });

  test('should handle frontmatter with only YAML comments', () => {
    const content = `---
# This is a comment
theme: default
---

# Content`;
    const result = Frontmatter.parse(content);
    expect(result.theme).toBe('default');
  });

  test('should parse frontmatter with array values', () => {
    const content = `---
themes:
  - gaia
  - marpx
---

# Content`;
    const result = Frontmatter.parse(content);
    expect(result.themes).toEqual(['gaia', 'marpx']);
  });
});

describe('Frontmatter.getTheme', () => {
  test('should return theme value when present', () => {
    const content = `---
theme: uncover
---

# Presentation`;
    const result = Frontmatter.getTheme(content);
    expect(result).toBe('uncover');
  });

  test('should return null when theme not in frontmatter', () => {
    const content = `---
paginate: true
---

# Presentation`;
    const result = Frontmatter.getTheme(content);
    expect(result).toBeNull();
  });

  test('should return null when no frontmatter exists', () => {
    const content = `# Just a heading`;
    const result = Frontmatter.getTheme(content);
    expect(result).toBeNull();
  });

  test('should handle theme with hyphenated name', () => {
    const content = `---
theme: my-custom-theme
---

# Content`;
    const result = Frontmatter.getTheme(content);
    expect(result).toBe('my-custom-theme');
  });
});

describe('Frontmatter.setTheme', () => {
  test('should update existing theme value', () => {
    const content = `---
theme: gaia
---

# Old Theme`;
    const result = Frontmatter.setTheme(content, 'marpx');
    expect(result).toContain('theme: marpx');
    expect(result).toContain('# Old Theme');
  });

  test('should add theme to existing frontmatter without theme', () => {
    const content = `---
paginate: true
---

# Presentation`;
    const result = Frontmatter.setTheme(content, 'uncover');
    expect(result).toContain('theme: uncover');
    expect(result).toContain('paginate: true');
  });

  test('should create frontmatter when none exists', () => {
    const content = `# Presentation\n\nNo frontmatter.`;
    const result = Frontmatter.setTheme(content, 'gaia');
    expect(result).toMatch(/^---\s*\ntheme: gaia\s*\n---\s*\n/);
    expect(result).toContain('# Presentation');
  });

  test('should preserve other frontmatter properties', () => {
    const content = `---
paginate: true
style: |
  h1 { color: red; }
---

# Presentation`;
    const result = Frontmatter.setTheme(content, 'marpx');

    const parsed = Frontmatter.parse(result);
    expect(parsed.theme).toBe('marpx');
    expect(parsed.paginate).toBe(true);
    expect(parsed.style).toContain('color: red');
  });

  test('should handle theme names with special characters', () => {
    const content = `# Content`;
    const result = Frontmatter.setTheme(content, 'my_theme-123');
    expect(result).toContain('theme: my_theme-123');
  });
});

describe('Frontmatter.writeToFile', () => {
  const tempDir = path.join(__dirname, '..', 'temp', 'frontmatter');

  beforeEach(() => {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('should write content to file', () => {
    const content = `---
theme: gaia
---

# Test`;
    const filePath = path.join(tempDir, 'test.md');

    Frontmatter.writeToFile(filePath, content);

    expect(fs.existsSync(filePath)).toBe(true);
    const written = fs.readFileSync(filePath, 'utf-8');
    expect(written).toBe(content);
  });

  test('should create parent directories if they do not exist', () => {
    const content = '# Deep File';
    const filePath = path.join(tempDir, 'level1', 'level2', 'deep.md');

    Frontmatter.writeToFile(filePath, content);

    expect(fs.existsSync(filePath)).toBe(true);
    const written = fs.readFileSync(filePath, 'utf-8');
    expect(written).toBe(content);
  });

  test('should overwrite existing file', () => {
    const filePath = path.join(tempDir, 'overwrite.md');
    fs.writeFileSync(filePath, 'old content');

    const newContent = `---
theme: marpx
---

# New Content`;
    Frontmatter.writeToFile(filePath, newContent);

    const written = fs.readFileSync(filePath, 'utf-8');
    expect(written).toBe(newContent);
  });

  test('should handle relative paths', () => {
    const content = '# Relative Path Test';
    const filePath = path.join(tempDir, 'relative.md');

    Frontmatter.writeToFile(filePath, content);

    expect(fs.existsSync(filePath)).toBe(true);
  });

  test('should preserve unicode content', () => {
    const content = `---
theme: gaia
---

# Présentation en Français

日本語のプレゼンテーザョン`;
    const filePath = path.join(tempDir, 'unicode.md');

    Frontmatter.writeToFile(filePath, content);

    const written = fs.readFileSync(filePath, 'utf-8');
    expect(written).toBe(content);
  });
});
