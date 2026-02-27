import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { registerExportHtmlCommand } from "./commands/exportHtml";

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

      // Send theme
      sendTheme(context, currentPanel);
    })
  );

  // Watch for theme changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("mdPreview.theme") && currentPanel) {
        sendTheme(context, currentPanel);
      }
    })
  );

  // Export commands
  context.subscriptions.push(registerExportHtmlCommand(context));
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
