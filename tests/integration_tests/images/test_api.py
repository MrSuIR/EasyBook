from io import BytesIO

import pytest
from PIL import Image

from src.config import settings


def valid_png() -> bytes:
    output = BytesIO()
    Image.new("RGB", (10, 10), color="blue").save(output, format="PNG")
    return output.getvalue()


def valid_jpeg() -> bytes:
    output = BytesIO()
    Image.new("RGB", (10, 10), color="red").save(output, format="JPEG")
    return output.getvalue()


@pytest.mark.asyncio
async def test_image_upload_ignores_filename_and_requires_admin(client, admin_client, clean_database):
    hotel_id = clean_database["hotel_id"]
    files = {"file": ("../../evil.png", valid_png(), "image/png")}
    assert (await client.post(f"/hotels/{hotel_id}/images", files=files)).status_code == 403
    created = await admin_client.post(f"/hotels/{hotel_id}/images", files=files)
    assert created.status_code == 201
    body = created.json()
    assert "evil" not in body["original_url"]
    assert ".." not in body["original_url"]
    assert set(body) == {"id", "hotel_id", "created_at", "original_url"}
    assert (settings.IMAGE_DIR / body["original_url"].removeprefix("/static/images/")).is_file()
    assert (settings.IMAGE_DIR / "hotels" / str(hotel_id)).is_dir()

    images = await client.get(f"/hotels/{hotel_id}/images")
    assert images.status_code == 200
    assert images.json() == [body]


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
        response = await admin_client.post(f"/hotels/{hotel_id}/images", files={"file": file_data})
        assert response.status_code == status_code


@pytest.mark.asyncio
async def test_admin_can_replace_image_and_old_file_is_removed(client, admin_client, clean_database):
    hotel_id = clean_database["hotel_id"]
    created = await admin_client.post(
        f"/hotels/{hotel_id}/images", files={"file": ("first.png", valid_png(), "image/png")}
    )
    original = created.json()
    old_path = settings.IMAGE_DIR / original["original_url"].removeprefix("/static/images/")
    assert old_path.is_file()

    denied = await client.put(
        f"/hotels/{hotel_id}/images/{original['id']}", files={"file": ("new.jpg", valid_jpeg(), "image/jpeg")}
    )
    assert denied.status_code == 403
    replaced = await admin_client.put(
        f"/hotels/{hotel_id}/images/{original['id']}", files={"file": ("new.jpg", valid_jpeg(), "image/jpeg")}
    )
    assert replaced.status_code == 200
    body = replaced.json()
    assert body["id"] == original["id"]
    assert body["created_at"] == original["created_at"]
    assert body["original_url"] != original["original_url"]
    assert body["original_url"].endswith(".jpg")
    assert not old_path.exists()
    new_path = settings.IMAGE_DIR / body["original_url"].removeprefix("/static/images/")
    with Image.open(new_path) as image:
        assert image.format == "JPEG"


@pytest.mark.asyncio
async def test_invalid_replacement_keeps_original_image(admin_client, clean_database):
    hotel_id = clean_database["hotel_id"]
    created = await admin_client.post(
        f"/hotels/{hotel_id}/images", files={"file": ("first.png", valid_png(), "image/png")}
    )
    original = created.json()
    old_path = settings.IMAGE_DIR / original["original_url"].removeprefix("/static/images/")
    response = await admin_client.put(
        f"/hotels/{hotel_id}/images/{original['id']}", files={"file": ("broken.png", b"broken", "image/png")}
    )
    assert response.status_code == 422
    assert old_path.read_bytes() == valid_png()
    images = await admin_client.get(f"/hotels/{hotel_id}/images")
    assert images.json() == [original]


@pytest.mark.asyncio
async def test_replace_missing_image_returns_domain_404(admin_client, clean_database):
    hotel_id = clean_database["hotel_id"]
    response = await admin_client.put(
        f"/hotels/{hotel_id}/images/00000000-0000-0000-0000-000000000000",
        files={"file": ("new.png", valid_png(), "image/png")},
    )
    assert response.status_code == 404
    assert response.json()["code"] == "image_not_found"
