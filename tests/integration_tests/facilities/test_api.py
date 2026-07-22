from io import BytesIO
import asyncio

import pytest
from PIL import Image

from src.config import settings


def image_bytes(size: tuple[int, int] = (38, 38), image_format: str = "PNG") -> bytes:
    output = BytesIO()
    Image.new("RGB", size, color="green").save(output, format=image_format)
    return output.getvalue()


@pytest.mark.asyncio
async def test_facility_mutations_require_admin(anonymous_client, client, admin_client):
    payload = {"title": "Breakfast"}
    assert (await anonymous_client.post("/facilities", json=payload)).status_code == 401
    assert (await client.post("/facilities", json=payload)).status_code == 403
    created = await admin_client.post("/facilities", json=payload)
    assert created.status_code == 201
    facility_id = created.json()["id"]
    assert (await client.put(f"/facilities/{facility_id}", json={"title": "Pool"})).status_code == 403
    edited = await admin_client.put(f"/facilities/{facility_id}", json={"title": "  Pool  "})
    assert edited.status_code == 200
    assert edited.json() == {"id": facility_id, "title": "Pool", "image_url": None}
    assert (await admin_client.delete(f"/facilities/{facility_id}")).status_code == 200


@pytest.mark.asyncio
async def test_edit_missing_facility_returns_domain_404(admin_client):
    response = await admin_client.put("/facilities/999999", json={"title": "Pool"})
    assert response.status_code == 404
    assert response.json()["code"] == "facility_not_found"


@pytest.mark.asyncio
async def test_admin_can_upload_replace_and_delete_facility_image(client, admin_client, clean_database):
    facility_id = clean_database["facility_id"]
    endpoint = f"/facilities/{facility_id}/image"
    first_file = {"file": ("../../unsafe.png", image_bytes(), "image/png")}

    assert (await client.put(endpoint, files=first_file)).status_code == 403

    created = await admin_client.put(endpoint, files=first_file)
    assert created.status_code == 200
    body = created.json()
    assert body["image_url"].startswith(f"/static/images/facilities/{facility_id}/")
    assert "unsafe" not in body["image_url"]
    assert "image_path" not in body
    first_path = settings.IMAGE_DIR / body["image_url"].removeprefix("/static/images/")
    assert first_path.is_file()

    facilities = await client.get("/facilities")
    listed = next(item for item in facilities.json() if item["id"] == facility_id)
    assert listed["image_url"] == body["image_url"]

    replaced = await admin_client.put(
        endpoint, files={"file": ("new.webp", image_bytes(image_format="WEBP"), "image/webp")}
    )
    assert replaced.status_code == 200
    replacement_url = replaced.json()["image_url"]
    assert replacement_url.endswith(".webp")
    assert replacement_url != body["image_url"]
    assert not first_path.exists()

    replacement_path = settings.IMAGE_DIR / replacement_url.removeprefix("/static/images/")
    assert replacement_path.is_file()
    deleted = await admin_client.delete(endpoint)
    assert deleted.status_code == 204
    assert deleted.content == b""
    assert not replacement_path.exists()

    missing = await admin_client.delete(endpoint)
    assert missing.status_code == 404
    assert missing.json()["code"] == "facility_image_not_found"


@pytest.mark.asyncio
async def test_facility_image_validation_errors(admin_client, clean_database):
    facility_id = clean_database["facility_id"]
    endpoint = f"/facilities/{facility_id}/image"

    wrong_dimensions = await admin_client.put(
        endpoint, files={"file": ("small.png", image_bytes((37, 38)), "image/png")}
    )
    assert wrong_dimensions.status_code == 422
    assert wrong_dimensions.json()["code"] == "invalid_facility_image_dimensions"

    wrong_mime = await admin_client.put(endpoint, files={"file": ("icon.png", image_bytes(), "image/jpeg")})
    assert wrong_mime.status_code == 422
    assert wrong_mime.json()["code"] == "image_validation_error"


@pytest.mark.asyncio
async def test_missing_facility_image_routes_return_domain_404(admin_client):
    files = {"file": ("icon.png", image_bytes(), "image/png")}
    uploaded = await admin_client.put("/facilities/999999/image", files=files)
    deleted = await admin_client.delete("/facilities/999999/image")

    assert uploaded.status_code == 404
    assert uploaded.json()["code"] == "facility_not_found"
    assert deleted.status_code == 404
    assert deleted.json()["code"] == "facility_not_found"


@pytest.mark.asyncio
async def test_deleting_facility_removes_its_image(admin_client, clean_database):
    facility_id = clean_database["facility_id"]
    uploaded = await admin_client.put(
        f"/facilities/{facility_id}/image", files={"file": ("icon.png", image_bytes(), "image/png")}
    )
    image_path = settings.IMAGE_DIR / uploaded.json()["image_url"].removeprefix("/static/images/")
    assert image_path.is_file()

    deleted = await admin_client.delete(f"/facilities/{facility_id}")
    assert deleted.status_code == 200
    assert not image_path.exists()


@pytest.mark.asyncio
async def test_concurrent_replacements_do_not_leave_orphan_files(admin_client, clean_database):
    facility_id = clean_database["facility_id"]
    endpoint = f"/facilities/{facility_id}/image"
    initial = await admin_client.put(endpoint, files={"file": ("initial.png", image_bytes(), "image/png")})
    assert initial.status_code == 200

    first, second = await asyncio.gather(
        admin_client.put(endpoint, files={"file": ("first.png", image_bytes(), "image/png")}),
        admin_client.put(
            endpoint, files={"file": ("second.webp", image_bytes(image_format="WEBP"), "image/webp")}
        ),
    )
    assert first.status_code == 200
    assert second.status_code == 200

    facilities = await admin_client.get("/facilities")
    current = next(item for item in facilities.json() if item["id"] == facility_id)
    facility_dir = settings.IMAGE_DIR / "facilities" / str(facility_id)
    stored_files = list(facility_dir.iterdir())
    assert len(stored_files) == 1
    assert stored_files[0] == settings.IMAGE_DIR / current["image_url"].removeprefix("/static/images/")
