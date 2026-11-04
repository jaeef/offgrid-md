import React, { useState, useEffect, useCallback } from 'react'
import { AlertOctagon, RefreshCw } from 'lucide-react'
import { Header } from './components/Header'
import { SingleConverter } from './components/SingleConverter'
import { BatchConverter } from './components/BatchConverter'
import { QuickPaste } from './components/QuickPaste'
import { SettingsModal } from './components/SettingsModal'
import { Button } from './components/ui/button'

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'single' | 'batch' | 'paste'>('single')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isDark, setIsDark] = useState<boolean>(
    () => document.documentElement.classList.contains('dark')
  )
  const [serverStatus, setServerStatus] = useState<'connected' | 'checking' | 'offline'>('checking')
  const [supportedExtensions, setSupportedExtensions] = useState<string[]>([
    '.pdf', '.docx', '.pptx', '.xlsx', '.png', '.jpg', '.mp3', '.wav', '.html', '.zip', '.csv', '.json', '.xml'
  ])

  // Check backend server health (skipped while the tab is hidden)
  // Cold start shows 'checking' only until first fetch settles; retry from banner.
  const checkHealth = useCallback(async () => {
    if (document.hidden) return
    const ctrl = new AbortController()
    const timeout = setTimeout(() => ctrl.abort(), 5000)
    try {
      const res = await fetch('/api/health', { signal: ctrl.signal })
      if (res.ok) {
        const data = await res.json()
        setServerStatus('connected')
        if (data.supported_extensions) {
          setSupportedExtensions(data.supported_extensions)
        }
      } else {
        setServerStatus('offline')
      }
    } catch (err) {
      setServerStatus('offline')
    } finally {
      clearTimeout(timeout)
    }
  }, [])

  useEffect(() => {
    checkHealth()
    const interval = setInterval(checkHealth, 10000)
    return () => clearInterval(interval)
  }, [checkHealth])

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev
      document.documentElement.classList.toggle('dark', next)
      try {
        localStorage.setItem('offgrid-theme', next ? 'dark' : 'light')
      } catch {
        /* storage unavailable — theme just won't persist */
      }
      return next
    })
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-foreground">
      {/* Top Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        serverStatus={serverStatus}
        isDark={isDark}
        toggleTheme={toggleTheme}
      />

      {/* Engine-offline recovery banner */}
      {serverStatus === 'offline' && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 border-b border-destructive/40 bg-destructive/10 px-4 py-2 text-center text-xs text-foreground"
        >
          <span className="flex items-center gap-1.5">
            <AlertOctagon className="h-3.5 w-3.5 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
            <span>
              <strong className="font-semibold">Engine not running.</strong>{' '}
              Double-click <code className="rounded-none border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">start.bat</code>, then retry.
            </span>
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={checkHealth}
            className="h-6 gap-1 px-2 text-[10px]"
          >
            <RefreshCw className="h-3 w-3" aria-hidden="true" />
            Retry
          </Button>
        </div>
      )}

      {/* Main Views — all three stay mounted so work is never lost on tab switch */}
      <main className="flex-1">
        <div className={activeTab === 'single' ? 'block' : 'hidden'}>
          <SingleConverter />
        </div>
        <div className={activeTab === 'batch' ? 'block' : 'hidden'}>
          <BatchConverter />
        </div>
        <div className={activeTab === 'paste' ? 'block' : 'hidden'}>
          <QuickPaste />
        </div>
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        supportedExtensions={supportedExtensions}
      />
    </div>
  )
}

export default App
