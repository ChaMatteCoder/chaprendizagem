"""Pinned Fashion-MNIST downloads, IDX decoding, stratified disjoint splits."""
import argparse
import gzip
import struct
from urllib.request import urlopen

import numpy as np

from common import CACHE, asset, digest, read_json, record, write_json

SOURCE_COMMIT = "b2617bb6d3ffa2e429640350f613e3291e10b141"
BASE = f"https://raw.githubusercontent.com/zalandoresearch/fashion-mnist/{SOURCE_COMMIT}"
FILES = {
    "train-images-idx3-ubyte.gz": ("8d4fb7e6c68d591d4c3dfef9ec88bf0d", 2051, 60000),
    "train-labels-idx1-ubyte.gz": ("25c81989df183df01b3e8a0aad5dffbe", 2049, 60000),
    "t10k-images-idx3-ubyte.gz": ("bef4ecab320f06d8554ea6380940ec79", 2051, 10000),
    "t10k-labels-idx1-ubyte.gz": ("bb300cfdad3c16e7a12a480ee83cd310", 2049, 10000),
}
CLASS_NAMES = ["T-shirt/top", "Trouser", "Pullover", "Dress", "Coat", "Sandal", "Shirt", "Sneaker", "Bag", "Ankle boot"]


def decode_idx(path, expected_magic, expected_count):
    with gzip.open(path, "rb") as stream:
        data = stream.read()
    if len(data) < 8:
        raise ValueError("Truncated IDX header")
    magic, count = struct.unpack(">II", data[:8])
    if magic != expected_magic or count != expected_count:
        raise ValueError("Unexpected IDX type or count")
    if magic == 2051:
        if len(data) < 16 or struct.unpack(">II", data[8:16]) != (28, 28):
            raise ValueError("Fashion-MNIST requires 28 x 28 images")
        if len(data) != 16 + count * 784:
            raise ValueError("Truncated or trailing IDX pixels")
        return np.frombuffer(data, dtype=np.uint8, offset=16).reshape(count, 28, 28).copy()
    if magic != 2049 or len(data) != 8 + count:
        raise ValueError("Invalid IDX labels")
    labels = np.frombuffer(data, dtype=np.uint8, offset=8).copy()
    if np.any(labels > 9):
        raise ValueError("Unknown Fashion-MNIST label")
    return labels


def make_partitions(labels, seed, held_out_per_class=500, test_count=10000):
    rng = np.random.Generator(np.random.PCG64(seed))
    groups = {"train": [], "development": [], "arena": []}
    for label in range(10):
        indices = rng.permutation(np.flatnonzero(labels == label))
        if len(indices) <= held_out_per_class * 2:
            raise ValueError("Insufficient records per class")
        groups["development"].extend(indices[:held_out_per_class].tolist())
        groups["arena"].extend(indices[held_out_per_class:2 * held_out_per_class].tolist())
        groups["train"].extend(indices[2 * held_out_per_class:].tolist())
    result = {name: [f"train-{index:05d}" for index in sorted(indices)] for name, indices in groups.items()}
    result["test"] = [f"test-{index:05d}" for index in range(test_count)]
    validate_partitions(result, len(labels), test_count)
    return result


def validate_partitions(partitions, train_count=60000, test_count=10000):
    if set(partitions) != {"train", "development", "arena", "test"}:
        raise ValueError("Missing partition")
    sets = [set(ids) for ids in partitions.values()]
    if any(len(ids) != len(set(ids)) for ids in partitions.values()):
        raise ValueError("Duplicate partition record")
    if sum(map(len, sets)) != len(set.union(*sets)):
        raise ValueError("Overlapping partitions")
    development_pool = set.union(*(set(partitions[key]) for key in ("train", "development", "arena")))
    if development_pool != {f"train-{index:05d}" for index in range(train_count)}:
        raise ValueError("Training source coverage mismatch")
    if set(partitions["test"]) != {f"test-{index:05d}" for index in range(test_count)}:
        raise ValueError("Official test partition must remain intact")


def prepare(cache=CACHE, download=False, seed=20261117):
    cache.mkdir(parents=True, exist_ok=True)
    sources = []
    for name, (md5, magic, count) in FILES.items():
        path = cache / name
        if not path.exists():
            if not download:
                raise FileNotFoundError(f"Missing {name}; run prepare:enganai first")
            partial = path.with_suffix(path.suffix + ".partial")
            try:
                print(f"Downloading {name}", flush=True)
                with urlopen(f"{BASE}/data/fashion/{name}", timeout=60) as response, partial.open("wb") as stream:
                    for chunk in iter(lambda: response.read(1024 * 1024), b""):
                        stream.write(chunk)
                if digest(partial, "md5") != md5:
                    raise ValueError(f"Source checksum mismatch: {name}")
                partial.replace(path)
            finally:
                partial.unlink(missing_ok=True)
        if digest(path, "md5") != md5:
            raise ValueError(f"Corrupted source: {name}; preserved for inspection")
        # Decode once to verify magic, dimensions, byte length and labels.
        values = decode_idx(path, magic, count)
        npy = cache / name.replace(".gz", ".npy")
        np.save(npy, values, allow_pickle=False)
        sources.append({"file": asset(path, cache), "decoded": asset(npy, cache), "md5": md5, "url": f"{BASE}/data/fashion/{name}"})
    license_path = cache / "FASHION-MNIST-LICENSE.txt"
    if not license_path.exists():
        if not download:
            raise FileNotFoundError("Missing dataset license")
        with urlopen(f"{BASE}/LICENSE", timeout=30) as response:
            license_path.write_bytes(response.read())
    source_manifest = {"datasetId": "fashion-mnist", "sourceCommit": SOURCE_COMMIT, "source": "https://github.com/zalandoresearch/fashion-mnist", "license": asset(license_path, cache), "files": sources}
    write_json(cache / "sources.json", source_manifest)
    labels = np.load(cache / "train-labels-idx1-ubyte.npy", allow_pickle=False)
    partitions = make_partitions(labels, seed)
    split = record("dataset-split", id="fashion-mnist-split-v1", datasetId="fashion-mnist", source=source_manifest["source"], sourceSha256=digest(cache / "sources.json"), partitionSeed=seed, partitions=partitions)
    write_json(cache / "split.json", split)
    print("Partitions:", {key: len(ids) for key, ids in partitions.items()}, flush=True)
    return split


def load_prepared(cache=CACHE):
    from common import validate_record, verify_asset
    sources = read_json(cache / "sources.json")
    for item in sources["files"]:
        verify_asset(item["file"], cache)
        verify_asset(item["decoded"], cache)
    verify_asset(sources["license"], cache)
    split = read_json(cache / "split.json")
    validate_record(split)
    validate_partitions(split["partitions"])
    if split["sourceSha256"] != digest(cache / "sources.json"):
        raise ValueError("Split/source manifest mismatch")
    # The official test files are verified above, but never loaded into training/evaluation tensors.
    images = np.load(cache / "train-images-idx3-ubyte.npy", mmap_mode="r", allow_pickle=False)
    labels = np.load(cache / "train-labels-idx1-ubyte.npy", mmap_mode="r", allow_pickle=False)
    return images, labels, split


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--download", action="store_true")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    if args.check:
        _, _, result = load_prepared()
        print("Dataset verified:", {key: len(ids) for key, ids in result["partitions"].items()})
    else:
        prepare(download=args.download)
