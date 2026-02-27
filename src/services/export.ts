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
  <style>${themeCss}</style>
</head>
<body>
  <div class="content">
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

const exportThemes: Record<string, string> = {
  github: `
    body { margin: 0; padding: 0; background: #ffffff; }
    .content { max-width: 980px; margin: 0 auto; padding: 32px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #1f2328; }
    h1 { font-size: 2em; border-bottom: 1px solid #d1d9e0; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #d1d9e0; padding-bottom: 0.3em; }
    h3 { font-size: 1.25em; }
    a { color: #0969da; text-decoration: none; }
    code { background: #eff1f3; padding: 0.2em 0.4em; border-radius: 6px; font-size: 85%; font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace; }
    pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    blockquote { margin: 0; padding: 0 1em; color: #656d76; border-left: 0.25em solid #d1d9e0; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #d1d9e0; padding: 6px 13px; }
    tr:nth-child(2n) { background: #f6f8fa; }
    hr { border: none; border-top: 1px solid #d1d9e0; }
    img { max-width: 100%; }
  `,
  dark: `
    body { margin: 0; padding: 0; background: #0d1117; }
    .content { max-width: 980px; margin: 0 auto; padding: 32px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #e6edf3; }
    h1 { font-size: 2em; border-bottom: 1px solid #30363d; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #30363d; padding-bottom: 0.3em; }
    h3 { font-size: 1.25em; }
    a { color: #58a6ff; text-decoration: none; }
    code { background: #161b22; padding: 0.2em 0.4em; border-radius: 6px; font-size: 85%; font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace; }
    pre { background: #161b22; padding: 16px; border-radius: 6px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    blockquote { margin: 0; padding: 0 1em; color: #8b949e; border-left: 0.25em solid #30363d; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #30363d; padding: 6px 13px; }
    tr:nth-child(2n) { background: #161b22; }
    hr { border: none; border-top: 1px solid #30363d; }
    img { max-width: 100%; }
  `,
  minimal: `
    body { margin: 0; padding: 0; background: #fafafa; }
    .content { max-width: 700px; margin: 0 auto; padding: 32px; font-family: "Georgia", "Times New Roman", serif; font-size: 18px; line-height: 1.8; color: #333333; }
    h1 { font-size: 1.8em; font-weight: normal; }
    h2 { font-size: 1.4em; font-weight: normal; }
    h3 { font-size: 1.15em; font-weight: bold; }
    a { color: #333333; text-decoration: underline; }
    code { background: #f0f0f0; padding: 0.15em 0.3em; border-radius: 3px; font-size: 85%; font-family: "Courier New", Courier, monospace; }
    pre { background: #f0f0f0; padding: 16px; border-radius: 3px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    blockquote { margin: 0; padding: 0 1.2em; color: #666666; border-left: 3px solid #cccccc; font-style: italic; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border-bottom: 1px solid #dddddd; padding: 8px 12px; text-align: left; }
    hr { border: none; border-top: 1px solid #dddddd; }
    img { max-width: 100%; }
  `,
};

export function getExportThemeCss(theme: string): string {
  return exportThemes[theme] || exportThemes.github;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
