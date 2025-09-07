const { autoUpdater } = require('electron-updater');
const { ipcMain, BrowserWindow } = require('electron');

function initAutoUpdate() {
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on('update-downloaded', () => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('update-downloaded');
    });
  });

  ipcMain.handle('update:install', () => {
    autoUpdater.quitAndInstall();
  });

  autoUpdater.checkForUpdatesAndNotify();
}

function checkForUpdates() {
  autoUpdater.once('update-not-available', () => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('update-not-available');
    });
  });
  autoUpdater.checkForUpdates();
}

module.exports = { initAutoUpdate, checkForUpdates };
