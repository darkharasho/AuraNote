const { autoUpdater } = require('electron-updater');
const { ipcMain, BrowserWindow } = require('electron');

function initAutoUpdate() {
  autoUpdater.on('update-downloaded', () => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('update-downloaded');
    });
  });

  ipcMain.on('update:install', () => {
    autoUpdater.quitAndInstall();
  });

  autoUpdater.checkForUpdatesAndNotify();
}

module.exports = { initAutoUpdate };
