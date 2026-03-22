import path from "node:path";
import { app, ipcMain } from "electron";

import { createOverlayWindow } from "./overlay-window.js";
import { createTray } from "./tray.js";

let quitting = false;
let overlayWindow: Electron.BrowserWindow | null = null;

async function loadOverlayContent(window: Electron.BrowserWindow): Promise<void> {
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    await window.loadURL(devServerUrl);
    return;
  }

  await window.loadFile(path.join(app.getAppPath(), "dist-renderer", "index.html"));
}

async function createAndLoadWindow(): Promise<Electron.BrowserWindow> {
  const window = createOverlayWindow();
  await loadOverlayContent(window);
  return window;
}

async function bootstrap(): Promise<void> {
  await app.whenReady();

  overlayWindow = await createAndLoadWindow();
  const trayController = createTray(
    () => overlayWindow?.showInactive(),
    () => overlayWindow?.hide(),
    () => {
      quitting = true;
      app.quit();
    },
  );

  ipcMain.on("overlay:set-mouse-passthrough", (_event, enabled: boolean) => {
    overlayWindow?.setIgnoreMouseEvents(enabled, { forward: true });
  });

  ipcMain.on("overlay:set-connection-status", (_event, status: "connected" | "disconnected" | "reconnecting") => {
    trayController.setStatus(status);
  });

  overlayWindow.on("close", (event) => {
    if (!quitting) {
      event.preventDefault();
      overlayWindow?.hide();
    }
  });

  overlayWindow.on("closed", () => {
    overlayWindow = null;
  });

  overlayWindow.showInactive();
}

app.on("window-all-closed", () => {
  // Keep the background tray app alive; quitting is handled explicitly.
});

app.on("activate", () => {
  void (async () => {
    if (overlayWindow === null) {
      overlayWindow = await createAndLoadWindow();
    }
    overlayWindow.showInactive();
  })();
});

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start overlay:", error);
  app.quit();
});
