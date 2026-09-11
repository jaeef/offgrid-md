import io
import zipfile
from typing import List, Optional
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import sys
if str(Path(__file__).parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).parent))

try:
    from converter import MarkItDownService, SUPPORTED_EXTENSIONS
except ImportError:
    from backend.converter import MarkItDownService, SUPPORTED_EXTENSIONS

app = FastAPI(title="MarkItDown Offline Studio API", version="1.0.0")

# Enable CORS for local dev servers (Vite runs on port 5173 / Electron)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173", "http://127.0.0.1:7860", "http://localhost:7860"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

service = MarkItDownService()

MAX_UPLOAD_BYTES = 100 * 1024 * 1024
MAX_ZIP_ITEMS = 200
MAX_ZIP_TOTAL_CHARS = 20 * 1024 * 1024

class PathConvertRequest(BaseModel):
    path: str

class SnippetConvertRequest(BaseModel):
    content: str
    content_type: str = "html"

class DirectoryScanRequest(BaseModel):
    path: str
    recursive: bool = True

class BatchConvertRequest(BaseModel):
    paths: List[str]
    output_dir: Optional[str] = None

class ZipExportItem(BaseModel):
    filename: str
    markdown: str

class ZipExportRequest(BaseModel):
    items: List[ZipExportItem]

class SettingsUpdateRequest(BaseModel):
    enable_llm: bool = False
    enable_whisper: bool = False
    llm_base_url: Optional[str] = None
    llm_model: Optional[str] = None
    llm_api_key: Optional[str] = None

@app.get("/api/health")
def health():
    return {
        "status": "online",
        "engine": "Microsoft MarkItDown",
        "supported_extensions": sorted(list(SUPPORTED_EXTENSIONS)),
        "settings": service.get_settings(),
        "capabilities": {
            "audio_transcription_available": service.audio_transcription_available,
            "llm_captioning": service.enable_llm
        }
    }

@app.post("/api/settings")
def update_settings(req: SettingsUpdateRequest):
    service.update_settings(
        enable_llm=req.enable_llm,
        enable_whisper=req.enable_whisper,
        llm_base_url=req.llm_base_url,
        llm_model=req.llm_model,
        llm_api_key=req.llm_api_key,
    )
    warnings: List[str] = []
    if req.enable_whisper and not service.audio_transcription_available:
        warnings.append(
            "Audio transcription dependencies (SpeechRecognition, pydub) are missing. "
            "Run 'pip install -r backend/requirements.txt' or start.bat to enable it."
        )
    return {"status": "updated", "settings": service.get_settings(), "warnings": warnings}


@app.post("/api/settings/test-llm")
def test_llm():
    """Probe the configured OpenAI-compatible endpoint (used by the Settings UI)."""
    return service.test_llm_connection()

@app.post("/api/convert/upload")
async def convert_upload(files: List[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    results = []
    for file in files:
        try:
            content = await file.read()
            if len(content) > MAX_UPLOAD_BYTES:
                results.append({
                    "filename": file.filename,
                    "status": "error",
                    "error": f"File too large: {file.filename}"
                })
                continue
            res = service.convert_stream(content, file.filename or "uploaded_file")
            res["status"] = "success"
            results.append(res)
        except Exception as e:
            results.append({
                "filename": file.filename,
                "status": "error",
                "error": str(e)
            })

    return {"results": results}

@app.post("/api/convert/path")
def convert_path(req: PathConvertRequest):
    p = Path(req.path).resolve()
    if not p.exists():
        raise HTTPException(status_code=404, detail=f"Path not found: {req.path}")

    if p.is_dir():
        # Return scanned directory info
        files = service.scan_directory(str(p), recursive=False)
        return {
            "type": "directory",
            "path": str(p),
            "files_count": len(files),
            "files": files
        }

    try:
        res = service.convert_file_path(str(p))
        res["type"] = "file"
        res["status"] = "success"
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/convert/snippet")
def convert_snippet(req: SnippetConvertRequest):
    try:
        res = service.convert_snippet(req.content, req.content_type)
        res["status"] = "success"
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/scan/dir")
def scan_directory(req: DirectoryScanRequest):
    try:
        files = service.scan_directory(req.path, recursive=req.recursive)
        return {
            "directory": req.path,
            "total_files": len(files),
            "files": files
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/convert/batch")
def convert_batch(req: BatchConvertRequest):
    results = service.batch_convert(req.paths, req.output_dir)
    return {"results": results}

@app.post("/api/export/zip")
def export_zip(req: ZipExportRequest):
    if not req.items:
        raise HTTPException(status_code=400, detail="No items to export")

    if len(req.items) > MAX_ZIP_ITEMS:
        raise HTTPException(status_code=413, detail="Too many items for ZIP export")
    if sum(len(i.markdown) for i in req.items) > MAX_ZIP_TOTAL_CHARS:
        raise HTTPException(status_code=413, detail="ZIP export too large")

    zip_buffer = io.BytesIO()
    seen: dict = {}
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for item in req.items:
            stem = Path(item.filename).stem
            count = seen.get(stem, 0)
            seen[stem] = count + 1
            md_filename = f"{stem}.md" if count == 0 else f"{stem}_{count}.md"
            zip_file.writestr(md_filename, item.markdown.encode("utf-8"))

    zip_buffer.seek(0)
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=markitdown_export.zip"}
    )

# Static frontend serving when built
dist_dirs = [
    Path(__file__).parent.parent / "dist",
    Path(__file__).parent.parent / "out" / "renderer"
]

for dist_dir in dist_dirs:
    if dist_dir.exists() and (dist_dir / "index.html").exists():
        app.mount("/assets", StaticFiles(directory=str(dist_dir / "assets")), name="assets")

        # index.html is never cached so UI fixes Shipping in a rebuild are
        # always picked up (hashed /assets files are still cached by browsers).
        no_cache = {"Cache-Control": "no-store"}

        @app.get("/")
        async def serve_root():
            return FileResponse(str(dist_dir / "index.html"), headers=no_cache)

        @app.get("/{full_path:path}")
        async def serve_spa(full_path: str):
            file_path = (dist_dir / full_path).resolve()
            try:
                file_path.relative_to(dist_dir.resolve())
            except ValueError:
                return FileResponse(str(dist_dir / "index.html"), headers=no_cache)
            if file_path.exists() and file_path.is_file():
                return FileResponse(str(file_path))
            return FileResponse(str(dist_dir / "index.html"), headers=no_cache)
        break

def _pick_port(preferred: int = 7860) -> int:
    import socket
    for port in range(preferred, preferred + 20):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    return preferred


if __name__ == "__main__":
    import threading
    import webbrowser
    import uvicorn

    port = _pick_port(7860)
    url = f"http://127.0.0.1:{port}"

    print()
    print("=" * 55)
    print(f"   MarkItDown Studio running at {url}")
    print("=" * 55)
    print()

    threading.Timer(1.5, lambda: webbrowser.open(url)).start()
    uvicorn.run(app, host="127.0.0.1", port=port)
