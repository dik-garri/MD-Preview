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

/* Export styles match Milkdown Crepe rendering */
const baseStyles = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    .content { max-width: 980px; margin: 0 auto; padding: 60px 120px; }
    .content p { font-size: 16px; line-height: 24px; padding: 4px 0; }
    .content h1, .content h2, .content h3, .content h4, .content h5, .content h6 { font-weight: 400; padding: 2px 0; }
    .content h1 { font-size: 42px; line-height: 50px; margin-top: 32px; }
    .content h2 { font-size: 36px; line-height: 44px; margin-top: 28px; }
    .content h3 { font-size: 32px; line-height: 40px; margin-top: 24px; }
    .content h4 { font-size: 28px; line-height: 36px; margin-top: 20px; }
    .content h5 { font-size: 24px; line-height: 32px; margin-top: 16px; }
    .content h6 { font-size: 18px; font-weight: 700; line-height: 28px; margin-top: 16px; }
    .content pre code { padding: 0; background: transparent; color: inherit; }
    .content ul, .content ol { padding-left: 24px; }
    .content li { padding: 2px 0; }
    .content table { border-collapse: collapse; width: 100%; margin: 8px 0; }
    .content img { max-width: 100%; vertical-align: bottom; }
`;

const exportThemes: Record<string, string> = {
  github: `
    body { margin: 0; padding: 0; background: #ffffff; }
    ${baseStyles}
    .content { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; color: #1f2328; }
    .content h1, .content h2, .content h3, .content h4, .content h5, .content h6 { font-family: 'Noto Serif', Cambria, 'Times New Roman', Times, serif; }
    .content a { color: #0969da; text-decoration: underline; }
    .content code { color: #cf222e; background: rgba(209,217,224,0.4); padding: 0 2px; border-radius: 4px; font-size: 87.5%; font-family: 'Space Mono', Fira Code, Menlo, Monaco, 'Courier New', monospace; }
    .content pre { background: rgba(209,217,224,0.4); padding: 10px; border-radius: 4px; overflow-x: auto; }
    .content blockquote { position: relative; padding-left: 40px; margin: 4px 0; }
    .content blockquote::before { content: ''; width: 4px; left: 0; top: 4px; bottom: 4px; position: absolute; background: #d5d5d5; border-radius: 100px; }
    .content th, .content td { border: 1px solid #d1d9e0; padding: 6px 13px; }
    .content tr:nth-child(2n) { background: #f6f8fa; }
    .content hr { border: none; background-color: rgba(168,168,168,0.2); height: 1px; margin: 6px 0; }
  `,
  dark: `
    body { margin: 0; padding: 0; background: #0d1117; }
    ${baseStyles}
    .content { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; color: #e6edf3; }
    .content h1, .content h2, .content h3, .content h4, .content h5, .content h6 { font-family: 'Noto Serif', Cambria, 'Times New Roman', Times, serif; }
    .content a { color: #58a6ff; text-decoration: underline; }
    .content code { color: #ff7b72; background: rgba(48,54,61,0.6); padding: 0 2px; border-radius: 4px; font-size: 87.5%; font-family: 'Space Mono', Fira Code, Menlo, Monaco, 'Courier New', monospace; }
    .content pre { background: rgba(48,54,61,0.6); padding: 10px; border-radius: 4px; overflow-x: auto; }
    .content blockquote { position: relative; padding-left: 40px; margin: 4px 0; }
    .content blockquote::before { content: ''; width: 4px; left: 0; top: 4px; bottom: 4px; position: absolute; background: #2f2f2f; border-radius: 100px; }
    .content th, .content td { border: 1px solid #30363d; padding: 6px 13px; }
    .content tr:nth-child(2n) { background: #161b22; }
    .content hr { border: none; background-color: rgba(117,117,117,0.2); height: 1px; margin: 6px 0; }
  `,
  minimal: `
    body { margin: 0; padding: 0; background: #fafafa; }
    ${baseStyles}
    .content { max-width: 700px; font-family: "Georgia", "Times New Roman", serif; color: #333333; }
    .content h1, .content h2, .content h3, .content h4, .content h5, .content h6 { font-family: "Georgia", "Times New Roman", serif; }
    .content a { color: #333333; text-decoration: underline; }
    .content code { color: #8b4513; background: rgba(204,204,204,0.4); padding: 0 2px; border-radius: 4px; font-size: 87.5%; font-family: "Courier New", Courier, monospace; }
    .content pre { background: rgba(204,204,204,0.4); padding: 10px; border-radius: 4px; overflow-x: auto; }
    .content blockquote { position: relative; padding-left: 40px; margin: 4px 0; }
    .content blockquote::before { content: ''; width: 4px; left: 0; top: 4px; bottom: 4px; position: absolute; background: #e0e0e0; border-radius: 100px; }
    .content th, .content td { border-bottom: 1px solid #dddddd; padding: 8px 12px; text-align: left; }
    .content hr { border: none; background-color: rgba(204,204,204,0.3); height: 1px; margin: 6px 0; }
  `,
};

export function getExportThemeCss(theme: string): string {
  return exportThemes[theme] || exportThemes.github;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
