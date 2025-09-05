const { app, BrowserWindow } = require('electron');

app.whenReady().then(() => {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadURL('data:text/html,<html></html>').then(() => {
    const code = 'localStorage.removeItem("tabs");';
    win.webContents.executeJavaScript(code).then(() => {
      console.log('Deleted saved tabs from localStorage');
      app.quit();
    }).catch((err) => {
      console.error('Failed to delete tabs:', err);
      app.quit();
    });
  }).catch((err) => {
    console.error('Failed to load temp page:', err);
    app.quit();
  });
});
