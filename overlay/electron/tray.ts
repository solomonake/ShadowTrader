import { Menu, Tray, nativeImage } from "electron";

type ConnectionState = "connected" | "disconnected" | "reconnecting";

function buildIcon(color: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16">
      <rect width="16" height="16" rx="4" fill="#111827"/>
      <circle cx="8" cy="8" r="4" fill="${color}"/>
    </svg>
  `;
  return nativeImage.createFromDataURL(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
}

const icons: Record<ConnectionState, Electron.NativeImage> = {
  connected: buildIcon("#22C55E"),
  disconnected: buildIcon("#EF4444"),
  reconnecting: buildIcon("#F59E0B"),
};

export function createTray(
  onShow: () => void,
  onHide: () => void,
  onQuit: () => void,
): { tray: Tray; setStatus: (status: ConnectionState) => void } {
  const tray = new Tray(icons.disconnected);
  tray.setToolTip("ShadowTrader Overlay");

  const setMenu = () => {
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: "Show Overlay", click: onShow },
        { label: "Hide Overlay", click: onHide },
        { type: "separator" },
        { label: "Quit", click: onQuit },
      ]),
    );
  };

  setMenu();

  return {
    tray,
    setStatus(status) {
      tray.setImage(icons[status]);
      setMenu();
    },
  };
}
