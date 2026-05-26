import { useState, useEffect, useRef } from 'react'
import {
  FolderOpen,
  Folder,
  Play,
  Square,
  Trash2,
  Copy,
  FileText,
  Terminal,
  Globe,
  Hammer,
  Eye,
  Zap,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Code2,
  Cpu,
  ChevronRight,
  ChevronDown,
  FileCode,
  FileJson,
  FileType,
  FolderClosed,
  Send
} from 'lucide-react'
import './App.css'

const MODELS = [
  { id: 'moonshotai/Kimi-K2.5', name: 'Kimi K2.5', color: '#10b981' },
  { id: 'deepseek/deepseek-v4-flash', name: 'DeepSeek Flash', color: '#3b82f6' },
  { id: 'Qwen/Qwen3.7-Max', name: 'Qwen Max', color: '#f59e0b' }
]

const STATUS = {
  READY: { label: 'Ready', color: '#10b981', icon: CheckCircle2 },
  RUNNING: { label: 'Running', color: '#3b82f6', icon: Loader2 },
  ERROR: { label: 'Error', color: '#ef4444', icon: AlertCircle },
  DONE: { label: 'Done', color: '#10b981', icon: CheckCircle2 }
}

function getFileIcon(ext) {
  if (['.js', '.jsx', '.mjs', '.cjs'].includes(ext)) return <FileCode size={14} />
  if (['.json'].includes(ext)) return <FileJson size={14} />
  if (['.md', '.txt'].includes(ext)) return <FileText size={14} />
  if (['.css', '.scss', '.less'].includes(ext)) return <FileType size={14} />
  if (['.html', '.htm'].includes(ext)) return <Globe size={14} />
  return <FileText size={14} />
}

function FileTree({ files, onFileClick, currentFile, level = 0 }) {
  const [expanded, setExpanded] = useState({})

  const toggleDir = (path, e) => {
    e.stopPropagation()
    setExpanded(prev => ({ ...prev, [path]: !prev[path] }))
  }

  const dirs = files.filter(f => f.type === 'directory')
  const fileItems = files.filter(f => f.type === 'file')

  return (
    <div className="file-tree" style={{ paddingLeft: level * 12 }}>
      {dirs.map(dir => (
        <div key={dir.path}>
          <div
            className="file-tree-item directory"
            onClick={(e) => toggleDir(dir.path, e)}
          >
            {expanded[dir.path] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            {expanded[dir.path] ? <FolderOpen size={14} /> : <FolderClosed size={14} />}
            <span>{dir.name}</span>
          </div>
          {expanded[dir.path] && (
            <FileTree
              files={files.filter(f => f.path.startsWith(dir.path + '/'))}
              onFileClick={onFileClick}
              currentFile={currentFile}
              level={level + 1}
            />
          )}
        </div>
      ))}
      {fileItems.map(file => (
        <div
          key={file.path}
          className={`file-tree-item file ${currentFile === file.path ? 'active' : ''}`}
          onClick={() => onFileClick(file.path)}
        >
          <span className="file-indent" />
          {getFileIcon(file.ext)}
          <span>{file.name}</span>
        </div>
      ))}
    </div>
  )
}

export default function App() {
  const [workspace, setWorkspace] = useState('')
  const [files, setFiles] = useState([])
  const [currentFile, setCurrentFile] = useState(null)
  const [fileContent, setFileContent] = useState('')
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id)
  const [prompt, setPrompt] = useState('')
  const [chatMessages, setChatMessages] = useState([])
  const [logs, setLogs] = useState([])
  const [status, setStatus] = useState('READY')
  const [isRunning, setIsRunning] = useState(false)
  const [commandId, setCommandId] = useState(0)
  const [activeTab, setActiveTab] = useState('editor')

  const logEndRef = useRef(null)

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getDefaultWorkspace().then(path => {
        setWorkspace(path)
        loadWorkspaceFiles(path)
      })
    }
  }, [])

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, chatMessages])

  useEffect(() => {
    if (!window.electronAPI) return

    const removeListener = window.electronAPI.onCommandOutput((data) => {
      if (data.type === 'stdout' || data.type === 'stderr') {
        setLogs(prev => [...prev, {
          id: Date.now(),
          type: data.type,
          text: data.data,
          timestamp: new Date().toLocaleTimeString()
        }])
      } else if (data.type === 'info') {
        setLogs(prev => [...prev, {
          id: Date.now(),
          type: 'info',
          text: data.data,
          timestamp: new Date().toLocaleTimeString()
        }])
      } else if (data.type === 'success' || data.type === 'error') {
        setLogs(prev => [...prev, {
          id: Date.now(),
          type: data.type,
          text: data.data,
          timestamp: new Date().toLocaleTimeString()
        }])
        setStatus(data.type === 'success' ? 'DONE' : 'ERROR')
        setIsRunning(false)
      }
    })

    return () => {
      if (removeListener) removeListener()
    }
  }, [])

  const loadWorkspaceFiles = async (path) => {
    if (!window.electronAPI) return
    const result = await window.electronAPI.listWorkspaceFiles(path)
    if (result.success) {
      setFiles(result.files)
      autoOpenFile(path)
    } else {
      setLogs(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        text: `Cannot load workspace: ${result.error}`,
        timestamp: new Date().toLocaleTimeString()
      }])
    }
  }

  const autoOpenFile = async (path) => {
    if (!window.electronAPI) return
    const result = await window.electronAPI.getAutoOpenFile(path)
    if (result.success) {
      openFile(result.filePath, path)
    }
  }

  const openFile = async (relativePath, workspacePath = workspace) => {
    if (!window.electronAPI) return
    const result = await window.electronAPI.readWorkspaceFile(workspacePath, relativePath)
    if (result.success) {
      setCurrentFile(relativePath)
      setFileContent(result.content)
      setActiveTab('editor')
    } else {
      setLogs(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        text: `Cannot open ${relativePath}: ${result.error}`,
        timestamp: new Date().toLocaleTimeString()
      }])
    }
  }

  const handleSelectWorkspace = async () => {
    if (!window.electronAPI) return
    const newPath = await window.electronAPI.selectWorkspace()
    if (newPath) {
      setWorkspace(newPath)
      setCurrentFile(null)
      setFileContent('')
      loadWorkspaceFiles(newPath)
    }
  }

  const handleOpenFolder = () => {
    if (!window.electronAPI) return
    window.electronAPI.openFolderInExplorer(workspace)
  }

  const handleLoadPrompt = async () => {
    if (!window.electronAPI) return
    const result = await window.electronAPI.readPromptFile(workspace)
    if (result.success) {
      setPrompt(result.content)
    }
  }

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
    } catch {}
  }

  const runCommand = async (command, args, label) => {
    if (!window.electronAPI) return
    if (isRunning) return

    const newId = commandId + 1
    setCommandId(newId)
    setIsRunning(true)
    setStatus('RUNNING')
    setActiveTab('terminal')

    await window.electronAPI.runCommand({
      command,
      args,
      cwd: workspace,
      id: newId
    })
  }

  const handleStop = async () => {
    if (!window.electronAPI) return
    await window.electronAPI.stopCommand()
    setIsRunning(false)
    setStatus('READY')
  }

  const handleClear = () => {
    setLogs([])
  }

  const handleSendPrompt = () => {
    const promptText = prompt.trim()
    if (!promptText) {
      setLogs(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        text: 'Prompt is empty',
        timestamp: new Date().toLocaleTimeString()
      }])
      return
    }

    setChatMessages(prev => [...prev, {
      id: Date.now(),
      role: 'user',
      text: promptText,
      timestamp: new Date().toLocaleTimeString()
    }])

    runCommand('command-code', ['-m', selectedModel, '--print', promptText], 'Command Code')
  }

  const handleOpenInteractiveTerminal = async () => {
    if (!window.electronAPI) return
    await window.electronAPI.openInteractiveTerminal(workspace, selectedModel)
  }

  const currentStatus = STATUS[status] || STATUS.READY
  const StatusIcon = currentStatus.icon

  const rootFiles = files.filter(f => !f.path.includes('/'))

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <div className="logo"><Code2 size={24} /></div>
          <div>
            <h1>CC Launcher</h1>
            <span>Code Editor + Command Code</span>
          </div>
        </div>
        <div className="header-actions">
          <select
            className="model-select"
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
          >
            {MODELS.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <div className="status-indicator" style={{ color: currentStatus.color }}>
            <StatusIcon size={18} className={status === 'RUNNING' ? 'spin' : ''} />
            <span>{currentStatus.label}</span>
          </div>
        </div>
      </header>

      <main className="app-main">
        <aside className="sidebar">
          <div className="workspace-header">
            <div className="workspace-path">{workspace}</div>
            <div className="workspace-actions">
              <button onClick={handleSelectWorkspace} className="btn btn-small">
                <FolderOpen size={14} />
                Change
              </button>
              <button onClick={handleOpenFolder} className="btn btn-small">
                <ExternalLink size={14} />
                Open
              </button>
            </div>
          </div>

          <div className="file-tree-container">
            <FileTree
              files={rootFiles}
              onFileClick={openFile}
              currentFile={currentFile}
            />
          </div>
        </aside>

        <section className="content">
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'editor' ? 'active' : ''}`}
              onClick={() => setActiveTab('editor')}
            >
              <FileCode size={14} />
              Editor {currentFile && `- ${currentFile}`}
            </button>
            <button
              className={`tab ${activeTab === 'terminal' ? 'active' : ''}`}
              onClick={() => setActiveTab('terminal')}
            >
              <Terminal size={14} />
              Terminal
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'editor' && (
              <div className="editor-panel">
                {currentFile ? (
                  <>
                    <div className="editor-header">
                      <span>{currentFile}</span>
                    </div>
                    <textarea
                      className="editor-textarea"
                      value={fileContent}
                      readOnly
                      spellCheck={false}
                    />
                  </>
                ) : (
                  <div className="editor-empty">
                    <FileCode size={48} />
                    <p>Select a file from the sidebar</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'terminal' && (
              <div className="terminal-content">
                <div className="terminal-toolbar">
                  {isRunning ? (
                    <button onClick={handleStop} className="btn btn-danger btn-small">
                      <Square size={14} fill="currentColor" />
                      Stop
                    </button>
                  ) : (
                    <>
                      <button onClick={() => runCommand('npm', ['run', 'dev'], 'npm run dev')} className="btn btn-small">
                        <Play size={14} />
                        Dev
                      </button>
                      <button onClick={() => runCommand('npm', ['run', 'build'], 'npm run build')} className="btn btn-small">
                        <Hammer size={14} />
                        Build
                      </button>
                      <button onClick={() => runCommand('npm', ['run', 'preview'], 'npm run preview')} className="btn btn-small">
                        <Eye size={14} />
                        Preview
                      </button>
                    </>
                  )}
                  <button onClick={handleClear} className="btn btn-ghost btn-small">
                    <Trash2 size={14} />
                    Clear
                  </button>
                </div>
                <div className="terminal-logs">
                  {logs.length === 0 ? (
                    <div className="terminal-empty">
                      <Terminal size={32} />
                      <p>Ready. Run a command to see output.</p>
                    </div>
                  ) : (
                    logs.map(log => (
                      <div key={log.id} className={`log-line ${log.type}`}>
                        <span className="log-time">{log.timestamp}</span>
                        <span className="log-text">{log.text}</span>
                      </div>
                    ))
                  )}
                  <div ref={logEndRef} />
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className="chat-panel">
          <div className="chat-header">
            <Zap size={16} />
            <span>Command Code</span>
          </div>
          
          <div className="prompt-section">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter prompt for Command Code..."
              className="prompt-input"
              rows={6}
            />
            <div className="prompt-actions">
              <button onClick={handleLoadPrompt} className="btn btn-small">
                <FileText size={14} />
                Load
              </button>
              <button onClick={handleCopyPrompt} className="btn btn-small">
                <Copy size={14} />
                Copy
              </button>
              <button
                onClick={handleSendPrompt}
                disabled={isRunning || !prompt.trim()}
                className="btn btn-primary btn-small"
              >
                <Send size={14} />
                Send
              </button>
              <button
                onClick={handleOpenInteractiveTerminal}
                disabled={isRunning}
                className="btn btn-small"
              >
                <Terminal size={14} />
                Interactive
              </button>
            </div>
          </div>

          <div className="chat-context">
            <div className="context-item">
              <strong>Workspace:</strong> {workspace}
            </div>
            {currentFile && (
              <div className="context-item">
                <strong>File:</strong> {currentFile}
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  )
}
