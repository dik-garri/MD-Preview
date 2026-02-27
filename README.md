# MD Preview

WYSIWYG Markdown editor for VS Code / Cursor with built-in themes and export to HTML/PDF.

## Features

- **WYSIWYG editing** — Notion/Typora-like editing experience powered by Milkdown
- **3 built-in themes** — GitHub (light), Dark, Minimal (serif)
- **Export to HTML** — standalone HTML file matching preview styles
- **Export to PDF** — via Chrome/Chromium (requires installation)

## Installation

### From source

```bash
# Clone and install
git clone <repo-url> md-extension
cd md-extension
npm install

# Build
npm run build

# Package as .vsix
npx @vscode/vsce package

# Install in VS Code
code --install-extension md-preview-0.0.1.vsix
```

Or in **Cursor**: `Cmd+Shift+P` → `Extensions: Install from VSIX...` → select `md-preview-0.0.1.vsix`.

### Development mode

```bash
npm install
npm run compile
```

Then press **F5** in VS Code/Cursor to launch the Extension Development Host.

## Usage

1. Open a `.md` file
2. Run **MD Preview: Open WYSIWYG Preview** from the Command Palette (`Cmd+Shift+P`)
3. Edit in the WYSIWYG panel — changes sync back to the source file

### Switch theme

Settings → search `mdPreview.theme` → choose `github`, `dark`, or `minimal`.

### Export

- **HTML**: Command Palette → **MD Preview: Export to HTML**
- **PDF**: Command Palette → **MD Preview: Export to PDF** (requires Chrome/Chromium installed)

## Requirements

- VS Code / Cursor `^1.85.0`
- Node.js (for building from source)
- Google Chrome or Chromium (for PDF export only)

## Author

Garry Dik
