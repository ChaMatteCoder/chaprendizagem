# Treinamento MNIST para o Trabalho 08

Este diretorio contem scripts para treinar uma MLP real com a base MNIST e disponibilizar o modelo no modulo `/mlp/reconhecimento-manuscrito`.

O modo Letras A-Z continua usando o treino didatico local. Por enquanto, somente o modo Digitos 0-9 tenta usar o modelo MNIST pre-treinado quando os arquivos existirem em `public/models/digits/`.

## 1. Criar ambiente virtual

Crie o ambiente virtual na raiz do projeto, em `C:\chaprendizagem\.venv`. Nao crie outro ambiente dentro de `training/`.

Windows PowerShell:

```bash
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Linux/macOS:

```bash
python -m venv .venv
source .venv/bin/activate
```

Se voce tentar ativar `training\.venv`, o PowerShell pode falhar porque esse nao e o ambiente padrao do projeto.

## 2. Instalar dependencias

Windows PowerShell:

```bash
pip install tensorflow tensorflowjs matplotlib scikit-learn
```

Linux/macOS:

```bash
pip install tensorflow tensorflowjs matplotlib scikit-learn
```

`matplotlib` e `scikit-learn` sao uteis para relatorios. Se alguma dependencia opcional estiver ausente, o treino principal ainda pode funcionar, mas alguns graficos ou relatorios podem nao ser gerados.

## 3. Rodar o treino

Windows PowerShell:

```bash
python training/train_digits_mnist.py
```

Linux/macOS:

```bash
python training/train_digits_mnist.py
```

Tambem existe um atalho npm opcional:

```bash
npm run train:digits
```

O script baixa o MNIST automaticamente com `tf.keras.datasets.mnist.load_data()`, normaliza os pixels para `[0, 1]`, transforma cada imagem `28x28` em um vetor de `784` valores e treina a arquitetura:

```txt
784 entradas -> Dense 128 ReLU -> Dense 64 ReLU -> Dense 10 Softmax
```

Artefatos esperados:

```txt
training/artifacts/mnist_mlp_digits.h5
training/reports/mnist_loss.png
training/reports/mnist_accuracy.png
training/reports/mnist_confusion_matrix.npy
```

## 4. Exportar para uso no site

Existem dois caminhos possiveis para disponibilizar o modelo no site.

### Caminho A: conversor oficial TensorFlow.js

Use este caminho somente se `tensorflowjs_converter` funcionar corretamente no seu ambiente.

Windows PowerShell:

```bash
tensorflowjs_converter `
  --input_format=keras `
  training/artifacts/mnist_mlp_digits.h5 `
  public/models/digits
```

Linux/macOS:

```bash
tensorflowjs_converter \
  --input_format=keras \
  training/artifacts/mnist_mlp_digits.h5 \
  public/models/digits
```

Resultado esperado:

```txt
public/models/digits/model.json
public/models/digits/group1-shard*.bin
```

### Caminho B: pesos JSON proprios do Chaprendizagem

Este e o caminho recomendado neste projeto enquanto o conversor oficial apresenta incompatibilidade entre TensorFlow.js, TensorFlow Hub e TensorFlow em alguns ambientes Windows/Python.

Depois de treinar e gerar `training/artifacts/mnist_mlp_digits.h5`, rode:

```bash
python training/export_digits_weights_json.py
```

Ou use o atalho npm:

```bash
npm run export:digits-weights
```

O script carrega o modelo Keras, extrai `model.get_weights()` e salva os pesos achatados em JSON.

Resultado esperado:

```txt
public/models/digits/mnist_mlp_weights.json
```

## 5. Como o site carrega o modelo

O site tenta carregar automaticamente, nesta ordem:

```txt
public/models/digits/model.json
public/models/digits/mnist_mlp_weights.json
```

Se o caminho oficial existir, ele sera usado. Se nao existir ou falhar, o site tenta reconstruir a MLP com o JSON proprio:

```txt
784 entradas -> Dense 128 ReLU -> Dense 64 ReLU -> Dense 10 Softmax
```

Se nenhum arquivo existir, a pagina continua funcionando com o treino didatico local no navegador.

## 6. Treinamento do modelo Todos: 0-9 + A-Z

O modo **Todos** usa uma MLP alfanumerica com 36 classes, combinando:

```txt
MNIST para digitos 0-9
EMNIST Letters para letras A-Z
```

Este caminho usa exportacao JSON propria do Chaprendizagem, sem depender do `tensorflowjs_converter`, para evitar os problemas de compatibilidade observados no ambiente Windows/Python.

### Instalar dependencias adicionais

Ative o ambiente virtual da raiz do projeto e instale:

```bash
pip install tensorflow-datasets importlib_resources
```

Se estiver preparando o ambiente do zero, um conjunto completo de dependencias fica:

```bash
pip install tensorflow tensorflow-datasets importlib_resources matplotlib scikit-learn
```

No Windows com Python 3.12, o `tensorflow-datasets` pode falhar ao preparar o EMNIST com a mensagem
`ModuleNotFoundError: No module named 'importlib_resources'`. Nesse caso, instale explicitamente:

```bash
pip install importlib_resources
```

Se a execução anterior tiver parado durante o download/preparo do EMNIST, remova o cache parcial antes de rodar de novo:

```powershell
Remove-Item -Recurse -Force "$env:USERPROFILE\tensorflow_datasets\emnist\letters\3.1.0"
```

### Treinar o modelo alfanumerico

```bash
python training/train_alphanumeric_mnist_emnist.py
```

Ou use o atalho npm:

```bash
npm run train:alphanumeric
```

O script carrega o MNIST com `tf.keras.datasets.mnist.load_data()` e o EMNIST Letters com `tensorflow_datasets`:

```python
tfds.load("emnist/letters", ...)
```

Ele normaliza as imagens para `[0, 1]`, garante formato `28x28`, achata cada amostra em um vetor de `784` valores e aplica o mapeamento:

```txt
MNIST: 0 -> 0, ..., 9 -> 9
EMNIST Letters: A -> 10, B -> 11, ..., Z -> 35
```

A arquitetura treinada e:

```txt
784 entradas -> Dense 256 ReLU -> Dropout 0.2 -> Dense 128 ReLU -> Dense 36 Softmax
```

Artefatos esperados:

```txt
training/artifacts/alphanumeric_mlp_mnist_emnist.h5
training/reports/alphanumeric_loss.png
training/reports/alphanumeric_accuracy.png
training/reports/alphanumeric_confusion_matrix.npy
training/reports/alphanumeric_classification_report.json
```

### Exportar pesos para o site

Depois de treinar, rode:

```bash
python training/export_alphanumeric_weights_json.py
```

Ou use:

```bash
npm run export:alphanumeric-weights
```

Resultado esperado:

```txt
public/models/alphanumeric/alphanumeric_mlp_weights.json
public/models/alphanumeric/alphanumeric_metrics.json
```

O site reconstrui a arquitetura de inferencia sem Dropout:

```txt
784 entradas -> Dense 256 ReLU -> Dense 128 ReLU -> Dense 36 Softmax
```

Se esses arquivos nao existirem, o modo Todos continua acessivel, mas usa o fluxo didatico local ou informa que o modelo alfanumerico ainda nao foi encontrado.
