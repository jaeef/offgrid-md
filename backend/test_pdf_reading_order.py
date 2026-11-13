"""Run: .venv\\Scripts\\python.exe backend\\test_pdf_reading_order.py"""
import io

import pymupdf

from converter import ReadingOrderPdfConverter, _reflow
from markitdown._stream_info import StreamInfo

LEFT = "Left column starts here and keeps going for a while so that it wraps across several lines. LEFT-END."
RIGHT = "Right column text sits beside it and also wraps across several lines in its box. RIGHT-END."


def _pdf(two_columns: bool) -> io.BytesIO:
    doc = pymupdf.open()
    page = doc.new_page()
    if two_columns:
        page.insert_textbox(pymupdf.Rect(50, 60, 295, 400), LEFT, fontsize=9)
        page.insert_textbox(pymupdf.Rect(310, 60, 555, 400), RIGHT, fontsize=9)
    return io.BytesIO(doc.tobytes())


def main():
    info = StreamInfo(extension=".pdf")
    md = ReadingOrderPdfConverter().convert(_pdf(True), info).markdown

    assert md.startswith("## Page 1"), md
    # whole left column before the right one, each rejoined into a single paragraph
    assert LEFT in md and RIGHT in md, md
    assert md.index("LEFT-END") < md.index("Right column"), md

    # blank page (stands in for a scanned PDF) -> None so the OCR plugin gets a turn
    blank = _pdf(False)
    assert ReadingOrderPdfConverter().convert(blank, info) is None
    assert blank.tell() == 0  # stream left intact for the next converter

    assert _reflow("accom-\nmodate the\nmodel") == "accommodate the model"
    print("ok")


if __name__ == "__main__":
    main()
