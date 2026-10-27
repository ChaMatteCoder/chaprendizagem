# Pixel em Pânico! + PixelLab — Checkpoint da Etapa 03

Data: 20 de outubro de 2026. Escopo concluído: implementação da CNN candidata de `61.130` parâmetros, smoke test, treinamento completo na base CIFAR-10, avaliação única no teste oficial, protocolo agregado de robustez, exportação para TensorFlow.js e verificação de equivalência numérica e descarte de tensores.

## Arquitetura Real da CNN (`cifar10-compact-cnn-v1`)

| Camada | Tipo | Shape de Entrada | Shape de Saída | Kernel / Janela | Ativação | Parâmetros |
| --- | --- | --- | --- | --- | --- | ---: |
| `input_rgb` | `InputLayer` | `32 × 32 × 3` | `32 × 32 × 3` | — | Identidade | `0` |
| `conv2d_1` | `Conv2D` | `32 × 32 × 3` | `32 × 32 × 32` | `3 × 3 × 3 × 32` (`same`) | `ReLU` | `896` |
| `max_pooling2d_1` | `MaxPooling2D` | `32 × 32 × 32` | `16 × 16 × 32` | `2 × 2` (passo `2`) | — | `0` |
| `conv2d_2` | `Conv2D` | `16 × 16 × 32` | `16 × 16 × 64` | `3 × 3 × 32 × 64` (`same`) | `ReLU` | `18.496` |
| `max_pooling2d_2` | `MaxPooling2D` | `16 × 16 × 64` | `8 × 8 × 64` | `2 × 2` (passo `2`) | — | `0` |
| `conv2d_3` | `Conv2D` | `8 × 8 × 64` | `8 × 8 × 64` | `3 × 3 × 64 × 64` (`same`) | `ReLU` | `36.928` |
| `global_average_pooling2d_1` | `GlobalAveragePooling2D` | `8 × 8 × 64` | `64` | Média `8 × 8` | — | `0` |
| `dense_1` | `Dense` | `64` | `64` | `64 × 64` | `ReLU` | `4.160` |
| `dense_2` | `Dense` | `64` | `10` | `64 × 10` | `Softmax` | `650` |
| **Total** | | | | | | **61.130** |

## Treinamento e Métricas Efetivamente Medidas

- **Modelo oficial**: `pixel-cifar10-cnn-f27ef7d52038`
- **Configuração**: otimizador `Adam` ($\eta = 0{,}001$, $\beta_1 = 0{,}9$, $\beta_2 = 0{,}999$, $\epsilon = 10^{-7}$), função de perda `categorical_crossentropy`, `batch_size = 128`, `seed = 42`, `20` épocas monitorando `val_loss` (`bestEpoch = 20`), tempo medido de `739,57 s` em CPU (6 threads).
- **Smoke test prévio**: validado em `training/pixel/runs/smoke` (`2` épocas sobre subconjunto reduzido, `maxAbsDiff = 2,235e-8`, `0` vazamentos), sem publicar como modelo oficial.

| Conjunto | Amostras | Acertos | Acurácia | Macro-Precisão | Macro-Recall | Macro-F1 | Cross-Entropy |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| **Treino (Época 20)** | `45.000` | `30.259` | `67,24%` | — | — | — | `0,9232` |
| **Validação** | `5.000` | `3.393` | `67,86%` | `68,01%` | `67,86%` | `67,56%` | `0,9106` |
| **Teste Oficial (avaliação única)** | `10.000` | `6.753` | `67,53%` | `67,84%` | `67,53%` | `67,34%` | `0,9242` |

> **Comparação com o acaso uniforme**: em 10 classes balanceadas (`1.000` amostras por classe no teste), o palpite uniforme obtém `10,00%` de acurácia e $\ln(10) \approx 2{,}3026$ de cross-entropy. O modelo oficial de `61.130` parâmetros alcança `67,53%` de acurácia e reduz a cross-entropy para `0,9242`.

## Equivalência Python ↔ TensorFlow.js e Gerenciamento de Memória

O checkpoint congelado foi exportado para [public/models/pixel/official/](../public/models/pixel/official/) (`model.json`, `weights.bin`, `manifest.json`, `metrics.json`, `history.json`, `robustness.json` e `parity-fixtures.json`).

| Verificação | Valor Medido |
| --- | --- |
| Versão do `@tensorflow/tfjs` | `4.22.0` |
| Amostras de paridade (10 originais + 10 perturbadas/restauradas) | `20` |
| Concordância de `argmax` Python vs. TF.js | `20 / 20` (`100%`) |
| Diferença absoluta máxima nas probabilidades (`maxAbsDiff`) | `2,384e-7` ($\le 10^{-5}$) |
| Variação de tensores (`tf.memory().numTensors`) após inferência e `dispose` | `0` |
