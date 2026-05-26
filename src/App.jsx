import { useState, useEffect, useRef, useCallback } from 'react'
import {
  FolderOpen,
  Folder,
  Play,
  Square,
  RotateCcw,
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
  Cpu
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

export default function App() {
  const [workspace, setWorkspace] = useState('')
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id)
  const [prompt, setPrompt] = useState('')
  const [logs, setLogs] = useState([])
  const [status, setStatus] = useState('READY')
  const [isRunning, setIsRunning] = useState(false)
  const [commandId, setCommandId] = useState(0)
  const [useFallback, setUseFallback] = useState(false)
  
  const logEndRef = useRef(null)
  const logContainerRef = useRef(null)

  // Initialize workspace and detect platform
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getDefaultWorkspace().then(path => {
        setWorkspace(path)
      })
      // Detect if running on Windows - node-pty may have issues
      const isWindows = navigator.userAgent.includes('Windows')
      setUseFallback(isWindows)
    } else {
      // Running in browser without Electron
      setUseFallback(true)
    }
  }, [])

  // Auto-scroll logs
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs])

  // Listen for command output
  useEffect(() => {
    if (!window.electronAPI) return

    const removeListener = window.electronAPI.onCommandOutput((data) => {
      setLogs(prev => [...prev, { 
        id: Date.now(), 
        type: data.type, 
        text: data.data,
        timestamp: new Date().toLocaleTimeString()
      }])
      
      if (data.type === 'success') {
        setStatus('DONE')
        setIsRunning(false)
      } else if (data.type === 'error') {
        setStatus('ERROR')
        setIsRunning(false)
      }
    })

    return () => {
      if (removeListener) removeListener()
    }
  }, [])

  const handleSelectWorkspace = async () => {
    if (!window.electronAPI) {
      addLog('error', 'Electron API not available')
      return
    }
    const path = await window.electronAPI.selectWorkspace()
    if (path) {
      setWorkspace(path)
      addLog('info', `Workspace changed to: ${path}`)
    }
  }

  const handleOpenFolder = async () => {
    if (!window.electronAPI) return
    const success = await window.electronAPI.openFolder(workspace)
    if (success) {
      addLog('info', `Opened folder: ${workspace}`)
    }
  }

  const handleLoadPrompt = async () => {
    if (!window.electronAPI) return
    const result = await window.electronAPI.readPromptFile(workspace)
    if (result.success) {
      setPrompt(result.content)
      addLog('info', 'Prompt loaded from commandcode-prompt.txt')
    } else {
      addLog('error', `Failed to load prompt: ${result.error}`)
    }
  }

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
      addLog('info', 'Prompt copied to clipboard')
    } catch (err) {
      addLog('error', 'Failed to copy prompt')
    }
  }

  const addLog = (type, text) => {
    setLogs(prev => [...prev, { 
      id: Date.now(), 
      type, 
      text,
      timestamp: new Date().toLocaleTimeString()
    }])
  }

  const runCommand = async (command, args, label) => {
    if (!window.electronAPI) {
      addLog('error', 'Electron API not available - running in browser mode?')
      return
    }

    if (isRunning) {
      addLog('error', 'Another command is already running')
      return
    }

    const newCommandId = commandId + 1
    setCommandId(newCommandId)
    setIsRunning(true)
    setStatus('RUNNING')
    
    addLog('info', `\n--- Starting: ${label} ---`)
    
    try {
      await window.electronAPI.runCommand({
        command,
        args,
        cwd: workspace,
        id: newCommandId
      })
    } catch (error) {
      addLog('error', `Failed to run command: ${error.message}`)
      setStatus('ERROR')
      setIsRunning(false)
    }
  }

  const handleStopCommand = async () => {
    if (!window.electronAPI) return
    const result = await window.electronAPI.stopCommand()
    if (result.success) {
      addLog('info', 'Command stopped')
      setIsRunning(false)
      setStatus('READY')
    }
  }

  const handleClearLogs = () => {
    setLogs([])
    setStatus('READY')
  }

  const handleStartDev = () => {
    runCommand('npm', ['run', 'dev'], 'npm run dev')
  }

  const handleBuild = () => {
    runCommand('npm', ['run', 'build'], 'npm run build')
  }

  const handlePreview = () => {
    runCommand('npm', ['run', 'preview'], 'npm run preview')
  }

  const handleRunCommandCode = () => {
    const model = MODELS.find(m => m.id === selectedModel)
    runCommand('command-code', ['-m', selectedModel], `Command Code with ${model.name}`)
  }

  const handleRunCommandCodeWithPrompt = () => {
    if (!prompt.trim()) {
      addLog('error', 'Prompt is empty!')
      return
    }
    const model = MODELS.find(m => m.id === selectedModel)
    // Note: --print flag behavior depends on command-code version
    // Using echo to pipe prompt as alternative
    addLog('info', 'Note: Interactive mode with prompt - pasting to terminal...')
    runCommand('command-code', ['-m', selectedModel], `Command Code with ${model.name} (with prompt)`)
  }

  const handleOpenBrowser = async () => {
    if (!window.electronAPI) return
    await window.electronAPI.openBrowser('http://localhost:5173')
    addLog('info', 'Opened browser at http://localhost:5173')
  }

  const handleOpenExternalTerminal = () => {
    if (!window.electronAPI) return
    window.electronAPI.openFolder(workspace)
    addLog('info', 'Opened folder in file explorer - you can open terminal there manually')
  }

  const currentStatus = STATUS[status] || STATUS.READY
  const StatusIcon = currentStatus.icon

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <div className="logo">
            <Code2 size={24} />
          </div>
          <div>
            <h1>CC Launcher</h1>
            <span>Command Code Desktop Tool</span>
          </div>
        </div>
        <div className="status-indicator" style={{ color: currentStatus.color }}>
          <StatusIcon size={18} className={status === 'RUNNING' ? 'spin' : ''} />
          <span>{currentStatus.label}</span>
        </div>
      </header>

      <main className="app-main">
        <aside className="sidebar-panel">
          {/* Workspace Section */}
          <section className="section">
            <h2><Folder size={18} /> Workspace</h2>
            <div className="input-group">
              <input 
                type="text" 
                value={workspace} 
                readOnly 
                placeholder="Select workspace..."
                className="workspace-input"
              />
              <button onClick={handleSelectWorkspace} className="btn btn-secondary">
                <FolderOpen size={16} />
                Chọn
              </button>
            </div>
            <button onClick={handleOpenFolder} className="btn btn-ghost">
              <ExternalLink size={14} />
              Mở thư mục
            </button>
          </section>

          {/* Model Selection */}
          <section className="section">
            <h2><Cpu size={18} /> Model</h2>
            <div className="model-list">
              {MODELS.map(model => (
                <button
                  key={model.id}
                  className={`model-btn ${selectedModel === model.id ? 'active' : ''}`}
                  onClick={() => setSelectedModel(model.id)}
                  style={{ '--model-color': model.color }}
                >
                  <span className="model-dot" style={{ background: model.color }} />
                  {model.name}
                </button>
              ))}
            </div>
          </section>

          {/* Prompt Section */}
          <section className="section prompt-section">
            <h2><FileText size={18} /> Prompt</h2>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your prompt here..."
              className="prompt-textarea"
              rows={8}
            />
            <div className="btn-row">
              <button onClick={handleLoadPrompt} className="btn btn-secondary">
                <FileText size={14} />
                Load from file
              </button>
              <button onClick={handleCopyPrompt} className="btn btn-secondary">
                <Copy size={14} />
                Copy
              </button>
            </div>
          </section>

          {/* Quick Actions */}
          <section className="section">
            <h2><Zap size={18} /> Quick Actions</h2>
            <div className="action-grid">
              <button onClick={handleStartDev} disabled={isRunning} className="action-btn dev">
                <Play size={16} />
                Start Dev
              </button>
              <button onClick={handleBuild} disabled={isRunning} className="action-btn build">
                <Hammer size={16} />
                Build
              </button>
              <button onClick={handlePreview} disabled={isRunning} className="action-btn preview">
                <Eye size={16} />
                Preview
              </button>
              <button onClick={handleOpenBrowser} className="action-btn browser">
                <Globe size={16} />
                Open Browser
              </button>
            </div>
          </section>

          {/* Command Code Actions */}
          <section className="section">
            <h2><Terminal size={18} /> Command Code</h2>
            <div className="action-list">
              <button 
                onClick={handleRunCommandCode} 
                disabled={isRunning}
                className="btn btn-primary btn-large"
              >
                <Play size={18} />
                Run Command Code
                <span className="model-tag">{MODELS.find(m => m.id === selectedModel)?.name}</span>
              </button>
              <button 
                onClick={handleRunCommandCodeWithPrompt} 
                disabled={isRunning || !prompt.trim()}
                className="btn btn-primary btn-large"
              >
                <Terminal size={18} />
                Run with Prompt
              </button>
            </div>
          </section>
        </aside>

        {/* Terminal Panel */}
        <section className="terminal-panel">
          <div className="terminal-header">
            <h2><Terminal size={18} /> Terminal / Logs</h2>
            <div className="terminal-actions">
              {isRunning && (
                <button onClick={handleStopCommand} className="btn btn-danger">
                  <Square size={14} fill="currentColor" />
                  Stop
                </button>
              )}
              <button onClick={handleClearLogs} className="btn btn-ghost">
                <Trash2 size={14} />
                Clear
              </button>
              <button onClick={handleOpenExternalTerminal} className="btn btn-ghost" title="Open external terminal">
                <ExternalLink size={14} />
              </button>
            </div>
          </div>
          
          <div className="terminal-body" ref={logContainerRef}>
            {logs.length === 0 ? (
              <div className="terminal-empty">
                <Terminal size={48} opacity={0.3} />
                <p>Terminal ready. Run a command to see output here.</p>
                <span className="fallback-note">
                  {useFallback 
                    ? 'Mode: child_process spawn (Windows compatible fallback)' 
                    : 'Mode: Integrated terminal'}
                </span>
              </div>
            ) : (
              <div className="log-list">
                {logs.map(log => (
                  <div 
                    key={log.id} 
                    className={`log-line ${log.type}`}
                  >
                    <span className="log-time">{log.timestamp}</span>
                    <span className="log-text">{log.text}</span>
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            )}
          </div>

          <div className="terminal-footer">
            <span className="terminal-info">
              {isRunning ? 'Process running...' : 'Ready'}
              {useFallback && ' (Fallback mode)'}
            </span>
          </div>
        </section>
      </main>
    </div>
  )
}
