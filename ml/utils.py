import os
import traceback
import tempfile
from fastapi import UploadFile


async def save_upload(file: UploadFile) -> str:
    """Persist an uploaded file to a temp path and return the path."""
    suffix = os.path.splitext(file.filename)[1] or ".xlsx"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    content = await file.read()
    tmp.write(content)
    tmp.flush()
    tmp.close()
    print(f"[UTILS] Saved upload '{file.filename}' → {tmp.name} ({len(content)} bytes)")
    return tmp.name


def format_error(e: Exception) -> str:
    """Return a human-readable error string including the full traceback."""
    tb = traceback.format_exc()
    return f"{type(e).__name__}: {e}\n\nTraceback:\n{tb}"
