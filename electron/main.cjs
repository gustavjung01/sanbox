const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const fs = require('fs');

let mainWindow;
let currentProcess = null;

const DEFAULT_WORKSPACE = 'F:\\1_A_Disk_D\\Tool\\sanbox';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    title: 'CC Launcher',
    icon: path.join(__dirname, '../dist/favicon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false
    },
    show: false,
    backgroundColor: '#1a1a2e'
  });

  mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.webContents.openDevTools();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (currentProcess) {
      killProcess();
    }
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (currentProcess) {
    killProcess();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers
ipcMain.handle('select-workspace', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    defaultPath: DEFAULT_WORKSPACE
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('get-default-workspace', () => {
  return DEFAULT_WORKSPACE;
});

ipcMain.handle('open-folder', async (event, folderPath) => {
  if (folderPath && fs.existsSync(folderPath)) {
    await shell.openPath(folderPath);
    return true;
  }
  return false;
});

ipcMain.handle('read-prompt-file', async (event, workspacePath) => {
  try {
    const promptPath = path.join(workspacePath || DEFAULT_WORKSPACE, 'commandcode-prompt.txt');
    if (fs.existsSync(promptPath)) {
      const content = fs.readFileSync(promptPath, 'utf-8');
      return { success: true, content };
    }
    return { success: false, error: 'File not found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('run-command', async (event, { command, args, cwd, id }) => {
  return new Promise((resolve) => {
    if (currentProcess) {
      mainWindow.webContents.send('command-output', { 
        id, 
        type: 'error', 
        data: 'Another command is already running. Stop it first.' 
      });
      resolve({ success: false, error: 'Process already running' });
      return;
    }

    const workDir = cwd || DEFAULT_WORKSPACE;
    
    // Validate working directory
    if (!fs.existsSync(workDir)) {
      mainWindow.webContents.send('command-output', { 
        id, 
        type: 'error', 
        data: `Directory does not exist: ${workDir}` 
      });
      resolve({ success: false, error: 'Invalid directory' });
      return;
    }

    // Security: only allow specific commands
    const allowedCommands = ['npm', 'command-code', 'npx', 'node'];
    const cmdBase = command.toLowerCase();
    
    if (!allowedCommands.some(cmd => cmdBase === cmd || cmdBase.endsWith('\\' + cmd))) {
      mainWindow.webContents.send('command-output', { 
        id, 
        type: 'error', 
        data: `Command not allowed: ${command}` 
      });
      resolve({ success: false, error: 'Command not allowed' });
      return;
    }

    mainWindow.webContents.send('command-output', { 
      id, 
      type: 'info', 
      data: `> Running: ${command} ${args ? args.join(' ') : ''}\n> Working directory: ${workDir}\n` 
    });

    try {
      // Use spawn for better control on Windows
      const isWin = process.platform === 'win32';
      const shell = isWin ? true : false;
      
      currentProcess = spawn(command, args || [], {
        cwd: workDir,
        shell: shell,
        env: { ...process.env, FORCE_COLOR: '1' }
      });

      let stdoutData = '';
      let stderrData = '';

      currentProcess.stdout.on('data', (data) => {
        const text = data.toString();
        stdoutData += text;
        mainWindow.webContents.send('command-output', { id, type: 'stdout', data: text });
      });

      currentProcess.stderr.on('data', (data) => {
        const text = data.toString();
        stderrData += text;
        mainWindow.webContents.send('command-output', { id, type: 'stderr', data: text });
      });

      currentProcess.on('close', (code) => {
        currentProcess = null;
        const exitMsg = `\n> Process exited with code ${code}\n`;
        mainWindow.webContents.send('command-output', { 
          id, 
          type: code === 0 ? 'success' : 'error', 
          data: exitMsg 
        });
        resolve({ 
          success: code === 0, 
          code, 
          stdout: stdoutData, 
          stderr: stderrData 
        });
      });

      currentProcess.on('error', (error) => {
        currentProcess = null;
        mainWindow.webContents.send('command-output', { 
          id, 
          type: 'error', 
          data: `\n> Error: ${error.message}\n` 
        });
        resolve({ success: false, error: error.message });
      });

    } catch (error) {
      currentProcess = null;
      mainWindow.webContents.send('command-output', { 
        id, 
        type: 'error', 
        data: `\n> Failed to start: ${error.message}\n` 
      });
      resolve({ success: false, error: error.message });
    }
  });
});

ipcMain.handle('stop-command', async () => {
  if (!currentProcess) {
    return { success: false, error: 'No process running' };
  }
  
  killProcess();
  return { success: true };
});

function killProcess() {
  if (!currentProcess) return;
  
  const isWin = process.platform === 'win32';
  
  try {
    if (isWin) {
      // On Windows, we need to kill the process tree
      exec(`taskkill /pid ${currentProcess.pid} /T /F`, (err) => {
        if (err) {
          // Fallback to normal kill
          currentProcess.kill('SIGTERM');
        }
      });
    } else {
      currentProcess.kill('SIGTERM');
    }
  } catch (error) {
    console.error('Error killing process:', error);
  }
  
  currentProcess = null;
}

ipcMain.handle('open-browser', async (event, url) => {
  try {
    await shell.openExternal(url || 'http://localhost:5173');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
