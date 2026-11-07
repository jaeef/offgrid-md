import React from 'react'
import { FileText, FolderArchive, ClipboardCopy, Settings, Moon, Sun } from 'lucide-react'
import { Button } from './ui/button'

interface HeaderProps {
  activeTab: 'single' | 'batch' | 'paste'
  setActiveTab: (tab: 'single' | 'batch' | 'paste') => void
  onOpenSettings: () => void
  serverStatus: 'connected' | 'checking' | 'offline'
  isDark: boolean
  toggleTheme: () => void
}

const TABS = [
  { id: 'single' as const, short: 'Single', label: 'Single Converter', icon: FileText },
  { id: 'batch' as const, short: 'Batch', label: 'Batch Folder Queue', icon: FolderArchive },
  { id: 'paste' as const, short: 'Paste', label: 'Quick Paste', icon: ClipboardCopy },
]

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenSettings,
  serverStatus,
  isDark,
  toggleTheme
}) => {
  const statusColor =
    serverStatus === 'connected'
      ? 'bg-emerald-500'
      : serverStatus === 'checking'
        ? 'bg-accent'
        : 'bg-red-500'
  const statusLabel =
    serverStatus === 'connected' ? 'Offline Engine' : serverStatus === 'offline' ? 'Offline' : 'Checking…'

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-2 gap-y-2 px-3 py-2 sm:px-6 lg:h-16 lg:flex-nowrap lg:py-0">
        {/* Brand */}
        <div className="flex shrink-0 items-center gap-2.5">
          <div
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow"
          >
            <span className="font-serif text-base font-semibold leading-none text-primary-foreground">M</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-serif text-base font-semibold text-foreground">
              MarkItDown
            </span>
            <span className="hidden rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground min-[400px]:inline">
              v0.1 Studio
            </span>
          </div>
        </div>

        {/* Navigation Tabs — full-width row on small screens */}
        <nav
          aria-label="Primary"
          className="order-3 grid w-full grid-cols-3 gap-1 rounded-lg border border-border bg-card/70 p-1 sm:order-none sm:flex sm:w-auto sm:gap-0 sm:space-x-1"
        >
          {TABS.map(({ id, short, label, icon: Icon }) => {
            const active = activeTab === id
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                aria-current={active ? 'page' : undefined}
                className={`flex h-9 shrink-0 items-center justify-center gap-2 rounded-md px-2 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-8 sm:justify-start sm:px-3 sm:text-xs ${
                  active
                    ? 'bg-muted text-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <span className="sm:hidden">{short}</span>
                <span className="hidden sm:inline">{label}</span>
              </button>
            )
          })}
        </nav>

        {/* Status & Actions */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          {/* Compact status dot on small screens */}
          <span
            role="status"
            aria-label={`Engine status: ${statusLabel}`}
            title={statusLabel}
            className="flex h-8 w-8 items-center justify-center md:hidden"
          >
            <span className={`h-2.5 w-2.5 rounded-full ${statusColor} ${serverStatus === 'connected' ? 'animate-pulse' : ''}`} />
          </span>

          {/* Server status pill */}
          <div
            role="status"
            className="hidden h-8 items-center gap-1.5 rounded-full border border-border bg-card/70 px-2.5 text-[11px] md:flex"
            title={serverStatus === 'connected' ? 'Offline engine connected' : 'Engine disconnected'}
          >
            <span className={`h-2 w-2 rounded-full ${statusColor} ${serverStatus === 'connected' ? 'animate-pulse' : ''}`} />
            <span className="font-medium text-foreground">{statusLabel}</span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            title="Toggle theme"
            aria-label="Toggle dark and light theme"
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
            title="Engine settings"
            aria-label="Open engine settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
