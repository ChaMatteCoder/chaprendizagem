"""Exporta pesos da MLP alfanumerica Keras para JSON proprio do Chaprendizagem."""

import json
from pathlib import Path

import numpy as np
import tensorflow as tf


ROOT_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = ROOT_DIR / "training" / "artifacts" / "alphanumeric_mlp_mnist_emnist.h5"
OUTPUT_DIR = ROOT_DIR / "public" / "models" / "alphanumeric"
WEIGHTS_OUTPUT_PATH = OUTPUT_DIR / "alphanumeric_mlp_weights.json"
METRICS_OUTPUT_PATH = OUTPUT_DIR / "alphanumeric_metrics.json"
CONFUSION_MATRIX_PATH = ROOT_DIR / "training" / "reports" / "alphanumeric_confusion_matrix.npy"
CLASSIFICATION_REPORT_PATH = ROOT_DIR / "training" / "reports" / "alphanumeric_classification_report.json"

LABELS = [str(index) for index in range(10)] + [chr(65 + index) for index in range(26)]
WEIGHT_NAMES = [
    "dense/kernel",
    "dense/bias",
    "dense_1/kernel",
    "dense_1/bias",
    "dense_2/kernel",
    "dense_2/bias",
]


def flatten_float32(array):
    float_array = np.asarray(array, dtype=np.float32)
    return [float(value) for value in float_array.reshape(-1)]


def load_classification_report():
    if not CLASSIFICATION_REPORT_PATH.exists():
        return None

    with CLASSIFICATION_REPORT_PATH.open("r", encoding="utf-8") as input_file:
        return json.load(input_file)


def export_metrics():
    matrix = None
    accuracy = None

    if CONFUSION_MATRIX_PATH.exists():
        matrix = np.load(CONFUSION_MATRIX_PATH).astype(int)
        total = float(matrix.sum())
        accuracy = float(np.trace(matrix) / total) if total else None

    report = load_classification_report()
    payload = {
        "format": "chaprendizagem-alphanumeric-metrics-v1",
        "task": "alphanumeric-mnist-emnist",
        "accuracy": accuracy,
        "testLoss": None,
        "labels": LABELS,
        "confusionMatrix": matrix.tolist() if matrix is not None else None,
        "classificationReport": report,
    }

    with METRICS_OUTPUT_PATH.open("w", encoding="utf-8") as output_file:
        json.dump(payload, output_file, ensure_ascii=False, separators=(",", ":"))

    print(f"Metricas alfanumericas exportadas para: {METRICS_OUTPUT_PATH}")


def main():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Modelo Keras nao encontrado em {MODEL_PATH}. Rode primeiro: python training/train_alphanumeric_mnist_emnist.py"
        )

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Carregando modelo: {MODEL_PATH}")
    model = tf.keras.models.load_model(MODEL_PATH, compile=False)
    weights = model.get_weights()

    if len(weights) != len(WEIGHT_NAMES):
        raise ValueError(
            f"Quantidade inesperada de arrays de pesos: {len(weights)}. Esperado: {len(WEIGHT_NAMES)}."
        )

    payload = {
        "format": "chaprendizagem-mlp-weights-v1",
        "task": "alphanumeric-mnist-emnist",
        "inputSize": 784,
        "classes": LABELS,
        "architecture": [
            {"type": "dense", "units": 256, "activation": "relu"},
            {"type": "dropout", "rate": 0.2, "trainingOnly": True},
            {"type": "dense", "units": 128, "activation": "relu"},
            {"type": "dense", "units": 36, "activation": "softmax"},
        ],
        "weights": [
            {
                "name": name,
                "shape": list(np.asarray(array).shape),
                "values": flatten_float32(array),
            }
            for name, array in zip(WEIGHT_NAMES, weights)
        ],
    }

    with WEIGHTS_OUTPUT_PATH.open("w", encoding="utf-8") as output_file:
        json.dump(payload, output_file, ensure_ascii=False, separators=(",", ":"))

    print(f"Pesos exportados para: {WEIGHTS_OUTPUT_PATH}")
    export_metrics()


if __name__ == "__main__":
    main()
