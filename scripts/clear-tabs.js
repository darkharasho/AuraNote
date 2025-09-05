const { app, BrowserWindow } = require('electron');
const path = require('path');

app.whenReady().then(() => {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  const indexPath = path.join(__dirname, '..', 'src', 'index.html');
  win.loadFile(indexPath).catch((err) => {
    console.error('Failed to load temp page:', err);
    app.quit();
  });

  win.webContents.once('did-finish-load', () => {
    const code = 'localStorage.removeItem("tabs");';
    win.webContents.executeJavaScript(code).then(() => {
      console.log('Deleted saved tabs from localStorage');
      app.quit();
    }).catch((err) => {
      console.error('Failed to delete tabs:', err);
      app.quit();
    });
  });
});

