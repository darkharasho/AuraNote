const { contextBridge, ipcRenderer } = require('electron');

const isDev =
  process.env.NODE_ENV === 'development' ||
  process.defaultApp ||
  /[\\/]electron[\\/]/.test(process.execPath);

contextBridge.exposeInMainWorld('api', {
  isDev,
  windowControl: (action) => ipcRenderer.invoke('window-control', action),
  setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
  openSettings: () => ipcRenderer.invoke('open-settings'),
  openMain: () => ipcRenderer.invoke('open-main'),
  importMd: () => ipcRenderer.invoke('import-md'),
  exportTab: (tab) => ipcRenderer.invoke('export-md', tab),
  getVersion: () => ipcRenderer.invoke('app:version'),
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (_e, info) => callback(info)),
  onUpdateNotAvailable: (callback) => ipcRenderer.on('update-not-available', (_e, info) => callback(info)),
  installUpdate: () => ipcRenderer.invoke('update:install')
});
