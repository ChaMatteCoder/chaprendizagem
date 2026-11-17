# enGAN.AI — pipeline da DCGAN

Esta pasta prepara o Fashion-MNIST e treina uma DCGAN incondicional em PyTorch. Os registros de treinamento têm `runtime: pytorch` e `browserReady: false`. A exportação ONNX da etapa 04 (`export_onnx.py`) publica ao lado deles o manifesto e os modelos usados pelo navegador. Veja [Exportação ONNX](#exportação-onnx-etapa-04).

## Ambiente reproduzível

Execução verificada em Python 3.12, PyTorch CPU e Linux. O ambiente é privado deste módulo e não altera o Python do sistema. Com `uv`:

```bash
uv venv --python 3.12 training/enganai/.venv
uv pip install --python training/enganai/.venv/bin/python \
  --extra-index-url https://download.pytorch.org/whl/cpu \
  -r training/enganai/requirements.lock.txt
```

O arquivo `requirements.lock.txt` registra todas as versões instaladas; `requirements.txt` contém as dependências diretas. Para outro ambiente, uma instalação nova a partir das dependências diretas também é possível, mas não promete igualdade bit a bit. O PyTorch documenta os limites de reprodução entre versões e plataformas em [Reproducibility](https://docs.pytorch.org/docs/2.15/notes/randomness.html).

## Preparar e verificar dados

```bash
npm run prepare:enganai
npm run check:enganai
```

O download usa o repositório oficial [Fashion-MNIST](https://github.com/zalandoresearch/fashion-mnist), fixado no commit `b2617bb6d3ffa2e429640350f613e3291e10b141`. Os quatro arquivos gzip são conferidos contra os MD5 publicados pelos autores. O manifesto local registra também SHA-256, bytes, URL e identidade dos arrays decodificados. O parser IDX rejeita dimensões, contagens e comprimentos inesperados. A licença acompanha a publicação.

Das 60 mil imagens oficiais de treino, cada classe contribui com 500 registros para desenvolvimento e 500 para a arena. As 50 mil restantes treinam as redes. A estratificação usa NumPy PCG64 e seed `20261117`; o manifesto salva todos os IDs. As 10 mil imagens oficiais de teste ficam em uma quarta partição intacta. O preparo confere seus bytes, mas o treino e os diagnósticos não as carregam como tensores de avaliação.

Os rótulos de classe servem somente para estratificação e contagem: a GAN não recebe esses rótulos como entrada. Arena e desenvolvimento nunca entram nos lotes de treino.

## Testes e execução

```bash
npm run test:enganai:training
npm run train:enganai:smoke -- --run-id smoke-local-01
npm run train:enganai -- --run-id minha-execucao-01 --publish
```

IDs existentes não são sobrescritos. O smoke usa 1024 registros, uma época e lotes de 64; ele não pode ser publicado. A configuração principal está em `configs/cpu-v2.json`: oito épocas completas, lotes de 128, duas threads, z normal de 64 dimensões e Adam com taxa `0.0002` para ambas as redes, betas `0.5/0.999`. Checkpoints são declarados antes do treino nas épocas 0, 1, 4 e 8. Época 0 é inicialização sem treino. A escolha ativa é a última época predefinida, sem selecionar pela aparência das imagens ou pelo teste.

O Gerador transforma `N × 64 × 1 × 1` em `N × 1 × 28 × 28` com convoluções transpostas, BatchNorm, ReLU e Tanh. O Discriminador usa convoluções e LeakyReLU e retorna `N × 1` logits, sem Sigmoid na arquitetura. Imagens entram como `float32` em `[-1, 1]`.

A atualização de D soma a BCE média dos exemplos reais com a BCE média das imagens sintéticas desconectadas do gradiente de G. A atualização de G usa o objetivo não saturante, com alvo real. Durante essa segunda atualização, D fica em avaliação e com parâmetros congelados, mantendo a derivada em relação à imagem sintética. O modo volta a treino no próximo passo.

A primeira execução, `cpu-baseline-v1` (`configs/cpu-v1.json`), usava BatchNorm em D. As perdas de treino caíram, mas houve forte divergência nos diagnósticos em modo de avaliação. A segunda execução, `cpu-no-batchnorm-v1`, remove essa normalização de D; assim seus logits não dependem da composição do lote nem de estatísticas móveis. G mantém BatchNorm. Os dois experimentos preservam dados, seeds, taxas, lotes e épocas. A comparação é exploratória e está registrada em [Etapa 03](../../docs/enganai/etapa-03/README.md).

A base é o [tutorial DCGAN do PyTorch](https://docs.pytorch.org/tutorials/beginner/dcgan_faces_tutorial.html), adaptada para 28 × 28. A perda é [BCEWithLogitsLoss](https://docs.pytorch.org/docs/2.15/generated/torch.nn.BCEWithLogitsLoss.html), que combina Sigmoid e BCE de forma numericamente estável. Não há suavização de rótulos, aumento de dados ou regularização adicional nesta primeira configuração.

## Artefatos

Execuções locais ficam em `runs/<id>/`, ignoradas pelo Git. Apenas uma execução completa, verificada e sem limitação de dados pode ser copiada com `--publish` para `public/models/enganai/research/<id>/`.

| Arquivo | Evidência |
| --- | --- |
| `run.json` | Ambiente, arquitetura, número real de parâmetros, finalidade, duração e estado |
| `config.json` | Hiperparâmetros efetivos, seeds, cronograma e limite de dados |
| `sources.json`, `split.json` | Origem e integridade dos dados, partições completas |
| `training-record-ids.json` | Registros efetivamente usados no treino |
| `fixed-latents.json` | Dezesseis vetores z completos, comparáveis entre checkpoints |
| `checkpoints/epoch-NNN/` | Pesos separados de G e D, prévias PNG 28 × 28, procedência e hashes |
| `history.json` | Perdas de cada atualização, sem completar ou suavizar valores ausentes |
| `epochs.json` | Médias das perdas ponderadas pelo tamanho do lote e duração de cada época |
| `evaluation-inputs.json`, `evaluation-latents.npy` | IDs e z usados nos diagnósticos, separados do ruído de treino |
| `diagnostics.json` | Diagnóstico de D e diversidade numérica ao fim de cada época |
| `source/` | Cópias identificadas por SHA-256 do código usado na execução |
| `verification.json` | Resultado da recarga dos pesos, reprodução das prévias e conferência dos registros |

O estado nativo de otimizadores/RNG é salvo localmente nos checkpoints e não é publicado. Para retomar uma execução interrompida, mantenha o mesmo ambiente/configuração e acrescente `--resume`:

```bash
npm run train:enganai -- --run-id minha-execucao-01 --resume --publish
```

A retomada restaura G, D, Adam, ruído de treino e permutações NumPy. Usa o último checkpoint completo e descarta registros posteriores a esse ponto. O histórico preserva passos únicos. Snapshots do código de retomada são acrescentados sem substituir os originais. SIGTERM e interrupção por teclado registram estado interrompido; uma execução parcial não é publicada. O tempo retomado exclui o período offline e trabalho parcial descartado, conforme indicado no próprio registro. Um teste compara uma atualização contínua com a retomada e exige igualdade dos pesos, buffers e perdas.

`dataset-split`, `latent-set`, `checkpoint`, `history` e `sample` seguem os schemas v1 da etapa 01. O descritor `pytorch-training-run` é um registro de pesquisa desta etapa, e não um `model-manifest` ONNX fictício. O verificador confere as relações entre esses registros e os arquivos. O `model-manifest` ONNX só é criado pela exportação, depois da paridade verificada.

## Verificar e gerar figuras

```bash
npm run verify:enganai
npm run report:enganai
# Para uma execução diferente:
training/enganai/.venv/bin/python training/enganai/verify.py training/enganai/runs/minha-execucao-01
training/enganai/.venv/bin/python training/enganai/report.py \
  training/enganai/runs/minha-execucao-01 --output docs/enganai/minha-execucao-01
```

A verificação confere bytes/hashes e schemas, disjunção e cobertura das partições, ordem das perdas, passos por época, vetores e procedência. Recarrega G e D, regenera todas as prévias e exige igualdade dos pixels quantizados. Com o cache disponível, recalcula também os diagnósticos finais do desenvolvimento. Sem o cache, informa explicitamente que essa última conferência não foi repetida.

O diagnóstico de acerto de origem usa 512 imagens reais do desenvolvimento e 512 saídas atuais de G, com entradas fixas. Ele depende desse Gerador e não mede qualidade perceptual, cobertura de classes ou detecção geral de imagens de IA. Contagem de imagens quantizadas únicas e desvio de pixels também não provam ausência de colapso de modos. Nenhuma dessas medidas escolhe o checkpoint ativo.

As figuras de `report.py` mostram as primeiras oito entradas fixas, sem escolher as melhores imagens. As perdas são traçadas a partir do registro: cada passo aparece em transparência e as médias ponderadas por época ficam destacadas. A escala das imagens é sempre 0–255, sem normalização individual para melhorar sua aparência.

## Exportação ONNX (etapa 04)

```bash
npm run export:enganai:onnx   # verifica a execução, exporta, mede paridade e publica
npm run verify:enganai:onnx   # valida o pacote publicado e reexporta para comparar bytes
```

`export_onnx.py` executa primeiro `verify.py` sobre a execução. Em seguida exporta G e D de cada checkpoint com `torch.onnx.export` (dynamo, opset 18, lote dinâmico, pesos embutidos) e confere o grafo com `onnx.checker` e uma lista de operações permitidas. Depois compara PyTorch e ONNX Runtime (Python):

- vetores fixos, em lote e um a um;
- vetores de diagnóstico;
- imagens reais de desenvolvimento;
- prévias PNG registradas.

As tolerâncias (`TOLERANCE`) são declaradas no script e repetidas no navegador. A publicação só acontece quando todas as comparações passam. Ela grava, ao lado da execução:

- `model-manifest.json` (contrato v1);
- `onnx-export.json`, com checkpoints, hashes dos pesos de origem, referências, paridade e versões;
- `onnx/`, com redes, saídas de referência do PyTorch, imagens reais de referência e cópia do código.

A exportação é determinística: duas execuções geram os mesmos bytes. A paridade no `onnxruntime-web` é verificada por `npm test` (Node) e `npm run test:enganai:inference-browser` (Chromium). Resultados: [Etapa 04](../../docs/enganai/etapa-04/README.md).

## Conjunto da arena e validação da missão (etapa 05)

```bash
npm run prepare:enganai:arena   # publica public/data/enganai/arena/
npm run verify:enganai:arena    # reconstrói e exige bytes idênticos
```

`arena_pool.py` escolhe 50 imagens por classe da partição `arena` (NumPy PCG64, semente 20261118) e sorteia 64 vetores z com o RNG do manifesto (`pytorch-cpu-normal-v1`, semente 6011). Os rótulos não são publicados, e o teste oficial não é lido. `validate_mission.py` recebe registros produzidos por uma missão (`sample`, `question`, `round-reveal`, `session`, `progress`) e os valida com o validador da etapa 01, junto dos artefatos publicados. O teste `tests/enganai-mission.test.js` usa esse script. Detalhes: [Etapa 05](../../docs/enganai/etapa-05/README.md).
