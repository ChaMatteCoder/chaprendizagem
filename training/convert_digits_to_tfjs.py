from pathlib import Path
import types
import numpy as np
import tensorflow as tf

# Compatibilidade para versões novas do NumPy.
# Algumas versões do tensorflowjs ainda tentam usar np.object / np.bool.
if "object" not in np.__dict__:
    np.object = object

if "bool" not in np.__dict__:
    np.bool = bool

# Compatibilidade para tensorflow_hub/tensorflowjs em versões novas do TensorFlow.
# O conversor importa tensorflow_hub, que tenta acessar tf.compat.v1.estimator.
# Para converter Keras H5 simples, isso não é usado diretamente.
if not hasattr(tf.compat.v1, "estimator"):
    tf.compat.v1.estimator = types.SimpleNamespace(Exporter=object)

import tensorflowjs as tfjs

ROOT = Path(__file__).resolve().parent.parent

keras_model_path = ROOT / "training" / "artifacts" / "mnist_mlp_digits.h5"
output_dir = ROOT / "public" / "models" / "digits"

if not keras_model_path.exists():
    raise FileNotFoundError(f"Modelo Keras não encontrado: {keras_model_path}")

output_dir.mkdir(parents=True, exist_ok=True)

print(f"Carregando modelo Keras: {keras_model_path}")
model = tf.keras.models.load_model(keras_model_path)

print(f"Convertendo para TensorFlow.js em: {output_dir}")
tfjs.converters.save_keras_model(model, str(output_dir))

print("Conversão finalizada com sucesso.")
print("Arquivos gerados:")
for file in sorted(output_dir.iterdir()):
    print(f"- {file.name}")
