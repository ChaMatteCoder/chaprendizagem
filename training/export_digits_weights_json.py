"""Exporta pesos da MLP MNIST Keras para JSON proprio do Chaprendizagem."""

import json
from pathlib import Path

import numpy as np
import tensorflow as tf


ROOT_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = ROOT_DIR / "training" / "artifacts" / "mnist_mlp_digits.h5"
OUTPUT_PATH = ROOT_DIR / "public" / "models" / "digits" / "mnist_mlp_weights.json"
METRICS_OUTPUT_PATH = ROOT_DIR / "public" / "models" / "digits" / "mnist_metrics.json"
CONFUSION_MATRIX_PATH = ROOT_DIR / "training" / "reports" / "mnist_confusion_matrix.npy"

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


def main():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Modelo Keras nao encontrado em {MODEL_PATH}. Rode primeiro: python training/train_digits_mnist.py"
        )

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

    print(f"Carregando modelo: {MODEL_PATH}")
    model = tf.keras.models.load_model(MODEL_PATH, compile=False)
    weights = model.get_weights()

    if len(weights) != len(WEIGHT_NAMES):
        raise ValueError(
            f"Quantidade inesperada de arrays de pesos: {len(weights)}. Esperado: {len(WEIGHT_NAMES)}."
        )

    payload = {
        "format": "chaprendizagem-mlp-weights-v1",
        "task": "digits-mnist",
        "inputSize": 784,
        "classes": [str(index) for index in range(10)],
        "architecture": [
            {"type": "dense", "units": 128, "activation": "relu"},
            {"type": "dense", "units": 64, "activation": "relu"},
            {"type": "dense", "units": 10, "activation": "softmax"},
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

    with OUTPUT_PATH.open("w", encoding="utf-8") as output_file:
        json.dump(payload, output_file, ensure_ascii=False, separators=(",", ":"))

    print(f"Pesos exportados para: {OUTPUT_PATH}")
    print("Arquivo pronto para ser carregado pelo site no modo Digitos 0-9.")

    if CONFUSION_MATRIX_PATH.exists():
        matrix = np.load(CONFUSION_MATRIX_PATH)
        total = float(matrix.sum())
        accuracy = float(np.trace(matrix) / total) if total else None
        metrics_payload = {
            "format": "chaprendizagem-mnist-metrics-v1",
            "task": "digits-mnist",
            "accuracy": accuracy,
            "testLoss": None,
            "labels": [str(index) for index in range(10)],
            "confusionMatrix": matrix.astype(int).tolist(),
            "classificationReport": None,
        }

        with METRICS_OUTPUT_PATH.open("w", encoding="utf-8") as output_file:
            json.dump(metrics_payload, output_file, ensure_ascii=False, separators=(",", ":"))

        print(f"Metricas MNIST exportadas para: {METRICS_OUTPUT_PATH}")
    else:
        print("Matriz training/reports/mnist_confusion_matrix.npy nao encontrada; mnist_metrics.json nao foi gerado.")


if __name__ == "__main__":
    main()
