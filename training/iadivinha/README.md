# IAdivinha — treinamento de oito classes

Pipeline local para `cat`, `duck`, `shoe`, `bread`, `hand`, `hot air balloon`, `airplane` e `guitar`.
O jogo executa o modelo selecionado no navegador; nenhum serviço remoto recebe desenhos.
O [checkpoint de oito classes](../../docs/iadivinha-turma-ao-treinamento.md) registra os resultados atuais.
O [experimento anterior](../../docs/iadivinha-etapa-3.md), de três classes, permanece como histórico.
As métricas de teste não medem desenhos feitos no canvas do jogo.

## Ambiente e execução

Python **3.12**, Node e as dependências npm já existentes no repositório. Execute na raiz:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r training/iadivinha/requirements.txt
.\.venv\Scripts\python.exe -m unittest discover -s training/iadivinha -p 'test_*.py' -v
.\.venv\Scripts\python.exe training/iadivinha/run_pipeline.py --smoke --run-dir training/iadivinha/runs/eight-smoke
.\.venv\Scripts\python.exe training/iadivinha/run_pipeline.py --run-dir training/iadivinha/runs/eight-full
```

No Linux/macOS, use `python3.12` para criar o ambiente e `.venv/bin/python` para executar.
`requirements.txt` fixa as dependências diretas; `requirements-windows.lock.txt` registra todas
as versões efetivamente usadas no Windows para reproduzir o ambiente do experimento.
Não use o Python 3.14 do sistema para este conjunto de versões.

O download inicial traz os arquivos completos das oito categorias,
mesmo no smoke test, permitindo sortear amostras do arquivo inteiro. Downloads posteriores
usam o cache validado por SHA256. Arquivos oficiais diferentes de `sources.lock.json` causam
erro; não se aceita uma mudança silenciosa dos dados.

O smoke test usa **100 imagens por classe e 2 épocas**. Serve para verificar o pipeline,
nunca para apresentar desempenho final ou substituir os pesos públicos. O modo completo usa
**10.000 imagens por classe**, no máximo 15 épocas por rede e early stopping.
Resultados ficam separados em `runs/eight-smoke` e `runs/eight-full`, ignorados no Git.

Uma execução já treinada não é sobrescrita pelo orquestrador. Para repetir:

```powershell
.\.venv\Scripts\python.exe training/iadivinha/run_pipeline.py --smoke --run-dir training/iadivinha/runs/eight-smoke-repeat
```

Também é possível executar cada comando individualmente, útil ao retomar uma execução:

```powershell
.\.venv\Scripts\python.exe training/iadivinha/download_quickdraw.py
.\.venv\Scripts\python.exe training/iadivinha/prepare_dataset.py --run-dir training/iadivinha/runs/eight-full
.\.venv\Scripts\python.exe training/iadivinha/train_models.py --run-dir training/iadivinha/runs/eight-full
.\.venv\Scripts\python.exe training/iadivinha/evaluate_models.py --run-dir training/iadivinha/runs/eight-full
.\.venv\Scripts\python.exe training/iadivinha/export_tfjs.py --run-dir training/iadivinha/runs/eight-full --publish
node training/iadivinha/validate_tfjs.mjs training/iadivinha/runs/eight-full
node training/iadivinha/validate-game-render.mjs
```

Todos os comandos após o download aceitam `--run-dir`. `prepare_dataset.py` aceita
`--seed` e `--per-class`; `train_models.py` aceita `--epochs` e `--batch-size`.
`--publish` significa copiar os artefatos verificados para `public/` **localmente**, não fazer deploy.

## Dados e prevenção de vazamento

- A fonte da ordem das saídas é `src/features/iadivinha/data/classCatalog.json`, copiado para `public/models/iadivinha/classes.json` junto dos pesos.
- O formato oficial é `uint8 [N,784]`; a entrada das duas redes é `float32 [N,28,28,1]`,
  divisão por 255, fundo 0 e tinta 1, com canais por último. Não há inversão adicional.
- Os bitmaps oficiais já são centralizados pela caixa delimitadora do desenho. Não há
  novo recorte, limiar, aumento de dados nem mudança de escala no treinamento.
- Semente 42; permutação sem reposição de todo o arquivo por classe. São excluídos
  bitmaps vazios e hashes de pixels já selecionados, inclusive entre classes.
- A seleção é dividida antes do treino em 8.000/1.000/1.000 por classe, seguida de uma
  permutação de cada conjunto. Total: 64.000 treino, 8.000 validação e 8.000 teste.
- `dataset.json` guarda índices de origem, exclusões, fontes, checksums, seed e contrato;
  `dataset.npz` inclui rótulos e índices por split. Ambos ficam fora do Git.
- Deduplicação exata não elimina desenhos apenas parecidos. Os bitmaps não trazem IDs
  de autores ou o indicador `recognized`; não há filtragem nem divisão por esses campos.

## Modelos, seleção e métricas

MLP: Flatten → Dense 128 ReLU → Dense 64 ReLU → Dense 8 Softmax.

CNN: Conv2D 32 (3×3, valid) → MaxPooling 2×2 → Conv2D 64 (3×3, valid) →
MaxPooling 2×2 → Flatten → Dense 64 ReLU → Dropout 0,25 → Dense 8 Softmax.

Ambas usam Adam 0,001, batch 128 e entropia cruzada categórica esparsa. O checkpoint de
menor perda de validação é restaurado explicitamente; a paciência do early stopping é 3.
Não há ajuste de hiperparâmetros usando o teste. A seleção compara **macro-F1 da validação**,
com desempate por acurácia de validação e depois menor quantidade de parâmetros.
Somente depois dessa escolha calculam-se as métricas do teste de ambas as redes.

São produzidos acurácia, perda, precisão/recall/F1 e suporte por classe, macro-F1,
matriz de confusão (linhas reais, colunas previstas), curvas de treino/validação,
parâmetros, tamanho dos arquivos e duração do treino. O tempo de inferência no navegador
permanece `null`, pois não foi medido para este novo treinamento. A duração do treino não é latência de inferência.

Usam-se operações determinísticas, seeds Python/NumPy/TensorFlow, CPU com 4 threads de
operações e 2 entre operações, e oneDNN desativado. Reproduzir em outra versão ou hardware
pode mudar detalhes numéricos; o ambiente e os hashes ficam registrados.

## Exportação e validação independente

`tf-keras` mantém a serialização Keras 2. O exportador é um escritor pequeno do formato
TF.js Layers para **estas arquiteturas Sequential**, com lista explícita de camadas aceitas;
não é um conversor geral de grafos. Salva a topologia Keras e pesos nomeados em float32
little-endian, sem quantização nem estado de otimizador. Não depende do pacote Python
`tensorflowjs`; a validação usa o `@tensorflow/tfjs` 4.22.0 já instalado no projeto.

Antes da cópia para `public/`, Node carrega **as duas redes exportadas** via TensorFlow.js
e compara as probabilidades com Python em 10 imagens de validação de cada classe, uma
imagem vazia e outra cheia (82 entradas). Exige argmax idêntico, erro absoluto ≤ 0,0001,
dimensões corretas, soma das probabilidades e ausência de crescimento de tensores em
três execuções. As entradas artificiais são apenas testes numéricos: o jogo bloqueia vazio.

Somente o modelo selecionado vai para `public/models/iadivinha/model.json` e `weights.bin`,
acompanhado por `metrics.json`, `classes.json` e `preprocessing.json`. O catálogo do código
permanece a fonte única da ordem das classes. Os dois modelos HDF5, datasets e fixtures de paridade permanecem
em `runs/`, ignorados. Gráficos e evidências compactas do experimento completo são copiados
para `docs/iadivinha/training/eight-class/`.

## Limites e atribuição

O teste mede generalização dentro do Quick, Draw!, em uma única seed. Não demonstra
acurácia em desenhos do canvas do jogo, calibração de confiança ou desempenho em outros
dispositivos. O pré-processamento do canvas aproxima a geometria dos bitmaps oficiais, mas não há
demonstração de identidade pixel a pixel com a rasterização original.

Dados disponibilizados por **Google, Inc. / Quick, Draw!**, sob **CC BY 4.0**.
Foram amostrados, deduplicados e normalizados para este experimento. Dados brutos não
são versionados. Fontes primárias consultadas:

- [Quick, Draw! — formatos e bitmaps](https://github.com/googlecreativelab/quickdraw-dataset)
- [Licença dos dados](https://github.com/googlecreativelab/quickdraw-dataset/blob/master/LICENSE)
- [TensorFlow — instalação](https://www.tensorflow.org/install/pip)
- [TensorFlow — operações determinísticas](https://www.tensorflow.org/api_docs/python/tf/config/experimental/enable_op_determinism)
- [Keras — EarlyStopping](https://keras.io/api/callbacks/early_stopping/)
- [TensorFlow.js — importação de Keras](https://www.tensorflow.org/js/tutorials/conversion/import_keras)
- [TensorFlow.js — escritor oficial Keras/HDF5, referência de formato](https://github.com/tensorflow/tfjs/blob/tfjs-v4.22.0/tfjs-converter/python/tensorflowjs/converters/keras_h5_conversion.py)
- [TensorFlow.js — tipos de IO e manifesto](https://github.com/tensorflow/tfjs/blob/tfjs-v4.22.0/tfjs-core/src/io/types.ts)
- [scikit-learn — classification_report](https://scikit-learn.org/1.5/modules/generated/sklearn.metrics.classification_report.html)
