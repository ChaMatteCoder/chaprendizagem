"""Choose on validation macro-F1 first; then report the held-out test once."""
import argparse
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, log_loss

from common import HERE, check_dataset, read_json, setup_tf, sha256, write_json


def metrics(labels, probabilities, manifest):
    if probabilities.shape != (len(labels), len(manifest)) or not np.all(np.isfinite(probabilities)):
        raise ValueError("Invalid prediction shape or nonfinite probabilities")
    if np.any(probabilities < 0) or not np.allclose(probabilities.sum(axis=1), 1, atol=1e-5):
        raise ValueError("Invalid probability distribution")
    predicted = probabilities.argmax(axis=1)
    report = classification_report(labels, predicted, labels=list(range(len(manifest))),
                                   target_names=[item["id"] for item in manifest],
                                   output_dict=True, zero_division=0)
    return {"accuracy": float(accuracy_score(labels, predicted)),
            "loss": float(log_loss(labels, probabilities, labels=list(range(len(manifest))))),
            "macro_f1": report["macro avg"]["f1-score"], "classification_report": report,
            "confusion_matrix": confusion_matrix(labels, predicted, labels=list(range(len(manifest)))).tolist(),
            "samples": len(labels)}


def choose_model(records):
    # No test statistic participates; smaller model breaks exact validation ties.
    return max(records, key=lambda name: (records[name]["validation"]["macro_f1"],
                                         records[name]["validation"]["accuracy"],
                                         -records[name]["parameters"]))


def plots(report_dir, records, manifest):
    report_dir.mkdir(parents=True, exist_ok=True)
    for name, record in records.items():
        history = record["history"]
        figure, axes = plt.subplots(1, 2, figsize=(11, 4))
        for ax, metric, title in zip(axes, ("loss", "accuracy"), ("Perda", "Acurácia")):
            epochs = np.arange(1, len(history[metric]) + 1)
            ax.plot(epochs, history[metric], label="Treino")
            ax.plot(epochs, history[f"val_{metric}"], label="Validação")
            ax.axvline(record["best_epoch"], color="gray", linestyle=":", label="Checkpoint")
            ax.set(title=f"{name.upper()} — {title}", xlabel="Época", ylabel=title)
            ax.legend()
            ax.grid(alpha=0.2)
        figure.tight_layout()
        figure.savefig(report_dir / f"{name}-curves.png", dpi=150)
        plt.close(figure)
        matrix = np.array(record["test"]["confusion_matrix"])
        figure, ax = plt.subplots(figsize=(10, 9))
        ax.imshow(matrix, cmap="Blues", vmin=0)
        labels = [item["label"] for item in manifest]
        ax.set(xticks=range(len(manifest)), xticklabels=labels, yticks=range(len(manifest)), yticklabels=labels,
               xlabel="Previsto", ylabel="Real", title=f"{name.upper()} — teste ({matrix.sum()} imagens)")
        plt.setp(ax.get_xticklabels(), rotation=35, ha="right")
        for row in range(len(manifest)):
            for column in range(len(manifest)):
                ax.text(column, row, str(matrix[row, column]), ha="center", va="center",
                        color="white" if matrix[row, column] > matrix.max() / 2 else "black")
        figure.tight_layout()
        figure.savefig(report_dir / f"{name}-confusion.png", dpi=150)
        plt.close(figure)


def evaluate(run):
    metadata = check_dataset(run)
    training = read_json(run / "training.json")
    if training["dataset_sha256"] != metadata["npz_sha256"]:
        raise ValueError("Training used a different dataset")
    tf = setup_tf(metadata["seed"])
    data = np.load(run / "dataset.npz", allow_pickle=False)
    records = training["models"]
    models = {}
    for name, record in records.items():
        if sha256(run / f"{name}.h5") != record["h5_sha256"]:
            raise ValueError("Trained model checksum mismatch")
        model = tf.keras.models.load_model(run / f"{name}.h5", compile=False)
        models[name] = model
        record["validation"] = metrics(data["y_val"], model.predict(data["x_val"], verbose=0), metadata["classes"])
    selected = choose_model(records)
    print(f"Selected using validation only: {selected}", flush=True)
    # Test evaluated only after selection has been fixed.
    for name, model in models.items():
        records[name]["test"] = metrics(data["y_test"], model.predict(data["x_test"], verbose=0), metadata["classes"])
        print(f"{name}: test accuracy={records[name]['test']['accuracy']:.6f}", flush=True)
    result = {
        "schema_version": 1, "smoke": metadata["smoke"], "classes": metadata["classes"],
        "preprocessing": metadata["preprocessing"],
        "dataset": {**{key: metadata[key] for key in ("seed", "per_class", "sources", "split_counts", "deduplication", "npz_sha256")},
                    "sampling_exclusions": {key: value["skipped"] for key, value in metadata["selection"].items()}},
        "training": {key: value for key, value in training.items() if key != "models"},
        "models": records,
        "selection": {"model": selected, "criterion": "validation macro-F1; ties: validation accuracy, then fewer parameters",
                      "test_used_for_selection": False},
        "browser_inference_ms": None,
        "limitations": ["Single seed; Quick Draw test is not a test of game canvas drawings",
                        "Exact duplicates removed; similar drawings and author overlap cannot be excluded with bitmap-only data",
                        "Browser latency and canvas preprocessing will be validated in Stage 4"],
    }
    write_json(run / "metrics.json", result)
    plots(run / "reports", records, metadata["classes"])
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run-dir", type=Path, default=HERE / "runs/full")
    args = parser.parse_args()
    evaluate(args.run_dir)
