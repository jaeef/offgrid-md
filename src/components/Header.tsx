import React from 'react'
import { FileText, FolderArchive, ClipboardCopy, Settings, Moon, Sun, CheckCircle2 } from 'lucide-react'
import { Button } from './ui/button'

interface HeaderProps {
  activeTab: 'single' | 'batch' | 'paste'
  setActiveTab: (tab: 'single' | 'batch' | 'paste') => void
  onOpenSettings: () => void
  serverStatus: 'connected' | 'checking' | 'offline'
  isDark: boolean
  toggleTheme: () => void
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenSettings,
  serverStatus,
  isDark,
  toggleTheme
}) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex min-h-14 max-w-7xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2 sm:px-6 lg:flex-nowrap lg:py-0">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-none bg-primary shadow-md shadow-primary/30">
            <span className="font-mono text-sm font-bold text-white">M</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight text-foreground">
                MarkItDown
              </span>
              <span className="rounded bg-muted/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                v0.1 Studio
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 rounded-none border border-border bg-card/60 p-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('single')}
            className={`flex shrink-0 items-center gap-2 rounded-none px-2.5 py-1.5 text-xs font-medium transition-all sm:px-3 ${
              activeTab === 'single'
                ? 'bg-muted text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <FileText className="h-3.5 w-3.5 text-primary" />
            <span className="hidden sm:inline">Single Converter</span>
          </button>

          <button
            onClick={() => setActiveTab('batch')}
            className={`flex shrink-0 items-center gap-2 rounded-none px-2.5 py-1.5 text-xs font-medium transition-all sm:px-3 ${
              activeTab === 'batch'
                ? 'bg-muted text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <FolderArchive className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Batch Folder Queue</span>
          </button>

          <button
            onClick={() => setActiveTab('paste')}
            className={`flex shrink-0 items-center gap-2 rounded-none px-2.5 py-1.5 text-xs font-medium transition-all sm:px-3 ${
              activeTab === 'paste'
                ? 'bg-muted text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <ClipboardCopy className="h-3.5 w-3.5 text-accent" />
            <span className="hidden sm:inline">Quick Paste</span>
          </button>
        </nav>

        {/* Status & Actions */}
        <div className="flex items-center gap-2.5">
          {/* Server status pill (hidden on small screens to prevent overlap) */}
          <div
            className="hidden items-center gap-1.5 rounded-full border border-border bg-card/70 px-2.5 py-1 text-[11px] md:flex"
            title={serverStatus === 'connected' ? 'Offline Engine Connected' : 'Engine Disconnected'}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                serverStatus === 'connected'
                  ? 'bg-emerald-500 animate-pulse'
                  : serverStatus === 'checking'
                  ? 'bg-accent'
                  : 'bg-red-500'
              }`}
            />
            <span className="text-foreground font-medium">
              {serverStatus === 'connected' ? 'Offline Engine' : serverStatus === 'offline' ? 'Offline' : 'Checking...'}
            </span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title="Toggle theme"
          >
            <span key={isDark ? 'sun' : 'moon'} className="theme-icon">
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </span>
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={onOpenSettings}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title="Engine Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
