"""Read-only confidence audit of the published CNN; does not train or calibrate it."""
import argparse
from pathlib import Path
import numpy as np
from common import ROOT, check_dataset, classes, read_json, setup_tf, sha256, write_json


def summarize(probabilities, labels):
    confidence = probabilities.max(axis=1)
    winners = probabilities.argmax(axis=1)
    correct = winners == labels
    bins = []
    for low, high in zip(np.linspace(0, 1, 11)[:-1], np.linspace(0, 1, 11)[1:]):
        mask = (confidence >= low) & ((confidence < high) if high < 1 else (confidence <= high))
        if mask.any():
            bins.append({"low": float(low), "high": float(high), "count": int(mask.sum()),
                         "confidence": float(confidence[mask].mean()), "accuracy": float(correct[mask].mean())})
    rounded = confidence >= .995
    return {
        "samples": len(labels), "accuracy": float(correct.mean()), "mean_confidence": float(confidence.mean()),
        "ece_10_bins": sum(b["count"] * abs(b["confidence"] - b["accuracy"]) for b in bins) / len(labels),
        "confidence_quantiles": dict(zip(["min", "p25", "median", "p75", "p95", "max"],
                                          map(float, np.quantile(confidence, [0, .25, .5, .75, .95, 1])))),
        "rounded_to_100_old_ui": int(rounded.sum()), "exact_float32_one": int((confidence == 1).sum()),
        "errors_among_rounded_100": int((rounded & ~correct).sum()),
        "mean_confidence_on_errors": float(confidence[~correct].mean()) if (~correct).any() else None,
        "predicted_class_counts": {item["id"]: int((winners == i).sum()) for i, item in enumerate(classes())},
        "reliability_bins": bins,
    }


def audit(run, output):
    check_dataset(run)
    metadata = read_json(run / "training.json")
    metrics = read_json(ROOT / "public/models/iadivinha/metrics.json")
    selected = metrics["selection"]["model"]
    assert selected == "cnn"
    assert sha256(run / "cnn.h5") == metadata["models"]["cnn"]["h5_sha256"]
    hashes = {}
    for name in ("model.json", "weights.bin"):
        actual = sha256(ROOT / "public/models/iadivinha" / name)
        expected = metrics["models"][selected]["tfjs_sha256"][name]
        assert actual == expected == sha256(run / "tfjs" / selected / name)
        hashes[name] = actual
    tf = setup_tf()
    model = tf.keras.models.load_model(run / "cnn.h5", compile=False)
    data = np.load(run / "dataset.npz", allow_pickle=False)
    reports = {}
    for split in ("val", "test"):
        probabilities = model.predict(data[f"x_{split}"], batch_size=256, verbose=0)
        assert probabilities.shape == (8000, 8)
        assert np.isfinite(probabilities).all() and (probabilities >= 0).all() and (probabilities <= 1).all()
        assert np.max(np.abs(probabilities.sum(axis=1) - 1)) < 1e-5
        reports[split] = summarize(probabilities, data[f"y_{split}"])
    # Out-of-distribution probes have no class label and are not an accuracy test.
    probes = np.zeros((4, 28, 28, 1), dtype=np.float32)
    probes[1] = 1
    probes[2, 14, :, 0] = 1
    probes[3, :, :, 0] = np.random.default_rng(42).random((28, 28))
    values = model.predict(probes, verbose=0)
    report = {"model": selected, "published_sha256": hashes, "splits": reports,
              "synthetic_probes_not_accuracy": [{"name": name, "prediction": classes()[int(p.argmax())]["id"],
                                                  "confidence": float(p.max())}
                                                 for name, p in zip(["blank_blocked_by_game", "filled", "line", "noise"], values)],
              "limitations": ["Quick Draw bitmaps are not user canvas drawings", "No retraining or calibration performed",
                              "ECE depends on bins; softmax confidence is not a measure of drawing similarity"]}
    write_json(output, report)
    print({s: {k: v for k, v in r.items() if k not in ("reliability_bins", "predicted_class_counts")}
           for s, r in reports.items()}, flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--run-dir", type=Path, default=Path("training/iadivinha/runs/eight-full"))
    parser.add_argument("--output", type=Path, default=Path("docs/iadivinha/ajustes-finais/confidence-audit.json"))
    args = parser.parse_args()
    audit(args.run_dir, args.output)
