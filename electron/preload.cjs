const { contextBridge, ipcRenderer } = require('electron');
const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);
contextBridge.exposeInMainWorld('lighttodo', {
  load: () => invoke('data:load'),
  save: (data) => invoke('data:save', data),
  settings: (settings) => invoke('settings:save', settings),
  chooseFolder: () => invoke('data:folder'),
  openFolder: () => invoke('data:open'),
  exportBackup: () => invoke('data:export'),
  importBackup: () => invoke('data:import'),
  minimize: () => invoke('window:minimize'),
  close: () => invoke('window:close'),
});
