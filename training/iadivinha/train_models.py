"""Train the specified baseline and CNN on the same immutable data split."""
import argparse
import platform
import time
from pathlib import Path

import numpy as np

from common import HERE, check_dataset, setup_tf, sha256, write_json, classes


def create_model(tf, name):
    layers = tf.keras.layers
    stack = [layers.Input(shape=(28, 28, 1), name="drawing")]
    if name == "mlp":
        stack += [layers.Flatten(), layers.Dense(128, activation="relu"), layers.Dense(64, activation="relu")]
    elif name == "cnn":
        stack += [layers.Conv2D(32, 3, activation="relu"), layers.MaxPooling2D(),
                  layers.Conv2D(64, 3, activation="relu"), layers.MaxPooling2D(),
                  layers.Flatten(), layers.Dense(64, activation="relu"), layers.Dropout(0.25)]
    else:
        raise ValueError(f"Unknown model: {name}")
    stack += [layers.Dense(len(classes()), activation="softmax", name="probabilities")]
    model = tf.keras.Sequential(stack, name=f"iadivinha_{name}")
    model.compile(optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
                  loss="sparse_categorical_crossentropy", metrics=["accuracy"])
    return model


def train(run, epochs=15, batch_size=128):
    if epochs < 1 or batch_size < 1:
        raise ValueError("epochs and batch_size must be positive")
    if (run / "training.json").exists():
        raise FileExistsError("Use a new run directory; do not overwrite an experiment")
    metadata = check_dataset(run)
    tf = setup_tf(metadata["seed"])
    data = np.load(run / "dataset.npz", allow_pickle=False)
    records = {}
    for name in ("mlp", "cnn"):
        tf.keras.backend.clear_session()
        tf.keras.utils.set_random_seed(metadata["seed"])
        model = create_model(tf, name)
        started = time.perf_counter()
        history = model.fit(data["x_train"], data["y_train"],
                            validation_data=(data["x_val"], data["y_val"]),
                            epochs=epochs, batch_size=batch_size, shuffle=True, verbose=2,
                            callbacks=[tf.keras.callbacks.ModelCheckpoint(
                                str(run / f"{name}.best.weights.h5"), monitor="val_loss",
                                save_best_only=True, save_weights_only=True),
                                tf.keras.callbacks.EarlyStopping(
                                    monitor="val_loss", patience=3, restore_best_weights=True)])
        seconds = time.perf_counter() - started
        model.load_weights(run / f"{name}.best.weights.h5")
        # HDF5 contains topology and weights; optimizer state is unnecessary for inference.
        model.save(run / f"{name}.h5", include_optimizer=False)
        records[name] = {
            "history": history.history, "parameters": model.count_params(),
            "epochs_completed": len(history.history["loss"]),
            "best_epoch": int(np.argmin(history.history["val_loss"])) + 1,
            "training_seconds": seconds, "h5_bytes": (run / f"{name}.h5").stat().st_size,
            "h5_sha256": sha256(run / f"{name}.h5"),
        }
        model.summary(print_fn=lambda line: print(line, flush=True))
    result = {
        "seed": metadata["seed"], "dataset_sha256": metadata["npz_sha256"],
        "epochs_max": epochs, "batch_size": batch_size, "optimizer": "Adam", "learning_rate": 0.001,
        "early_stopping": {"monitor": "val_loss", "patience": 3, "restore_best_weights": True},
        "source_sha256": {path.name: sha256(path) for path in sorted(HERE.glob("*.py"))},
        "environment": {"python": platform.python_version(), "platform": platform.platform(),
                        "tensorflow": tf.__version__, "numpy": np.__version__,
                        "devices": [device.name for device in tf.config.list_physical_devices()],
                        "deterministic_ops": True, "onednn": False, "intra_threads": 4, "inter_threads": 2},
        "models": records,
    }
    write_json(run / "training.json", result)
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run-dir", type=Path, default=HERE / "runs/full")
    parser.add_argument("--epochs", type=int, default=15)
    parser.add_argument("--batch-size", type=int, default=128)
    args = parser.parse_args()
    train(args.run_dir, args.epochs, args.batch_size)
