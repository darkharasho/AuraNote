const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  windowControl: (action) => ipcRenderer.invoke('window-control', action),
  setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
  openSettings: () => ipcRenderer.invoke('open-settings'),
  openMain: () => ipcRenderer.invoke('open-main'),
  importMd: () => ipcRenderer.invoke('import-md'),
  exportTab: (tab) => ipcRenderer.invoke('export-md', tab)
});
