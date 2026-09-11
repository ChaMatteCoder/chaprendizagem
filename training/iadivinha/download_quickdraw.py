"""Download full official .npy categories, cache with recorded checksums."""
import argparse
import urllib.request
from urllib.parse import quote
from datetime import datetime, timezone

import numpy as np

from common import HERE, RAW, classes, read_json, sha256, write_json

BASE_URL = "https://storage.googleapis.com/quickdraw_dataset/full/numpy_bitmap"


def download(raw=RAW, record_new_sources=False):
    raw.mkdir(parents=True, exist_ok=True)
    manifest_path = raw / "sources.json"
    previous = read_json(manifest_path) if manifest_path.exists() else {}
    locked = read_json(HERE / "sources.lock.json")
    sources = {}
    for item in classes():
        category = item["id"]
        path = raw / f"{category}.npy"
        url = f"{BASE_URL}/{quote(item['datasetLabel'])}.npy"
        if not path.exists():
            temporary = path.with_suffix(".npy.part")
            print(f"Downloading {url}", flush=True)
            with urllib.request.urlopen(url, timeout=120) as response, temporary.open("wb") as out:
                expected = int(response.headers.get("Content-Length", "0"))
                while chunk := response.read(1024 * 1024):
                    out.write(chunk)
            if expected and temporary.stat().st_size != expected:
                raise ValueError(f"Incomplete download: {category}")
            temporary.replace(path)
        array = np.load(path, mmap_mode="r", allow_pickle=False)
        if array.dtype != np.uint8 or array.ndim != 2 or array.shape[1] != 784:
            raise ValueError(f"Invalid bitmap format: {path}")
        digest = sha256(path)
        if category not in locked:
            if not record_new_sources:
                raise ValueError(f"Unrecorded source: {category}; use --record-new-sources for the first download")
            locked[category] = {"sha256": digest, "bytes": path.stat().st_size, "rows": len(array), "url": url}
            write_json(HERE / "sources.lock.json", locked)
        if digest != locked[category]["sha256"]:
            raise ValueError(f"Official source differs from the recorded experiment: {category}")
        if category in previous and previous[category]["sha256"] != digest:
            raise ValueError(f"Cached source changed: {category}")
        sources[category] = {
            "url": url, "sha256": digest, "bytes": path.stat().st_size,
            "rows": len(array), "dtype": str(array.dtype),
            "downloaded_at": previous.get(category, {}).get("downloaded_at", datetime.now(timezone.utc).isoformat()),
        }
        print(f"{category}: {len(array)} rows, sha256={digest}", flush=True)
    write_json(manifest_path, sources)
    return sources


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--record-new-sources", action="store_true")
    args = parser.parse_args()
    download(record_new_sources=args.record_new_sources)
