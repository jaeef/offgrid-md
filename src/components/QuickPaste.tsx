import React, { useState } from 'react'
import { ClipboardCopy, Sparkles, Loader2 } from 'lucide-react'
import { Button } from './ui/button'
import { MarkdownViewer } from './MarkdownViewer'

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
        throw new Error(data.detail || 'Snippet conversion failed')
      }

      setMarkdown(data.markdown || '')
      setStats(data.stats)
    } catch (err: any) {
      setError(err.message || 'Conversion failed')
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
      <td>Minimal Shadcn Zinc</td>
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
                className={`rounded px-2 py-0.5 text-xs font-mono uppercase transition-all ${
                  contentType === type
                    ? 'bg-accent/20 text-accent-foreground border border-accent/40'
                    : 'text-muted-foreground hover:text-foreground bg-muted/50 border border-border'
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
              className="h-full w-full resize-none rounded-none border border-border bg-muted/60 p-3 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring selection:bg-primary/20 selection:text-foreground"
              spellCheck={false}
            />
          </div>

          {/* Action button */}
          <div className="pt-3">
            <Button
              onClick={handleConvert}
              disabled={isLoading || !content.trim()}
              className="w-full bg-accent hover:bg-accent/80 text-white font-medium text-xs h-9 shadow-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Converting with MarkItDown...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
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
