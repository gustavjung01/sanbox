const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Workspace
  selectWorkspace: () => ipcRenderer.invoke('select-workspace'),
  getDefaultWorkspace: () => ipcRenderer.invoke('get-default-workspace'),
  openFolderInExplorer: (path) => ipcRenderer.invoke('open-folder-in-explorer', path),
  
  // Files
  listWorkspaceFiles: (workspacePath) => ipcRenderer.invoke('list-workspace-files', workspacePath),
  readWorkspaceFile: (workspacePath, relativePath) => ipcRenderer.invoke('read-workspace-file', workspacePath, relativePath),
  openFileExternal: (filePath) => ipcRenderer.invoke('open-file-external', filePath),
  getAutoOpenFile: (workspacePath) => ipcRenderer.invoke('get-auto-open-file', workspacePath),
  
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
  
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});
