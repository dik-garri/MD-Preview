# MD Preview — VS Code Extension Design

## Summary

A VS Code extension for viewing and editing Markdown files with a WYSIWYG editor, built-in themes, and export to HTML/PDF.

## Requirements

- **WYSIWYG editing** — Notion/Typora-like editing experience inside VS Code
- **Built-in themes** — GitHub, dark, minimal styles for the preview
- **Export to HTML** — standalone HTML file with inline CSS matching preview
- **Export to PDF** — via puppeteer-core (requires Chrome/Chromium installed)

## Approach

**Webview + Milkdown Crepe** — VS Code Webview API with Milkdown v7 Crepe (ProseMirror-based WYSIWYG Markdown editor).

## Architecture

```
Extension Host (TypeScript)
├── Commands (mdPreview.open, mdPreview.exportHtml, mdPreview.exportPdf)
├── Settings (mdPreview.theme: github | dark | minimal)
├── WebviewPanel
│   └── Milkdown Crepe editor + theme via --crepe-* CSS variables
└── Export Service
    ├── HTML (markdown-it + Milkdown-matched CSS)
    └── PDF (puppeteer-core + Chrome)
```

## Data Flow

### Opening a file
1. User invokes `MD Preview: Open WYSIWYG Preview` command
2. Extension creates WebviewPanel, sets HTML with script tag
3. Webview loads, sends `ready` message to extension
4. Extension receives `ready` → sends `setContent` (markdown) + `setTheme` (CSS)
5. Milkdown Crepe initializes with markdown content
6. On edit: Milkdown serializes → sends `contentChanged` → Extension applies edit to source file

### Themes
3 built-in themes override Milkdown `--crepe-*` CSS variables on `.milkdown` class:
- `github` — light theme with GitHub-style colors
- `dark` — dark theme (GitHub Dark-inspired)
- `minimal` — serif fonts, narrow layout, clean aesthetics

Themes are CSS files read from disk and injected via `postMessage({ command: "setTheme", css })`. Switching happens in real-time via `onDidChangeConfiguration` listener.

### Export HTML
1. Read markdown from active editor
2. markdown-it renders MD → HTML body
3. Wrap in full HTML document with Milkdown-matched export CSS (same sizes, fonts, colors)
4. Save via `showSaveDialog`

### Export PDF
1. Generate HTML (same as above)
2. puppeteer-core launches Chrome headless → `page.setContent(html)` → `page.pdf()`
3. Chrome path auto-detected on macOS/Linux/Windows

## Project Structure

```
md-extension/
├── package.json              # Extension manifest + contributes
├── tsconfig.json
├── webpack.config.js         # Dual build: extension (node) + webview (web)
├── .vscode/
│   ├── launch.json           # F5 to run Extension Development Host
│   └── tasks.json
├── src/
│   ├── extension.ts          # Activate, commands, WebviewPanel, theme sync
│   ├── webview/
│   │   ├── index.ts          # Milkdown Crepe init + message handling
│   │   ├── vscode.d.ts       # Type declarations for acquireVsCodeApi
│   │   └── themes/
│   │       ├── github.css    # --crepe-* overrides for GitHub style
│   │       ├── dark.css      # --crepe-* overrides for dark style
│   │       └── minimal.css   # --crepe-* overrides for minimal style
│   ├── commands/
│   │   ├── exportHtml.ts     # Export to HTML command
│   │   └── exportPdf.ts      # Export to PDF command
│   └── services/
│       └── export.ts         # markdown-it render, export CSS, theme loader
├── dist/                     # Built extension.js
└── media/                    # Built webview.js + font assets
```

## Key Decisions

- **Bundler**: webpack with dual config (node + web targets)
- **Webview bundling**: ESM resolution (`conditionNames: ["import"]`) + `LimitChunkCountPlugin` for single file
- **Language**: TypeScript
- **WYSIWYG engine**: Milkdown v7 Crepe (ProseMirror + remark)
- **Theming**: Override `--crepe-*` CSS variables (not direct CSS)
- **Export rendering**: markdown-it with CSS matching Milkdown's visual output
- **PDF generation**: puppeteer-core (requires user-installed Chrome)
- **Communication**: postMessage API with `ready` → `setContent` handshake
