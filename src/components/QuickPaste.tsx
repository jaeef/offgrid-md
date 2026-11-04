import React, { useState } from 'react'
import { ClipboardCopy, Sparkles, Loader2, AlertCircle, X } from 'lucide-react'
import { Button } from './ui/button'
import { MarkdownViewer } from './MarkdownViewer'
import { engineErrorMessage } from '@/lib/utils'

interface QuickPasteProps {
  apiBaseUrl?: string
}

export const QuickPaste: React.FC<QuickPasteProps> = ({ apiBaseUrl = '' }) => {
  const MAX_SNIPPET_CHARS = 500000
  const [content, setContent] = useState('')
  const [contentType, setContentType] = useState<'html' | 'csv' | 'json' | 'xml' | 'txt'>('html')
  const [isLoading, setIsLoading] = useState(false)
  const [markdown, setMarkdown] = useState('')
  const [stats, setStats] = useState<{
    words: number
    characters: number
    lines: number
    tokens: number
  } | undefined>()
  const [error, setError] = useState<string | null>(null)

  const handleConvert = async () => {
    if (!content.trim()) return
    if (content.length > MAX_SNIPPET_CHARS) {
      setError('Snippet too large (max 500k characters)')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${apiBaseUrl}/api/convert/snippet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          content_type: contentType
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.detail || `engine-http-${response.status}`)
      }

      setMarkdown(data.markdown || '')
      setStats(data.stats)
    } catch (err: any) {
      setError(engineErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasteSample = () => {
    setContent(`<table>
  <thead>
    <tr>
      <th>Project</th>
      <th>Engine</th>
      <th>Offline Support</th>
      <th>UI Aesthetic</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>MarkItDown Studio</td>
      <td>Microsoft MarkItDown</td>
      <td>100% Offline</td>
      <td>Ink brutalist</td>
    </tr>
    <tr>
      <td>Standard CLI</td>
      <td>Python CLI</td>
      <td>Local Terminal</td>
      <td>Console text</td>
    </tr>
  </tbody>
</table>`)
    setContentType('html')
  }

  return (
    <div className="grid grid-cols-1 lg:h-[calc(100vh-4.5rem)] lg:grid-cols-12 gap-4 p-4 max-w-7xl mx-auto">
      {/* Left Column: Input Scratchpad (5 cols) */}
      <div className="flex flex-col gap-3 lg:col-span-5 h-[60vh] lg:h-full lg:overflow-hidden">
        <div className="flex flex-col h-full rounded-none border border-border bg-card/60 p-4 backdrop-blur-sm">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <ClipboardCopy className="h-4 w-4 text-accent" />
                Raw Input Scratchpad
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Paste HTML, tables, rich text, or code to convert instantly
              </p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handlePasteSample}
              className="text-[11px] h-7 text-muted-foreground hover:text-foreground"
            >
              Load Sample
            </Button>
          </div>

          {/* Type selector pill */}
          <div className="flex items-center gap-1.5 py-2">
            <span className="text-xs text-muted-foreground font-medium mr-1">Input Format:</span>
            {(['html', 'csv', 'json', 'xml', 'txt'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setContentType(type)}
                aria-pressed={contentType === type}
                className={`rounded border px-2 py-1.5 font-mono text-[11px] uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  contentType === type
                    ? 'border-accent bg-accent text-accent-foreground'
                    : 'border-border bg-muted/50 text-muted-foreground hover:text-foreground'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Textarea */}
          <div className="flex-1 overflow-hidden pt-1">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste HTML, table code, or text here..."
              aria-label="Raw input content"
              className="h-full w-full resize-none rounded-none border border-border bg-muted/60 p-3 font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring selection:bg-primary/20 selection:text-foreground"
              spellCheck={false}
            />
            <div className="flex items-center justify-between pt-1.5 text-[10px] font-mono text-muted-foreground">
              <span>{content.length > MAX_SNIPPET_CHARS ? 'Over 500k limit — trim before converting' : `${content.length.toLocaleString()} / 500k chars`}</span>
              {content.length > MAX_SNIPPET_CHARS && <span className="text-red-600 dark:text-red-400 font-semibold">Too large</span>}
            </div>
          </div>

          {/* Action button */}
          <div className="pt-3 space-y-2">
            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-none border border-destructive/40 bg-destructive/10 p-2.5 text-[11px] text-red-700 dark:text-red-300">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
                <span className="flex-1">{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="rounded-none p-0.5 text-red-600 transition-colors hover:bg-red-500/20 dark:text-red-400"
                  aria-label="Dismiss error"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            )}
            <Button
              onClick={handleConvert}
              disabled={isLoading || !content.trim() || content.length > MAX_SNIPPET_CHARS}
              className="h-9 w-full bg-accent font-semibold text-xs text-accent-foreground shadow-sm hover:bg-accent/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  Converting with MarkItDown...
                </>
              ) : (
                <>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  Convert to Markdown
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Right Column: Markdown Output (7 cols) */}
      <div className="min-h-[60vh] lg:h-full lg:col-span-7">
        <MarkdownViewer
          markdown={markdown}
          filename="scratchpad.md"
          stats={stats}
          onMarkdownChange={setMarkdown}
        />
      </div>
    </div>
  )
}
