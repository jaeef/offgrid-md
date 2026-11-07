import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Copy, Check, Download, FileCode, Eye, Columns, UploadCloud, HardDrive, ClipboardCopy } from 'lucide-react'
import { Button } from './ui/button'

interface MarkdownViewerProps {
  markdown: string
  filename?: string
  stats?: {
    words: number
    characters: number
    lines: number
    tokens: number
  }
  onMarkdownChange?: (newMarkdown: string) => void
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({
  markdown,
  filename = 'document.md',
  stats,
  onMarkdownChange
}) => {
  const [viewMode, setViewMode] = useState<'rendered' | 'source' | 'split'>('rendered')
  const [copied, setCopied] = useState(false)

  // Display stats must match current markdown, not stale backend props.
  // Backend tokens = chars/4 heuristic — keep same formula client-side so edit + convert agree.
  const displayStats = React.useMemo(() => {
    if (!markdown) return stats
    const words = markdown ? markdown.split(/\s+/).filter(Boolean).length : 0
    return {
      words,
      characters: markdown.length,
      lines: markdown ? markdown.split('\n').length : 0,
      tokens: markdown ? Math.floor(markdown.length / 4) : 0
    }
  }, [markdown, stats])

  const handleCopy = async () => {
    if (!markdown) return
    try {
      await navigator.clipboard.writeText(markdown)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const handleDownload = () => {
    if (!markdown) return
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    // Ensure .md extension
    const baseName = filename.replace(/\.[^/.]+$/, '')
    a.download = `${baseName}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex min-h-[50vh] lg:h-full flex-col overflow-hidden rounded-lg border border-border bg-card">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-4 py-2.5">
        {/* Left: View Mode Switches */}
        <div className="flex items-center gap-1 rounded-md border border-border bg-muted/60 p-0.5">
          <button
            onClick={() => setViewMode('rendered')}
            aria-pressed={viewMode === 'rendered'}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-all ${
              viewMode === 'rendered'
                ? 'bg-muted text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Eye className="h-3 w-3" />
            <span>Preview</span>
          </button>
          <button
            onClick={() => setViewMode('source')}
            aria-pressed={viewMode === 'source'}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-all ${
              viewMode === 'source'
                ? 'bg-muted text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileCode className="h-3 w-3" />
            <span>Markdown</span>
          </button>
          <button
            onClick={() => setViewMode('split')}
            aria-pressed={viewMode === 'split'}
            className={`hidden md:flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-all ${
              viewMode === 'split'
                ? 'bg-muted text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Columns className="h-3 w-3" />
            <span>Side by Side</span>
          </button>
        </div>

        {/* Center/Right: Stats & Actions */}
        <div className="flex items-center gap-2">
          {stats && (
            <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground font-mono">
              <span className="rounded border border-border bg-muted/60 px-2 py-0.5" title="Estimated GPT-style token count (backend chars/4 heuristic)">
                <span className="text-muted-foreground">Tokens:</span>{' '}
                <span className="font-semibold text-primary-readable">{displayStats?.tokens.toLocaleString()}</span>
                <span className="ml-1 text-[10px]">est.</span>
              </span>
              <span className="rounded border border-border bg-muted/60 px-2 py-0.5">
                <span className="text-muted-foreground">Words:</span>{' '}
                <span className="font-semibold text-success-readable">{displayStats?.words.toLocaleString()}</span>
              </span>
              <span className="rounded bg-muted/60 border border-border px-2 py-0.5">
                <span className="text-muted-foreground">Lines:</span> <span className="text-foreground font-semibold">{displayStats?.lines.toLocaleString()}</span>
              </span>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            disabled={!markdown}
            className="h-7 text-xs border-border bg-muted/60 hover:bg-muted/80 text-foreground"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 mr-1" />
                <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                <span>Copy</span>
              </>
            )}
          </Button>

          <Button
            size="sm"
            onClick={handleDownload}
            disabled={!markdown}
            className="h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm"
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            <span>Export .md</span>
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative flex-1 min-h-[40vh] lg:min-h-0 overflow-hidden">
        {!markdown ? (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <FileCode className="mb-2 h-10 w-10 stroke-[1.5] text-muted-foreground/50" aria-hidden="true" />
            <p className="text-sm font-medium text-foreground">Nothing converted yet</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Output appears here. Get started three ways:
            </p>
            <ul className="mt-4 space-y-1.5 text-left text-xs text-muted-foreground">
              <li className="flex items-center gap-2">
                <UploadCloud className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                Drop or browse a file in the upload card
              </li>
              <li className="flex items-center gap-2">
                <HardDrive className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                Paste an absolute path to a local file
              </li>
              <li className="flex items-center gap-2">
                <ClipboardCopy className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                Quick Paste for HTML, CSV, JSON or XML snippets
              </li>
            </ul>
          </div>
        ) : (
          <div className="flex min-h-[40vh] w-full lg:min-h-0 lg:h-full">
            {/* Source Editor Panel */}
            {(viewMode === 'source' || viewMode === 'split') && (
              <div className={`min-h-[40vh] overflow-auto p-4 lg:min-h-0 lg:h-full ${viewMode === 'split' ? 'w-1/2 border-r border-border' : 'w-full'}`}>
                <textarea
                  value={markdown}
                  onChange={(e) => onMarkdownChange?.(e.target.value)}
                  readOnly={!onMarkdownChange}
                  aria-readonly={!onMarkdownChange}
                  title={onMarkdownChange ? undefined : 'Read-only preview — Export .md or Copy to edit elsewhere'}
                  className={`min-h-[35vh] w-full resize-none bg-transparent font-mono text-xs leading-relaxed text-foreground focus:outline-none focus:ring-2 focus:ring-ring selection:bg-primary/20 selection:text-foreground lg:min-h-0 lg:h-full ${onMarkdownChange ? '' : 'cursor-default'}`}
                  placeholder="Raw markdown..."
                  spellCheck={false}
                />
              </div>
            )}

            {/* Rendered Preview Panel */}
            {(viewMode === 'rendered' || viewMode === 'split') && (
              <div className={`min-h-[40vh] overflow-y-auto p-6 markdown-body lg:min-h-0 lg:h-full ${viewMode === 'split' ? 'w-1/2' : 'w-full'}`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {markdown}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
