from io import BytesIO
from unittest.mock import Mock

import pytest
from PIL import Image

from src.config import settings


def valid_png() -> bytes:
    output = BytesIO()
    Image.new("RGB", (10, 10), color="blue").save(output, format="PNG")
    return output.getvalue()


@pytest.mark.asyncio
async def test_image_upload_ignores_filename_and_requires_admin(
    monkeypatch, client, admin_client, clean_database
):
    task = Mock()
    monkeypatch.setattr("src.service.images.resize_image", task)
    hotel_id = clean_database["hotel_id"]
    files = {"file": ("../../evil.png", valid_png(), "image/png")}
    assert (
        await client.post(f"/hotels/{hotel_id}/images", files=files)
    ).status_code == 403
    created = await admin_client.post(f"/hotels/{hotel_id}/images", files=files)
    assert created.status_code == 202
    body = created.json()
    assert "evil" not in body["original_url"]
    assert ".." not in body["original_url"]
    assert (settings.IMAGE_DIR / str(hotel_id)).is_dir()


@pytest.mark.asyncio
async def test_invalid_mime_corruption_and_size_rejected(admin_client, clean_database):
    hotel_id = clean_database["hotel_id"]
    cases = (
        ("photo.png", valid_png(), "image/jpeg"),
        ("photo.png", b"not an image", "image/png"),
        ("photo.png", b"x" * (settings.MAX_IMAGE_SIZE_BYTES + 1), "image/png"),
    )
    expected = (422, 422, 413)
    for file_data, status_code in zip(cases, expected, strict=True):
        response = await admin_client.post(
            f"/hotels/{hotel_id}/images", files={"file": file_data}
        )
        assert response.status_code == status_code


@pytest.mark.asyncio
async def test_broker_failure_marks_image_failed(
    monkeypatch, admin_client, clean_database
):
    task = Mock()
    task.delay.side_effect = RuntimeError("broker unavailable")
    monkeypatch.setattr("src.service.images.resize_image", task)
    hotel_id = clean_database["hotel_id"]
    response = await admin_client.post(
        f"/hotels/{hotel_id}/images",
        files={"file": ("photo.png", valid_png(), "image/png")},
    )
    assert response.status_code == 503
    images = await admin_client.get(f"/hotels/{hotel_id}/images")
    assert images.json()[0]["status"] == "failed"
