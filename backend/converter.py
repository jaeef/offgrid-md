import os
import io
import time
from types import SimpleNamespace
from typing import Optional, Dict, Any, List
from pathlib import Path

import requests

from markitdown import MarkItDown

# Audio formats gated behind the "Audio Transcription" settings toggle
# (MarkItDown's AudioConverter handles .wav/.mp3/.m4a/.mp4)
AUDIO_EXTENSIONS = {".mp3", ".wav", ".m4a", ".mp4", ".ogg", ".flac"}

# Image formats. MarkItDown's ImageConverter only emits text when an LLM
# client is attached (for captioning), so offline conversions return empty.
# We fall back to image metadata so the Markdown output is never blank.
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif"}

# Default OpenAI-compatible endpoint (Ollama's local server). Overridable in Settings.
DEFAULT_LLM_BASE_URL = "http://127.0.0.1:11434/v1"
DEFAULT_LLM_MODEL = "llava"


class _ChatCompletions:
    """Mimics `openai.Client().chat.completions`."""

    def __init__(self, client: "OpenAICompatibleClient"):
        self._client = client

    def create(self, model: str, messages: List[Dict[str, Any]], **kwargs: Any):
        return self._client.create_completion(model, messages, **kwargs)


class _Chat:
    """Mimics `openai.Client().chat`."""

    def __init__(self, client: "OpenAICompatibleClient"):
        self.completions = _ChatCompletions(client)


class OpenAICompatibleClient:
    """Minimal OpenAI-compatible chat-completions client built on `requests`.

    Talks to any OpenAI-compatible server (Ollama, LM Studio, llama.cpp,
    vLLM, OpenAI, ...) without requiring the `openai` SDK. Exposes the exact
    call shape MarkItDown's converters expect:

        client.chat.completions.create(model=..., messages=...) -> response
        response.choices[0].message.content
    """

    def __init__(self, base_url: str, api_key: str = "", timeout: int = 180):
        self.base_url = (base_url or "").rstrip("/")
        self.api_key = api_key or ""
        self.timeout = timeout
        self.chat = _Chat(self)

    def _headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    def create_completion(self, model: str, messages: List[Dict[str, Any]], **kwargs: Any):
        url = f"{self.base_url}/chat/completions"
        payload: Dict[str, Any] = {"model": model, "messages": messages}
        payload.update(kwargs)
        response = requests.post(url, json=payload, headers=self._headers(), timeout=self.timeout)
        response.raise_for_status()
        data = response.json()
        choices = [
            SimpleNamespace(
                message=SimpleNamespace(content=(choice.get("message") or {}).get("content", ""))
            )
            for choice in data.get("choices", [])
        ]
        return SimpleNamespace(choices=choices)

SUPPORTED_EXTENSIONS = {
    # Documents
    ".pdf", ".docx", ".doc", ".pptx", ".ppt", ".xlsx", ".xls",
    # Images
    ".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif",
    # Audio
    ".mp3", ".wav", ".m4a", ".mp4", ".ogg", ".flac",
    # Web & Text (note: .rtf deliberately excluded — the engine has no RTF
    # converter and would return raw markup)
    ".html", ".htm", ".xml", ".json", ".csv", ".tsv", ".txt", ".log", ".epub",
    # Archives
    ".zip"
}

class MarkItDownService:
    def __init__(
        self,
        enable_llm: bool = False,
        enable_whisper: bool = False,
        llm_base_url: Optional[str] = None,
        llm_model: Optional[str] = None,
        llm_api_key: Optional[str] = None,
    ):
        self.enable_llm = enable_llm
        self.enable_whisper = enable_whisper
        self.llm_base_url = llm_base_url or DEFAULT_LLM_BASE_URL
        self.llm_model = llm_model or DEFAULT_LLM_MODEL
        self.llm_api_key = llm_api_key or ""
        self._build_engine()

    def _build_engine(self):
        """Recreate the MarkItDown engine so settings take effect immediately.

        MarkItDown 0.1.x stores `llm_client`/`llm_model` at construction time and
        injects them into every converter call (see _markitdown.py _convert()),
        which is what enables LLM image captioning. Audio transcription is
        handled by the always-registered AudioConverter, so `enable_whisper` is
        enforced as a gate in our own convert methods instead.
        """
        if self.enable_llm and self.llm_base_url and self.llm_model:
            self._llm_client = OpenAICompatibleClient(self.llm_base_url, self.llm_api_key)
            self._md = MarkItDown(
                llm_client=self._llm_client,
                llm_model=self.llm_model,
                enable_plugins=True,
            )
        else:
            self._llm_client = None
            # Standard offline engine (no LLM captioning).
            # enable_plugins=True loads 3rd-party converters such as markitdown-ocr;
            # without an llm_client the OCR plugin silently skips itself, so this
            # stays fully offline.
            self._md = MarkItDown(enable_plugins=True)

    def update_settings(
        self,
        enable_llm: bool = False,
        enable_whisper: bool = False,
        llm_base_url: Optional[str] = None,
        llm_model: Optional[str] = None,
        llm_api_key: Optional[str] = None,
    ):
        # None means "keep the currently stored value"
        self.enable_llm = enable_llm
        self.enable_whisper = enable_whisper
        if llm_base_url is not None:
            self.llm_base_url = llm_base_url.strip() or DEFAULT_LLM_BASE_URL
        if llm_model is not None:
            self.llm_model = llm_model.strip() or DEFAULT_LLM_MODEL
        if llm_api_key is not None:
            self.llm_api_key = llm_api_key.strip()
        self._build_engine()

    def get_settings(self) -> Dict[str, Any]:
        """Effective engine settings (the API key itself is never echoed back)."""
        return {
            "enable_llm": self.enable_llm,
            "enable_whisper": self.enable_whisper,
            "llm_base_url": self.llm_base_url,
            "llm_model": self.llm_model,
            "llm_api_key_set": bool(self.llm_api_key),
        }

    @property
    def audio_transcription_available(self) -> bool:
        """Whether MarkItDown's SpeechRecognition transcription backend is installed."""
        try:
            import speech_recognition  # noqa: F401
            import pydub  # noqa: F401
            return True
        except Exception:
            return False

    def test_llm_connection(self) -> Dict[str, Any]:
        """Send a tiny chat completion to verify the configured endpoint works."""
        if not self.enable_llm or self._llm_client is None:
            return {"ok": False, "message": "Image captioning is disabled. Enable it first."}
        try:
            probe = OpenAICompatibleClient(self.llm_base_url, self.llm_api_key, timeout=15)
            response = probe.chat.completions.create(
                model=self.llm_model,
                messages=[{"role": "user", "content": "Reply with the single word: OK"}],
                max_tokens=8,
            )
            content = response.choices[0].message.content.strip() if response.choices else ""
            return {
                "ok": True,
                "message": f"Connected to {self.llm_base_url} (model: {self.llm_model}). Reply: {content[:60]!r}",
            }
        except Exception as e:
            return {"ok": False, "message": f"Connection to {self.llm_base_url} failed: {e}"}

    def _check_audio_enabled(self, extension: str):
        """Audio conversion requires the 'Audio Transcription' toggle to be on."""
        if extension in AUDIO_EXTENSIONS and not self.enable_whisper:
            raise ValueError(
                "Audio transcription is disabled. Enable 'Audio Transcription' in Settings to convert audio files."
            )

    @staticmethod
    def _check_supported(extension: str, filename: str):
        """Reject extensions the engine cannot convert before attempting."""
        if extension not in SUPPORTED_EXTENSIONS:
            raise ValueError(
                f"Unsupported file type '{extension or '(none)'}' for file '{filename}'. "
                "See Settings for the full list of supported formats."
            )

    @staticmethod
    def _friendly_error(extension: str, error: Exception) -> Exception:
        """Map raw engine exceptions to user-readable errors."""
        if isinstance(error, (FileNotFoundError, ValueError)):
            return error
        if extension in AUDIO_EXTENSIONS:
            return ValueError(
                "Audio transcription failed — no speech was detected, or the "
                f"transcription service is unreachable. Details: {error}"
            )
        return error

    def _calculate_stats(self, text: str) -> Dict[str, int]:
        words = len(text.split())
        chars = len(text)
        lines = len(text.splitlines())
        # Standard token heuristic (~4 characters per token in English)
        tokens = int(chars / 4) if chars > 0 else 0
        return {
            "words": words,
            "characters": chars,
            "lines": lines,
            "tokens": tokens
        }

    def _image_fallback(
        self,
        path: Optional[str],
        filename: str,
        raw_bytes: Optional[bytes] = None,
    ) -> str:
        """Build a metadata Markdown block when an image yields no text.

        MarkItDown's ImageConverter returns an empty string offline because
        captioning requires an LLM client. This keeps the output non-empty and
        copyable, and points the user at the captioning toggle for descriptions.
        """
        lines = [f"# Image: {filename}", ""]

        info: List[tuple] = []
        try:
            from PIL import Image

            if raw_bytes is not None:
                source = io.BytesIO(raw_bytes)
            else:
                source = path
            with Image.open(source) as img:
                info.append(("Format", str(img.format)))
                info.append(("Size", f"{img.width} x {img.height}"))
                info.append(("Mode", str(img.mode)))
                try:
                    exif = img.getexif()
                except Exception:
                    exif = None
                if exif:
                    for key, value in list(exif.items())[:20]:
                        info.append((str(key), str(value)))
        except Exception:
            pass

        if info:
            lines.append("| Property | Value |")
            lines.append("| --- | --- |")
            for key, value in info:
                safe_key = str(key).replace("|", "\\|").replace("\n", " ")
                safe_value = str(value).replace("|", "\\|").replace("\n", " ")
                lines.append(f"| {safe_key} | {safe_value} |")
            lines.append("")

        if path:
            lines.append(f"**Source:** `{path}`")
            lines.append("")

        lines.append(
            "> No text was extracted from this image. Enable **Image Captioning** "
            "in Settings (requires an OpenAI-compatible LLM endpoint such as Ollama) "
            "to generate a description."
        )
        return "\n".join(lines)

    def convert_file_path(self, file_path: str) -> Dict[str, Any]:
        """Convert a file from a local filesystem path."""
        p = Path(file_path).resolve()
        if not p.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        if not p.is_file():
            raise ValueError(f"Path is not a regular file: {file_path}")

        self._check_audio_enabled(p.suffix.lower())
        self._check_supported(p.suffix.lower(), p.name)

        start_time = time.time()
        # Narrowest API per official security guidance: local paths only,
        # never remote URIs.
        try:
            result = self._md.convert_local(str(p))
        except Exception as e:
            raise self._friendly_error(p.suffix.lower(), e)
        duration_ms = int((time.time() - start_time) * 1000)

        markdown_text = result.text_content or ""
        if not markdown_text.strip() and p.suffix.lower() in IMAGE_EXTENSIONS:
            markdown_text = self._image_fallback(str(p), p.name)
        stats = self._calculate_stats(markdown_text)

        return {
            "filename": p.name,
            "path": str(p),
            "size": p.stat().st_size,
            "extension": p.suffix.lower(),
            "title": getattr(result, "title", None) or p.stem,
            "markdown": markdown_text,
            "duration_ms": duration_ms,
            "stats": stats
        }

    def convert_stream(self, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        """Convert file contents passed as raw bytes."""
        extension = Path(filename).suffix.lower()
        stream = io.BytesIO(file_bytes)

        self._check_audio_enabled(extension)
        self._check_supported(extension, filename)

        start_time = time.time()
        # MarkItDown supports convert_stream(stream, file_extension=...)
        try:
            result = self._md.convert_stream(stream, file_extension=extension)
        except Exception as e:
            raise self._friendly_error(extension, e)
        duration_ms = int((time.time() - start_time) * 1000)

        markdown_text = result.text_content or ""
        if not markdown_text.strip() and extension in IMAGE_EXTENSIONS:
            markdown_text = self._image_fallback(None, filename, raw_bytes=file_bytes)
        stats = self._calculate_stats(markdown_text)

        return {
            "filename": filename,
            "size": len(file_bytes),
            "extension": extension,
            "title": getattr(result, "title", None) or Path(filename).stem,
            "markdown": markdown_text,
            "duration_ms": duration_ms,
            "stats": stats
        }

    def convert_snippet(self, content: str, content_type: str = "html") -> Dict[str, Any]:
        """Convert raw HTML or text snippet to clean markdown."""
        normalized = content_type.strip().lower()
        ext = normalized if normalized.startswith(".") else f".{normalized.strip('.')}"
        if ext not in [".html", ".htm", ".xml", ".json", ".csv", ".txt"]:
            ext = ".html"

        stream = io.BytesIO(content.encode("utf-8"))
        start_time = time.time()
        result = self._md.convert_stream(stream, file_extension=ext)
        duration_ms = int((time.time() - start_time) * 1000)

        markdown_text = result.text_content or ""
        stats = self._calculate_stats(markdown_text)

        return {
            "title": getattr(result, "title", None) or "Snippet",
            "markdown": markdown_text,
            "duration_ms": duration_ms,
            "stats": stats
        }

    def scan_directory(self, dir_path: str, recursive: bool = True) -> List[Dict[str, Any]]:
        """Scan a local computer folder for all files supported by MarkItDown."""
        p = Path(dir_path).resolve()
        if not p.exists() or not p.is_dir():
            raise NotADirectoryError(f"Directory not found: {dir_path}")

        files_found = []
        iterator = p.rglob("*") if recursive else p.glob("*")

        for item in iterator:
            if item.is_file() and item.suffix.lower() in SUPPORTED_EXTENSIONS:
                try:
                    stat = item.stat()
                    files_found.append({
                        "name": item.name,
                        "path": str(item),
                        "extension": item.suffix.lower(),
                        "size": stat.st_size,
                        "modified": stat.st_mtime
                    })
                except Exception:
                    continue

        return files_found

    def batch_convert(
        self,
        file_paths: List[str],
        output_dir: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Convert a list of files, optionally writing outputs to disk."""
        results = []
        out_path = Path(output_dir).resolve() if output_dir else None
        if out_path:
            out_path.mkdir(parents=True, exist_ok=True)

        for fp in file_paths:
            try:
                converted = self.convert_file_path(fp)
                if out_path:
                    stem = Path(fp).stem
                    out_file = out_path / f"{stem}.md"
                    counter = 1
                    while out_file.exists():
                        out_file = out_path / f"{stem}_{counter}.md"
                        counter += 1
                    out_file.write_text(converted["markdown"], encoding="utf-8")
                    converted["output_file"] = str(out_file)
                converted["status"] = "success"
                results.append(converted)
            except Exception as e:
                results.append({
                    "path": fp,
                    "filename": Path(fp).name,
                    "status": "error",
                    "error": str(e)
                })

        return results
