"""Export these two Sequential networks to TF.js Layers; verify before publishing.

Small format writer, not a general Keras converter. Uses the documented TF.js
topology + named little-endian float32 weight manifest. No quantization.
"""
import argparse
import json
import shutil
import subprocess
from pathlib import Path

import numpy as np

from common import HERE, ROOT, classes, check_dataset, read_json, setup_tf, sha256, write_json

SUPPORTED = {"InputLayer", "Flatten", "Dense", "Conv2D", "MaxPooling2D", "Dropout"}


def export_layers(model, directory):
    topology = json.loads(model.to_json())
    if topology["class_name"] != "Sequential":
        raise ValueError("Only Sequential networks are supported")
    for layer in topology["config"]["layers"]:
        if layer["class_name"] not in SUPPORTED:
            raise ValueError(f"Unsupported layer: {layer['class_name']}")
    directory.mkdir(parents=True, exist_ok=True)
    specifications = []
    with (directory / "weights.bin").open("wb") as out:
        for weight in model.weights:
            value = weight.numpy()
            if value.dtype != np.float32 or not np.all(np.isfinite(value)):
                raise ValueError("Only finite float32 weights are supported")
            specifications.append({"name": weight.name.removesuffix(":0"), "shape": list(value.shape), "dtype": "float32"})
            out.write(value.astype("<f4").tobytes(order="C"))
    if len({item["name"] for item in specifications}) != len(specifications):
        raise ValueError("Duplicate weight names")
    write_json(directory / "model.json", {
        "format": "layers-model", "generatedBy": "IAdivinha scoped Keras 2 exporter",
        "convertedBy": "export_tfjs.py schema v1",
        "modelTopology": {"keras_version": topology["keras_version"], "backend": "tensorflow",
                          "model_config": {"class_name": topology["class_name"], "config": topology["config"]}},
        "weightsManifest": [{"paths": ["weights.bin"], "weights": specifications}],
    })


def export(run, publish=False):
    metadata = check_dataset(run)
    result = read_json(run / "metrics.json")
    if result["dataset"]["npz_sha256"] != metadata["npz_sha256"] or result["classes"] != metadata["classes"]:
        raise ValueError("Evaluation does not match dataset")
    if publish and metadata["smoke"]:
        raise ValueError("A smoke model must never replace public production artifacts")
    tf = setup_tf(metadata["seed"])
    data = np.load(run / "dataset.npz", allow_pickle=False)
    # 10 validation images from each class, plus blank and all-ink edge cases.
    rows = np.concatenate([np.flatnonzero(data["y_val"] == index)[:10] for index in range(len(metadata['classes']))])
    samples = np.concatenate([data["x_val"][rows], np.zeros((1, 28, 28, 1), np.float32), np.ones((1, 28, 28, 1), np.float32)])
    fixtures = {"shape": list(samples.shape), "images": samples.flatten().tolist(), "predictions": {}}
    for name, record in result["models"].items():
        if sha256(run / f"{name}.h5") != record["h5_sha256"]:
            raise ValueError("Model checksum mismatch")
        model = tf.keras.models.load_model(run / f"{name}.h5", compile=False)
        export_dir = run / "tfjs" / name
        export_layers(model, export_dir)
        record["tfjs_bytes"] = sum((export_dir / filename).stat().st_size for filename in ("model.json", "weights.bin"))
        record["tfjs_sha256"] = {filename: sha256(export_dir / filename) for filename in ("model.json", "weights.bin")}
        fixtures["predictions"][name] = model.predict(samples, verbose=0).tolist()
    write_json(run / "parity-fixtures.json", fixtures)
    subprocess.run(["node", str(HERE / "validate_tfjs.mjs"), str(run.resolve())], check=True, cwd=ROOT)
    result["export_validation"] = read_json(run / "export-validation.json")
    write_json(run / "metrics.json", result)
    if publish:
        destination = ROOT / "public/models/iadivinha"
        selected = result["selection"]["model"]
        for filename in ("model.json", "weights.bin"):
            shutil.copy2(run / "tfjs" / selected / filename, destination / filename)
        write_json(destination / "metrics.json", {**result, "classes": classes()})
        write_json(destination / "classes.json", classes())
        write_json(destination / "preprocessing.json", metadata["preprocessing"])
        report_dir = ROOT / "docs/iadivinha/training/eight-class"
        report_dir.mkdir(parents=True, exist_ok=True)
        for path in (run / "reports").glob("*.png"):
            shutil.copy2(path, report_dir / path.name)
        for filename in ("metrics.json", "training.json", "export-validation.json"):
            shutil.copy2(run / filename, report_dir / filename)
        print(f"Published verified {selected} artifacts locally in {destination}", flush=True)
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run-dir", type=Path, default=HERE / "runs/full")
    parser.add_argument("--publish", action="store_true", help="Copy full-run verified artifacts into public; not a deployment")
    args = parser.parse_args()
    export(args.run_dir, args.publish)
