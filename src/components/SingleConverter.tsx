import React, { useState, useRef } from 'react'
import {
  UploadCloud,
  FileText,
  HardDrive,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  X
} from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { MarkdownViewer } from './MarkdownViewer'
import { formatBytes, getRecentPaths, pushRecentPath, engineErrorMessage } from '@/lib/utils'

interface SingleConverterProps {
  apiBaseUrl?: string
}

// Mirror of backend SUPPORTED_EXTENSIONS (backend/converter.py) for instant
// client-side validation before any server roundtrip.
const SUPPORTED_EXTENSIONS = new Set([
  '.pdf', '.docx', '.doc', '.pptx', '.ppt', '.xlsx', '.xls',
  '.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif',
  '.mp3', '.wav', '.m4a', '.ogg', '.flac',
  '.html', '.htm', '.xml', '.json', '.csv', '.tsv', '.txt', '.log', '.epub',
  '.zip'
])

export const SingleConverter: React.FC<SingleConverterProps> = ({
  apiBaseUrl = ''
}) => {
  const [dragOver, setDragOver] = useState(false)
  const [localPath, setLocalPath] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  const [currentFile, setCurrentFile] = useState<{
    name: string
    size: number
    durationMs?: number
    extension?: string
  } | null>(null)
  const [markdown, setMarkdown] = useState<string>('')
  const [stats, setStats] = useState<{
    words: number
    characters: number
    lines: number
    tokens: number
  } | undefined>()
  const [recentPaths, setRecentPaths] = useState<string[]>(() => getRecentPaths())

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]

    // Instant client-side popup for unsupported types — no server roundtrip.
    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase()
    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      setWarning(null)
      setError(
        `Unsupported file type "${ext === '.' ? '(none)' : ext}". ` +
        `Supported: PDF, DOCX, PPTX, XLSX, images, audio, HTML, CSV, JSON, XML, TXT, ZIP & more. ` +
        `See Settings for the full list.`
      )
      return
    }

    setIsLoading(true)
    setError(null)
    setWarning(null)
    setCurrentFile({
      name: file.name,
      size: file.size,
      extension: (file.name.split('.').pop() || '').toLowerCase()
    })

    const formData = new FormData()
    formData.append('files', file)

    try {
      const response = await fetch(`${apiBaseUrl}/api/convert/upload`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`engine-http-${response.status}`)
      }

      const data = await response.json()
      const item = data.results?.[0]
      if (!item) {
        throw new Error('Empty conversion response')
      }
      if (item.status === 'error') {
        throw new Error(item.error || 'Conversion failed')
      }

      setMarkdown(item.markdown || '')
      if (!item.markdown || !item.markdown.trim()) {
        setWarning(
          'Converted, but no readable text was extracted from this file. ' +
          'For images, enable Image Captioning in Settings; for audio, enable Audio Transcription.'
        )
      }
      setStats(item.stats)
      setCurrentFile((prev) =>
        prev
          ? {
              ...prev,
              durationMs: item.duration_ms
            }
          : null
      )
    } catch (err: any) {
      setError(engineErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  const handleConvertPath = async () => {
    if (!localPath.trim()) return

    setIsLoading(true)
    setError(null)
    setWarning(null)

    try {
      const response = await fetch(`${apiBaseUrl}/api/convert/path`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: localPath.trim() })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.detail || `engine-http-${response.status}`)
      }

      if (data.type === 'directory') {
        setError(`"${localPath}" is a folder. Switch to "Batch Folder Queue" to convert whole folders!`)
        return
      }

      setCurrentFile({
        name: data.filename,
        size: data.size,
        durationMs: data.duration_ms,
        extension: data.extension
      })
      setMarkdown(data.markdown || '')
      if (!data.markdown || !data.markdown.trim()) {
        setWarning(
          'Converted, but no readable text was extracted from this file. ' +
          'For images, enable Image Captioning in Settings; for audio, enable Audio Transcription.'
        )
      }
      setStats(data.stats)
      pushRecentPath(localPath)
      setRecentPaths(getRecentPaths())
    } catch (err: any) {
      setError(engineErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const onDragLeave = () => {
    setDragOver(false)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFileUpload(e.dataTransfer.files)
  }

  return (
    <div className="grid grid-cols-1 lg:h-[calc(100vh-4.5rem)] lg:grid-cols-12 gap-4 p-4 max-w-7xl mx-auto">
      {/* Left Column: Input & Controls (5 Cols) */}
      <div className="flex flex-col gap-4 lg:col-span-5 lg:h-full lg:overflow-y-auto">
        {/* Upload Card */}
        <div className="rounded-none border border-border bg-card/60 p-5 backdrop-blur-sm">
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <UploadCloud className="h-4 w-4 text-primary" />
              Document Upload
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Drag & drop any supported file or select from your computer
            </p>
          </div>

          <button
            type="button"
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            aria-label="Browse for a document to convert"
            className={`group relative flex w-full cursor-pointer flex-col items-center justify-center rounded-none border-2 border-dashed p-8 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
              dragOver
                ? 'border-primary bg-primary/10'
                : 'border-border bg-muted/50 hover:border-foreground/30 hover:bg-muted/70'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileUpload(e.target.files)}
              className="hidden"
              aria-hidden="true"
              tabIndex={-1}
            />
            <div className="pointer-events-none mb-3 rounded-full border border-border bg-card p-3 text-muted-foreground transition-colors group-hover:border-primary/40 group-hover:text-primary">
              <UploadCloud className="h-6 w-6" />
            </div>
            <p className="pointer-events-none text-sm font-medium text-foreground">
              Drop document here, or <span className="text-primary underline">browse</span>
            </p>
            <p className="pointer-events-none mt-1 text-[11px] text-muted-foreground">
              Supports PDF, DOCX, XLSX, PPTX, Images, Audio, ZIP &amp; more
            </p>

            {/* Format hints */}
            <div className="pointer-events-none mt-4 flex flex-wrap justify-center gap-1.5">
              {['PDF', 'DOCX', 'XLSX', 'PPTX', 'ZIP'].map((fmt) => (
                <span
                  key={fmt}
                  className="inline-flex items-center rounded-none border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                >
                  {fmt}
                </span>
              ))}
            </div>
          </button>
        </div>

        {/* Local Computer Path Box */}
        <div className="rounded-none border border-border bg-card/60 p-5 backdrop-blur-sm">
          <div className="mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
              Direct Computer Path
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Read any file on your computer directly without browser upload limits
            </p>
          </div>

          <div className="flex gap-2">
            <label htmlFor="local-path-input" className="sr-only">Direct computer path</label>
            <Input
              id="local-path-input"
              type="text"
              placeholder="e.g. C:\Users\Documents\quarterly_report.pdf"
              value={localPath}
              onChange={(e) => setLocalPath(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConvertPath()}
              className="text-xs font-mono"
              list="recent-paths-single"
              autoComplete="off"
              spellCheck={false}
            />
            <datalist id="recent-paths-single">
              {recentPaths.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
            <Button
              onClick={handleConvertPath}
              disabled={isLoading || !localPath.trim()}
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 font-medium text-xs"
            >
              Convert
            </Button>
          </div>
        </div>

        {/* Active File Info & Error Status */}
        {error && (
          <div className="flex items-start gap-2.5 rounded-none border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-800 dark:text-red-200">Conversion Error</p>
              <p className="mt-0.5 text-red-700/90 dark:text-red-300/90">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="rounded p-0.5 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 hover:bg-red-500/20 transition-colors"
              title="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {warning && !error && (
          <div className="flex items-start gap-2.5 rounded-none border border-accent/40 bg-accent/10 p-3 text-xs">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent-readable" />
            <div className="flex-1">
              <p className="font-semibold text-accent-readable">Empty Result</p>
              <p className="mt-0.5 text-accent-readable/90">{warning}</p>
            </div>
            <button
              onClick={() => setWarning(null)}
              className="rounded p-0.5 text-accent-readable transition-colors hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center gap-3 rounded-none border border-primary/30 bg-primary/10 p-4 text-xs text-primary">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div>
              <p className="font-semibold text-primary">Processing with MarkItDown...</p>
              <p className="text-primary/80 text-[11px] mt-0.5">
                Parsing document structure, tables, and contents offline
              </p>
            </div>
          </div>
        )}

        {currentFile && !isLoading && !error && (
          <div className="rounded-none border border-border bg-card/70 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-none bg-muted text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="truncate">
                  <p className="truncate text-xs font-semibold text-foreground">
                    {currentFile.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatBytes(currentFile.size)}
                  </p>
                </div>
              </div>
              <Badge variant="success" className="gap-1 text-[11px]">
                <CheckCircle2 className="h-3 w-3" />
                Converted
              </Badge>
            </div>

            {currentFile.durationMs !== undefined && (
              <div className="mt-3 flex items-center gap-1.5 border-t border-border pt-2.5 text-[11px] text-muted-foreground">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Converted offline in </span>
                <span className="font-mono font-medium text-foreground">
                  {currentFile.durationMs}ms
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Column: Split Markdown Viewer (7 Cols) */}
      <div className="min-h-[60vh] lg:h-full lg:col-span-7">
        <MarkdownViewer
          markdown={markdown}
          filename={currentFile?.name || 'converted.md'}
          stats={stats}
          onMarkdownChange={setMarkdown}
        />
      </div>
    </div>
  )
}
