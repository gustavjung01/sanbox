const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Workspace
  selectWorkspace: () => ipcRenderer.invoke('select-workspace'),
  getDefaultWorkspace: () => ipcRenderer.invoke('get-default-workspace'),
  openFolder: (path) => ipcRenderer.invoke('open-folder', path),
  
  // Prompt
  readPromptFile: (workspacePath) => ipcRenderer.invoke('read-prompt-file', workspacePath),
  
  // Commands
  runCommand: (options) => ipcRenderer.invoke('run-command', options),
  stopCommand: () => ipcRenderer.invoke('stop-command'),
  
  // Browser
  openBrowser: (url) => ipcRenderer.invoke('open-browser', url),
  
  // Event listeners
  onCommandOutput: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('command-output', handler);
    return () => ipcRenderer.removeListener('command-output', handler);
  },
  
  // Remove all listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});
