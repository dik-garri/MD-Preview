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
