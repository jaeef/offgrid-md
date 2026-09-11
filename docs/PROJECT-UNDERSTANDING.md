# PROJECT UNDERSTANDING — MarkItDown Studio (→ offgrid-md)

> Audit date: 2026-09-11. Regenerated after hardening + dead-code cleanup pass.
> Finding labels: **CONFIRMED** (directly supported by code/config), **INFERRED** (likely intended),
> **UNKNOWN** (cannot be determined from the repo).

## 1. Project overview

**CONFIRMED.** MarkItDown Studio is a local, offline document-to-Markdown converter.
A Python/FastAPI backend wraps the official Microsoft `markitdown` package; a React + Vite
single-page app provides three tabs (Single Converter, Batch Folder Queue, Quick Paste) with a
live rendered/source Markdown viewer, copy-to-clipboard, `.md` download, and batch ZIP export.
Launchers (`start.bat`, `start.ps1`) set up the venv, install deps, always rebuild the UI, and serve
everything from one process at `http://127.0.0.1:7860` (auto-bumps if busy).
Planned public name: `offgrid-md` (verified: zero GitHub repos with that name; no doc-to-Markdown
tool uses it). `package.json` still says `markitdown-studio` — rename pending.

## 2. Problem it solves

**CONFIRMED** (README + feature set). Converting PDF/Office/images/audio/data files to Markdown
normally needs cloud tools or CLI skill. This gives a private, offline, one-click GUI for that,
with batch folder conversion and paste-to-Markdown for HTML/tables.

## 3. Target users

**INFERRED.** A single local user on Windows converting their own documents — offline,
powered by Microsoft MarkItDown. No multi-user, team, or SaaS characteristics in code.
Roadmap (`future.md`) targets general users first, pure self-host paid (free desktop +
one-time Pro license, no cloud).

## 4. Current functionality

**CONFIRMED** (verified against `backend/app.py`, `backend/converter.py`, `src/components/*`).

- Single file convert via browser upload (`POST /api/convert/upload`, 100 MB cap, per-file errors).
- Single file convert via direct local path (`POST /api/convert/path`, bypasses upload limits).
- Directory path auto-detect: posting a folder to `/api/convert/path` returns a file listing.
- Batch folder scan recursive (`POST /api/scan/dir`), per-file and convert-all with snapshot loop,
  queue Clear disabled while converting, batch ZIP download with dedupe + caps (`POST /api/export/zip`).
- Quick paste scratchpad for HTML/CSV/JSON/XML/TXT snippets, 500k-char cap (`POST /api/convert/snippet`).
- Markdown viewer with Rendered / Source / Split modes, stats, Copy (guarded clipboard),
  `Export .md` download (`MarkdownViewer.tsx`).
- Official `markitdown-ocr` plugin installed and enabled (`enable_plugins=True`); offline-safe
  (skips itself without an LLM client). Local-path converts use `convert_local()`.
  Images with no extractable text fall back to a metadata Markdown block (never blank, pipes escaped).
- Settings modal: engine info, supported-format list, image-captioning toggle with connection test,
  audio-transcription toggle (all persisted + reloaded correctly).
- Dark/light theme toggle; health polling every 10 s with Offline Engine / Offline / Checking pill.
- Production UI served by the same FastAPI process from `dist/` with `..`-escape-guarded SPA fallback.
- `future.md` holds the features-only roadmap (P0/P1/P2, Free vs Pro gates, 30/60/90-day milestones).

## 5. Current architecture

**CONFIRMED.**

```
Browser (localhost:5173 dev / 127.0.0.1:7860 prod)
  └─ React 18 SPA (Vite; dev proxy /api → 127.0.0.1:$BACKEND_PORT or 7860)
       └─ FastAPI (uvicorn, 127.0.0.1:7860+, loopback only)
            └─ MarkItDownService (backend/converter.py)
                 └─ markitdown 0.1.8b1 (official Microsoft package)
                      ├─ convert_local(path) / convert_stream(bytes, ext)
                      └─ optional OpenAI-compatible LLM client (custom requests-based,
                         no openai SDK) for image captioning
```

No workers/queues: batch converts sequentially in-request. No caching layer. No database.

## 6. Tech stack

**CONFIRMED** (`package.json`, `backend/requirements.txt`, `vite.config.ts`, `tsconfig.json`).

- Frontend: React 18, TypeScript (strict off), Vite 6 (ESM-safe `__dirname`), Tailwind CSS v4,
  Radix primitives (slot/switch only — separator/tabs removed as unused),
  class-variance-authority, lucide-react, react-markdown + remark-gfm.
- Backend: Python, FastAPI, uvicorn[standard], pydantic, python-multipart,
  `markitdown[all]>=0.1.8b1`, `markitdown-ocr>=0.1.0`, SpeechRecognition + pydub for audio.
  (`aiofiles` removed — never imported.)
- Launch: `start.bat` / `start.ps1` (venv create, pip install, always `vite build`,
  open browser, run `backend/app.py`).

## 7. Database

**CONFIRMED.** None. No database, schema, migrations, ORM, or persistence code exists.
All state is in-memory (React state; one global `MarkItDownService` instance).
History library (SQLite) is roadmap P0 in `future.md`, not implemented.

## 8. APIs

**CONFIRMED** (`backend/app.py`, all on `http://127.0.0.1:7860`).

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/health` | Engine status, extensions, settings, capabilities |
| POST | `/api/settings` | Update LLM/audio toggles + endpoint config |
| POST | `/api/settings/test-llm` | Probe OpenAI-compatible endpoint |
| POST | `/api/convert/upload` | Convert uploaded file(s), 100 MB/file cap |
| POST | `/api/convert/path` | Convert local path; returns listing if directory |
| POST | `/api/convert/snippet` | Convert raw HTML/text snippet (normalized type) |
| POST | `/api/scan/dir` | Recursive folder scan for supported files |
| POST | `/api/convert/batch` | Convert path list; optional `output_dir` with same-stem dedupe |
| POST | `/api/export/zip` | Bundle items as ZIP (200 items / 20M chars cap, name dedupe) |
| GET | `/`, `/{path}` | Static SPA serving from `dist/` (traversal-guarded) |

Supported extensions now include `.mp4` audio (was gated but rejected — fixed).

## 9. Authentication

**CONFIRMED.** None. No login, tokens, sessions, or per-user scoping. The API trusts any
caller that can reach localhost. CORS is now locked to
`127.0.0.1/localhost:5173 + :7860`, `GET/POST` only, no credentials — so browser-based
cross-site calls are rejected and the loopback-only bind holds the trust boundary.

## 10. Integrations / external services

**CONFIRMED.**

- Microsoft MarkItDown converters (local; PDF/Office/media/data/ZIP).
- Official `markitdown-ocr` plugin — LLM-Vision OCR for images embedded in PDF/DOCX/PPTX/XLSX.
- Optional OpenAI-compatible vision-LLM endpoint (default Ollama `http://127.0.0.1:11434/v1`,
  model `llava`) for image captioning — user-supplied, not bundled.
- Google Fonts (Inter, JetBrains Mono) loaded from CDN in `index.html` — the only
  network call the UI itself makes.
- **Notable:** "Audio transcription" relies on MarkItDown's SpeechRecognition
  backend, and the Settings modal itself states it uses the Google Web Speech API
  (needs internet) plus system `ffmpeg` for MP3/M4A. So audio is **not** offline despite
  the product's offline positioning. Local Whisper is roadmap P1.

## 11. Current user flows

**CONFIRMED** (component code).

1. Single: drop/browse file or type local path → Convert → viewer shows rendered
   Markdown (empty-output warning when nothing extracted) → Copy or Export `.md`.
2. Batch: type folder path → Scan → Convert All (or per-file Convert) → View per-file preview →
   Download ZIP (names deduped).
3. Paste: paste HTML/table/text, pick input format → Convert → viewer shows result, editable.
4. Settings: open modal → toggle image captioning, enter endpoint/model/key → Apply & Test;
   toggle audio transcription (missing-deps warning when applicable).

## 12. Completed features (post-hardening)

**CONFIRMED.** Everything in §4, plus this session's fixes:

- Backend: CORS locked, 100 MB upload cap with per-file errors, ZIP item/size caps + name
  dedupe, SPA `..`-traversal guard, `.mp4` admitted, EXIF pipe-escaping, snippet type
  normalization, same-stem disk-output dedupe.
- Frontend: batch snapshot loop + Clear-locked-while-converting + surfaced ZIP errors +
  fixed double-`.md` preview name; Header shows true Offline state; clipboard guarded;
  extension casing consistent; empty-response guard; snippet 500k cap; settings reload awaited;
  `formatBytes` clamped; Vite ESM-safe + `BACKEND_PORT`-aware proxy; launchers always rebuild.
- Cleanup: removed `Badge`-import, `aiofiles`, radix separator/tabs deps.
  Pending user-side deletes: `ui/card.tsx`, `ui/tabs.tsx`, `ui/separator.tsx`,
  `server.out.log`, `server.err.log`, `vite.out.log` (all gitignored anyway).

## 13. Partial features

- **Batch `output_dir` save-to-disk** — API supports it with dedupe, but no UI input exists
  (dead `outputDir` state was removed). **CONFIRMED** API-only for now.
- **Audio transcription toggle** — wired end-to-end, but internet-dependent (Google STT) +
  system ffmpeg; contradicts offline claims. **CONFIRMED.**
- **Image captioning** — fully wired but requires the user's own Ollama/LM Studio. **CONFIRMED.**

## 14. Missing features

- **CONFIRMED:** no tests (no test script in `package.json`, no `*.test.*` / `test_*.py`;
  only matches inside `node_modules`). No lint/typecheck scripts. `tsconfig` has
  `strict: false`, `noUnusedLocals: false`.
- **CONFIRMED:** no `.env` example, no agent-instruction files, no API docs beyond README.
- **CONFIRMED:** no batch drag-and-drop — README advertises "drop files or folders",
  but `SingleConverter` reads only `dataTransfer.files[0]` and `BatchConverter` is
  path-typed input only.
- **INFERRED missing:** per-file `.md` download buttons in batch table; conversion history
  (state lost on refresh); Folder Watch; templates; license-key gating (all roadmap P0–P2).

## 15. Bugs / defects — current status

1. ~~Images → empty Markdown with "Converted" badge~~ — FIXED (metadata fallback + empty warning).
2. ~~Batch preview double extension (`name.md` → `name.md.md`)~~ — FIXED (pass raw name).
3. ~~Offline pill stuck on "Checking..."~~ — FIXED (true Offline state).
4. ~~Stale batch preview on re-convert~~ — PARTIAL: snapshot loop + Clear-lock reduce it;
   open preview still holds its snapshot until re-clicked. **CONFIRMED remaining.**
5. ~~Stale `dist/` served after frontend edits~~ — FIXED (launchers always rebuild).
6. ~~`.mp4` rejected despite audio gate~~ — FIXED (admitted to supported set).

## 16. Security posture

- **CONFIRMED (fixed):** CORS was `["*"]` + credentials — now locked origins, no credentials.
- **CONFIRMED (fixed):** SPA fallback allowed `..` escape — now contained to `dist/`.
- **CONFIRMED (fixed):** unbounded uploads/ZIP — now 100 MB/file, 200 items / 20M chars ZIP caps.
- **CONFIRMED (by design):** unauthenticated arbitrary local-path read/convert and `output_dir`
  writes — acceptable for loopback-only single-user tool; risk appears only if re-bound to `0.0.0.0`.
- **CONFIRMED:** uploads feed user bytes + user extension into MarkItDown incl. `.zip`
  auto-extract — caps mitigate, no sandboxing beyond that.
- **CONFIRMED:** LLM API key held in server memory, never echoed (`llm_api_key_set` boolean) — correct.

## 17. Technical debt

- **CONFIRMED remaining:** no pinned backend versions (`>=` ranges, beta `markitdown 0.1.8b1`);
  `tsconfig` non-strict; no tests/lint scripts; sequential in-request batch (large folders
  risk HTTP timeouts; no progress streaming/cancellation); health poll has no tab-visibility guard.
- **CONFIRMED (fixed this session):** dead imports (`FileCode/HardDrive/ExternalLink/Save`,
  `FileCode/Check/RefreshCw`, `Share2`, `Badge`, `AlertCircle/Sparkles`), dead `outputDir` state,
  duplicate `Path` import, unused `os/Form/Body`, `convert_stream` dot-shape question left open upstream.
- **CONFIRMED:** repo has gitignored-but-present session artifacts (`*.log`, `dist/`);
  pending user-side file deletes listed in §12.

## 18. Confirmed assumptions (safe to build on)

- Single-user local desktop tool; no auth/accounts needed unless scope changes.
- Official Microsoft MarkItDown stays the conversion core.
- Offline-first for documents; audio (Google STT) and image captioning (user LLM) are the
  documented exceptions.
- One-process deployment (FastAPI serves API + static UI) is the intended distribution.
- Public name direction: `offgrid-md`.

## 19. Unknowns

- **UNKNOWN:** intended handling of password-protected/DRM Office/PDF files (no code path).
- **UNKNOWN:** whether batch disk-output (`output_dir`) should become user-facing UI.
- **UNKNOWN:** target scale for batch folders (tens vs thousands) — affects sequential design.
- **UNKNOWN:** whether "Whisper" naming means a future switch to local Whisper for audio.
- **UNKNOWN:** installer choice (Tauri vs Electron) — `future.md` prefers Tauri, undecided.

## 20. Verification performed

- Read: README, `future.md`, `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`,
  `start.bat`, `start.ps1`, `backend/app.py`, `backend/converter.py`,
  `backend/requirements.txt`, `src/main.tsx`, `src/App.tsx`, `src/index.css`,
  `src/lib/utils.ts`, all of `src/components/` + `ui/`, `.gitignore`, `docs/` prior rev.
- Grep: dead `ui/` importers (card/tabs/separator = zero), `aiofiles` (requirements-only),
  `Badge` in `MarkdownViewer` (import-only).
- Re-read after every edit batch (app lines 1–50, converter snippet block, batch header block,
  header pill, vite config, utils, package.json, requirements) — all OK.
- Not run: `npm run build`, backend boot, E2E conversions (prior audit ran them; this pass
  was static + re-read verification). Recommend `npm install && npx vite build` after the
  pending file deletes, plus a 10-file golden-set convert before release.
