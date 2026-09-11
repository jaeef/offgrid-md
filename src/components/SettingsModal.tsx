import React from 'react'
import {
  X, Cpu, HardDrive, CheckCircle2, Sliders, Loader2,
  Image as ImageIcon, AudioLines, AlertTriangle, PlugZap
} from 'lucide-react'
import { Button } from './ui/button'
import { Switch } from './ui/switch'
import { Input } from './ui/input'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  supportedExtensions: string[]
}

interface EngineSettings {
  enable_llm: boolean
  enable_whisper: boolean
  llm_base_url: string
  llm_model: string
  llm_api_key_set: boolean
}

interface TestResult {
  ok: boolean
  message: string
}

interface HealthResponse {
  settings?: Partial<EngineSettings>
  capabilities?: {
    audio_transcription_available?: boolean
    llm_captioning?: boolean
  }
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, supportedExtensions }) => {
  const [enableLlm, setEnableLlm] = React.useState(false)
  const [enableWhisper, setEnableWhisper] = React.useState(false)
  const [llmBaseUrl, setLlmBaseUrl] = React.useState('http://127.0.0.1:11434/v1')
  const [llmModel, setLlmModel] = React.useState('llava')
  const [llmApiKey, setLlmApiKey] = React.useState('')
  const [llmKeySet, setLlmKeySet] = React.useState(false)
  const [audioDepsAvailable, setAudioDepsAvailable] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [testing, setTesting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [testResult, setTestResult] = React.useState<TestResult | null>(null)

  const applyServerState = React.useCallback((data: HealthResponse) => {
    const s = data.settings || {}
    if (typeof s.enable_llm === 'boolean') setEnableLlm(s.enable_llm)
    if (typeof s.enable_whisper === 'boolean') setEnableWhisper(s.enable_whisper)
    if (s.llm_base_url) setLlmBaseUrl(s.llm_base_url)
    if (s.llm_model) setLlmModel(s.llm_model)
    setLlmKeySet(!!s.llm_api_key_set)
    if (data.capabilities) {
      setAudioDepsAvailable(!!data.capabilities.audio_transcription_available)
    }
  }, [])

  const loadSettings = React.useCallback(async () => {
    try {
      const res = await fetch('/api/health')
      if (!res.ok) throw new Error(`Health check failed (${res.status})`)
      const data: HealthResponse = await res.json()
      applyServerState(data)
      setError(null)
    } catch (err) {
      setError('Cannot reach the local engine at http://127.0.0.1:7860. Start the backend (start.bat) and try again.')
    }
  }, [applyServerState])

  React.useEffect(() => {
    if (isOpen) {
      setTestResult(null)
      loadSettings()
    }
  }, [isOpen, loadSettings])

  const persist = async (next: {
    enable_llm: boolean
    enable_whisper: boolean
    llm_base_url: string
    llm_model: string
    llm_api_key?: string
  }) => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next)
      })
      if (!res.ok) throw new Error(`Failed to save settings (${res.status})`)
      const data = await res.json()
      applyServerState(data)
      setTestResult(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
      await loadSettings()
    } finally {
      setSaving(false)
    }
  }

  const toggleLlm = (value: boolean) => {
    persist({
      enable_llm: value,
      enable_whisper: enableWhisper,
      llm_base_url: llmBaseUrl,
      llm_model: llmModel,
      llm_api_key: llmApiKey || undefined
    })
  }

  const toggleWhisper = (value: boolean) => {
    persist({
      enable_llm: enableLlm,
      enable_whisper: value,
      llm_base_url: llmBaseUrl,
      llm_model: llmModel,
      llm_api_key: llmApiKey || undefined
    })
  }

  const applyAndTest = async () => {
    await persist({
      enable_llm: true,
      enable_whisper: enableWhisper,
      llm_base_url: llmBaseUrl,
      llm_model: llmModel,
      llm_api_key: llmApiKey || undefined
    })
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/settings/test-llm', { method: 'POST' })
      const data = await res.json()
      setTestResult({ ok: !!data.ok, message: data.message || 'Unknown response' })
    } catch (err) {
      setTestResult({ ok: false, message: 'Request failed — is the backend running?' })
    } finally {
      setTesting(false)
    }
  }

  const clearApiKey = () => {
    setLlmApiKey('')
    persist({
      enable_llm: enableLlm,
      enable_whisper: enableWhisper,
      llm_base_url: llmBaseUrl,
      llm_model: llmModel,
      llm_api_key: ''
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-none border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-muted/50">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Engine Settings & Info</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-none p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
          {/* Engine Status */}
          <div className="rounded-none border border-border bg-muted/50 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                Conversion Core
              </span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Microsoft MarkItDown
              </span>
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Running 100% offline directly on your local computer via FastAPI. Documents are parsed locally with zero cloud telemetry.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-none border border-destructive/50 bg-destructive/10 p-3 text-[11px] text-destructive">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600 dark:text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Plugin Options */}
          <div className="space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Optional Plugins
            </h3>

            {/* Image captioning via OpenAI-compatible vision LLM */}
            <div className="space-y-2.5 rounded-none border border-border bg-muted/50 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-3.5 w-3.5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Image Captioning (Vision LLM)</p>
                    <p className="text-[11px] text-muted-foreground">Add AI-generated descriptions to converted images</p>
                  </div>
                </div>
                <Switch
                  checked={enableLlm}
                  disabled={saving}
                  onCheckedChange={(v) => { setEnableLlm(v); toggleLlm(v) }}
                />
              </div>

              {enableLlm && (
                <div className="space-y-2.5 border-t border-border pt-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Endpoint URL (OpenAI-compatible)
                    </label>
                    <Input
                      value={llmBaseUrl}
                      onChange={(e) => setLlmBaseUrl(e.target.value)}
                      placeholder="http://127.0.0.1:11434/v1"
                      className="h-8 font-mono text-[11px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Vision Model
                    </label>
                    <Input
                      value={llmModel}
                      onChange={(e) => setLlmModel(e.target.value)}
                      placeholder="llava"
                      className="h-8 font-mono text-[11px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      API Key (optional — local servers don't need one)
                    </label>
                    <div className="flex gap-1.5">
                      <Input
                        type="password"
                        value={llmApiKey}
                        onChange={(e) => setLlmApiKey(e.target.value)}
                        placeholder={llmKeySet ? '•••••••• (saved)' : 'sk-... (optional)'}
                        className="h-8 font-mono text-[11px]"
                      />
                      {llmKeySet && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={saving}
                          onClick={clearApiKey}
                          className="h-8 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      disabled={saving || testing}
                      onClick={applyAndTest}
                      className="h-7 bg-primary px-2.5 text-[11px] text-primary-foreground hover:bg-primary/90"
                    >
                      {testing ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <PlugZap className="h-3 w-3" />
                      )}
                      Apply &amp; Test
                    </Button>
                    {testResult && (
                      <span className={`text-[10px] font-medium ${testResult.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {testResult.message}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] leading-relaxed text-muted-foreground">
                    Works fully offline with a local server — Ollama:{' '}
                    <code className="text-muted-foreground">http://127.0.0.1:11434/v1</code> (models: llava, llama3.2-vision){' '}
                    · LM Studio: <code className="text-muted-foreground">http://127.0.0.1:1234/v1</code>
                  </p>
                </div>
              )}
            </div>

            {/* Audio transcription */}
            <div className="space-y-2.5 rounded-none border border-border bg-muted/50 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AudioLines className="h-3.5 w-3.5 text-accent" />
                  <div>
                    <p className="font-medium text-foreground">Audio Transcription</p>
                    <p className="text-[11px] text-muted-foreground">Transcribe speech from .wav / .mp3 / .m4a files</p>
                  </div>
                </div>
                <Switch
                  checked={enableWhisper}
                  disabled={saving}
                  onCheckedChange={(v) => { setEnableWhisper(v); toggleWhisper(v) }}
                />
              </div>

              {enableWhisper && (
                <div className="space-y-1.5 border-t border-border pt-2.5 text-[10px] leading-relaxed">
                  {audioDepsAvailable ? (
                    <p className="flex items-start gap-1.5 text-accent">
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                      <span>
                        Uses MarkItDown's SpeechRecognition backend (Google Web Speech API — needs an internet
                        connection). MP3/M4A also require <code className="text-muted-foreground">ffmpeg</code> on your
                        system. Everything else stays local.
                      </span>
                    </p>
                  ) : (
                    <p className="flex items-start gap-1.5 text-destructive">
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                      <span>
                        Missing Python packages (SpeechRecognition, pydub). Run{' '}
                        <code className="text-muted-foreground">start.bat</code> or{' '}
                        <code className="text-muted-foreground">pip install -r backend/requirements.txt</code> to enable.
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Supported Formats */}
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Supported Offline Formats ({supportedExtensions.length})
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {supportedExtensions.map((ext) => (
                <span
                  key={ext}
                  className="rounded bg-muted/70 border border-border px-2 py-0.5 font-mono text-[10px] text-foreground uppercase"
                >
                  {ext.replace('.', '')}
                </span>
              ))}
            </div>
          </div>

          {/* Local Server info */}
          <div className="rounded-none border border-border bg-muted/50 p-3 text-[11px] text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
              Local Endpoint:
            </span>
            <code className="text-foreground font-mono">http://127.0.0.1:7860</code>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-muted/50 px-5 py-3 flex justify-end">
          <Button onClick={onClose} size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium">
            Done
          </Button>
        </div>
      </div>
    </div>
  )
}
