# MD Preview Extension — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a VS Code extension with WYSIWYG Markdown editing (Milkdown), built-in themes, and export to HTML/PDF.

**Architecture:** Extension Host manages commands and file I/O. WebviewPanel runs Milkdown editor in a browser context. Communication via postMessage. Export uses markdown-it for HTML and puppeteer-core for PDF.

**Tech Stack:** TypeScript, VS Code Extension API, Milkdown v7 (Crepe), webpack, markdown-it, puppeteer-core

---

### Task 1: Initialize project and install dependencies

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.vscodeignore`
- Create: `.gitignore`

**Step 1: Initialize git repo**

```bash
cd /Users/garrydik/projects/personal/md-extension
git init
```

**Step 2: Create package.json**

```json
{
  "name": "md-preview",
  "displayName": "MD Preview",
  "description": "WYSIWYG Markdown editor with themes and export",
  "version": "0.0.1",
  "engines": {
    "vscode": "^1.85.0"
  },
  "categories": ["Other"],
  "main": "./dist/extension.js",
  "activationEvents": [],
  "contributes": {
    "commands": [
      {
        "command": "mdPreview.open",
        "title": "Open WYSIWYG Preview",
        "category": "MD Preview"
      },
      {
        "command": "mdPreview.exportHtml",
        "title": "Export to HTML",
        "category": "MD Preview"
      },
      {
        "command": "mdPreview.exportPdf",
        "title": "Export to PDF",
        "category": "MD Preview"
      }
    ],
    "configuration": {
      "title": "MD Preview",
      "properties": {
        "mdPreview.theme": {
          "type": "string",
          "default": "github",
          "enum": ["github", "dark", "minimal"],
          "description": "Theme for Markdown preview"
        }
      }
    }
  },
  "scripts": {
    "vscode:prepublish": "npm run build",
    "build": "webpack --mode production",
    "watch": "webpack --mode development --watch",
    "compile": "webpack --mode development"
  },
  "devDependencies": {
    "@types/vscode": "^1.85.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0",
    "webpack": "^5.90.0",
    "webpack-cli": "^5.1.0",
    "ts-loader": "^9.5.0",
    "style-loader": "^3.3.0",
    "css-loader": "^6.9.0"
  },
  "dependencies": {
    "@milkdown/crepe": "^7.0.0",
    "markdown-it": "^14.0.0"
  }
}
```

**Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2020",
    "outDir": "dist",
    "lib": ["ES2020", "DOM"],
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "exclude": ["node_modules", "dist", "media"]
}
```

**Step 4: Create .vscodeignore**

```
.vscode/**
node_modules/**
src/**
docs/**
test/**
tsconfig.json
webpack.config.js
.gitignore
```

**Step 5: Create .gitignore**

```
node_modules/
dist/
media/webview.js
media/webview.js.map
*.vsix
```

**Step 6: Install dependencies**

```bash
npm install
```

**Step 7: Commit**

```bash
git add package.json tsconfig.json .vscodeignore .gitignore package-lock.json
git commit -m "chore: initialize project with dependencies"
```

---

### Task 2: Configure webpack for extension + webview dual build

**Files:**
- Create: `webpack.config.js`

**Step 1: Create webpack.config.js**

```javascript
//@ts-check
"use strict";

const path = require("path");

/** @type {import('webpack').Configuration} */
const extensionConfig = {
  target: "node",
  mode: "none",
  entry: "./src/extension.ts",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "extension.js",
    libraryTarget: "commonjs2",
  },
  externals: {
    vscode: "commonjs vscode",
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: "ts-loader",
      },
    ],
  },
  devtool: "nosources-source-map",
};

/** @type {import('webpack').Configuration} */
const webviewConfig = {
  target: "web",
  mode: "none",
  entry: "./src/webview/index.ts",
  output: {
    path: path.resolve(__dirname, "media"),
    filename: "webview.js",
  },
  resolve: {
    extensions: [".ts", ".js", ".css"],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: "ts-loader",
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  devtool: "nosources-source-map",
};

module.exports = [extensionConfig, webviewConfig];
```

**Step 2: Create placeholder files so webpack can build**

Create `src/extension.ts`:
```typescript
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  console.log("MD Preview activated");
}

export function deactivate() {}
```

Create `src/webview/index.ts`:
```typescript
console.log("webview loaded");
```

**Step 3: Verify webpack builds**

```bash
npx webpack --mode development
```

Expected: builds `dist/extension.js` and `media/webview.js` without errors.

**Step 4: Commit**

```bash
git add webpack.config.js src/extension.ts src/webview/index.ts
git commit -m "chore: add webpack config for extension + webview"
```

---

### Task 3: Implement basic Webview panel with Open command

**Files:**
- Modify: `src/extension.ts`

**Step 1: Implement the Open command that creates a WebviewPanel**

Replace `src/extension.ts`:

```typescript
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

let currentPanel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("mdPreview.open", () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== "markdown") {
        vscode.window.showWarningMessage("Open a Markdown file first.");
        return;
      }

      const doc = editor.document;
      const markdownContent = doc.getText();

      if (currentPanel) {
        currentPanel.reveal(vscode.ViewColumn.Beside);
      } else {
        currentPanel = vscode.window.createWebviewPanel(
          "mdPreview",
          `Preview: ${path.basename(doc.fileName)}`,
          vscode.ViewColumn.Beside,
          {
            enableScripts: true,
            localResourceRoots: [
              vscode.Uri.joinPath(context.extensionUri, "media"),
            ],
          }
        );

        currentPanel.onDidDispose(() => {
          currentPanel = undefined;
        });

        currentPanel.webview.onDidReceiveMessage(
          (message) => {
            if (message.command === "contentChanged") {
              const edit = new vscode.WorkspaceEdit();
              const fullRange = new vscode.Range(
                doc.positionAt(0),
                doc.positionAt(doc.getText().length)
              );
              edit.replace(doc.uri, fullRange, message.markdown);
              vscode.workspace.applyEdit(edit);
            }
          },
          undefined,
          context.subscriptions
        );
      }

      const scriptUri = currentPanel.webview.asWebviewUri(
        vscode.Uri.joinPath(context.extensionUri, "media", "webview.js")
      );

      currentPanel.webview.html = getWebviewContent(
        scriptUri,
        currentPanel.webview.cspSource
      );

      currentPanel.webview.postMessage({
        command: "setContent",
        markdown: markdownContent,
      });
    })
  );
}

function getWebviewContent(scriptUri: vscode.Uri, cspSource: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; script-src ${cspSource}; style-src ${cspSource} 'unsafe-inline'; font-src ${cspSource};">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MD Preview</title>
  <style>
    body { margin: 0; padding: 16px; }
    #editor { min-height: 100vh; }
  </style>
</head>
<body>
  <div id="editor"></div>
  <script src="${scriptUri}"></script>
</body>
</html>`;
}

export function deactivate() {}
```

**Step 2: Build and verify**

```bash
npx webpack --mode development
```

Expected: builds without errors.

**Step 3: Commit**

```bash
git add src/extension.ts
git commit -m "feat: implement Open command with WebviewPanel"
```

---

### Task 4: Integrate Milkdown WYSIWYG editor in Webview

**Files:**
- Modify: `src/webview/index.ts`

**Step 1: Implement Milkdown editor with message passing**

Replace `src/webview/index.ts`:

```typescript
import { Crepe } from "@milkdown/crepe";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";

// Acquire VS Code API
const vscode = acquireVsCodeApi();

let crepe: Crepe | undefined;
let isUpdatingFromExtension = false;

async function initEditor(markdown: string) {
  if (crepe) {
    await crepe.destroy();
  }

  crepe = new Crepe({
    root: "#editor",
    defaultValue: markdown,
  });

  crepe.on((listener) => {
    listener.markdownUpdated((_, md, prevMd) => {
      if (!isUpdatingFromExtension && md !== prevMd) {
        vscode.postMessage({
          command: "contentChanged",
          markdown: md,
        });
      }
    });
  });

  await crepe.create();
}

// Handle messages from extension
window.addEventListener("message", async (event) => {
  const message = event.data;
  if (message.command === "setContent") {
    isUpdatingFromExtension = true;
    await initEditor(message.markdown);
    isUpdatingFromExtension = false;
  }
});
```

**Step 2: Add type declaration for VS Code webview API**

Create `src/webview/vscode.d.ts`:

```typescript
declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};
```

**Step 3: Build and verify**

```bash
npx webpack --mode development
```

Expected: builds without errors. `media/webview.js` includes Milkdown bundle.

**Step 4: Manual test**

1. Press F5 in VS Code to launch Extension Development Host
2. Open any `.md` file
3. Run `MD Preview: Open WYSIWYG Preview` from Command Palette
4. Verify: Milkdown WYSIWYG editor appears in side panel
5. Verify: editing in WYSIWYG updates the source file

**Step 5: Commit**

```bash
git add src/webview/index.ts src/webview/vscode.d.ts
git commit -m "feat: integrate Milkdown WYSIWYG editor in webview"
```

---

### Task 5: Add built-in themes (GitHub, Dark, Minimal)

**Files:**
- Create: `src/webview/themes/github.css`
- Create: `src/webview/themes/dark.css`
- Create: `src/webview/themes/minimal.css`
- Modify: `src/webview/index.ts`
- Modify: `src/extension.ts`

**Step 1: Create github.css**

```css
/* GitHub-style Markdown theme */
#editor {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 1.6;
  color: #1f2328;
  background: #ffffff;
  max-width: 980px;
  margin: 0 auto;
  padding: 24px;
}

#editor h1 { font-size: 2em; border-bottom: 1px solid #d1d9e0; padding-bottom: 0.3em; }
#editor h2 { font-size: 1.5em; border-bottom: 1px solid #d1d9e0; padding-bottom: 0.3em; }
#editor h3 { font-size: 1.25em; }

#editor a { color: #0969da; text-decoration: none; }
#editor a:hover { text-decoration: underline; }

#editor code {
  background: #eff1f3;
  padding: 0.2em 0.4em;
  border-radius: 6px;
  font-size: 85%;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
}

#editor pre {
  background: #f6f8fa;
  padding: 16px;
  border-radius: 6px;
  overflow-x: auto;
}

#editor pre code { background: none; padding: 0; font-size: 85%; }

#editor blockquote {
  margin: 0;
  padding: 0 1em;
  color: #656d76;
  border-left: 0.25em solid #d1d9e0;
}

#editor table { border-collapse: collapse; width: 100%; }
#editor th, #editor td { border: 1px solid #d1d9e0; padding: 6px 13px; }
#editor tr:nth-child(2n) { background: #f6f8fa; }

#editor hr { border: none; border-top: 1px solid #d1d9e0; margin: 24px 0; }
#editor img { max-width: 100%; }
```

**Step 2: Create dark.css**

```css
/* Dark theme */
#editor {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 1.6;
  color: #e6edf3;
  background: #0d1117;
  max-width: 980px;
  margin: 0 auto;
  padding: 24px;
}

#editor h1 { font-size: 2em; border-bottom: 1px solid #30363d; padding-bottom: 0.3em; }
#editor h2 { font-size: 1.5em; border-bottom: 1px solid #30363d; padding-bottom: 0.3em; }
#editor h3 { font-size: 1.25em; }

#editor a { color: #58a6ff; text-decoration: none; }
#editor a:hover { text-decoration: underline; }

#editor code {
  background: #161b22;
  padding: 0.2em 0.4em;
  border-radius: 6px;
  font-size: 85%;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
}

#editor pre {
  background: #161b22;
  padding: 16px;
  border-radius: 6px;
  overflow-x: auto;
}

#editor pre code { background: none; padding: 0; font-size: 85%; }

#editor blockquote {
  margin: 0;
  padding: 0 1em;
  color: #8b949e;
  border-left: 0.25em solid #30363d;
}

#editor table { border-collapse: collapse; width: 100%; }
#editor th, #editor td { border: 1px solid #30363d; padding: 6px 13px; }
#editor tr:nth-child(2n) { background: #161b22; }

#editor hr { border: none; border-top: 1px solid #30363d; margin: 24px 0; }
#editor img { max-width: 100%; }
```

**Step 3: Create minimal.css**

```css
/* Minimal clean theme */
#editor {
  font-family: "Georgia", "Times New Roman", serif;
  font-size: 18px;
  line-height: 1.8;
  color: #333333;
  background: #fafafa;
  max-width: 700px;
  margin: 0 auto;
  padding: 32px;
}

#editor h1 { font-size: 1.8em; font-weight: normal; margin-top: 1.5em; }
#editor h2 { font-size: 1.4em; font-weight: normal; margin-top: 1.3em; }
#editor h3 { font-size: 1.15em; font-weight: bold; }

#editor a { color: #333333; text-decoration: underline; }

#editor code {
  background: #f0f0f0;
  padding: 0.15em 0.3em;
  border-radius: 3px;
  font-size: 85%;
  font-family: "Courier New", Courier, monospace;
}

#editor pre {
  background: #f0f0f0;
  padding: 16px;
  border-radius: 3px;
  overflow-x: auto;
}

#editor pre code { background: none; padding: 0; }

#editor blockquote {
  margin: 0;
  padding: 0 1.2em;
  color: #666666;
  border-left: 3px solid #cccccc;
  font-style: italic;
}

#editor table { border-collapse: collapse; width: 100%; }
#editor th, #editor td { border-bottom: 1px solid #dddddd; padding: 8px 12px; text-align: left; }

#editor hr { border: none; border-top: 1px solid #dddddd; margin: 32px 0; }
#editor img { max-width: 100%; }
```

**Step 4: Update webview to accept theme CSS**

Modify `src/webview/index.ts` — add theme handling:

```typescript
import { Crepe } from "@milkdown/crepe";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame.css";

const vscode = acquireVsCodeApi();

let crepe: Crepe | undefined;
let isUpdatingFromExtension = false;

async function initEditor(markdown: string) {
  if (crepe) {
    await crepe.destroy();
  }

  crepe = new Crepe({
    root: "#editor",
    defaultValue: markdown,
  });

  crepe.on((listener) => {
    listener.markdownUpdated((_, md, prevMd) => {
      if (!isUpdatingFromExtension && md !== prevMd) {
        vscode.postMessage({
          command: "contentChanged",
          markdown: md,
        });
      }
    });
  });

  await crepe.create();
}

function applyTheme(themeCss: string) {
  let styleEl = document.getElementById("md-theme");
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "md-theme";
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = themeCss;
}

window.addEventListener("message", async (event) => {
  const message = event.data;
  switch (message.command) {
    case "setContent":
      isUpdatingFromExtension = true;
      await initEditor(message.markdown);
      isUpdatingFromExtension = false;
      break;
    case "setTheme":
      applyTheme(message.css);
      break;
  }
});
```

**Step 5: Update extension.ts to send theme CSS**

Add theme loading to `src/extension.ts`. After `currentPanel.webview.postMessage({ command: "setContent", ... })`, add:

```typescript
// After setting content, also send theme
const theme = vscode.workspace.getConfiguration("mdPreview").get<string>("theme", "github");
const themePath = path.join(context.extensionPath, "src", "webview", "themes", `${theme}.css`);
if (fs.existsSync(themePath)) {
  const themeCss = fs.readFileSync(themePath, "utf8");
  currentPanel.webview.postMessage({ command: "setTheme", css: themeCss });
}
```

Also add a configuration change listener inside `activate`:

```typescript
vscode.workspace.onDidChangeConfiguration((e) => {
  if (e.affectsConfiguration("mdPreview.theme") && currentPanel) {
    const newTheme = vscode.workspace.getConfiguration("mdPreview").get<string>("theme", "github");
    const themePath = path.join(context.extensionPath, "src", "webview", "themes", `${newTheme}.css`);
    if (fs.existsSync(themePath)) {
      const themeCss = fs.readFileSync(themePath, "utf8");
      currentPanel.webview.postMessage({ command: "setTheme", css: themeCss });
    }
  }
});
```

**Step 6: Build and verify**

```bash
npx webpack --mode development
```

**Step 7: Manual test**

1. F5 → open `.md` → run `MD Preview: Open WYSIWYG Preview`
2. Go to Settings → search `mdPreview.theme`
3. Switch between `github`, `dark`, `minimal`
4. Verify: preview styling changes in real time

**Step 8: Commit**

```bash
git add src/webview/themes/ src/webview/index.ts src/extension.ts
git commit -m "feat: add built-in themes (github, dark, minimal)"
```

---

### Task 6: Implement Export to HTML

**Files:**
- Create: `src/services/export.ts`
- Create: `src/commands/exportHtml.ts`
- Modify: `src/extension.ts`

**Step 1: Install markdown-it types**

```bash
npm install --save-dev @types/markdown-it
```

**Step 2: Create export service**

Create `src/services/export.ts`:

```typescript
import markdownit from "markdown-it";
import * as fs from "fs";
import * as path from "path";

const md = markdownit({
  html: true,
  linkify: true,
  breaks: true,
});

export function renderMarkdownToHtml(markdown: string): string {
  return md.render(markdown);
}

export function wrapInHtmlDocument(bodyHtml: string, themeCss: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
${themeCss}
  </style>
</head>
<body>
  <div id="editor">
${bodyHtml}
  </div>
</body>
</html>`;
}

export function loadThemeCss(extensionPath: string, theme: string): string {
  const themePath = path.join(extensionPath, "src", "webview", "themes", `${theme}.css`);
  if (fs.existsSync(themePath)) {
    return fs.readFileSync(themePath, "utf8");
  }
  return "";
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
```

**Step 3: Create exportHtml command**

Create `src/commands/exportHtml.ts`:

```typescript
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { renderMarkdownToHtml, wrapInHtmlDocument, loadThemeCss } from "../services/export";

export function registerExportHtmlCommand(context: vscode.ExtensionContext) {
  return vscode.commands.registerCommand("mdPreview.exportHtml", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== "markdown") {
      vscode.window.showWarningMessage("Open a Markdown file first.");
      return;
    }

    const markdown = editor.document.getText();
    const theme = vscode.workspace.getConfiguration("mdPreview").get<string>("theme", "github");
    const themeCss = loadThemeCss(context.extensionPath, theme);
    const bodyHtml = renderMarkdownToHtml(markdown);
    const title = path.basename(editor.document.fileName, ".md");
    const fullHtml = wrapInHtmlDocument(bodyHtml, themeCss, title);

    const defaultUri = vscode.Uri.file(
      path.join(path.dirname(editor.document.fileName), `${title}.html`)
    );

    const saveUri = await vscode.window.showSaveDialog({
      defaultUri,
      filters: { HTML: ["html"] },
    });

    if (saveUri) {
      fs.writeFileSync(saveUri.fsPath, fullHtml, "utf8");
      vscode.window.showInformationMessage(`Exported to ${saveUri.fsPath}`);
    }
  });
}
```

**Step 4: Register command in extension.ts**

Add to `src/extension.ts` inside `activate`:

```typescript
import { registerExportHtmlCommand } from "./commands/exportHtml";

// Inside activate():
context.subscriptions.push(registerExportHtmlCommand(context));
```

**Step 5: Build and verify**

```bash
npx webpack --mode development
```

**Step 6: Manual test**

1. F5 → open `.md` file
2. Run `MD Preview: Export to HTML`
3. Pick save location
4. Open saved HTML in browser — should look styled with the selected theme

**Step 7: Commit**

```bash
git add src/services/export.ts src/commands/exportHtml.ts src/extension.ts
git commit -m "feat: implement export to HTML with theme support"
```

---

### Task 7: Implement Export to PDF

**Files:**
- Create: `src/commands/exportPdf.ts`
- Modify: `src/extension.ts`
- Modify: `package.json`

**Step 1: Add puppeteer-core dependency**

```bash
npm install puppeteer-core
npm install --save-dev @types/puppeteer-core
```

**Step 2: Create exportPdf command**

Create `src/commands/exportPdf.ts`:

```typescript
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { renderMarkdownToHtml, wrapInHtmlDocument, loadThemeCss } from "../services/export";

function findChromePath(): string | undefined {
  const candidates: Record<string, string[]> = {
    darwin: [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ],
    linux: [
      "/usr/bin/google-chrome",
      "/usr/bin/chromium-browser",
      "/usr/bin/chromium",
    ],
    win32: [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    ],
  };

  const paths = candidates[process.platform] || [];
  for (const p of paths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return undefined;
}

export function registerExportPdfCommand(context: vscode.ExtensionContext) {
  return vscode.commands.registerCommand("mdPreview.exportPdf", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== "markdown") {
      vscode.window.showWarningMessage("Open a Markdown file first.");
      return;
    }

    const chromePath = findChromePath();
    if (!chromePath) {
      vscode.window.showErrorMessage(
        "Chrome/Chromium not found. Install Google Chrome to export PDF."
      );
      return;
    }

    const markdown = editor.document.getText();
    const theme = vscode.workspace.getConfiguration("mdPreview").get<string>("theme", "github");
    const themeCss = loadThemeCss(context.extensionPath, theme);
    const bodyHtml = renderMarkdownToHtml(markdown);
    const title = path.basename(editor.document.fileName, ".md");
    const fullHtml = wrapInHtmlDocument(bodyHtml, themeCss, title);

    const defaultUri = vscode.Uri.file(
      path.join(path.dirname(editor.document.fileName), `${title}.pdf`)
    );

    const saveUri = await vscode.window.showSaveDialog({
      defaultUri,
      filters: { PDF: ["pdf"] },
    });

    if (!saveUri) {
      return;
    }

    try {
      const puppeteer = await import("puppeteer-core");
      const browser = await puppeteer.default.launch({
        executablePath: chromePath,
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const page = await browser.newPage();
      await page.setContent(fullHtml, { waitUntil: "networkidle0" });

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" },
      });

      fs.writeFileSync(saveUri.fsPath, pdfBuffer);
      await browser.close();

      vscode.window.showInformationMessage(`Exported to ${saveUri.fsPath}`);
    } catch (err) {
      vscode.window.showErrorMessage(`PDF export failed: ${err}`);
    }
  });
}
```

**Step 3: Register command in extension.ts**

Add to `src/extension.ts`:

```typescript
import { registerExportPdfCommand } from "./commands/exportPdf";

// Inside activate():
context.subscriptions.push(registerExportPdfCommand(context));
```

**Step 4: Update webpack externals**

Add `puppeteer-core` to webpack extension externals so it's not bundled (it uses native modules):

In `webpack.config.js`, update `extensionConfig.externals`:

```javascript
externals: {
  vscode: "commonjs vscode",
  "puppeteer-core": "commonjs puppeteer-core",
},
```

**Step 5: Build and verify**

```bash
npx webpack --mode development
```

**Step 6: Manual test**

1. F5 → open `.md` file
2. Run `MD Preview: Export to PDF`
3. Pick save location
4. Open saved PDF — should be styled with selected theme

**Step 7: Commit**

```bash
git add src/commands/exportPdf.ts src/extension.ts webpack.config.js package.json package-lock.json
git commit -m "feat: implement export to PDF via puppeteer-core"
```

---

### Task 8: Final integration — wire up all commands and polish

**Files:**
- Modify: `src/extension.ts` (final version)

**Step 1: Write final extension.ts integrating all commands**

Replace `src/extension.ts` with the complete version:

```typescript
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { registerExportHtmlCommand } from "./commands/exportHtml";
import { registerExportPdfCommand } from "./commands/exportPdf";

let currentPanel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
  // Register Open command
  context.subscriptions.push(
    vscode.commands.registerCommand("mdPreview.open", () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== "markdown") {
        vscode.window.showWarningMessage("Open a Markdown file first.");
        return;
      }

      const doc = editor.document;
      const markdownContent = doc.getText();

      if (currentPanel) {
        currentPanel.reveal(vscode.ViewColumn.Beside);
      } else {
        currentPanel = vscode.window.createWebviewPanel(
          "mdPreview",
          `Preview: ${path.basename(doc.fileName)}`,
          vscode.ViewColumn.Beside,
          {
            enableScripts: true,
            localResourceRoots: [
              vscode.Uri.joinPath(context.extensionUri, "media"),
            ],
          }
        );

        currentPanel.onDidDispose(() => {
          currentPanel = undefined;
        });

        currentPanel.webview.onDidReceiveMessage(
          (message) => {
            if (message.command === "contentChanged") {
              const edit = new vscode.WorkspaceEdit();
              const fullRange = new vscode.Range(
                doc.positionAt(0),
                doc.positionAt(doc.getText().length)
              );
              edit.replace(doc.uri, fullRange, message.markdown);
              vscode.workspace.applyEdit(edit);
            }
          },
          undefined,
          context.subscriptions
        );
      }

      const scriptUri = currentPanel.webview.asWebviewUri(
        vscode.Uri.joinPath(context.extensionUri, "media", "webview.js")
      );

      currentPanel.webview.html = getWebviewContent(
        scriptUri,
        currentPanel.webview.cspSource
      );

      currentPanel.webview.postMessage({
        command: "setContent",
        markdown: markdownContent,
      });

      // Send theme
      sendTheme(context, currentPanel);
    })
  );

  // Register export commands
  context.subscriptions.push(registerExportHtmlCommand(context));
  context.subscriptions.push(registerExportPdfCommand(context));

  // Watch for theme changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("mdPreview.theme") && currentPanel) {
        sendTheme(context, currentPanel);
      }
    })
  );
}

function sendTheme(context: vscode.ExtensionContext, panel: vscode.WebviewPanel) {
  const theme = vscode.workspace.getConfiguration("mdPreview").get<string>("theme", "github");
  const themePath = path.join(context.extensionPath, "src", "webview", "themes", `${theme}.css`);
  if (fs.existsSync(themePath)) {
    const themeCss = fs.readFileSync(themePath, "utf8");
    panel.webview.postMessage({ command: "setTheme", css: themeCss });
  }
}

function getWebviewContent(scriptUri: vscode.Uri, cspSource: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; script-src ${cspSource}; style-src ${cspSource} 'unsafe-inline'; font-src ${cspSource};">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MD Preview</title>
  <style>
    body { margin: 0; padding: 0; }
    #editor { min-height: 100vh; }
  </style>
</head>
<body>
  <div id="editor"></div>
  <script src="${scriptUri}"></script>
</body>
</html>`;
}

export function deactivate() {}
```

**Step 2: Build production**

```bash
npx webpack --mode production
```

**Step 3: Full manual test**

1. F5 to launch Extension Development Host
2. Open a `.md` file
3. Test: `MD Preview: Open WYSIWYG Preview` — editor appears, WYSIWYG works
4. Test: edit in WYSIWYG — source file updates
5. Test: change theme in settings — preview restyled
6. Test: `MD Preview: Export to HTML` — saves valid HTML
7. Test: `MD Preview: Export to PDF` — saves valid PDF

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: final integration of all commands and theme wiring"
```
