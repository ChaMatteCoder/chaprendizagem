# Sonar ou Azar? + SonarLab — checkpoint da Etapa 03

Data: 30 de setembro de 2026. Núcleo MLP, treinamento real, inferência e artefatos concluídos. Continuação dos [dados e protocolo da Etapa 02](sonar-etapa-2.md). A interface do SonarLab será construída na Etapa 04.

## Modelo e configuração registrada

O modelo oficial é **60 → 16 → 2**, com uma camada oculta Dense/ReLU de 16 neurônios e saída Dense/Softmax de duas classes: índice 0 = Rocha/R, índice 1 = Metal/M. São **1.010 parâmetros**: `60×16+16 + 16×2+2`. Os 60 atributos mantêm os valores originais `[0,1]`, sem transformação aprendida. TensorFlow.js executa retropropagação e Adam; não existe classificador fictício de contingência.

A [configuração](../training/sonar/config.json) foi persistida antes dos resultados, junto com hashes do código, ambiente e horário no [registro distribuído](../public/models/sonar/official/registration.json). SHA-256 da configuração: `5307c4637c81ad40a4706c7e1a4a21e0c30d1a7f3d8e07613ad3b33a3db227a9`.

| Parâmetro | Valor efetivo |
| --- | --- |
| Motor / backend | TensorFlow.js 4.22.0 / CPU |
| Ambiente do experimento | Node v24.21.0, Windows x64 |
| Épocas / mini-batch | 200 / 16, incluindo lote final menor |
| Otimizador | Adam, taxa 0,001; β₁ 0,9; β₂ 0,999; ε 10⁻⁷ |
| Perda | `categoricalCrossentropy`, rótulos one-hot R=0/M=1 |
| Inicialização | GlorotUniform com seed por camada; biases zero |
| Seeds dos folds | 4200, 4201, 4202, 4203, 4204, iguais entre candidatos |
| Seed final | 4242 |
| Embaralhamento | Mulberry32(seed + índice da época), Fisher–Yates; `fit` sem shuffle interno |
| Checkpoint | Última época do orçamento fixo; sem early stopping |

As partições da Etapa 02 foram reutilizadas por ID: desenvolvimento 166; teste reservado 42; cinco folds estratificados somente no desenvolvimento. Não houve ajuste de época, hiperparâmetros ou arquitetura a partir do teste.

## Comparação medida no desenvolvimento

| Candidato | Parâmetros | Macro-F1 média ± DP | Acurácia média ± DP |
| --- | ---: | ---: | ---: |
| Baseline linear 60 → 2 | 122 | 73,95% ± 1,48 p.p. | 74,69% ± 1,81 p.p. |
| **MLP 60 → 16 → 2** | **1.010** | **77,97% ± 7,09 p.p.** | **78,32% ± 7,18 p.p.** |
| MLP 60 → 16 → 8 → 2 | 1.130 | 77,31% ± 4,46 p.p. | 77,74% ± 4,39 p.p. |

Médias aritméticas dos cinco folds; DP amostral com divisor `n−1`, sem interpretação como intervalo de confiança. Resultados por fold, probabilidades e matrizes estão em [metrics.json](../public/models/sonar/official/metrics.json).

O critério previamente registrado escolhe a maior macro-F1 média entre as MLPs, com tolerância de empate `0,0001`; dentro dela, prefere menos parâmetros e depois a ordem dos candidatos. A baseline é reportada integralmente, mas o oficial deve cumprir o requisito acadêmico de camada oculta. Neste experimento, a MLP de 16 neurônios também superou a baseline. A diferença entre as duas MLPs é pequena e a variabilidade dos folds não sustenta uma alegação de superioridade geral.

Foram realizados **17 treinamentos completos**: 15 na CV (3 candidatos × 5 folds), uma repetição do fold 1 selecionado para verificar reprodutibilidade e um treinamento final nos 166 exemplos do desenvolvimento. O experimento durou aproximadamente 74,07 segundos neste ambiente, incluindo essas verificações; isso não é uma estimativa de desempenho no navegador.

## Avaliação final congelada

O oficial foi treinado por 200 épocas em todo o desenvolvimento, sem validação para escolher checkpoint. Em seguida, foi avaliado **uma vez** nos 42 IDs reservados. A conclusão e as probabilidades reais foram salvas antes da exportação, sem ajustes posteriores.

| Métrica de teste | Resultado |
| --- | ---: |
| Acertos / total | 32 / 42 |
| Acurácia | 76,19% |
| Macro-F1 | 75,69% |
| Cross-entropy média | 0,394607604 |

Matriz de confusão: linhas = classe verdadeira; colunas = classe prevista.

| Verdadeiro / Previsto | Rocha | Metal |
| --- | ---: | ---: |
| Rocha | 13 | 7 |
| Metal | 3 | 19 |

| Classe | Suporte | Precisão | Recall | F1 |
| --- | ---: | ---: | ---: | ---: |
| Rocha | 20 | 81,25% | 65,00% | 72,22% |
| Metal | 22 | 73,08% | 86,36% | 79,17% |

A cross-entropy usa `tf.metrics.categoricalCrossentropy`, float32 e o clipping numérico da biblioteca. Precisão, recall e F1 usam zero quando o denominador é zero e sinalizam a métrica afetada; não ocorreu esse caso no teste final.

Nos mesmos 166 exemplos usados para o treino final, a acurácia de ressubstituição foi 95,78% e macro-F1 95,76%. São medidas de ajuste ao treino, não estimativas de generalização.

## Artefatos e reprodução

Diretório distribuído: [public/models/sonar/official](../public/models/sonar/official/manifest.json). Identidade: `sonar-mlp-16-8a825d3f32f9`; a arquitetura continua sendo **60 → 16 → 2** — o sufixo identifica o hash dos pesos.

| Arquivo | Conteúdo |
| --- | --- |
| `manifest.json` | Identidade, arquitetura, classes, protocolo, conclusão e SHA-256/tamanho dos 12 arquivos |
| `model.json`, `weights.bin` | Topologia TensorFlow.js e pesos finais reais, sem slots do Adam |
| `metrics.json`, `evaluation.json` | CV, ajuste final, teste congelado e previsões registradas |
| `history.json` | Loss/acurácia por época de todos os folds e do treino final |
| `config.json`, `registration.json` | Configuração anterior aos resultados, ambiente e hashes do código |
| `partitions.json`, `provenance.json` | IDs persistidos, origem e contrato dos dados |
| `reproducibility.json` | Repetição selecionada: diferença máxima zero em probabilidades e históricos |
| `parity-fixtures.json`, `validation.json` | Paridade nas 166 amostras de desenvolvimento, tolerância e memória |

Na raiz, após instalar as dependências:

```bash
npm run check:sonar
npm run verify:sonar
npm run test:sonar
npm test
npm run lint
npm run build
```

Para reproduzir o experimento somente no desenvolvimento, preservando o oficial:

```bash
npm run train:sonar -- --run=reproducao-01
```

Esse comando faz CV, repetição selecionada, treino final e paridade; **não avalia o teste**. Os resultados locais ficam em `training/sonar/runs/reproducao-01/`, ignorado pelo Git. Um diretório concluído é reutilizado sem treino; um registro incompleto exige outro nome, preservando a execução anterior.

O fluxo original foi `npm run train:sonar`, seguido de `npm run evaluate:sonar`. Agora, `evaluate:sonar` verifica a conclusão versionada e termina sem novas previsões de teste, mesmo em uma cópia nova sem arquivos locais de execução. Configuração ou artefatos divergentes causam erro. Antes da primeira avaliação, a reivindicação exclusiva `evaluation-attempt.json` impede repetição silenciosa de uma tentativa interrompida. Não remover os registros para procurar um resultado melhor.

O exportador preserva arquivos existentes e escreve `manifest.json` por último. As rotinas não publicam o site. Comandos diretos equivalentes e particularidades do npm no Windows estão no [guia de reprodução](../training/sonar/README.md).

## Contratos para a interface

`loadOfficialSonar()` carrega o manifesto local, confere SHA-256/tamanho da topologia e pesos, ordem R/M, dimensões e Dense/ReLU/Softmax. Retorna um serviço que possui o modelo e deve receber `dispose()` ao sair. Falhas de carregamento, contrato ou inferência são erros explícitos, sem previsões fabricadas.

`predict(features, { signal, trace })` recebe um array de exatamente 60 números finitos em `[0,1]`. Retorna duas probabilidades, índice/rótulo do argmax, ordem das classes, identidade e tipo do modelo. Nenhum rótulo, ID de amostra ou placar entra no classificador. A soma das probabilidades é validada com tolerância `10⁻⁵`; empate favorece R.

Com `trace: true`, retorna os pesos e biases reais, entradas, `z = aW+b`, ativações ReLU, logits finais e Softmax, com kernel na orientação `[entrada, saída]`. O trace deve reproduzir a inferência dentro da tolerância, não altera pesos e não inclui loss ou rótulo verdadeiro. É uma inspeção da computação, sem alegação de explicação causal do fenômeno físico.

`createSonarTrainer(tf)` impede treinos Sonar concorrentes no mesmo contexto JavaScript, faz cópias das entradas antes de aguardar e disponibiliza estados `idle/loading/training/completed/cancelled/error`. Cada execução recebe `runId`; eventos incluem esse identificador. `cancel()`, `dispose()` e `AbortSignal` interrompem cooperativamente, suprimem eventos tardios e descartam modelos parciais. Só um orçamento concluído transfere um modelo ao chamador.

O treinamento usa `yieldEvery: 'batch'` e checa cancelamento entre lotes; o teste confirmou que um timer do event loop executa durante o treino. A interface da Etapa 04 ainda deverá conferir o desempenho nos navegadores e ignorar eventos de `runId` anteriores ao atualizar a tela. Não há garantia de latência máxima por lote ou medições mobile nesta etapa.

`createSonarLabTrainer(tf, samples, partitions, verifiedDatasetSha256)` fixa os 133 exemplos de treino e 33 de validação do laboratório, exclusivamente no desenvolvimento. Um treino concluído retorna um predictor `experimental`, com identidade própria. Ele não escreve artefatos oficiais. A inferência oficial permanece ligada aos pesos congelados.

## Verificação e limites

**90 testes passaram**, incluindo 19 dos dados, 15 do núcleo MLP e três novos testes de integração dos artefatos oficiais; os 53 testes anteriores também passaram. Lint sem avisos e build de produção concluído em 43,59 segundos. Cobertura relevante: Softmax com logits extremos, dimensão/faixa inválidas, argmax, independência do rótulo, pesos realmente atualizados, cancelamento/concorrência/reinício, callbacks com erro, respostas antigas, descarte de modelos/tensores/Adam, trace e paridade exportação/importação. O loader foi exercitado com os arquivos oficiais reais; o transporte HTTP foi injetado, sem construir a interface nesta etapa.

`verify:sonar` conferiu os 12 hashes/tamanhos do manifesto, 498 registros da CV e 42 registros já salvos do teste. Executou 166 inferências novas **somente no desenvolvimento**, com diferença máxima zero e argmax idêntico às fixtures. Não repetiu avaliação do teste. A repetição controlada do fold 1 também produziu diferença zero nas probabilidades e no histórico, neste backend CPU.

Os 13 arquivos oficiais (incluindo o manifesto) e os três arquivos dos dados foram comparados byte a byte com a saída do build: todos os **16 permaneceram idênticos**. Os hashes do código de treinamento continuaram iguais ao registro anterior aos resultados. O lockfile de dependências não foi alterado, e `git diff --check` passou. Foram verificados os 30 links locais nos quatro documentos atualizados.

Determinismo foi verificado no ambiente registrado. Outros backends, versões, dispositivos ou implementações de kernels podem produzir diferenças em float32; não se promete igualdade bit a bit entre CPU, WebGL e WebGPU. Os testes de memória verificam a contagem de tensores do TensorFlow.js; não constituem um perfil completo de RAM/GPU.

A base é pequena, com apenas 42 exemplos no teste e folds de 33/34. A divisão estratificada por linha não comprova independência entre objetos ou ângulos de aquisição, que não estão identificados no arquivo. As probabilidades Softmax não foram calibradas. O teste já está avaliado e congelado: futuros placares de missões nessas amostras serão demonstrações do modelo, não novas estimativas científicas.

Referência do motor: [API oficial TensorFlow.js 4.22.0](https://js.tensorflow.org/api/4.22.0/). Próximo checkpoint: Etapa 04 — SonarLab com dados, treino experimental, previsões e matemática, usando os resultados reais.
