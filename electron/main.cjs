const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const fs = require('fs');

let mainWindow;
let currentProcess = null;

const DEFAULT_WORKSPACE = 'F:\\1_A_Disk_D\\Tool\\sanbox';

const EXCLUDED_DIRS = ['node_modules', 'dist', 'release', '.git', '.commandcode', 'coverage'];
const EXCLUDED_EXTS = ['.exe', '.dll', '.asar', '.pak', '.map', '.bin', '.dat', '.ico', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ttf'];
const MAX_FILE_SIZE = 1024 * 1024;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1200,
    minHeight: 700,
    title: 'CC Launcher',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    show: false,
    backgroundColor: '#0a0a0f'
  });

  mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
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

function isPathSafe(workspacePath, targetPath) {
  const resolvedWorkspace = path.resolve(workspacePath);
  const resolvedTarget = path.resolve(targetPath);
  return resolvedTarget.startsWith(resolvedWorkspace);
}

function shouldExcludeFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (EXCLUDED_EXTS.includes(ext)) return true;
  
  const parts = filePath.split(path.sep);
  return parts.some(part => EXCLUDED_DIRS.includes(part));
}

function shouldExcludeDir(dirPath) {
  const parts = dirPath.split(path.sep);
  return parts.some(part => EXCLUDED_DIRS.includes(part));
}

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

ipcMain.handle('open-folder-in-explorer', async (event, folderPath) => {
  if (folderPath && fs.existsSync(folderPath)) {
    await shell.openPath(folderPath);
    return { success: true };
  }
  return { success: false, error: 'Folder not found' };
});

ipcMain.handle('open-file-external', async (event, filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    await shell.openPath(filePath);
    return { success: true };
  }
  return { success: false, error: 'File not found' };
});

ipcMain.handle('list-workspace-files', async (event, workspacePath) => {
  try {
    if (!fs.existsSync(workspacePath)) {
      return { success: false, error: 'Workspace not found' };
    }

    const result = [];
    
    function scanDir(dirPath, relativePath = '') {
      const items = fs.readdirSync(dirPath, { withFileTypes: true });
      
      for (const item of items) {
        const itemRelativePath = relativePath ? `${relativePath}/${item.name}` : item.name;
        const fullPath = path.join(dirPath, item.name);
        
        if (item.isDirectory()) {
          if (!shouldExcludeDir(itemRelativePath)) {
            result.push({
              name: item.name,
              path: itemRelativePath,
              type: 'directory',
              children: []
            });
            scanDir(fullPath, itemRelativePath);
          }
        } else {
          if (!shouldExcludeFile(itemRelativePath)) {
            result.push({
              name: item.name,
              path: itemRelativePath,
              type: 'file',
              ext: path.extname(item.name).toLowerCase()
            });
          }
        }
      }
    }
    
    scanDir(workspacePath);
    return { success: true, files: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('read-workspace-file', async (event, workspacePath, relativePath) => {
  try {
    if (!fs.existsSync(workspacePath)) {
      return { success: false, error: 'Workspace not found' };
    }

    const fullPath = path.join(workspacePath, relativePath);
    
    if (!isPathSafe(workspacePath, fullPath)) {
      return { success: false, error: 'Access denied: path outside workspace' };
    }

    if (!fs.existsSync(fullPath)) {
      return { success: false, error: 'File not found' };
    }

    const stats = fs.statSync(fullPath);
    if (stats.size > MAX_FILE_SIZE) {
      return { success: false, error: 'File too large (max 1MB)' };
    }

    if (stats.isDirectory()) {
      return { success: false, error: 'Cannot open directory as file' };
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    return { success: true, content, path: relativePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-auto-open-file', async (event, workspacePath) => {
  try {
    const workDir = workspacePath || DEFAULT_WORKSPACE;

    if (!fs.existsSync(workDir)) {
      return { success: false, error: 'Workspace not found' };
    }

    const files = fs.readdirSync(workDir);
    
    const priorityFiles = ['README.md', 'readme.md', 'Readme.md', 'package.json'];
    for (const file of priorityFiles) {
      if (files.includes(file)) {
        return { success: true, filePath: file };
      }
    }

    const textFiles = files.filter(f => {
      const ext = path.extname(f).toLowerCase();
      return ['.md', '.txt', '.js', '.jsx', '.ts', '.tsx', '.json', '.css', '.html'].includes(ext);
    });

    if (textFiles.length > 0) {
      return { success: true, filePath: textFiles[0] };
    }

    return { success: false, error: 'No suitable file found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
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
        data: '[Error: Another command is already running. Stop it first.]'
      });
      resolve({ success: false, error: 'Process already running' });
      return;
    }

    const workDir = cwd || DEFAULT_WORKSPACE;
    
    if (!fs.existsSync(workDir)) {
      mainWindow.webContents.send('command-output', {
        id,
        type: 'error',
        data: `[Error: Directory does not exist: ${workDir}]`
      });
      resolve({ success: false, error: 'Invalid directory' });
      return;
    }

    if (!isPathSafe(DEFAULT_WORKSPACE, workDir)) {
      mainWindow.webContents.send('command-output', {
        id,
        type: 'error',
        data: '[Error: Access denied - directory outside allowed workspace]'
      });
      resolve({ success: false, error: 'Access denied' });
      return;
    }

    const allowedCommands = ['npm', 'command-code', 'npx', 'node'];
    const cmdBase = command.toLowerCase();

    if (!allowedCommands.some(cmd => cmdBase === cmd || cmdBase.endsWith('\\' + cmd))) {
      mainWindow.webContents.send('command-output', {
        id,
        type: 'error',
        data: `[Error: Command not allowed: ${command}]`
      });
      resolve({ success: false, error: 'Command not allowed' });
      return;
    }

    const formattedCmd = args && args.length > 0
      ? `${command} ${args.map(arg => arg.includes(' ') ? `"${arg}"` : arg).join(' ')}`
      : command;

    mainWindow.webContents.send('command-output', {
      id,
      type: 'info',
      data: `Running: ${formattedCmd}\n`
    });

    try {
      currentProcess = spawn(command, args || [], {
        cwd: workDir,
        shell: false,
        windowsHide: true,
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
        mainWindow.webContents.send('command-output', {
          id,
          type: code === 0 ? 'success' : 'error',
          data: code === 0 ? '\n[Done]' : `\n[Exit code: ${code}]`
        });
        resolve({
          success: code === 0,
          code,
          stdout: stdoutData,
          stderr: stderrData
        });
      });

      currentProcess.on('error', async (error) => {
        if (error.code === 'ENOENT' && command === 'command-code') {
          mainWindow.webContents.send('command-output', {
            id,
            type: 'info',
            data: '[Retrying with command-code.cmd...]\n'
          });

          try {
            currentProcess = spawn('command-code.cmd', args || [], {
              cwd: workDir,
              shell: false,
              windowsHide: true,
              env: { ...process.env, FORCE_COLOR: '1' }
            });

            let retryStdout = '';
            let retryStderr = '';

            currentProcess.stdout.on('data', (data) => {
              const text = data.toString();
              retryStdout += text;
              mainWindow.webContents.send('command-output', { id, type: 'stdout', data: text });
            });

            currentProcess.stderr.on('data', (data) => {
              const text = data.toString();
              retryStderr += text;
              mainWindow.webContents.send('command-output', { id, type: 'stderr', data: text });
            });

            currentProcess.on('close', (code) => {
              currentProcess = null;
              mainWindow.webContents.send('command-output', {
                id,
                type: code === 0 ? 'success' : 'error',
                data: code === 0 ? '\n[Done]' : `\n[Exit code: ${code}]`
              });
              resolve({
                success: code === 0,
                code,
                stdout: retryStdout,
                stderr: retryStderr
              });
            });

            return;
          } catch (retryError) {
            currentProcess = null;
            mainWindow.webContents.send('command-output', {
              id,
              type: 'error',
              data: `\n[Error: command-code not found. Please install Command Code CLI.]`
            });
            resolve({ success: false, error: retryError.message });
            return;
          }
        }

        currentProcess = null;
        mainWindow.webContents.send('command-output', {
          id,
          type: 'error',
          data: `\n[Error: ${error.message}]`
        });
        resolve({ success: false, error: error.message });
      });

    } catch (error) {
      currentProcess = null;
      mainWindow.webContents.send('command-output', {
        id,
        type: 'error',
        data: `\n[Failed to start: ${error.message}]`
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
      exec(`taskkill /pid ${currentProcess.pid} /T /F`, (err) => {
        if (err) {
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

ipcMain.handle('open-interactive-terminal', async (event, workspacePath, model) => {
  try {
    const workDir = workspacePath || DEFAULT_WORKSPACE;

    if (!fs.existsSync(workDir)) {
      return { success: false, error: 'Workspace not found' };
    }

    const command = `cd /d "${workDir}" && command-code -m "${model}"`;
    exec(`start cmd.exe /K "${command}"`, (error) => {
      if (error) {
        console.error('Error opening terminal:', error);
      }
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
