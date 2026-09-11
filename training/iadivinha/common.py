"""Shared paths, contracts and deterministic TensorFlow setup."""
import hashlib
import json
import os
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
CLASSES_PATH = ROOT / "src/features/iadivinha/data/classCatalog.json"
RAW = HERE / "data/raw"
PREPROCESSING = {
    "version": "quickdraw-bitmap-v1",
    "shape": [28, 28, 1],
    "dtype": "float32",
    "range": [0, 1],
    "background": 0,
    "ink": 1,
    "normalization": "Official uint8 bitmap / 255; channels_last; no further crop or inversion",
    "geometry": "Official Quick Draw bitmap, centered on drawing bounding box",
}


def read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def write_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False, allow_nan=False) + "\n", encoding="utf-8")


def sha256(path):
    with Path(path).open("rb") as source:
        return hashlib.file_digest(source, "sha256").hexdigest()


def classes():
    result = read_json(CLASSES_PATH)
    if len(result) != 8 or [item["index"] for item in result] != list(range(len(result))):
        raise ValueError("Class catalog must have eight contiguous indexes")
    if len({item["id"] for item in result}) != len(result):
        raise ValueError("Duplicate classes")
    return result


def setup_tf(seed=42):
    # Set before importing TensorFlow. Legacy Keras emits a TF.js-compatible topology.
    os.environ["TF_USE_LEGACY_KERAS"] = "1"
    os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
    os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
    import tensorflow as tf
    tf.keras.utils.set_random_seed(seed)
    tf.config.experimental.enable_op_determinism()
    tf.config.threading.set_intra_op_parallelism_threads(4)
    tf.config.threading.set_inter_op_parallelism_threads(2)
    return tf


def check_dataset(run):
    metadata = read_json(run / "dataset.json")
    # Labels, prompts and colors are presentation; dataset identities/order are immutable.
    identity = lambda items: [(item['id'], item['datasetLabel'], item['index']) for item in items]
    if identity(metadata["classes"]) != identity(classes()):
        raise ValueError("Class manifest changed; prepare the dataset again")
    if metadata["npz_sha256"] != sha256(run / "dataset.npz"):
        raise ValueError("Dataset checksum mismatch")
    return metadata
