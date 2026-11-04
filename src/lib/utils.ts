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
