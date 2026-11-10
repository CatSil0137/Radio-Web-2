// Electron entry point: Z Riemann Visualizer as a portable Windows app.
// The page (app/index.html) is the same self-contained zeta-riemann.html.
const { app, BrowserWindow, shell, Menu, session } = require("electron");
const path = require("path");

const isExternal = (url) => /^https?:\/\//i.test(url);

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 400,
    minHeight: 600,
    backgroundColor: "#040c1e",
    title: "Z Riemann Visualizer",
    icon: path.join(__dirname, "build", "icon.png"),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // Tour narration and sounds start without an extra click.
      autoplayPolicy: "no-user-gesture-required",
    },
  });

  win.once("ready-to-show", () => {
    win.maximize();
    win.show();
  });

  // External links open in the default browser, not inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternal(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e, url) => {
    if (isExternal(url)) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });

  // F11 toggles fullscreen, Ctrl+Shift+I opens DevTools (diagnostics).
  win.webContents.on("before-input-event", (e, input) => {
    if (input.type !== "keyDown") return;
    if (input.key === "F11") {
      win.setFullScreen(!win.isFullScreen());
      e.preventDefault();
    } else if (input.control && input.shift && input.key.toLowerCase() === "i") {
      win.webContents.toggleDevTools();
      e.preventDefault();
    }
  });

  win.loadFile(path.join(__dirname, "app", "index.html"));
};

Menu.setApplicationMenu(null);

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

  app.whenReady().then(() => {
    // Allow the microphone (video narration), fullscreen, clipboard, etc.
    session.defaultSession.setPermissionRequestHandler((wc, permission, cb) => cb(true));
    createWindow();
  });

  app.on("window-all-closed", () => app.quit());
}
