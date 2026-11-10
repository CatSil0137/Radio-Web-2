// Electron entry point: wraps the React build (copied into ./app) as a
// Windows desktop application.
const { app, BrowserWindow, shell, Menu } = require("electron");
const path = require("path");

const createWindow = () => {
  const win = new BrowserWindow({
    width: 480,
    height: 860,
    minWidth: 360,
    minHeight: 560,
    backgroundColor: "#1e1b4b",
    title: "Radio Web",
    icon: path.join(__dirname, "build", "icon.png"),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // Let radio streams start without a prior click.
      autoplayPolicy: "no-user-gesture-required",
    },
  });

  // Open external links (station homepages etc.) in the default browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  win.loadFile(path.join(__dirname, "app", "index.html"));
};

Menu.setApplicationMenu(null);

// Only one instance: focusing the existing window instead of opening a new one.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(createWindow);

  app.on("window-all-closed", () => app.quit());
}
