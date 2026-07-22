from io import BytesIO
import threading

import pytest
from fastapi import UploadFile
from PIL import Image
from starlette.datastructures import Headers

from src.service import image_validation


def valid_png() -> bytes:
    output = BytesIO()
    Image.new("RGB", (38, 38), color="blue").save(output, format="PNG")
    return output.getvalue()


@pytest.mark.asyncio
async def test_pillow_validation_runs_in_worker_thread(monkeypatch):
    event_loop_thread = threading.get_ident()
    validation_threads: list[int] = []
    original = image_validation._validate_image_content

    def recording_validator(*args):
        validation_threads.append(threading.get_ident())
        return original(*args)

    monkeypatch.setattr(image_validation, "_validate_image_content", recording_validator)
    upload = UploadFile(
        file=BytesIO(valid_png()), filename="icon.png", headers=Headers({"content-type": "image/png"})
    )

    validated = await image_validation.validate_image_upload(upload, required_dimensions=(38, 38))

    assert validated.extension == ".png"
    assert validation_threads
    assert validation_threads[0] != event_loop_thread
