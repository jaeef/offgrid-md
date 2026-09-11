# offgrid-md

> Offline document → Markdown studio. Private by default. No cloud, no accounts.

![offline](https://img.shields.io/badge/offline-100%25-black)
![engine](https://img.shields.io/badge/engine-Microsoft_MarkItDown-blue)
![stack](https://img.shields.io/badge/stack-React_%2B_FastAPI-red)
![license](https://img.shields.io/badge/license-MIT-green)

Drop in a PDF or a Word doc, point it at a whole folder by path, or paste a snippet — get clean, LLM-ready Markdown back. Runs entirely on your machine. Direct local paths bypass upload caps entirely.

## Quickstart

**Windows — double-click:**

```bash
start.bat
```

Opens `http://127.0.0.1:7860` in your browser. The launcher creates `.venv`, installs Python + JS deps, builds the UI, and starts the server. That's it.

**Manual:**

```bash
# backend
python -m venv .venv && .venv\Scripts\activate
pip install -r backend\requirements.txt
python backend\app.py        # → http://127.0.0.1:7860

# frontend (hot reload)
npm install && npm run dev   # → http://localhost:5173 (proxies /api → :7860)
```

## Features

| | |
|---|---|
| 📄 **Single converter** | Drag & drop, direct local-path input (no upload limits), live rendered/source split preview, speed + token stats |
| 📁 **Batch queue** | Recursive folder scan, per-file status (`pending → converting → success/error`), convert-all, ZIP export with name dedupe |
| 📋 **Quick paste** | HTML / CSV / JSON / XML / TXT snippets → GFM instantly |
| 🖼️ **Images that never blank** | Metadata block offline; optional Ollama/LM Studio vision captioning + LLM-Vision OCR of embedded images |
| 🎙️ **Audio** | Speech transcription toggle (`.mp3 .wav .m4a .mp4 .ogg .flac`) |
| 🌗 **Zinc UI** | Shadcn dark/light, responsive down to snapped-half windows |

## Privacy

Documents convert **100% offline** — no keys, no telemetry. Two documented exceptions:

- **Audio transcription** → Google Web Speech API (needs internet + system `ffmpeg` for MP3/M4A).
- **Image captioning / embedded-image OCR** → your own local LLM endpoint (Ollama default `http://127.0.0.1:11434/v1`).

## Formats

| Category | Extensions |
|---|---|
| Office | `.docx .doc .pptx .ppt .xlsx .xls` |
| PDF | `.pdf` |
| Images | `.png .jpg .jpeg .webp .bmp .gif` |
| Audio | `.mp3 .wav .m4a .mp4 .ogg .flac` |
| Data & web | `.html .htm .xml .json .csv .tsv .txt .log .epub` |
| Archives | `.zip` (auto-extracts + converts contents) |

Uploads capped at 100 MB/file; snippets at 500k chars; ZIP exports at 200 items.

## API

All routes live on `http://127.0.0.1:7860`, loopback-only, CORS-locked to local origins.

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/health` | Engine status, extensions, settings |
| `POST` | `/api/convert/upload` | Convert uploaded file(s) |
| `POST` | `/api/convert/path` | Convert local path (lists dirs) |
| `POST` | `/api/convert/snippet` | Convert raw HTML/text |
| `POST` | `/api/scan/dir` | Recursive folder scan |
| `POST` | `/api/convert/batch` | Convert path list, optional `output_dir` |
| `POST` | `/api/export/zip` | Bundle results as `.zip` |
| `POST` | `/api/settings` | Toggles + LLM endpoint config |

## Stack

- **Engine** — [Microsoft MarkItDown](https://github.com/microsoft/markitdown) (`markitdown[all]` + official `markitdown-ocr` plugin)
- **Backend** — Python, FastAPI, Uvicorn, Pydantic
- **Frontend** — React 18, Vite 6, Tailwind v4, Shadcn/Radix, `react-markdown` + `remark-gfm`, Lucide

## Project structure

```
├── backend/        # app.py (API) · converter.py (engine) · requirements.txt
├── src/
│   ├── components/ # Header · SingleConverter · BatchConverter · QuickPaste · MarkdownViewer · SettingsModal
│   │   └── ui/     # button · badge · input · switch
│   └── lib/ App.tsx main.tsx
├── start.bat       # one-click launcher
└── index.html      # Vite entry
```

## Contributing

PRs welcome. No tests yet — manual bar is `npx tsc --noEmit`, `npx vite build`, and a 10-file golden-set convert (PDF/DOCX/PPTX/XLSX/PNG/MP3/HTML/CSV/ZIP/EPUB).

## License & attribution

- This project's own code is MIT — see [LICENSE](LICENSE).
- Conversion core: [Microsoft MarkItDown](https://github.com/microsoft/markitdown) (MIT © Microsoft Corporation), used as a library dependency, not vendored. This project is not affiliated with or endorsed by Microsoft.
- Microsoft marks follow [Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general) — no sponsorship implied.
