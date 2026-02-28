# Theme Management Guide

This guide explains how to use the theme management system in your Marp presentation project.

## Overview

The theme management system provides a simple way to:
- Add pre-built themes to your project
- List available and installed themes
- Switch between themes
- Create custom themes
- Integrate with VSCode for live preview

## Available Themes

The following themes are available in the template:

- **beam** - Clean, modern theme with progress bar
- **default-clean** - Minimal variation of default theme
- **gaia-dark** - Dark version of the Gaia theme
- **marpx** - Extended version of Marp's default theme
- **socrates** - Educational theme with clear typography
- **uncover-minimal** - Minimal reveal-style theme

### System Themes

These built-in Marp themes are always available:
- **default** - Marp's default theme
- **gaia** - Clean, professional theme
- **uncover** - Slide-by-slide reveal theme

## Commands

### List Themes

```bash
npm run theme:list
```

This shows:
- Available themes in the theme library
- Installed themes in your project's `themes/` directory
- Dependencies for each theme

### Add Themes

```bash
npm run theme:add
```

You'll be prompted to:
1. Select themes from the available list
2. Resolve any conflicts (if themes with the same name exist)
3. Confirm the selection

The command will:
- Copy theme files to your `themes/` directory
- Resolve dependencies automatically
- Update VSCode settings
- Skip themes that would conflict (unless using `--force`)

**Options:**
```bash
npm run theme add --force      # Overwrite existing themes
npm run theme add --no-vscode  # Skip VSCode settings update
```

### Set Active Theme

```bash
npm run theme:set <theme-name>
```

This will:
- Update the `theme` value in `presentation.md` frontmatter
- Add the theme to VSCode settings (for custom themes)
- Warn if the theme is not installed

**Examples:**
```bash
npm run theme:set beam
npm run theme:set default
npm run theme:set gaia
```

### Create Custom Theme

```bash
npm run theme:create <theme-name>
```

You'll be prompted to:
1. Select a parent theme to base your theme on
2. Choose a directory location (root, subfolder, or new folder)

The command will:
- Create a new CSS file in the appropriate location
- Add the theme directive and parent import
- Update VSCode settings if needed

**Example:**
```bash
npm run theme:create my-brand
# Select parent: beam
# Select location: root
# Creates: themes/my-brand.css
```

## Theme File Structure

Themes are organized in the `themes/` directory:

```
my-presentation/
├── themes/
│   ├── beam.css
│   ├── marpx.css
│   └── custom/
│       └── my-theme.css
└── presentation.md
```

### Theme File Format

Each theme CSS file must include:
1. A theme directive: `/* @theme theme-name */`
2. Optional parent imports: `@import "parent-theme";`

**Example:**
```css
/* @theme my-custom */
@import "beam";

:root {
  --color-primary: #3498db;
  --color-secondary: #2ecc71;
}

section {
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary));
}
```

## VSCode Integration

The theme management system automatically updates VSCode settings for live preview support.

### Settings Location

`.vscode/settings.json`:
```json
{
  "markdown.marp.themes": [
    "themes/beam/beam.css",
    "themes/marpx/marpx.css"
  ]
}
```

### How It Works

- When you add themes, they're added to the settings
- When you set an active theme, it's added to the settings
- System themes (default, gaia, uncover) are not added (built-in)
- Use `--no-vscode` to skip this behavior

## Manual Theme Management

You can also manage themes manually:

### Add a Theme Manually

1. Copy your theme CSS file to the `themes/` directory (e.g., `themes/your-theme/your-theme.css`)
2. Add the theme directive: `/* @theme your-theme-name */`
3. Update `.vscode/settings.json` if needed:
   ```json
   {
     "markdown.marp.themes": ["themes/your-theme/your-theme.css"]
   }
   ```

### Switch Theme Manually

Edit `presentation.md`:
```yaml
---
marp: true
theme: your-theme-name
---
```

## Troubleshooting

### Theme Not Found

If you get a "Theme not found" error:
1. Check if the theme is installed: `npm run theme:list`
2. Add the theme if missing: `npm run theme:add`
3. Verify the theme name matches exactly

### Live Preview Not Working

If VSCode live preview doesn't show your theme:
1. Check `.vscode/settings.json` exists
2. Verify the theme path is correct
3. Reload the VSCode window

### Dependencies Not Found

Warning about missing dependencies is expected for system themes (default, gaia, uncover). These are built into Marp CLI and don't need to be in your project.

## Best Practices

1. **Use Descriptive Names**: Name themes clearly (e.g., `brand-primary`, `presentation-dark`)
2. **Organize Themes**: Use subfolders for many themes
3. **Document Dependencies**: Include parent theme imports in comments
4. **Test Themes**: Always test with `npm run dev` after changing themes
5. **Version Control**: Commit your custom themes to git

## Advanced Usage

### Creating Theme Variants

Create multiple variants based on the same parent:

```bash
npm run theme:create brand-light  # Parent: beam
npm run theme:create brand-dark   # Parent: beam
```

Edit the themes to differentiate them:

```css
/* themes/brand-light.css */
/* @theme brand-light */
@import "beam";
:root { --bg-color: #ffffff; }

/* themes/brand-dark.css */
/* @theme brand-dark */
@import "beam";
:root { --bg-color: #1a1a1a; }
```

### Conditional Themes

Use different themes for different presentations:

```bash
# For external presentations
npm run theme:set brand-professional

# For internal workshops
npm run theme:set brand-casual
```

## References

- [Marp Theme Documentation](https://marp.app/docs/theming)
- [Marp CLI GitHub](https://github.com/marp-team/marp-cli)
- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
