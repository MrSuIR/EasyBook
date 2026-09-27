import asyncio
from PIL import Image

from src.service.demo_catalog import DemoCatalogProvider, demo_hotel_gallery, demo_hotels_count
from src.service.demo_photos import IMAGE_DIR


def test_builtin_catalog_has_distinct_credited_photographs():
    provider = DemoCatalogProvider()

    catalog = asyncio.run(provider.load())

    assert len(catalog) == demo_hotels_count()
    assert len({hotel.image_path for hotel in catalog}) == len(catalog)
    for hotel in catalog:
        gallery = demo_hotel_gallery(catalog, hotel)
        assert len({photo.image_path for photo in gallery}) == 3
        assert gallery[0] == hotel
        assert all(photo.location == hotel.location for photo in gallery)
    for hotel in catalog:
        path = IMAGE_DIR / hotel.image_path
        assert path.is_file()
        with Image.open(path) as image:
            assert image.format == "JPEG"
            assert image.width >= 850
            assert image.height >= 550
        assert hotel.image_page_url.startswith("https://commons.wikimedia.org/")
        assert hotel.image_author
        assert hotel.image_license

    first = catalog[0]
    first_path = IMAGE_DIR / first.image_path
    before = first_path.stat().st_mtime_ns
    assert asyncio.run(provider.load()) == catalog
    assert first_path.stat().st_mtime_ns == before
