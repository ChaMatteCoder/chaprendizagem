"""Seeded sampling without replacement and pixel leakage across 80/10/10 splits."""
import argparse
import hashlib
from pathlib import Path

import numpy as np

from common import HERE, PREPROCESSING, RAW, classes, read_json, sha256, write_json


def sample_unique(array, count, rng, seen):
    selected = []
    skipped = {"blank": 0, "duplicate": 0}
    for row in rng.permutation(len(array)):
        bitmap = array[row]
        if not np.any(bitmap):
            skipped["blank"] += 1
            continue
        digest = hashlib.sha256(bitmap.tobytes()).digest()
        if digest in seen:
            skipped["duplicate"] += 1
            continue
        seen.add(digest)
        selected.append(int(row))
        if len(selected) == count:
            return np.array(selected, dtype=np.int64), skipped
    raise ValueError(f"Not enough unique nonblank drawings for {count} samples")


def normalize(bitmaps):
    if bitmaps.dtype != np.uint8 or bitmaps.ndim != 2 or bitmaps.shape[1] != 784:
        raise ValueError("Expected uint8 [N, 784]")
    return bitmaps.reshape(-1, 28, 28, 1).astype(np.float32) / 255.0


def prepare(run, per_class=10000, seed=42, raw=RAW):
    if per_class < 10 or per_class % 10:
        raise ValueError("per_class must be a positive multiple of 10 (at least 10)")
    run.mkdir(parents=True, exist_ok=True)
    if (run / "training.json").exists():
        raise FileExistsError("Use a new run directory; trained experiments are immutable")
    manifest = classes()
    rng = np.random.default_rng(seed)
    seen = set()
    splits = {name: {"x": [], "y": [], "source_row": []} for name in ("train", "val", "test")}
    sources = read_json(raw / "sources.json")
    selection = {}
    for item in manifest:
        path = raw / f'{item["id"]}.npy'
        if sha256(path) != sources[item["id"]]["sha256"]:
            raise ValueError(f"Source checksum mismatch: {path}")
        array = np.load(path, mmap_mode="r", allow_pickle=False)
        rows, skipped = sample_unique(array, per_class, rng, seen)
        selection[item["id"]] = {"rows": rows.tolist(), "skipped": skipped}
        limits = (0, per_class * 8 // 10, per_class * 9 // 10, per_class)
        for name, start, end in zip(splits, limits[:-1], limits[1:]):
            chosen = rows[start:end]
            splits[name]["x"].append(normalize(array[chosen]))
            splits[name]["y"].append(np.full(len(chosen), item["index"], dtype=np.int64))
            splits[name]["source_row"].append(chosen)
    arrays = {}
    for name, values in splits.items():
        size = sum(len(part) for part in values["y"])
        order = rng.permutation(size)
        for key, parts in values.items():
            arrays[f"{key}_{name}"] = np.concatenate(parts)[order]
    np.savez_compressed(run / "dataset.npz", **arrays)
    metadata = {
        "seed": seed, "per_class": per_class, "smoke": per_class != 10000,
        "classes": manifest, "preprocessing": PREPROCESSING,
        "sources": sources, "selection": selection,
        "split_counts": {name: np.bincount(arrays[f"y_{name}"], minlength=len(manifest)).tolist() for name in splits},
        "deduplication": "Exact bitmap SHA256 globally across selected classes and splits; blanks excluded",
        "npz_sha256": sha256(run / "dataset.npz"),
    }
    write_json(run / "dataset.json", metadata)
    print(f"Prepared {per_class * len(manifest)} images: {metadata['split_counts']}", flush=True)
    return metadata


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run-dir", type=Path, default=HERE / "runs/full")
    parser.add_argument("--per-class", type=int, default=10000)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    prepare(args.run_dir, args.per_class, args.seed)
