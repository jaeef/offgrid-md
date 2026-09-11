# MarkItDown Studio (Offline Document to Markdown Converter)

A modern, offline document-to-Markdown studio powered by **Microsoft MarkItDown**, featuring a sleek **Shadcn UI (Zinc dark/light mode)**, real-time split-screen Markdown preview, batch folder queue, and direct computer storage access.

---

## Key Features

1. **Powered by Microsoft MarkItDown**:
   - Official Python engine: [github.com/microsoft/markitdown](https://github.com/microsoft/markitdown) (`markitdown[all]` + official `markitdown-ocr` plugin, plugins enabled)
   - Converts **PDF, Word (.docx), PowerPoint (.pptx), Excel (.xlsx), Images, Audio, HTML, CSV, JSON, XML, and ZIP archives**.
   - **Images:** without an LLM configured you get an image-metadata Markdown block (format, dimensions, source path) so output is never blank; enable **Image Captioning** in Settings (Ollama/LM Studio) for AI descriptions plus LLM-Vision OCR of embedded images.

2. **100% Offline & Private** (documents):
   - Runs locally on your machine via a FastAPI server at `http://127.0.0.1:7860`.
   - No external API keys or internet connection required for document conversions.
   - Exceptions: **Audio transcription** uses MarkItDown's SpeechRecognition backend (Google Web Speech API — needs internet, plus system `ffmpeg` for MP3/M4A); **Image Captioning / OCR** needs a user-supplied local LLM endpoint (e.g. Ollama).

3. **Hybrid Computer File Access**:
   - **Direct Local File Paths**: Paste or type any path on your drive (e.g. `C:\Users\...\Documents\Report.pdf`) to convert instantly without browser upload limits.
   - **Drag & Drop**: Drop files or folders directly into the UI.
   - **Batch Folder Queue**: Scan an entire folder recursively, convert all documents, and export as a single `.zip` or save to disk.

4. **Minimal Shadcn Zinc Interface**:
   - **Single Converter**: Drag & drop zone, direct path input, conversion speed stats, and live split-screen preview (Rendered GFM tables/code + Raw Markdown editor).
   - **Batch Folder Queue**: Folder path scanner, conversion status table (`Pending`, `Converting`, `Success`, `Error`), token counters, and batch ZIP export.
   - **Quick Paste Scratchpad**: Paste raw HTML, tables, or text to get instant GitHub Flavored Markdown.
   - **Settings & Stats**: View supported formats, toggle OCR and Whisper audio transcription.

---

## One-Click Launch (Windows)

Simply double-click:
```bash
start.bat
```
*(or run `./start.ps1` in PowerShell)*

This launcher automatically:
1. Sets up the Python virtual environment (`.venv`).
2. Installs `markitdown` and FastAPI dependencies.
3. Builds the frontend UI bundle.
4. Starts the local server and opens `http://127.0.0.1:7860` in your browser.

---

## Developer / Manual Run

### 1. Backend Server
```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r backend\requirements.txt
python backend\app.py
```
Backend runs at `http://127.0.0.1:7860`.

### 2. Frontend Development Server (Hot Reloading)
```bash
npm install
npm run dev
```
Frontend runs at `http://localhost:5173` and proxies API calls to `http://127.0.0.1:7860`.

---

## Supported File Formats

| Category | Supported Extensions |
|---|---|
| **Office Documents** | `.docx`, `.doc`, `.pptx`, `.ppt`, `.xlsx`, `.xls` |
| **PDF** | `.pdf` |
| **Images** | `.png`, `.jpg`, `.jpeg`, `.webp`, `.bmp`, `.gif` |
| **Audio** | `.mp3`, `.wav`, `.m4a`, `.ogg`, `.flac` |
| **Data & Web** | `.html`, `.htm`, `.xml`, `.json`, `.csv`, `.tsv`, `.txt`, `.log`, `.epub` |
| **Archives** | `.zip` (auto-extracts and converts internal files) |
