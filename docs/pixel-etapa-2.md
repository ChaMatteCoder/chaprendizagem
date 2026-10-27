# Pixel em Pânico! + PixelLab — Checkpoint da Etapa 02

Data: 20 de outubro de 2026. Escopo concluído: aquisição oficial da base CIFAR-10, validação criptográfica, particionamento estratificado reproduzível, pacote de demonstração sem perdas e equivalência numérica das operações de pixel entre Python e JavaScript. Continuação do [plano da Etapa 01](pixel-etapa-1.md).

## Entrega

O arquivo oficial `cifar-10-python.tar.gz` da Universidade de Toronto (Alex Krizhevsky, 2009) foi verificado por tamanho, MD5 e SHA-256 em relação ao manifesto de bloqueio [training/pixel/sources.lock.json](../training/pixel/sources.lock.json), incluindo o hash SHA-256 individual de `batches.meta`, `data_batch_1..5` e `test_batch`.

As 60.000 imagens permanecem fora do Git e do bundle web (`training/pixel/cache/`, ignorado no `.gitignore`). No repositório são versionados apenas os manifestos públicos de proveniência ([public/data/pixel/provenance.json](../public/data/pixel/provenance.json)), partições ([public/data/pixel/partitions.json](../public/data/pixel/partitions.json)) e o pacote fixo de demonstração local ([public/data/pixel/demo-samples.json](../public/data/pixel/demo-samples.json)) com 100 amostras reais da partição de validação (10 por classe) codificadas sem perdas em `uint8` (`base64`), sem compressão JPEG.

## Dados Efetivamente Verificados

| Verificação | Resultado |
| --- | --- |
| Fonte oficial | [CIFAR-10 (Python version)](https://www.cs.toronto.edu/~kriz/cifar-10-python.tar.gz) |
| Bytes do arquivo `.tar.gz` | `170.498.071` |
| MD5 verificado | `c58f30108f718f92721af3b95e74349a` |
| SHA-256 verificado | `6d958be074577803d12ecdefd02955f39262c83c16fe9348329d7fe0b5c001ce` |
| Dimensão nativa por amostra | `32 × 32 × 3` RGB (`3.072` valores `uint8` em `[0, 255]`) |
| Pré-processamento da CNN | `x_float32 = x_uint8 / 255.0` em layout `NHWC` (`[0, 1]`) |
| Total de amostras | `60.000` (`6.000` por classe) |
| Ordem canônica das 10 classes | `0: Avião (airplane)`, `1: Automóvel (automobile)`, `2: Pássaro (bird)`, `3: Gato (cat)`, `4: Cervo (deer)`, `5: Cachorro (dog)`, `6: Sapo (frog)`, `7: Cavalo (horse)`, `8: Navio (ship)`, `9: Caminhão (truck)` |

## Partições Persistidas (`seed = 42`, Mulberry32 + Fisher–Yates)

| Partição | Total | Amostras por classe (0 a 9) | Papel no protocolo `pixel-cifar10-protocol-v1` |
| --- | ---: | ---: | --- |
| Treino (`train`) | `45.000` | `4.500` | Ajuste de pesos e aumento de dados leve |
| Validação (`validation`) | `5.000` | `500` | Seleção de época (early stopping), análise de robustez e pacote de demonstração |
| Teste oficial (`officialTest`) | `10.000` | `1.000` | Preservado exclusivamente para avaliação final única |
| Pacote interativo (`demoPack`) | `100` | `10` | Subconjunto fixo da validação usado pelo jogo e pelo PixelLab no navegador |

Hashes SHA-256 dos índices das partições de desenvolvimento:
- `trainIndicesSha256`: `95dcbccd2387d3637faf815e0bd57761fc63b791ebc108f43156d11bccfdb950`
- `validationIndicesSha256`: `dc068769836e53d6aaba4496e18a9dfdee007931e360e0fbc21a6806d2254fc7`

## Equivalência Python ↔ JavaScript no Processamento de Pixels

As fórmulas de interferência (contraste em torno de `127,5`, brilho aditivo e ruído uniforme simétrico com `Mulberry32`) e de restauração (suavização `3×3` com borda por repetição `replicate`, contraste e brilho em ordem fixa a partir da imagem corrompida, seguidos de clipping em `[0, 255]` e arredondamento `floor(x + 0.5)`) foram validadas em `pixelOpsReferenceFixtures` e em `tests/pixel-data-ops.test.js`, com concordância byte a byte (`3.072 / 3.072` valores idênticos) entre Python e JavaScript.

## Arquivos Principais da Etapa 02

| Arquivo | Responsabilidade |
| --- | --- |
| [cifar10Schema.js](../src/features/pixel/data/cifar10Schema.js) | Ordem canônica das 10 classes, especificação `32×32×3`, arquitetura de `61.130` parâmetros e limites das ferramentas |
| [pixelOps.js](../src/features/pixel/lib/pixelOps.js) | PRNG `Mulberry32`, normalização, codificação `base64` sem perdas, interferência, restauração sem deriva cumulativa e extração de canais RGB |
| [prepare_cifar10.py](../training/pixel/prepare_cifar10.py) | Download retomável, verificação criptográfica, divisão estratificada `45k/5k/10k` e geração dos manifestos públicos |
| [pixel-data-ops.test.js](../tests/pixel-data-ops.test.js) | Testes automatizados das classes, partições disjuntas e paridade Python ↔ JS |
