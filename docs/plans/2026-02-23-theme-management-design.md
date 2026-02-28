# Theme Management System Design

**Date:** 2026-02-23
**Author:** Design session with user
**Status:** Approved

## Overview

The theme management system enables users to create, manage, and switch between Marp themes in their presentation projects. It provides CLI commands for theme operations and integrates with VSCode for live preview.

## Requirements

See [docs/reqs/themes-requirements.md](../reqs/themes-requirements.md) for detailed requirements.

### Key Requirements Summary

- **System themes:** `default`, `gaia`, `uncover` (built into Marp)
- **User themes:** CSS files that can import other themes via `@import`
- **Theme identification:** via `/* @theme name */` directive in CSS
- **Interactive CLI:** using `@inquirer/prompts` (Inquirer.js v3+)
- **VSCode integration:** dynamic updates to `.vscode/settings.json`
- **Testing:** full coverage with Jest

## Architecture

### Monolithic Approach

Selected approach: **Monolithic ThemeManager** with focused helper classes.

### File Structure

```
create-marp-presentation/           # Мета-пакет (npm published)
├── index.js                        # CLI entry point
├── lib/                            # Библиотечный код
│   ├── add-themes-command.js       # addThemesCommand функция
│   ├── theme-manager.js            # Main ThemeManager class
│   ├── theme-resolver.js           # Parse CSS for @theme and @import
│   ├── prompts.js                  # Wrappers around @inquirer/prompts
│   ├── vscode-integration.js       # Update .vscode/settings.json
│   ├── frontmatter.js              # Parse/edit markdown frontmatter
│   └── errors.js                   # Custom error classes
│
├── template/                       # Копируется в создаваемый проект
│   ├── themes/                     # Flat structure: themes/{name}/
│   │   ├── beam/
│   │   │   └── beam.css
│   │   ├── marpx/
│   │   │   ├── marpx.css
│   │   │   └── socrates.css
│   │   ├── gaia-dark/
│   │   │   └── dark.css
│   │   ├── uncover-minimal/
│   │   │   └── minimal.css
│   │   └── default-clean/
│   │       └── clean.css
│   │
│   └── scripts/                    # Копируется в project/scripts/
│       ├── theme-cli.js            # CLI entry point for npm scripts
│       └── lib/                    # Копия lib/ для theme-cli.js
│           ├── theme-manager.js
│           ├── theme-resolver.js
│           ├── prompts.js
│           ├── vscode-integration.js
│           ├── frontmatter.js
│           └── errors.js
│
└── tests/
    ├── unit/
    │   ├── theme-resolver.test.js
    │   ├── vscode-integration.test.js
    │   ├── theme-manager.test.js
    │   └── add-themes-command.test.js
    ├── integration/
    │   └── theme-cli.test.js
    └── fixtures/
        ├── themes/
        └── presentations/
```

### Key Architectural Decisions

1. **lib/ копируется в project/scripts/lib/** — theme-cli.js в созданном проекте использует локальную копию модулей

2. **addThemesCommand в мета-пакете** — функция находится в create-marp-presentation/lib/add-themes-command.js, используется:
   - index.js при создании проекта
   - CLI команда `add-themes` для theme:add-from-template

3. **npx для theme:add-from-template** — вызывается через `npx create-marp-presentation add-themes`, код выполняется из установленного пакета

## Components

### ThemeResolver

Parses CSS files to extract theme metadata.

```javascript
class ThemeResolver {
  /**
   * Extract theme name from CSS: /* @theme beam *\/
   * Falls back to filename if directive not found
   */
  static extractThemeName(cssContent) → string

  /**
   * Extract @import dependencies: @import "gaia"
   * Ignores url() imports
   */
  static extractDependencies(cssContent) → string[]

  /**
   * Full theme resolution from single CSS file
   */
  static resolveTheme(cssPath) → Theme

  /**
   * Scan directory recursively for all themes
   * Returns flat array of Theme objects
   * Used by: index.js (project creation) and theme:list
   */
  static scanDirectory(themesPath) → Theme[]

  /**
   * Resolve all dependencies for selected themes
   * Returns complete set of themes to copy (including parents)
   * Excludes system themes (default, gaia, uncover)
   *
   * @param {Theme[]} selectedThemes - themes user selected
   * @param {Theme[]} allThemes - all available themes in template
   * @returns {Theme[]} - themes to copy (selected + dependencies)
   *
   * Example:
   *   selected: [socrates]
   *   socrates.dependencies: [marpx]
   *   marpx.dependencies: [default]  ← system, not copied
   *   returns: [socrates, marpx]
   */
  static resolveDependencies(selectedThemes, allThemes) → Theme[]
}
```

### Theme

```javascript
class Theme {
  constructor(name, path, css, dependencies = [])

  name: string           // From /* @theme */ or filename
  path: string           // Full path to CSS file
  css: string            // CSS content
  dependencies: string[] // Parent themes
  isSystem: boolean      // false for user themes
}
```

### VSCodeIntegration

Manages VSCode settings for Marp extension.

```javascript
class VSCodeIntegration {
  constructor(projectPath)

  /**
   * Sync themes to markdown.marp.themes in settings.json
   * Creates settings.json if not exists
   * Backs up corrupted JSON and recreates
   */
  syncThemes(themes: Theme[]) → void

  readSettings() → object
  writeSettings(settings: object) → void
}
```

**VSCode settings format:**
```json
{
  "markdown.marp.themes": [
    "themes/beam/beam.css",
    "themes/marpx/marpx.css"
  ]
}
```

### ThemeManager

Main class for theme operations. **Delegates scanning to ThemeResolver.**

```javascript
class ThemeManager {
  constructor(projectPath)

  // Properties
  get themesPath() → string  // path/to/project/themes

  // Reading
  /**
   * Scan themes in project
   * IMPLEMENTATION: delegates to ThemeResolver.scanDirectory(this.themesPath)
   */
  scanThemes() → Theme[]
  getTheme(name) → Theme | null
  getActiveTheme() → string | null

  // Modification
  createTheme(name, parent, directory) → void
  setActiveTheme(themeName) → void

  // Integration
  updateVSCodeSettings() → void
}
```

**Single Source of Truth:** `ThemeResolver.scanDirectory()` — единственная реализация сканирования тем.
- `ThemeManager.scanThemes()` → вызывает `ThemeResolver.scanDirectory(this.themesPath)`
- `index.js` (project creation) → вызывает `ThemeResolver.scanDirectory(template/themes/)`
- Это обеспечивает консистентность логики сканирования везде.
```

### Prompts

Interactive prompts using `@inquirer/prompts`.

```javascript
const inquirer = require('@inquirer/prompts');

async function promptThemes(availableThemes) → string[]
async function promptActiveTheme(selectedThemes) → string
async function promptNewThemeName() → string
async function promptParentTheme(availableThemes) → string | null
async function promptDirectoryLocation(existingDirs) → string
async function promptNewFolderName() → string
```

## CLI Commands

### create-marp-presentation Commands

#### `npx create-marp-presentation add-themes <target-dir>`

**Общая команда для добавления тем из шаблона.** Используется:
- При создании проекта (Flow 1)
- В theme:add-from-template (вызывается через npx)

```
# Интерактивный режим
$ npx create-marp-presentation add-themes ./my-project

? Select themes to add:
  ☁ beam
  ☁ socrates
  ☐ gaia-dark

✓ Added 2 themes with dependencies
  - beam (themes/beam/)
  - socrates (themes/marpx/socrates.css)
  - marpx (dependency of socrates)
✓ VSCode settings updated

# Неинтерактивный режим (CI/CD)
$ npx create-marp-presentation add-themes ./my-project --themes=beam,socrates

✓ Added themes: beam, socrates (with dependencies)
```

**Аргументы:**
- `<target-dir>` — путь к директории проекта (должен существовать)
- `--themes=name1,name2` — список тем (опционально, для CI/CD)

**Логика:**
1. `ThemeResolver.scanDirectory(template/themes/)` → все доступные темы
2. Если `--themes` не указан → `@inquirer/checkbox` для выбора
3. `ThemeResolver.resolveDependencies()` → темы + родители
4. Копирование в `<target-dir>/themes/`
5. Обновление `<target-dir>/.vscode/settings.json`

---

### Project CLI Commands (npm scripts)

| Command | Description |
|---------|-------------|
| `theme:list` | List all themes in project |
| `theme:add` | Create new theme with parent selection |
| `theme:add-from-template` | Add themes from create-marp-presentation template |
| `theme:switch -- <name>` | Switch active theme in presentation.md |

### npm scripts

```json
{
  "scripts": {
    "theme:list": "node scripts/theme-cli.js list",
    "theme:add": "node scripts/theme-cli.js add",
    "theme:add-from-template": "node scripts/theme-cli.js add-from-template",
    "theme:switch": "node scripts/theme-cli.js switch"
  }
}
```

### Command Details

#### theme:list

Shows all themes in project with dependencies.

```
$ npm run theme:list

Themes in project:
  ✓ beam              (themes/beam/beam.css) extends: default
  ✓ marpx             (themes/marpx/marpx.css) extends: default
  ✓ socrates          (themes/marpx/socrates.css) extends: marpx

Active theme: beam
```

#### theme:add

Creates new theme with parent and directory selection.

```
$ npm run theme:add

? Theme name: my-dark
? Parent theme:
❯ none (create from scratch)
  default (system built-in)
  gaia (system built-in)
  marpx (custom)

? Where to create the theme CSS file?
❯ In root (themes/my-dark.css)
  In existing folder: themes/marpx/
  In new folder (enter name)

? Folder name: gaia-variants

✓ Created themes/gaia-variants/my-dark.css
✓ Theme registered in VSCode settings
```

#### theme:add-from-template

**Делегирует к `npx create-marp-presentation add-themes`**

```javascript
// template/scripts/theme-cli.js
case 'add-from-template':
  // Просто вызываем общую команду через npx
  const { execSync } = require('child_process');
  execSync(`npx create-marp-presentation add-themes ${process.cwd()}`, {
    stdio: 'inherit'
  });
  break;
```

```
$ npm run theme:add-from-template
# → npx create-marp-presentation add-themes $(pwd)

? Select themes to add:
  ☁ beam
  ☁ marpx
  ☐ socrates

✓ Added 2 themes with dependencies
```

**Преимущества:**
- Код добавления тем в одном месте (create-marp-presentation)
- Обновления автоматически доступны во всех проектах
- Консистентное поведение при создании проекта и добавлении тем позже

#### theme:switch

Switch active theme in presentation.md.

```
$ npm run theme:switch beam

✓ Active theme changed to 'beam'
  Updated presentation.md frontmatter
```

Interactive mode (no argument):
```
$ npm run theme:switch

? Select active theme:
❯ beam
  marpx
  socrates

✓ Active theme changed to 'beam'
```

**IMPORTANT:** Only edits `theme` attribute in frontmatter, preserves all other content.

## Data Flows

### Flow 1: Project Creation with Theme Selection

```
npx create-marp-presentation my-project
  ↓
[index.js]
  ↓
1. Создать директорию проекта
2. Скопировать template/* → my-project/
   (кроме template/themes/)
  ↓
3. Вызвать addThemesCommand(projectPath)
   ┌─────────────────────────────────────────────────────────┐
   │ ThemeResolver.scanDirectory(template/themes/)          │
   │   ├── Найти все *.css файлы рекурсивно                 │
   │   ├── extractThemeName() + extractDependencies()       │
   │   └── Вернуть плоский список Theme[]                   │
   │                                                       │
   │ @inquirer/checkbox: Select themes to add              │
   │   Пример:                                            │
   │     ☐ beam                                           │
   │     ☐ marpx                                          │
   │     ☁ socrates  ← выбрал пользователь                │
   │     ☐ gaia-dark                                      │
   │                                                       │
   │ ThemeResolver.resolveDependencies(selected, all)       │
   │   └── socrates → marpx → [socrates, marpx]           │
   │                                                       │
   │ Copy themes to project/themes/                        │
   │   ├── marpx/* → project/themes/marpx/                │
   │   └── (default НЕ копируется - системная)             │
   │                                                       │
   │ VSCodeIntegration.syncThemes()                        │
   │   └── Обновить .vscode/settings.json                  │
   └─────────────────────────────────────────────────────────┘
  ↓
4. @inquirer/select: Select active theme
   Choices: только скопированные темы
  ↓
5. ThemeManager.setActiveTheme(themeName)
   └── Обновить presentation.md frontmatter
  ↓
6. npm install
  ↓
Done
```

**Важно:**
- Шаг 3 — это та же логика, что в `add-themes` команде
- `addThemesCommand()` экспортируется и используется:
  - index.js (создание проекта)
  - CLI команда `add-themes` (для theme:add-from-template)
- **Single Source of Truth** для логики добавления тем

### Общая функция: addThemesCommand

Используется в Flow 1 (создание проекта) и Flow 3 (theme:add-from-template).

```
addThemesCommand(targetPath, options = {})
  ↓
ThemeResolver.scanDirectory(template/themes/) → Theme[]
  ↓
[Если options.themes не задан]
  @inquirer/checkbox: Select themes → selectedThemes[]
[Иначе]
  selectedThemes = options.themes
  ↓
ThemeResolver.resolveDependencies(selectedThemes, allThemes) → Theme[]
  ↓
[Проверка конфликтов]
  existingThemes = ThemeResolver.scanDirectory(targetPath/themes/)
  conflicts = findConflicts(themesToCopy, existingThemes)
  ↓
[Если есть конфликты]
  @inquirer/select: "Theme X already exists. Action?"
    - Skip (пропустить)
    - Overwrite (перезаписать)
    - Cancel (отменить всё)
  ↓
Copy to targetPath/themes/
  ├── Исключить системные темы (default, gaia, uncover)
  ├── Исключить skipped темы
  └── Сохранить структуру папок
  ↓
VSCodeIntegration.syncThemes(themesToCopy)
  ↓
Return: { added: Theme[], skipped: Theme[], dependencies: Theme[] }
```

### Conflict Handling

When a theme already exists in the project:

```
? Theme "beam" already exists at themes/beam/beam.css
  What would you like to do?

❯ Skip (keep existing)
  Overwrite (replace with template version)
  Cancel (stop adding themes)
```

**Options:**
- **Skip:** Keep existing theme, don't copy from template
- **Overwrite:** Replace existing theme with template version
- **Cancel:** Stop the entire operation

**For multiple conflicts:**
```
? 3 themes already exist in your project:
  - beam (themes/beam/)
  - marpx (themes/marpx/)
  - socrates (themes/marpx/socrates.css)

? Apply to all conflicts?
❯ Skip all
  Overwrite all
  Choose for each
  Cancel
```

### Flow 2: theme:list

```
npm run theme:list
  ↓
ThemeManager.scanThemes()
  ↓
Parse all CSS files in themes/
  ↓
Display theme list with dependencies
  ↓
Show active theme from presentation.md
```

### Flow 3: theme:add-from-template

```
npm run theme:add-from-template
  ↓
theme-cli.js
  ↓
execSync('npx create-marp-presentation add-themes $(pwd)')
  ↓
[addThemesCommand выполняется]
  ↓
Done
```

**Реализация в theme-cli.js:**
```javascript
case 'add-from-template':
  const { execSync } = require('child_process');
  const projectPath = process.cwd();
  execSync(`npx create-marp-presentation add-themes "${projectPath}"`, {
    stdio: 'inherit'
  });
  break;
```

### Flow 4: theme:add

```
npm run theme:add
  ↓
promptNewThemeName()
  ↓
ThemeManager.scanThemes() → existing themes
  ↓
promptParentTheme(existing themes)
  ↓
promptDirectoryLocation()
  ↓
[If new folder] promptNewFolderName()
  ↓
Create directory if needed
  ↓
Generate CSS template with @import if parent selected
  ↓
VSCodeIntegration.syncThemes()
  ↓
Done
```

### Flow 5: theme:switch

```
npm run theme:switch [theme-name]
  ↓
ThemeManager.scanThemes() → available themes
  ↓
[If no arg] @inquirer/select: Choose theme
  ↓
Validate theme exists
  ↓
ThemeManager.setThemeInFrontmatter(themeName)
  ↓
Parse presentation.md frontmatter
  ↓
Find/replace only: theme: old → theme: new
  ↓
Write updated presentation.md
  ↓
Done
```

## Error Handling

### Error Classes

```javascript
class ThemeError extends Error

class ThemeNotFoundError extends ThemeError
class ThemeAlreadyExistsError extends ThemeError
class PresentationNotFoundError extends ThemeError
class InvalidCSSError extends ThemeError
class VSCodeIntegrationError extends ThemeError
```

### Error Handling Strategy

| Component | Error Handling |
|-----------|----------------|
| ThemeResolver | Fallback to filename if no /* @theme */ |
| VSCodeIntegration | Create if missing, backup + recreate if corrupted |
| ThemeManager | Validate before operations, clear error messages |
| CLI | User-friendly messages with actionable suggestions |

## Testing

### Test Structure

```
tests/
├── unit/
│   ├── theme-resolver.test.js
│   ├── vscode-integration.test.js
│   └── theme-manager.test.js
├── integration/
│   └── theme-cli.test.js
└── fixtures/
    ├── themes/
    └── presentations/
```

### Coverage Targets

| Component | Target |
|-----------|--------|
| ThemeResolver | 90%+ |
| VSCodeIntegration | 85%+ |
| ThemeManager | 90%+ |
| theme-cli | 80%+ |
| **Overall** | **85%+** |

### Key Test Cases

1. **ThemeResolver**
   - Extract theme name from CSS comment
   - Fallback to filename
   - Extract @import dependencies
   - Ignore url() imports

2. **VSCodeIntegration**
   - Create settings.json if not exists
   - Merge with existing settings
   - Backup corrupted JSON

3. **ThemeManager**
   - Scan all themes in directory
   - Set active theme in frontmatter
   - Create frontmatter if not exists
   - Preserve content when updating theme

4. **CLI**
   - All commands execute correctly
   - Interactive mode works
   - Proper error messages

5. **addThemesCommand**
   - Select themes from template
   - Resolve dependencies
   - Handle conflicts (skip/overwrite/cancel)
   - Copy themes to project
   - Update VSCode settings

6. **Conflict Resolution**
   - Detect existing themes
   - Prompt for action
   - Skip selected themes
   - Overwrite selected themes
   - Cancel operation

## Implementation Notes

### Dependencies

**Root package.json (create-marp-presentation):**
```json
{
  "dependencies": {
    "@inquirer/prompts": "^7.0.0"
  },
  "devDependencies": {
    "jest": "^29.7.0"
  }
}
```

**template/package.json (generated project):**
```json
{
  "dependencies": {
    "@inquirer/prompts": "^7.0.0",
    "gray-matter": "^4.0.3"
  },
  "devDependencies": {
    "@marp-team/marp-cli": "^4.1.2"
  }
}
```

### File Copying Mechanism

Use Node.js built-in `fs.cpSync()` for recursive directory copying:

```javascript
import fs from 'fs';
import path from 'path';

function copyThemeToProject(theme, projectPath) {
  const sourceDir = path.dirname(theme.path);
  const themeDirName = path.basename(sourceDir);
  const targetDir = path.join(projectPath, 'themes', themeDirName);

  // Copy entire theme directory
  fs.cpSync(sourceDir, targetDir, { recursive: true });
}
```

**For lib/ copying during project creation:**
```javascript
function copyLibToProject(projectPath) {
  const libSource = path.join(__dirname, 'lib');
  const libTarget = path.join(projectPath, 'scripts', 'lib');
  fs.cpSync(libSource, libTarget, { recursive: true });
}
```

### Finding Template Themes Path

```javascript
// In addThemesCommand
function getTemplateThemesPath() {
  // When running from index.js
  return path.join(__dirname, '..', 'template', 'themes');

  // When installed as npm package and run via npx
  // __dirname points to lib/ directory in installed package
}
```

### Theme Template CSS

**No parent (from scratch):**
```css
/* @theme my-theme */

:root {
  /* Your theme variables */
}
```

**With parent:**
```css
/* @theme my-theme */

@import "default";

:root {
  /* Your overrides */
}
```

**Custom parent:**
```css
/* @theme my-theme */

@import "../marpx/marpx.css";

:root {
  /* Your overrides */
}
```

### Theme Sources

Initial themes from `docs/reqs/theme-templates/`:
- `beam/beam.css` - Beamer-inspired theme
- `marpx/marpx.css` - Academic theme base
- `marpx/socrates.css` - Socrates theme extending marpx

Plus one theme per system theme:
- `gaia-dark/dark.css` - Dark variant of gaia
- `uncover-minimal/minimal.css` - Minimal variant of uncover
- `default-clean/clean.css` - Clean variant of default

## Manual Operations

Users can manually:

**Add CSS file to theme:**
```bash
cp ~/my-styles.css themes/marpx/
# Then manually add @import to appropriate CSS file
```

**Remove theme:**
```bash
rm -rf themes/beam
```

## Next Steps

1. Create implementation plan via `writing-plans` skill
2. Implement ThemeResolver
3. Implement VSCodeIntegration
4. Implement ThemeManager
5. Implement prompts
6. Implement theme-cli
7. Add tests
8. Update main index.js for project creation flow
