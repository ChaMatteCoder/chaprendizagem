"""Treina uma MLP para reconhecimento de digitos MNIST e salva artefatos locais.

O modelo gerado e compativel com a arquitetura usada no site:
784 entradas -> Dense 128 ReLU -> Dense 64 ReLU -> Dense 10 Softmax.
"""

from pathlib import Path

import numpy as np
import tensorflow as tf

try:
    import matplotlib.pyplot as plt
except ImportError:  # dependencia opcional
    plt = None

try:
    from sklearn.metrics import classification_report, confusion_matrix
except ImportError:  # dependencia opcional
    classification_report = None
    confusion_matrix = None


ROOT_DIR = Path(__file__).resolve().parent
ARTIFACTS_DIR = ROOT_DIR / "artifacts"
REPORTS_DIR = ROOT_DIR / "reports"
MODEL_PATH = ARTIFACTS_DIR / "mnist_mlp_digits.h5"
EPOCHS = 12
SEED = 42


def prepare_directories():
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)


def load_dataset():
    (x_train, y_train), (x_test, y_test) = tf.keras.datasets.mnist.load_data()

    x_train = x_train.astype("float32") / 255.0
    x_test = x_test.astype("float32") / 255.0

    x_train = x_train.reshape((-1, 784))
    x_test = x_test.reshape((-1, 784))

    return x_train, y_train, x_test, y_test


def create_model():
    model = tf.keras.Sequential(
        [
            tf.keras.layers.Input(shape=(784,)),
            tf.keras.layers.Dense(128, activation="relu"),
            tf.keras.layers.Dense(64, activation="relu"),
            tf.keras.layers.Dense(10, activation="softmax"),
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
    plt.title("MNIST MLP - Loss")
    plt.xlabel("Epoca")
    plt.ylabel("Sparse categorical crossentropy")
    plt.legend()
    plt.tight_layout()
    plt.savefig(REPORTS_DIR / "mnist_loss.png", dpi=140)
    plt.close()

    plt.figure(figsize=(8, 5))
    plt.plot(epochs, history.history["accuracy"], label="Treino")
    plt.plot(epochs, history.history["val_accuracy"], label="Validacao")
    plt.title("MNIST MLP - Acuracia")
    plt.xlabel("Epoca")
    plt.ylabel("Accuracy")
    plt.legend()
    plt.tight_layout()
    plt.savefig(REPORTS_DIR / "mnist_accuracy.png", dpi=140)
    plt.close()


def save_optional_reports(model, x_test, y_test):
    predictions = np.argmax(model.predict(x_test, batch_size=512, verbose=0), axis=1)

    if classification_report is not None:
        print("\nRelatorio de classificacao:")
        print(classification_report(y_test, predictions, digits=4))
    else:
        print("scikit-learn nao encontrado; relatorio de classificacao nao foi gerado.")

    if confusion_matrix is not None:
        matrix = confusion_matrix(y_test, predictions)
        np.save(REPORTS_DIR / "mnist_confusion_matrix.npy", matrix)
        print(f"Matriz de confusao salva em: {REPORTS_DIR / 'mnist_confusion_matrix.npy'}")
    else:
        print("scikit-learn nao encontrado; matriz de confusao nao foi salva.")


def main():
    tf.keras.utils.set_random_seed(SEED)
    prepare_directories()

    print("Carregando MNIST...")
    x_train, y_train, x_test, y_test = load_dataset()

    print("Criando modelo MLP...")
    model = create_model()
    model.summary()

    print(f"Treinando por {EPOCHS} epocas...")
    history = model.fit(
        x_train,
        y_train,
        epochs=EPOCHS,
        batch_size=128,
        validation_split=0.1,
        verbose=2,
    )

    print("\nAvaliando no conjunto de teste...")
    test_loss, test_accuracy = model.evaluate(x_test, y_test, verbose=0)
    print(f"Loss de teste: {test_loss:.6f}")
    print(f"Acuracia de teste: {test_accuracy:.4%}")

    model.save(MODEL_PATH)
    print(f"Modelo Keras salvo em: {MODEL_PATH}")

    save_training_plots(history)
    save_optional_reports(model, x_test, y_test)


if __name__ == "__main__":
    main()
