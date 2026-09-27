import json
from pathlib import Path


IMAGE_DIR = Path(__file__).resolve().parents[1] / "static" / "images"
PHOTO_DIR = IMAGE_DIR / "demo"


def read_demo_photos() -> tuple[dict[str, str], ...]:
    manifest = json.loads((PHOTO_DIR / "manifest.json").read_text(encoding="utf-8"))
    if len(manifest) != 156 or len({item["file"] for item in manifest}) != len(manifest):
        raise ValueError("The bundled demo photo collection must contain 156 distinct files")
    for item in manifest:
        name = item["file"]
        if Path(name).name != name:
            raise ValueError(f"Invalid bundled demo photo name: {name}")
        if not (PHOTO_DIR / name).is_file():
            raise FileNotFoundError(f"Bundled demo photo is missing: {name}")
    return tuple(manifest)
