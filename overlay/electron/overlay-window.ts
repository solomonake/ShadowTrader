import { fileURLToPath } from "node:url";
import path from "node:path";

import { BrowserWindow, screen } from "electron";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createOverlayWindow(): BrowserWindow {
  const display = screen.getPrimaryDisplay().workAreaSize;
  const overlayWindow = new BrowserWindow({
    width: 380,
    height: 500,
    x: display.width - 400,
    y: display.height - 520,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: false,
    hasShadow: false,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlayWindow.setAlwaysOnTop(true, "screen-saver");
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });

  return overlayWindow;
}
