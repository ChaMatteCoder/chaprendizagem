# Pipeline de Dados e Treinamento — Pixel em Pânico! & PixelLab (CIFAR-10)

Este diretório contém o pipeline científico offline para o módulo **Pixel em Pânico!** (`/pixel/jogo`) e **PixelLab** (`/pixel/lab`).

## 1. Fonte de Dados Oficial e Particionamento

- **Dataset**: CIFAR-10 (*Learning Multiple Layers of Features from Tiny Images*, Alex Krizhevsky, 2009, Universidade de Toronto).
- **Formato nativo**: `32 × 32 × 3` RGB (`uint8`, `[0, 255]`), 10 classes canônicas balanceadas (6.000 imagens por classe; 60.000 no total).
- **Particionamento reproduzível (`seed = 42`)**:
  - **Treino (`train`)**: 45.000 imagens estratificadas (4.500 por classe), extraídas dos `data_batch_1..5` oficiais.
  - **Validação (`validation`)**: 5.000 imagens estratificadas (500 por classe), disjuntas do treino.
  - **Teste oficial (`test`)**: 10.000 imagens do `test_batch` oficial preservadas exclusivamente para avaliação final única.
- **Pacote interativo (`public/data/pixel/demo-samples.json`)**: 100 amostras estratificadas da partição de **validação** (10 por classe) codificadas sem perdas (`base64` de `Uint8Array` `32×32×3`), evitando versionar os 60.000 arquivos no Git ou no bundle web.

## 2. Arquitetura da CNN Candidata

```
Input(32, 32, 3)
→ Conv2D(32, 3×3, padding='same', activation='relu')     [896 params]
→ MaxPooling2D(2×2)
→ Conv2D(64, 3×3, padding='same', activation='relu')     [18.496 params]
→ MaxPooling2D(2×2)
→ Conv2D(64, 3×3, padding='same', activation='relu')     [36.928 params]
→ GlobalAveragePooling2D()
→ Dense(64, activation='relu')                           [4.160 params]
→ Dense(10, activation='softmax')                        [650 params]
Total: 61.130 parâmetros treináveis
```

## 3. Comandos

### Preparar e verificar o dataset CIFAR-10
```bash
npm run prepare:pixel
npm run check:pixel
```

### Smoke test (2 épocas em subconjunto reduzido)
```bash
python3 training/pixel/train_cnn.py --smoke --run-dir training/pixel/runs/smoke
```

### Treinamento completo e publicação do modelo oficial
```bash
npm run train:pixel
```

### Verificar equivalência numérica Python ↔ TensorFlow.js e ausência de vazamento de tensores
```bash
npm run verify:pixel
```

### Gerar explicação matemática passo a passo de uma amostra de validação
```bash
npm run explain:pixel -- --save
```
