const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { MicaBrowserWindow } = require('mica-electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let settingsWindow;
let currentTheme = 'dark-mica';

function createWindow() {
  mainWindow = new MicaBrowserWindow({
    width: 1090,
    height: 740,
    minWidth: 690,
    minHeight: 440,
    frame: false,
    titleBarStyle: 'hidden',
    show: false,
    transparent: true,
    backgroundColor: '#00000000',
    icon: path.join(__dirname, 'media', 'AuraNote.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.setDarkTheme();
  mainWindow.setMicaEffect();
  mainWindow.setRoundedCorner();

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
  mainWindow.webContents.once('dom-ready', () => {
    mainWindow.show();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle('window-control', (event, action) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  switch (action) {
    case 'minimize':
      win.minimize();
      break;
    case 'maximize':
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
      break;
    case 'close':
      win.close();
      break;
  }
});

function applyTheme(win, theme) {
  if (!win) return;
  switch (theme) {
    case 'light-mica':
      win.setLightTheme();
      win.setMicaEffect();
      break;
    case 'acrylic':
      win.setDarkTheme();
      if (win.setMicaAcrylicEffect) {
        win.setMicaAcrylicEffect();
      } else {
        win.setAcrylic();
      }
      break;
    case 'dark-mica':
    default:
      win.setDarkTheme();
      win.setMicaEffect();
      break;
  }
}

ipcMain.handle('set-theme', (event, theme) => {
  currentTheme = theme;
  applyTheme(mainWindow, theme);
  applyTheme(settingsWindow, theme);
});

ipcMain.handle('open-settings', () => {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }
  settingsWindow = new MicaBrowserWindow({
    width: 900,
    height: 600,
    minWidth: 600,
    minHeight: 400,
    frame: false,
    titleBarStyle: 'hidden',
    show: false,
    transparent: true,
    backgroundColor: '#00000000',
    icon: path.join(__dirname, 'media', 'AuraNote.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  });
  applyTheme(settingsWindow, currentTheme);
  settingsWindow.setRoundedCorner();
  settingsWindow.loadFile(path.join(__dirname, 'src', 'settings.html'));
  settingsWindow.on('closed', () => {
    settingsWindow = null;
    mainWindow.show();
  });
  settingsWindow.webContents.once('dom-ready', () => {
    settingsWindow.show();
    mainWindow.hide();
  });
});

ipcMain.handle('import-md', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Markdown', extensions: ['md'] }]
  });
  if (canceled || !filePaths.length) return null;
  const filePath = filePaths[0];
  const content = fs.readFileSync(filePath, 'utf8');
  const { name } = path.parse(filePath);
  return { content, name };
});

ipcMain.handle('export-md', async (event, tab) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    defaultPath: `${tab.title}.md`,
    filters: [{ name: 'Markdown', extensions: ['md'] }]
  });
  if (canceled || !filePath) return false;
  fs.writeFileSync(filePath, tab.content, 'utf8');
  return true;
});
