const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('gestaoDMA', {
  listModules: () => ipcRenderer.invoke('list-modules'),

  runScript: (scriptPath, scriptName, args) =>
    ipcRenderer.invoke('run-script', scriptPath, scriptName, args),

  pickFolder: (defaultPath) => ipcRenderer.invoke('pick-folder', defaultPath),
  pickFile: (defaultPath) => ipcRenderer.invoke('pick-file', defaultPath),
  pickSaveFile: (defaultPath) => ipcRenderer.invoke('pick-save-file', defaultPath),

  onScriptOutput: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('script-output', handler);
    return () => ipcRenderer.removeListener('script-output', handler);
  },

  onScriptDone: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('script-done', handler);
    return () => ipcRenderer.removeListener('script-done', handler);
  },
});
