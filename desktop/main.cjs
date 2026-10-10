// Desktop shell for TranAya. The built site (dist/) is served from a custom
// app:// origin so absolute paths such as /images/... work and IndexedDB
// (where all data lives) keeps one stable origin on every machine.
const { app, BrowserWindow, Menu, net, protocol, shell } = require("electron");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const ORIGIN = "app://tranaya";
const DIST = path.join(__dirname, "..", "dist");

protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
    },
  },
]);

function serveDist() {
  protocol.handle("app", (request) => {
    const { pathname } = new URL(request.url);
    const target = path.normalize(
      path.join(DIST, decodeURIComponent(pathname) || "/index.html"),
    );
    // Never serve anything outside dist/.
    if (!target.startsWith(DIST))
      return new Response("Forbidden", { status: 403 });
    const file = pathname === "/" ? path.join(DIST, "index.html") : target;
    return net.fetch(pathToFileURL(file).toString());
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 380,
    minHeight: 560,
    show: false,
    title: "TranAya",
    backgroundColor: "#211d16",
    icon: path.join(__dirname, "icon.ico"),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });
  win.once("ready-to-show", () => win.show());
  // Links to the web open in the default browser, never inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith(ORIGIN)) {
      event.preventDefault();
      if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    }
  });
  win.loadURL(`${ORIGIN}/index.html#home`);
  return win;
}

// One window only: opening the shortcut again focuses the running app.
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
    Menu.setApplicationMenu(null);
    serveDist();
    createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
  app.on("window-all-closed", () => app.quit());
}
