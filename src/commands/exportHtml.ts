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
