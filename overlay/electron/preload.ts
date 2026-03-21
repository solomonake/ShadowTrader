import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("overlayAPI", {
  setMousePassthrough(enabled: boolean) {
    ipcRenderer.send("overlay:set-mouse-passthrough", enabled);
  },
  setConnectionStatus(status: "connected" | "disconnected" | "reconnecting") {
    ipcRenderer.send("overlay:set-connection-status", status);
  },
});
