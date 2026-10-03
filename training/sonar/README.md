# Sonar — dados, treinamento e modelo oficial

Checkpoint atual: **Etapa 05**. Menu em `/sonar`, missão de cinco exemplos do teste já avaliado em `/sonar/missao` e SonarLab em `/sonar/lab`. A missão usa somente o modelo oficial, preserva o rótulo até a revelação e envia o mesmo trace ao laboratório. Experimentos continuam restritos ao desenvolvimento. Modelo oficial **60 → 16 → 2**, 1.010 parâmetros; teste congelado: 32/42 acertos, acurácia 76,19%, macro-F1 75,69%. O placar de uma missão não substitui essas métricas. Interface e verificação: [Etapa 05](../../docs/sonar-etapa-5.md); fórmulas e treinamento interativo: [Etapa 04](../../docs/sonar-etapa-4.md).

## Reprodução

Na raiz do repositório, com uma versão de Node compatível com o Vite (`^20.19.0 || >=22.12.0`):

```bash
npm ci
npm run check:sonar
npm run verify:sonar
npm run test:sonar
npm test
npm run lint
npm run build
```

Dados, manifestos, pesos e avaliação oficial estão versionados. `check:sonar`, `verify:sonar` e os testes são offline; os testes do loader injetam o transporte usando os arquivos reais. A preparação dos dados usa módulos nativos do Node e módulos puros do projeto, sem TensorFlow.js, Python ou React; o treinamento usa TensorFlow.js 4.22.0 já instalado no projeto.

## Treinamento e conclusão congelada

Configuração previamente registrada em [config.json](config.json): CPU, Adam 0,001, batches de 16, 200 épocas fixas, sem early stopping. Candidatos 60→2 (baseline), 60→16→2 e 60→16→8→2. CV em cinco folds do desenvolvimento, com seeds 4200–4204; seleção pela macro-F1 média entre MLPs, favorecendo simplicidade em empate até 0,0001. Treino final nos 166 exemplos, seed 4242. Detalhes e métricas: [Etapa 03](../../docs/sonar-etapa-3.md).

Para reproduzir CV, repetição controlada e treino final, usando apenas desenvolvimento:

```bash
npm run train:sonar -- --run=reproducao-01
```

Os resultados ficam em `training/sonar/runs/reproducao-01/`, ignorado pelo Git. Esse comando não avalia o teste nem substitui o oficial. Configuração, ambiente e hashes do código são salvos antes do treino. Um diretório concluído é reutilizado; um incompleto deve ser preservado, usando outro nome para uma reprodução.

A execução original usou `npm run train:sonar` (diretório `official-v1`), depois `npm run evaluate:sonar`. A avaliação única foi salva antes da exportação. Agora `evaluate:sonar` verifica o registro versionado e termina sem novas previsões, inclusive em uma cópia nova sem diretórios locais de treino. Se os artefatos ou a configuração divergirem, falha sem avaliar novamente. Não remover a conclusão ou a reivindicação exclusiva de tentativa para refazer o teste.

[Manifesto oficial](../../public/models/sonar/official/manifest.json): topologia `model.json`, `weights.bin`, configuração, partições, proveniência, métricas, avaliação, históricos, registro, reprodutibilidade e fixtures de paridade. O manifesto inclui SHA-256/tamanho dos 12 arquivos e é escrito por último. O exportador é somente local e não sobrescreve artefatos divergentes.

`verify:sonar` valida os hashes e recalcula métricas a partir dos 498 registros de CV e 42 registros de teste já salvos, sem novas previsões de teste. Carrega os pesos reais e verifica as 166 fixtures do desenvolvimento. A paridade e a repetição selecionada tiveram diferença máxima zero neste CPU, com tolerância declarada de 10⁻⁵; não se promete igualdade bit a bit entre backends.

Sem npm no PATH:

```bash
node training/sonar/run-experiment.mjs --run=reproducao-01
node training/sonar/evaluate-final.mjs
node training/sonar/verify-official.mjs
node --test tests/sonar-*.test.js
```

O serviço `loadOfficialSonar()` em `src/features/sonar/lib/model/sonarArtifacts.js` retorna um predictor oficial com `predict(features, { signal, trace })` e `dispose()`. O vetor tem exatamente 60 números; rótulos ficam fora da inferência. `createSonarLabTrainer()` fixa o treino/validação do laboratório (133/33), retorna um predictor experimental e não altera o oficial. Estados, cancelamento cooperativo, concorrência, propriedade dos recursos e trace estão descritos no checkpoint.

## Preparação dos dados

Para obter novamente o original da UCI e conferir sua integridade:

```bash
npm run prepare:sonar -- --download
```

Para gerar manifestos ausentes a partir do original local:

```bash
npm run prepare:sonar
```

Sem npm no PATH, a preparação e os testes focados também podem ser executados diretamente:

```bash
node training/sonar/prepare-data.mjs --download
node training/sonar/prepare-data.mjs --check
node --test tests/sonar-data.test.js
```

No ambiente Windows usado neste checkpoint, npm já estava instalado, mas fora do PATH. Foi invocado com `node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js"`, seguido de `ci`, `test` ou `run <comando>`. Não foi instalado outro gerenciador nem alterado o PATH permanente.

`--download` confere status HTTP, tamanho e SHA-256 antes de salvar. Um original local divergente causa erro e é preservado. Sem `--download`, a execução é totalmente offline. `--check` não escreve arquivos e compara os JSONs com a reprodução determinística. Preparações repetidas são idempotentes; um manifesto existente divergente causa erro em vez de substituir os IDs. Investigue diferenças antes de alterar o protocolo: não apague/recrie partições para procurar resultados melhores.

## Fonte e integridade

- [UCI — Connectionist Bench (Sonar, Mines vs. Rocks)](https://archive.ics.uci.edu/dataset/151/connectionist+bench+sonar+mines+vs+rocks), DOI [10.24432/C5T01Q](https://doi.org/10.24432/C5T01Q).
- Atribuição: Sejnowski, T. & Gorman, R. (1988). *Connectionist Bench (Sonar, Mines vs. Rocks)* [Dataset]. UCI Machine Learning Repository.
- Licença informada pela UCI: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- [Lock da fonte](source.lock.json): URL oficial, aquisição, atribuição, licença, tamanho e hash esperados.
- [Original preservado](../../public/data/sonar/sonar.all-data): 87.776 bytes, sem cabeçalho, sem conversão para CSV e sem alteração das quebras de linha.
- SHA-256: `e90434cdbf00fcf93ffa911fe447ae25606979658e60f1d32e155c3b5240234d`.
- [Proveniência](../../public/data/sonar/provenance.json): ordem dos atributos/classes, semântica, política de IDs, transformações e validação efetiva.
- [Partições](../../public/data/sonar/partitions.json): todos os IDs de desenvolvimento, teste, folds e laboratório; seeds, algoritmo e contagens.

O `.gitattributes` preserva os bytes do original e fixa LF nos JSONs gerados, inclusive em checkouts Windows. A lista `transformations` é vazia: os valores originais `[0,1]` são usados diretamente. Parsing numérico não arredonda e não ajusta parâmetros sobre os dados.

## Contrato e uso pelos próximos módulos

```js
import { parseSonar, selectSonarSamples, toSonarFeatureMatrix } from '../../src/features/sonar/lib/data/sonarDataset.js';
import { validateSonarPartitions } from '../../src/features/sonar/lib/data/sonarManifests.js';

// sourceText = conteúdo do original cujo SHA-256 já foi conferido;
// savedPartitions = JSON persistido; verifiedSha256 = hash dos bytes lidos.
const samples = parseSonar(sourceText);
validateSonarPartitions(samples, savedPartitions, verifiedSha256);
const trainSamples = selectSonarSamples(samples, savedPartitions.folds[0].trainIds);
const xs = toSonarFeatureMatrix(trainSamples); // [N, 60], sem IDs ou rótulos.
```

O snippet ilustra o contrato, não constitui um script autônomo. Resolver os **IDs salvos** ao consumir as partições; não sortear novamente no laboratório ou treinamento. O validador confere o hash informado pelo chamador, que deve ser calculado/verificado sobre o arquivo antes do parsing.

Cada amostra tem `{ id, features, label }`. IDs vão de `sonar-0001` a `sonar-0208` na ordem original, vinculados ao hash do corpus. `features[0]` é `Attribute1`/coluna 1 e `features[59]` é `Attribute60`/coluna 60; a coluna 61 é o rótulo. `sonarLabelIndex('R') = 0`, `sonarLabelIndex('M') = 1`.

`toSonarFeatureVector` e `toSonarFeatureMatrix` leem exclusivamente `features` e devolvem cópias numéricas. Os testes verificam isso inclusive com getters de `label`/`id` que lançam erro. A preparação de entradas e a inferência real estão testadas; o classificador recebe somente o vetor numérico.

O parser aceita LF/CRLF/CR e um terminador final; linhas vazias extras, dimensões incorretas, valores ausentes/não finitos/fora da faixa e rótulos inválidos causam erro com localização. O validador do corpus exige 208 registros e as contagens de classes esperadas. Nenhuma linha é removida ou imputada.

## Protocolo congelado dos dados

| Divisão | Rocha | Metal | Total |
| --- | ---: | ---: | ---: |
| Corpus | 97 | 111 | 208 |
| Desenvolvimento | 77 | 89 | 166 |
| Teste reservado | 20 | 22 | 42 |
| Laboratório — treino | 62 | 71 | 133 |
| Laboratório — validação | 15 | 18 | 33 |

Algoritmo `sonar-evaluation-v1`: Mulberry32 com seed inteira de 32 bits, Fisher–Yates por classe na ordem R/M, IDs ordenados antes do sorteio. Seeds: **42** teste, **43** folds, **44** laboratório. Os IDs de saída são armazenados em ordem crescente, não como ordem de mini-batches.

Para holdout, arredondar `N × proporção` globalmente e distribuir o total entre classes por maiores restos proporcionais (empate favorece R). Isso produz 42 exemplos de teste, em vez de arredondar cada classe isoladamente. A validação do laboratório usa a mesma regra sobre os 166 exemplos do desenvolvimento, produzindo 33 exemplos.

Na CV, embaralhar cada classe e distribuir em rodízio por cinco folds, mantendo o cursor entre classes. Isso equilibra o tamanho total e as contagens de cada classe, com diferença máxima de um exemplo.

| Fold | Treino R/M/total | Validação R/M/total |
| --- | --- | --- |
| 1 | 61 / 71 / 132 | 16 / 18 / 34 |
| 2 | 61 / 72 / 133 | 16 / 17 / 33 |
| 3 | 62 / 71 / 133 | 15 / 18 / 33 |
| 4 | 62 / 71 / 133 | 15 / 18 / 33 |
| 5 | 62 / 71 / 133 | 15 / 18 / 33 |

Cada exemplo do desenvolvimento aparece na validação de exatamente um fold. A divisão interativa do laboratório cobre o mesmo desenvolvimento; é um experimento separado e não um sexto fold. Sobreposição entre treino de folds diferentes é esperada. O teste não aparece em nenhum fold ou partição de laboratório.

A Etapa 03 comparou os três candidatos exclusivamente na CV do desenvolvimento. Orçamento, seeds e seleção foram registrados antes dos resultados, com checkpoint fixo na época 200. O oficial foi treinado em todo o desenvolvimento e avaliado uma vez no teste reservado. Se houver transformação aprendida em um protocolo futuro, seu ajuste deve ficar restrito ao treino de cada divisão.

## Duplicatas e limites

A auditoria encontrou **zero grupos de registros repetidos, zero grupos de vetores iguais e zero conflitos de rótulo**. Compara números, de modo que representações decimais equivalentes também contam como duplicatas. Se uma fonte futura contiver vetores repetidos, a geração de partições para e exige uma política revisada; não remove exemplos nem permite que cópias sejam distribuídas silenciosamente entre treino e teste.

Os atributos são energias integradas, não áudio completo; “Metal” corresponde ao cilindro da classe M. Não há ângulos físicos ou identificação de novos objetos em `sonar.all-data`. O [arquivo descritivo oficial](https://archive.ics.uci.edu/ml/machine-learning-databases/undocumented/connectionist-bench/sonar/sonar.names) discute diferenças entre protocolos por ângulo, sem fornecer ângulos exatos. Aqui foi implementado o protocolo estratificado por linha solicitado, sem alegar replicar o experimento original ou provar generalização a novos objetos/condições.

Resultados do modelo e contratos: [Etapa 03](../../docs/sonar-etapa-3.md). Interface e matemática: [Etapa 04](../../docs/sonar-etapa-4.md). Menu/missão: [Etapa 05](../../docs/sonar-etapa-5.md). Auditoria e limites finais: [Etapa 06](../../docs/sonar-etapa-6.md). Histórico da preparação: [Etapa 02](../../docs/sonar-etapa-2.md). Material de apresentação: [guia para o professor](../../docs/sonar-guia-professor.md).

## Exemplo matemático reproduzível

`npm run explain:sonar` carrega os pesos congelados em CPU e explica `sonar-0001`, do desenvolvimento. Confere os hashes, faz uma única previsão feature-only com trace, acrescenta o rótulo depois para cross-entropy/gradiente e libera seus tensores. Não treina, não faz novas previsões de teste nem altera o oficial. É possível escolher outro ID **de desenvolvimento** com `--id=sonar-0002`; IDs de teste ou desconhecidos são recusados.

```sh
npm run explain:sonar
npm run explain:sonar -- --id=sonar-0001 --save
```

`--save` grava somente [docs/sonar/etapa-6-exemplo.json](../../docs/sonar/etapa-6-exemplo.json), contendo vetores, pesos, ativações e produtos completos para conferir o exemplo do guia. É uma evidência didática separada, não um novo artefato oficial ou resultado de avaliação.
