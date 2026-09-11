import React, { useState } from 'react'
import {
  FolderSearch,
  FolderArchive,
  Play,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  Trash2,
  Eye
} from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Badge } from './ui/badge'
import { MarkdownViewer } from './MarkdownViewer'
import { formatBytes } from '@/lib/utils'

interface BatchFileItem {
  name: string
  path: string
  size: number
  extension: string
  status: 'pending' | 'converting' | 'success' | 'error'
  markdown?: string
  error?: string
  durationMs?: number
  stats?: {
    words: number
    characters: number
    lines: number
    tokens: number
  }
}

interface BatchConverterProps {
  apiBaseUrl?: string
}

export const BatchConverter: React.FC<BatchConverterProps> = ({
  apiBaseUrl = ''
}) => {
  const [folderPath, setFolderPath] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [isConvertingAll, setIsConvertingAll] = useState(false)
  const [files, setFiles] = useState<BatchFileItem[]>([])
  const [activePreviewFile, setActivePreviewFile] = useState<BatchFileItem | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)

  // Directory scanning
  const handleScanDirectory = async () => {
    if (!folderPath.trim()) return
    setIsScanning(true)
    setScanError(null)

    try {
      const response = await fetch(`${apiBaseUrl}/api/scan/dir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: folderPath.trim(), recursive: true })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.detail || 'Could not scan directory')
      }

      const fileItems: BatchFileItem[] = (data.files || []).map((f: any) => ({
        name: f.name,
        path: f.path,
        size: f.size,
        extension: f.extension,
        status: 'pending'
      }))

      setFiles(fileItems)
      if (fileItems.length === 0) {
        setScanError('No supported document files found in this directory.')
      }
    } catch (err: any) {
      setScanError(err.message || 'Failed to scan folder')
    } finally {
      setIsScanning(false)
    }
  }

  // Convert one specific file in batch list
  const convertSingleFileInBatch = async (item: BatchFileItem, index: number) => {
    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, status: 'converting' } : f))
    )

    try {
      const response = await fetch(`${apiBaseUrl}/api/convert/path`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: item.path })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.detail || 'Failed')
      }

      setFiles((prev) =>
        prev.map((f, i) =>
          i === index
            ? {
                ...f,
                status: 'success',
                markdown: data.markdown,
                stats: data.stats,
                durationMs: data.duration_ms
              }
            : f
        )
      )
    } catch (err: any) {
      setFiles((prev) =>
        prev.map((f, i) =>
          i === index
            ? {
                ...f,
                status: 'error',
                error: err.message || 'Conversion failed'
              }
            : f
        )
      )
    }
  }

  // Convert all pending files sequentially
  const handleConvertAll = async () => {
    if (files.length === 0 || isConvertingAll) return
    setIsConvertingAll(true)
    const snapshot = [...files]

    for (let i = 0; i < snapshot.length; i++) {
      const item = snapshot[i]
      if (item.status === 'success') continue
      await convertSingleFileInBatch(item, i)
    }

    setIsConvertingAll(false)
  }

  // Export all converted files as a single ZIP
  const handleExportZip = async () => {
    const convertedItems = files
      .filter((f) => f.status === 'success' && f.markdown)
      .map((f) => ({
        filename: f.name,
        markdown: f.markdown!
      }))

    if (convertedItems.length === 0) return

    try {
      const response = await fetch(`${apiBaseUrl}/api/export/zip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: convertedItems })
      })

      if (!response.ok) throw new Error('Failed to generate ZIP')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'markitdown_converted_files.zip'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setScanError('Failed to generate ZIP export')
    }
  }

  // Calculate summary stats
  const totalFiles = files.length
  const convertedCount = files.filter((f) => f.status === 'success').length
  const totalTokens = files.reduce((acc, curr) => acc + (curr.stats?.tokens || 0), 0)

  return (
    <div className="flex flex-col gap-4 p-4 max-w-7xl mx-auto lg:h-[calc(100vh-4.5rem)]">
      {/* Top Bar: Directory scanning & Output config */}
      <div className="rounded-none border border-border bg-card/60 p-4 backdrop-blur-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* Input Folder Path */}
          <div className="md:col-span-6">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
              <FolderSearch className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              Source Folder Path
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. C:\Users\Documents\Annual_Reports"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleScanDirectory()}
                className="text-xs font-mono"
              />
              <Button
                onClick={handleScanDirectory}
                disabled={isScanning || !folderPath.trim()}
                size="sm"
                className="shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium"
              >
                {isScanning ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <FolderSearch className="h-3.5 w-3.5 mr-1" />
                )}
                Scan Folder
              </Button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="md:col-span-6 flex flex-wrap items-center justify-end gap-2">
            <Button
              onClick={handleConvertAll}
              disabled={files.length === 0 || isConvertingAll}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium h-9"
            >
              {isConvertingAll ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Converting Queue...
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 mr-1.5" />
                  Convert All Files ({files.length})
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleExportZip}
              disabled={convertedCount === 0}
              className="border-border bg-muted/80 hover:bg-muted/80 text-foreground text-xs font-medium h-9"
            >
              <Download className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              Download ZIP ({convertedCount})
            </Button>

            {files.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                disabled={isConvertingAll}
                onClick={() => {
                  setFiles([])
                  setActivePreviewFile(null)
                }}
                className="h-9 w-9 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-destructive/10"
                title="Clear Queue"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {scanError && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" />
            {scanError}
          </p>
        )}
      </div>

      {/* Main Grid: File List Table & Preview Drawer */}
      <div className="grid flex-1 grid-cols-1 lg:grid-cols-12 gap-4 lg:overflow-hidden">
        {/* Table List (Left 7 Cols if preview open, 12 if not) */}
        <div
          className={`flex flex-col rounded-none border border-border bg-card/60 backdrop-blur-sm overflow-hidden ${
            activePreviewFile ? 'lg:col-span-7' : 'lg:col-span-12'
          }`}
        >
          <div className="flex items-center justify-between border-b border-border bg-card/80 px-4 py-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Queued Documents ({files.length})
            </h3>
            {files.length > 0 && (
              <span className="text-xs text-muted-foreground font-mono">
                {convertedCount} / {totalFiles} Converted
              </span>
            )}
          </div>

          <div className="flex-1 overflow-auto">
            {files.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <FolderArchive className="h-10 w-10 text-muted-foreground mb-2 opacity-50 stroke-[1.5]" />
                <p className="text-sm font-medium text-muted-foreground">Queue is Empty</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Enter a directory path above and click &quot;Scan Folder&quot; to discover and queue documents for batch conversion.
                </p>
              </div>
            ) : (
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead className="sticky top-0 bg-background/80 text-muted-foreground border-b border-border backdrop-blur-sm font-mono text-[11px]">
                  <tr>
                    <th className="py-2.5 px-4">Filename</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Size</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {files.map((file, idx) => (
                    <tr
                      key={file.path || idx}
                      className={`hover:bg-muted/30 dark:hover:bg-border/30 transition-colors ${
                        activePreviewFile?.path === file.path ? 'bg-muted/50' : ''
                      }`}
                    >
                      <td className="py-2.5 px-4 font-medium text-foreground">
                        <div className="flex items-center gap-2 max-w-xs truncate">
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="truncate" title={file.path}>
                            {file.name}
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground uppercase">
                          {file.extension.replace('.', '')}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-muted-foreground font-mono text-[11px]">
                        {formatBytes(file.size)}
                      </td>

                      <td className="py-2.5 px-3">
                        {file.status === 'pending' && (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Pending
                          </Badge>
                        )}
                        {file.status === 'converting' && (
                          <Badge variant="info" className="text-[10px] gap-1">
                            <Loader2 className="h-2.5 w-2.5 animate-spin" />
                            Converting
                          </Badge>
                        )}
                        {file.status === 'success' && (
                          <Badge variant="success" className="text-[10px] gap-1">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            Success
                          </Badge>
                        )}
                        {file.status === 'error' && (
                          <Badge variant="destructive" className="text-[10px] gap-1">
                            <AlertCircle className="h-2.5 w-2.5" />
                            Error
                          </Badge>
                        )}
                      </td>

                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {file.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => convertSingleFileInBatch(file, idx)}
                              className="h-6 px-2 text-[11px] text-primary hover:text-primary/80"
                            >
                              Convert
                            </Button>
                          )}
                          {file.status === 'success' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setActivePreviewFile(file)}
                              className="h-6 px-2 text-[11px] gap-1 border-border bg-muted/80 hover:bg-muted/80 text-foreground"
                            >
                              <Eye className="h-3 w-3" />
                              View
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Bottom Summary Bar */}
          {files.length > 0 && (
            <div className="flex items-center justify-between border-t border-border bg-muted/60 px-4 py-2 text-xs text-muted-foreground font-mono">
              <div className="flex items-center gap-4">
                <span>Total: <strong className="text-foreground">{totalFiles}</strong></span>
                <span>Converted: <strong className="text-emerald-600 dark:text-emerald-400">{convertedCount}</strong></span>
                <span>Tokens: <strong className="text-primary">{totalTokens.toLocaleString()}</strong></span>
              </div>
            </div>
          )}
        </div>

        {/* Right Preview Drawer (5 Cols if active) */}
        {activePreviewFile && (
          <div className="flex flex-col h-full lg:col-span-5">
            <MarkdownViewer
              markdown={activePreviewFile.markdown || ''}
              filename={activePreviewFile.name}
              stats={activePreviewFile.stats}
            />
          </div>
        )}
      </div>
    </div>
  )
}
