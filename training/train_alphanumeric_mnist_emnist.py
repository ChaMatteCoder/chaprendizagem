"""Treina uma MLP alfanumerica com MNIST + EMNIST Letters.

O modelo gerado reconhece 36 classes:
0-9 e A-Z.
"""

import json
from pathlib import Path

import numpy as np
import tensorflow as tf

try:
    import tensorflow_datasets as tfds
except ImportError as exc:
    tfds = None
    TFDS_IMPORT_ERROR = exc
else:
    TFDS_IMPORT_ERROR = None

try:
    import importlib_resources  # noqa: F401
except ImportError as exc:
    IMPORTLIB_RESOURCES_IMPORT_ERROR = exc
else:
    IMPORTLIB_RESOURCES_IMPORT_ERROR = None

try:
    import matplotlib.pyplot as plt
except ImportError:
    plt = None

try:
    from sklearn.metrics import classification_report, confusion_matrix
except ImportError:
    classification_report = None
    confusion_matrix = None


ROOT_DIR = Path(__file__).resolve().parent
ARTIFACTS_DIR = ROOT_DIR / "artifacts"
REPORTS_DIR = ROOT_DIR / "reports"
MODEL_PATH = ARTIFACTS_DIR / "alphanumeric_mlp_mnist_emnist.h5"
CONFUSION_MATRIX_PATH = REPORTS_DIR / "alphanumeric_confusion_matrix.npy"
CLASSIFICATION_REPORT_PATH = REPORTS_DIR / "alphanumeric_classification_report.json"

LABELS = [str(index) for index in range(10)] + [chr(65 + index) for index in range(26)]
MAX_SAMPLES_PER_CLASS = 6000
EPOCHS = 16
SEED = 42
BATCH_SIZE = 256


def prepare_directories():
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)


def flatten_images(images):
    images = np.asarray(images, dtype=np.float32)
    if images.max() > 1.0:
        images = images / 255.0
    return images.reshape((-1, 784))


def normalize_letter_labels(labels):
    labels = np.asarray(labels, dtype=np.int64).reshape(-1)
    if labels.min() == 1:
        labels = labels - 1
    if labels.min() < 0 or labels.max() > 25:
        raise ValueError(f"Labels EMNIST Letters fora do intervalo esperado: min={labels.min()} max={labels.max()}")
    return labels + 10


def load_mnist():
    (x_train, y_train), (x_test, y_test) = tf.keras.datasets.mnist.load_data()
    return flatten_images(x_train), y_train.astype(np.int64), flatten_images(x_test), y_test.astype(np.int64)


def tfds_split_to_numpy(split_name):
    if tfds is None:
        raise ImportError(
            "tensorflow-datasets nao esta instalado. Rode: pip install tensorflow-datasets"
        ) from TFDS_IMPORT_ERROR

    if IMPORTLIB_RESOURCES_IMPORT_ERROR is not None:
        raise ImportError(
            "Dependencia importlib_resources nao encontrada. "
            "No Python 3.12/Windows, o tensorflow-datasets pode precisar dela para carregar o EMNIST. "
            "Rode: pip install importlib_resources"
        ) from IMPORTLIB_RESOURCES_IMPORT_ERROR

    dataset = tfds.load("emnist/letters", split=split_name, as_supervised=True)
    images = []
    labels = []

    for image, label in tfds.as_numpy(dataset):
        # EMNIST vem como 28x28x1. O transpose alinha visualmente com o padrao usual de leitura.
        image = np.squeeze(image).astype(np.float32)
        image = np.transpose(image)
        images.append(image)
        labels.append(label)

    return flatten_images(np.stack(images)), normalize_letter_labels(np.asarray(labels))


def load_emnist_letters():
    x_train, y_train = tfds_split_to_numpy("train")
    x_test, y_test = tfds_split_to_numpy("test")
    return x_train, y_train, x_test, y_test


def limit_samples_per_class(x, y, max_per_class=MAX_SAMPLES_PER_CLASS, seed=SEED):
    rng = np.random.default_rng(seed)
    selected_indices = []

    for class_id in np.unique(y):
        indices = np.flatnonzero(y == class_id)
        if len(indices) > max_per_class:
            indices = rng.choice(indices, size=max_per_class, replace=False)
        selected_indices.extend(indices.tolist())

    selected_indices = np.asarray(selected_indices)
    rng.shuffle(selected_indices)
    return x[selected_indices], y[selected_indices]


def load_combined_dataset():
    print("Carregando MNIST...")
    x_mnist_train, y_mnist_train, x_mnist_test, y_mnist_test = load_mnist()

    print("Carregando EMNIST Letters via tensorflow_datasets...")
    x_letters_train, y_letters_train, x_letters_test, y_letters_test = load_emnist_letters()

    x_train = np.concatenate([x_mnist_train, x_letters_train], axis=0)
    y_train = np.concatenate([y_mnist_train, y_letters_train], axis=0)
    x_test = np.concatenate([x_mnist_test, x_letters_test], axis=0)
    y_test = np.concatenate([y_mnist_test, y_letters_test], axis=0)

    x_train, y_train = limit_samples_per_class(x_train, y_train)
    x_test, y_test = limit_samples_per_class(x_test, y_test, max_per_class=1200, seed=SEED + 1)

    return x_train, y_train, x_test, y_test


def create_model():
    model = tf.keras.Sequential(
        [
            tf.keras.layers.Input(shape=(784,)),
            tf.keras.layers.Dense(256, activation="relu"),
            tf.keras.layers.Dropout(0.2),
            tf.keras.layers.Dense(128, activation="relu"),
            tf.keras.layers.Dense(36, activation="softmax"),
        ]
    )

    model.compile(
        optimizer="adam",
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )

    return model


def save_training_plots(history):
    if plt is None:
        print("matplotlib nao encontrado; graficos PNG nao foram gerados.")
        return

    epochs = range(1, len(history.history["loss"]) + 1)

    plt.figure(figsize=(8, 5))
    plt.plot(epochs, history.history["loss"], label="Treino")
    plt.plot(epochs, history.history["val_loss"], label="Validacao")
    plt.title("MNIST + EMNIST MLP - Loss")
    plt.xlabel("Epoca")
    plt.ylabel("Sparse categorical crossentropy")
    plt.legend()
    plt.tight_layout()
    plt.savefig(REPORTS_DIR / "alphanumeric_loss.png", dpi=140)
    plt.close()

    plt.figure(figsize=(8, 5))
    plt.plot(epochs, history.history["accuracy"], label="Treino")
    plt.plot(epochs, history.history["val_accuracy"], label="Validacao")
    plt.title("MNIST + EMNIST MLP - Acuracia")
    plt.xlabel("Epoca")
    plt.ylabel("Accuracy")
    plt.legend()
    plt.tight_layout()
    plt.savefig(REPORTS_DIR / "alphanumeric_accuracy.png", dpi=140)
    plt.close()


def save_reports(model, x_test, y_test):
    predictions = np.argmax(model.predict(x_test, batch_size=512, verbose=0), axis=1)

    if classification_report is not None:
        report = classification_report(
            y_test,
            predictions,
            labels=list(range(36)),
            target_names=LABELS,
            digits=4,
            output_dict=True,
            zero_division=0,
        )
        print("\nRelatorio de classificacao:")
        print(json.dumps(report, ensure_ascii=False, indent=2))
        with CLASSIFICATION_REPORT_PATH.open("w", encoding="utf-8") as output_file:
            json.dump(report, output_file, ensure_ascii=False, indent=2)
    else:
        print("scikit-learn nao encontrado; relatorio de classificacao nao foi gerado.")

    if confusion_matrix is not None:
        matrix = confusion_matrix(y_test, predictions, labels=list(range(36)))
        np.save(CONFUSION_MATRIX_PATH, matrix)
        print(f"Matriz de confusao salva em: {CONFUSION_MATRIX_PATH}")
        print_top_confusions(matrix)
    else:
        print("scikit-learn nao encontrado; matriz de confusao nao foi salva.")


def print_top_confusions(matrix, limit=10):
    confusions = []
    for actual_index, row in enumerate(matrix):
        for predicted_index, value in enumerate(row):
            if actual_index != predicted_index and value > 0:
                confusions.append((value, LABELS[actual_index], LABELS[predicted_index]))

    confusions.sort(reverse=True)
    print("\nPrincipais confusoes fora da diagonal:")
    for value, actual, predicted in confusions[:limit]:
        print(f"{actual} confundido com {predicted}: {int(value)} casos")


def main():
    tf.keras.utils.set_random_seed(SEED)
    prepare_directories()

    x_train, y_train, x_test, y_test = load_combined_dataset()
    print(f"Amostras de treino: {len(x_train)}")
    print(f"Amostras de teste: {len(x_test)}")
    print(f"Classes: {', '.join(LABELS)}")

    model = create_model()
    model.summary()

    print(f"Treinando por {EPOCHS} epocas...")
    history = model.fit(
        x_train,
        y_train,
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        validation_split=0.1,
        shuffle=True,
        verbose=2,
    )

    print("\nAvaliando no conjunto de teste combinado...")
    test_loss, test_accuracy = model.evaluate(x_test, y_test, verbose=0)
    print(f"Loss de teste: {test_loss:.6f}")
    print(f"Acuracia de teste: {test_accuracy:.4%}")

    model.save(MODEL_PATH)
    print(f"Modelo Keras salvo em: {MODEL_PATH}")

    save_training_plots(history)
    save_reports(model, x_test, y_test)


if __name__ == "__main__":
    main()
