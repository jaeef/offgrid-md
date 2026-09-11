import React, { useState, useEffect } from 'react'
import { Header } from './components/Header'
import { SingleConverter } from './components/SingleConverter'
import { BatchConverter } from './components/BatchConverter'
import { QuickPaste } from './components/QuickPaste'
import { SettingsModal } from './components/SettingsModal'

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'single' | 'batch' | 'paste'>('single')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isDark, setIsDark] = useState(true)
  const [serverStatus, setServerStatus] = useState<'connected' | 'checking' | 'offline'>('checking')
  const [supportedExtensions, setSupportedExtensions] = useState<string[]>([
    '.pdf', '.docx', '.pptx', '.xlsx', '.png', '.jpg', '.mp3', '.wav', '.html', '.zip', '.csv', '.json', '.xml'
  ])

  // Check backend server health
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health')
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
      }
    }

    checkHealth()
    const interval = setInterval(checkHealth, 10000)
    return () => clearInterval(interval)
  }, [])

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev
      if (next) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
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

      {/* Main Views */}
      <main className="flex-1 lg:overflow-hidden">
        {activeTab === 'single' && <SingleConverter />}
        {activeTab === 'batch' && <BatchConverter />}
        {activeTab === 'paste' && <QuickPaste />}
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
