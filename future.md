# offgrid-md — Future Feature Plan

> Scope: features only. Audience first: general users. Model: pure self-host paid (free desktop + one-time Pro license, no cloud required).

## 1. Vision

`offgrid-md` is a one-click, offline document-to-Markdown studio for normal users.

Principles:
- **Offline by default.** No uploads, no accounts, no API keys to convert.
- **Zero setup.** Download, double-click, convert. No Python, no pip, no terminal.
- **Forgiving UX.** Drag anything in, get clean Markdown out, preview, fix, export.
- **Pay once for power.** Free covers daily use. Pro unlocks batch, history, and export power — still local.

## 2. Where We Are Now

Current base (React + Vite + Shadcn Zinc + FastAPI on `127.0.0.1:7860`):

- Single Converter: drag-drop, direct local path input, live split-screen (rendered GFM + raw editor), speed stats.
- Batch Folder Queue: folder path scan (recursive), status table (Pending / Converting / Success / Error), token counters, ZIP export / save-to-disk.
- Quick Paste Scratchpad: HTML / tables / text -> GFM instant.
- Settings: supported formats list, OCR toggle, Whisper audio toggle, Ollama / LM Studio endpoint for image captioning + LLM-vision OCR.
- Backend: `Microsoft MarkItDown` engine, upload / path / snippet / batch endpoints, ZIP export, static `dist/` serving.

What hurts general users today:
1. Setup requires Python venv + `pip install` + Node build (`start.bat` helps but still fragile).
2. No conversion history — close app, lose work.
3. Export is ZIP-only — no Obsidian / Notion / PDF / HTML one-click.
4. Scanned PDFs and complex tables fail silently or output thin.
5. No desktop shell (dock icon, file association, auto-update, right-click -> Convert).

## 3. Competitive Gaps (from online scan)

| Competitor | What they do well | Takeaway for offgrid-md |
|---|---|---|
| CloudConvert | Batch, 200+ formats, pay-as-you-go, API, version history | Copy batch reliability + export breadth, keep offline |
| Docling-serve / Docling API | Layout + TableFormer tables, OCR pipeline, `/convert` + `/batch` + async + webhooks | Add optional high-fidelity table mode for complex PDFs |
| markitdown.ai / markitdown.tools | Clean web converter, preview + copy/download, saved history, batch on paid tier | History + preview polish is table stakes |
| imadreamerboy/markitdown-gui, BOSSincrypto/markitdown-app | Native desktop binaries, portable builds, live preview, one-click export | Must ship portable `.exe` / AppImage / `.dmg`, no Python needed |
| MarkItDown-OCR-LocalRAG | Tesseract fallback + Ollama reorganize + local RAG | Tesseract fallback by default, Ollama cleanup as Pro toggle |
| Obsidian / Notion users | Vault save, paste-ready Markdown, front-matter | Direct "Send to Obsidian vault" + front-matter template |

## 4. P0 — Friction Killers (v1.1)

### 4.1 One-click desktop build
- [ ] Tauri (preferred, small) or Electron shell around existing `dist/` + bundled Python sidecar.
- [ ] Targets: Windows portable `.exe` + installer, Linux AppImage, macOS `.dmg`.
- [ ] Auto-update (Tauri updater / electron-updater).
- [ ] File association: double-click `.pdf` / `.docx` -> open in offgrid-md. Right-click -> "Convert to Markdown".
- [ ] Single-process launch: no separate terminal, tray icon, health indicator in Header.
- Acceptance: fresh Windows 11 VM, download, double-click, convert PDF in < 60s with no terminal.

### 4.2 History library (local-first)
- [ ] SQLite (via `sqlite3` / Prisma / sql.js) table: `id, source_path, filename, size, pages, engine, duration_ms, tokens, created_at, favorite, output_md_path`.
- [ ] Sidebar: search by filename / content, filter favorites / errors, reopen preview, re-export.
- [ ] "Clear history" + "Open output folder".
- [ ] Cap free tier (e.g. last 50), unlimited on Pro.
- Acceptance: convert 10 files, restart app, all 10 listed with preview intact.

### 4.3 Export pack
- [ ] Export single: `.md`, `.txt`, `.html` (styled), `.pdf` (print CSS).
- [ ] Export batch: preserve folder tree in ZIP, `index.md` manifest with source -> output map.
- [ ] Copy buttons: Copy Markdown, Copy HTML, Copy file path.
- [ ] Obsidian: "Save to vault" folder picker + YAML front-matter template (`title, source, converted_at, tags`).
- [ ] Notion-friendly clipboard (GFM that pastes clean).
- Acceptance: batch of nested folder exports to ZIP and re-opens with identical tree.

### 4.4 Drag-drop that never fails
- [ ] Drop files *and* folders (webkitGetAsEntry), recursive scan with progress.
- [ ] Skip list: `.exe`, `.dll`, system files, >500 MB warn before convert.
- [ ] Per-file cancel + retry. "Skip errors and continue" toggle.
- [ ] Direct path input keeps working (power users, no upload limit story).
- Acceptance: drop 100-file mixed folder, all convert or cleanly error with reason, zero app freeze.

## 5. P1 — Conversion Quality (v1.2)

### 5.1 Scanned PDF / image OCR that just works
- [ ] Default: Tesseract local OCR fallback when MarkItDown returns empty (< 50 chars) on PDF/image.
- [ ] Bundle Tesseract in installer or one-click "Install OCR" button (winget / brew guidance + local path setting).
- [ ] Keep existing LLM-vision OCR (Ollama / LM Studio) as optional high-accuracy toggle.
- [ ] UI badge on output: `Text`, `OCR-Tesseract`, `OCR-LLM`, `Audio-Transcript`.
- Acceptance: 5-page scanned PDF produces searchable Markdown without LLM configured.

### 5.2 Complex tables mode
- [ ] Optional Docling engine toggle for PDFs with tables ("Best tables, slower" vs "Fast").
- [ ] Side-by-side compare on demand (MarkItDown vs Docling) in preview.
- [ ] Preserve merged cells as GFM with `<!-- merged -->` note where lossy.
- Acceptance: 3 real-world reports with tables convert without column collapse.

### 5.3 Images / audio polish
- [ ] Images: extract embedded images to `assets/` sidecar, link `![fig](assets/...)`, toggle keep/skip base64 data URIs.
- [ ] Image metadata block when no LLM (format, dimensions, source path) — already present, keep + style it.
- [ ] Audio: local Whisper (`faster-whisper`) toggle; if missing, clear banner "needs `ffmpeg` + model download (~150 MB)".
- Acceptance: PPTX with 5 images exports Markdown + `assets/` folder that renders offline.

### 5.4 Markdown cleanup
- [ ] Post-process: normalize headings, strip repeated headers/footers/page numbers, collapse whitespace.
- [ ] "Clean for notes" toggle: de-dupe boilerplate, optional Ollama reorganize (local only).
- [ ] Front-matter template editor in Settings.
- Acceptance: 20-page contract converts without header repeated 20 times.

## 6. P2 — Everyday Delight + Pro Gates (v1.3)

### 6.1 Editor + preview
- [ ] Split / preview-only / source-only layout switch, sync scroll.
- [ ] Find-replace in output, word/char/token counter live.
- [ ] KaTeX math + code syntax highlight already via `react-markdown` stack — verify + add Mermaid toggle.
- [ ] Theme: keep Zinc dark/light, add font-size + line-width controls.

### 6.2 Folder Watch (Pro)
- [ ] Watch folder -> auto-convert new files to output folder, preserve tree.
- [ ] Toast + history entry per auto-convert. Pause/resume.
- Acceptance: drop file into `Inbox/`, Markdown appears in `Out/` in < 10s.

### 6.3 Templates (Pro)
- [ ] Built-ins: Meeting notes, Research paper, Invoice, Resume.
- [ ] Custom template: front-matter + heading skeleton prepended post-convert.

### 6.4 Free vs Pro (one-time license, offline check)
| | Free | Pro (one-time) |
|---|---|---|
| Single convert | ✅ unlimited | ✅ |
| Batch / folder queue | 20 files/day | Unlimited + Folder Watch |
| History | Last 50 | Unlimited + search content |
| OCR | Tesseract basic | + LLM-vision batch + table mode |
| Export | MD + ZIP | + HTML/PDF/Obsidian/templates |
| Support | Community | Email + vote on roadmap |

- License: signed key file, offline verify (Ed25519), no phone-home. "Enter license" in Settings. Trial: 14-day Pro, no card.
- Price anchor (to validate): $19 single / $49 household, based on CloudConvert $8/mo and desktop converter norms. Keep one-time story.

## 7. UX / Accessibility Checklist
- [ ] Empty states with sample file ("Try sample PDF").
- [ ] Every error shows: what failed, which file, how to fix, Retry button. No raw stack traces in UI (log to file).
- [ ] Keyboard: `Ctrl+O` add, `Ctrl+S` save, `Ctrl+Shift+S` save all, `Esc` close modal.
- [ ] i18n scaffolding (`en` first, then `zh`, `es`, `de`), all strings in one locale file.
- [ ] Reduced-motion + high-contrast pass on Zinc theme.

## 8. Packaging / Tech Tasks
- [ ] Backend: freeze `requirements.txt`, add `--frozen` smoke test, health includes `ocr_available`, `whisper_available`, `tesseract_version`.
- [ ] Frontend: `npm run build` outputs to `dist/`, backend serves it (already), add version footer from `package.json`.
- [ ] CI: GitHub Actions matrix (win/mac/linux) builds installer + runs 10-file golden set (PDF/DOCX/PPTX/XLSX/PNG/MP3/HTML/CSV/ZIP/EPUB) and diffs Markdown snapshot.
- [ ] Logging: `logs/convert.log` rotation, "Export diagnostics" button for bug reports.
- [ ] Docs: `README.md` stays 60-second quickstart + GIF, move deep docs to `docs/`.

## 9. Milestones
- **30 days (v1.1):** desktop portable + history + export pack + robust drag-drop. Goal: non-technical user converts without help.
- **60 days (v1.2):** Tesseract fallback + table mode + image sidecars + cleanup toggle. Goal: scanned PDFs + reports just work.
- **90 days (v1.3):** Folder Watch + templates + license key + i18n scaffold. Goal: first paid Pro sales.

## 10. Non-Goals (v1.x)
- No cloud conversion API, no team workspaces, no browser extension, no mobile app.
- No RAG chat / MCP server / vector DB in core (revisit only if general users ask; keep app lean).
- No format sprawl beyond current engine + Docling table mode (no video editing, no e-book authoring).

## 11. How We Know It's Working
- Time-to-first-Markdown < 60s on clean machine.
- Batch success rate > 98% on 100-file mixed corpus.
- Scanned PDF yields > 90% word recall vs ground truth on 5 samples.
- History reopen rate > 40% of sessions (signal users rely on library).
- Pro trial -> paid > 5% with zero cloud cost per user.
