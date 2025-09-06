const { app, BrowserWindow, ipcMain } = require('electron');
const { MicaBrowserWindow } = require('mica-electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new MicaBrowserWindow({
    width: 1040,
    height: 740,
    minWidth: 640,
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
  switch (action) {
    case 'minimize':
      mainWindow.minimize();
      break;
    case 'maximize':
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
      break;
    case 'close':
      mainWindow.close();
      break;
  }
});

ipcMain.handle('set-theme', (event, theme) => {
  switch (theme) {
    case 'light-mica':
      mainWindow.setLightTheme();
      mainWindow.setMicaEffect();
      break;
    case 'acrylic':
      mainWindow.setDarkTheme();
      if (mainWindow.setMicaAcrylicEffect) {
        mainWindow.setMicaAcrylicEffect();
      } else {
        mainWindow.setAcrylic();
      }
      break;
    case 'dark-mica':
    default:
      mainWindow.setDarkTheme();
      mainWindow.setMicaEffect();
      break;
  }
});
