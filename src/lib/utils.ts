import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1)
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

const ENGINE_DOWN_MESSAGE =
  'The local engine is not running. Double-click start.bat (or run .venv\\Scripts\\python.exe backend\\app.py), then hit Retry.'

// Map raw fetch/HTTP failures to plain-language guidance.
// Backend-provided `detail` messages pass through unchanged.
export function engineErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? '')
  if (!raw || /failed to fetch|networkerror|load failed/i.test(raw)) return ENGINE_DOWN_MESSAGE
  if (raw.startsWith('engine-http-')) {
    return `The local engine returned an error (HTTP ${raw.slice('engine-http-'.length)}). Check the backend window, then retry.`
  }
  return raw
}

const RECENTS_KEY = 'offgrid.recentPaths'
const RECENTS_MAX = 5

export function getRecentPaths(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]')
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, RECENTS_MAX) : []
  } catch {
    return []
  }
}

export function pushRecentPath(path: string): void {
  try {
    const trimmed = path.trim()
    if (!trimmed) return
    const next = [trimmed, ...getRecentPaths().filter((x) => x !== trimmed)].slice(0, RECENTS_MAX)
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next))
  } catch {
    /* storage unavailable — non-fatal */
  }
}

const FRONT_MATTER_KEY = 'offgrid.frontMatter'

export function getFrontMatterEnabled(): boolean {
  try {
    return localStorage.getItem(FRONT_MATTER_KEY) === '1'
  } catch {
    return false
  }
}

export function setFrontMatterEnabled(on: boolean): void {
  try {
    localStorage.setItem(FRONT_MATTER_KEY, on ? '1' : '0')
  } catch {
    /* storage unavailable — non-fatal */
  }
}

// Obsidian-style YAML header. JSON string escaping is valid YAML double-quoted syntax,
// so odd filenames (quotes, colons) can't break the block.
export function withFrontMatter(markdown: string, filename: string, source = filename): string {
  if (/^---\r?\n/.test(markdown)) return markdown // already has front-matter
  const title = filename.replace(/\.[^/.]+$/, '')
  return [
    '---',
    `title: ${JSON.stringify(title)}`,
    `source: ${JSON.stringify(source)}`,
    `converted_at: ${new Date().toISOString()}`,
    '---',
    '',
    markdown
  ].join('\n')
}

// Native "Save as" dialog (Chrome/Edge) remembers the last folder, e.g. an Obsidian vault.
// Falls back to a plain download elsewhere. Returns false if the user cancelled.
export async function saveTextFile(content: string, suggestedName: string): Promise<boolean> {
  const picker = (window as unknown as { showSaveFilePicker?: (o: object) => Promise<FileSystemFileHandle> })
    .showSaveFilePicker
  if (picker) {
    try {
      const handle = await picker({
        suggestedName,
        id: 'markdown-save',
        types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md'] } }]
      })
      const writable = await handle.createWritable()
      await writable.write(content)
      await writable.close()
      return true
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return false
      // any other picker failure → fall through to a normal download
    }
  }
  const url = URL.createObjectURL(new Blob([content], { type: 'text/markdown;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = suggestedName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  return true
}
