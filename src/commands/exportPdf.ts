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
