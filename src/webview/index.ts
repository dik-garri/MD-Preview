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
    listener.markdownUpdated((_ctx, md, prevMd) => {
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
