# IAdivinha — checkpoint da Etapa 3

## Escopo

Pipeline de treinamento e exportação local. A interface e o classificador simulado da
Etapa 2 permanecem como estavam. Integração com inferência real fica para a Etapa 4.

## Arquivos criados ou modificados

- `training/iadivinha/common.py`: contrato, manifesto de classes, checksums e configuração determinística.
- `download_quickdraw.py` e `sources.lock.json`: três arquivos oficiais, cache e hashes fixados.
- `prepare_dataset.py`: amostragem, normalização, splits estratificados e proteção contra duplicatas exatas.
- `train_models.py`: MLP e CNN, checkpoint de menor perda de validação e early stopping.
- `evaluate_models.py`: seleção pela validação, avaliação do teste e geração de gráficos.
- `export_tfjs.py` e `validate_tfjs.mjs`: exportação restrita de topologia/pesos e paridade Python/TF.js.
- `run_pipeline.py`: execução completa ou smoke em diretórios separados.
- `test_pipeline.py`: testes de contratos, isolamento, métricas e reprodutibilidade dos dados.
- `requirements.txt`, `requirements-windows.lock.txt` e `README.md`: ambiente e reprodução.
- `.gitignore`: dados e execuções intermediárias fora do versionamento.
- `README.md` da raiz e este checkpoint: documentação da etapa.
- `public/models/iadivinha/model.json`, `weights.bin`, `metrics.json` e `preprocessing.json`:
  CNN selecionada, métricas reais e contrato de entrada; `classes.json` existente preservado.
- `docs/iadivinha/training/full/`: curvas e matrizes de ambas as redes, métricas, histórico e paridade.
- `docs/iadivinha/training/smoke/`: evidências reduzidas e verificação de reprodução.

Os caminhos abreviados acima pertencem a `training/iadivinha/`.
As mudanças não commitadas das Etapas 1 e 2 foram preservadas.

## Decisões e evidências dos dados

10.000 bitmaps por classe, seed 42, 24.000 treino / 3.000 validação / 3.000 teste.
Entrada `float32 [28,28,1]`, fundo 0, tinta 1, normalizada por 255. Usa-se a centralização
dos bitmaps oficiais sem recorte adicional. `classes.json` continua definindo a ordem.

Auditoria da amostra real confirmou 30.000 hashes de pixels distintos, faixa [0,1] e
contagens estratificadas corretas. Nenhum candidato vazio ou duplicado precisou ser
excluído nesta seed; os bloqueios também foram testados com dados artificiais.
Checksums dos arquivos oficiais e índices de origem permitem reconstruir a seleção.

Cada rede usa Adam 0,001 e batch 128, no máximo 15 épocas, paciência 3 na perda de
validação e restauração explícita do checkpoint de menor perda. O vencedor é definido
por macro-F1 de validação antes de avaliar o teste; empate usa acurácia e tamanho.

## Validação e resultados

**Treinamento completo executado localmente em 09/09/2026**, em CPU, Python 3.12.14,
TensorFlow/TF-Keras 2.19.0, NumPy 1.26.4. Exportação conferida com TensorFlow.js 4.22.0,
Node 24.19.0, backend CPU. Não foram fabricadas métricas nem usados resultados de smoke como finais.

| Modelo | Parâmetros | Macro-F1 validação | Acurácia teste | Macro-F1 teste | Épocas executadas / checkpoint | TF.js (topologia + pesos) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| MLP | 108.931 | 0,9065 | 91,77% | 0,9178 | 7 / 4 | 441.780 bytes |
| **CNN selecionada** | **121.475** | **0,9500** | **95,23%** | **0,9523** | **12 / 9** | **496.354 bytes** |

A CNN venceu pelo macro-F1 de validação, sem usar o teste na escolha. No teste houve
247 erros da MLP e 143 da CNN, cada uma avaliada nas mesmas 3.000 imagens (1.000 por classe).
Precisão, recall, F1 por classe e matrizes completas estão no [JSON de métricas](iadivinha/training/full/metrics.json).
Maior confusão da CNN: 51 patos previstos como gatos. Os tempos observados de treino foram
7,76 s para a MLP e 147,14 s para a CNN; houve tarefas concorrentes, portanto não são um
benchmark controlado nem uma medida de latência de inferência.

- **9 testes Python aprovados**: splits reproduzíveis/disjuntos, normalização e orientação,
  duplicatas/vazios, checksums, preservação de execuções, métricas, seleção sem teste e bloqueio de publicação do smoke.
- **27 testes JavaScript aprovados**; **lint aprovado** no escopo configurado da aplicação.
- Smoke completo com 300 imagens e 2 épocas: download/cache, preparação, treino de ambas as redes,
  avaliação, gráficos, exportação e paridade aprovados.
- Uma segunda execução do smoke reproduziu exatamente o SHA256 do dataset e dos pesos das duas redes.
  Evidência: [reproducibility.json](iadivinha/training/smoke/reproducibility.json).
- Paridade do experimento completo: **32 entradas por modelo × 3 execuções**; mesmo argmax,
  soma de probabilidades válida, entrada/saída corretas, sem crescimento de tensores.
  Maior diferença absoluta: **1,1921 × 10⁻⁷**, abaixo da tolerância de 10⁻⁴.
- `pip check`: nenhuma dependência quebrada. Compilação sintática Python e verificação
  de whitespace aprovadas. Dados brutos, HDF5, fixtures e ambientes virtuais ignorados pelo Git.
- **Build de produção aprovado**: 3.745 módulos, 49,62 s. Chunk JS da feature 22,53 kB
  (7,90 kB gzip), CSS 17,29 kB (4,57 kB gzip), iguais à Etapa 2. Pesos exportados são
  arquivos estáticos disponíveis para a integração futura; não foram importados no jogo.

Os quatro gráficos foram abertos e conferidos visualmente, com eixos/rótulos legíveis:
[curvas CNN](iadivinha/training/full/cnn-curves.png),
[matriz CNN](iadivinha/training/full/cnn-confusion.png),
[curvas MLP](iadivinha/training/full/mlp-curves.png) e
[matriz MLP](iadivinha/training/full/mlp-confusion.png).
Não há nova interface nem novas capturas do jogo nesta etapa.

## Comandos executados

Ambiente virtual criado com o runtime Python 3.12 disponibilizado pelo Codex.
Para recriar em outra máquina, usar o Python 3.12 conforme o guia de treinamento.

```powershell
& 'C:/Users/matff/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe' -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r training/iadivinha/requirements.txt
.\.venv\Scripts\python.exe -m pip check
.\.venv\Scripts\python.exe -m pip freeze
.\.venv\Scripts\python.exe -m unittest discover -s training/iadivinha -p 'test_*.py' -v
.\.venv\Scripts\python.exe training/iadivinha/download_quickdraw.py
.\.venv\Scripts\python.exe training/iadivinha/prepare_dataset.py
.\.venv\Scripts\python.exe training/iadivinha/run_pipeline.py --smoke
.\.venv\Scripts\python.exe training/iadivinha/run_pipeline.py
.\.venv\Scripts\python.exe training/iadivinha/run_pipeline.py --smoke --run-dir training/iadivinha/runs/smoke-repeat
npm test
npm run lint
npm run build
git diff --check
git check-ignore training/iadivinha/data/raw/cat.npy training/iadivinha/runs/full/dataset.npz .venv/Scripts/python.exe
```

O orquestrador executou `train_models.py`, `evaluate_models.py` e `export_tfjs.py`, que por sua vez
executou `node training/iadivinha/validate_tfjs.mjs` em cada diretório de execução.
Também foram comparados os hashes dos dois smoke tests e auditadas as 30.000 imagens do dataset completo.
Na correção do ambiente, os pacotes iniciais `tensorflow-intel`, `tensorflow` e `tf-keras`
2.16 foram removidos somente de `.venv` antes da instalação das versões finais.

## Erros encontrados durante a preparação

- A primeira chamada dos testes Python ocorreu enquanto a instalação ainda estava em curso;
  faltava matplotlib. Após a instalação, os oito testes passaram.
- O primeiro smoke test com TF-Keras 2.16 falhou antes de treinar por `randint` com limite
  float no Python 3.12. O ambiente isolado foi ajustado para TensorFlow/TF-Keras 2.19,
  versão com correção registrada nas [notas oficiais](https://github.com/keras-team/tf-keras/releases/tag/v2.19.0).
- TensorFlow emitiu avisos de APIs legadas/HDF5 e uma mensagem sobre o atributo
  `use_unbounded_threadpool`, explicitamente ignorado pelo runtime. As execuções terminaram
  com código 0; reprodução e paridade numérica passaram. HDF5 foi mantido intencionalmente
  como artefato intermediário local. Nenhuma dependência npm foi adicionada ou atualizada.

## Limitações e riscos

Uma seed e um split do Quick, Draw! não medem a qualidade no canvas do jogo.
Não há teste por autor nem garantia contra desenhos apenas semelhantes. Ainda será necessário
validar espessura, recorte, centralização, inversão e escala na Etapa 4.
Paridade Node/TF.js não substitui testes do backend WebGL e latência em navegadores reais.

O escritor TF.js é restrito às camadas das duas redes, não um conversor geral de Keras.
Pesos, gráficos e métricas do experimento são evidências locais; não houve commit, push ou deploy.

## Próxima etapa proposta

Etapa 4, somente após aprovação: carregar o modelo exportado no navegador com estados de
carregamento/erro; implementar e verificar pré-processamento compatível com os bitmaps de
treino; substituir o simulador; mapear saídas pelo manifesto; assegurar que só a imagem
entra no modelo; medir latência e testar desenhos reais e partidas completas.

Reprodução e fontes: [guia do treinamento](../training/iadivinha/README.md).
