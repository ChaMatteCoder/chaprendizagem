# Sonar ou Azar? + SonarLab — contexto e plano da Etapa 01

Status: planejamento concluído; implementação funcional ainda não iniciada.
Data: 30 de setembro de 2026. Base inspecionada: commit `bc85c89`.

Este documento registra a proposta para o Trabalho 03 de **Aprendizagem Profunda de Modelos Generativos**: treinar e explicar uma MLP que classifica sinais de sonar como Rocha ou Metal. Missão e laboratório compartilharão os mesmos contratos de dados e inferência.

O pedido desta rodada autoriza somente a Etapa 01 do arquivo fornecido `ProjetoSonar.md`: inspeção, contexto, estrutura proposta, decisões e critérios de aceite. As etapas seguintes orientam o planejamento, mas não estão autorizadas para execução nesta rodada. Nenhuma rota, interface, base, partição ou rede Sonar foi implementada; não existem métricas medidas do Sonar neste checkpoint.

## 1. Inspeção do repositório

A cópia local estava limpa e em HEAD destacado no início. Não foi encontrado `AGENTS.md` na árvore do repositório nem nos diretórios ancestrais consultados. As convenções vêm do [README](../README.md), da [arquitetura](architecture.md) e dos checkpoints existentes em `docs/`. Não houve alteração de módulos anteriores, dependências ou lockfile.

O projeto usa JavaScript ESM e JSX, organizado por `src/features/<modulo>/{pages,components,data,lib}`; módulos recentes também têm `hooks/` e `styles/`. Não há motivo para introduzir TypeScript ou outro framework neste trabalho. Contratos serão documentados com JSDoc e validados em execução.

### Dependências observadas

Versões **resolvidas no lockfile**, que podem diferir dos intervalos declarados no `package.json`:

| Recurso | Versão resolvida | Uso proposto |
| --- | --- | --- |
| React / React DOM | 19.2.6 | Componentes, hooks e estado |
| Vite | 7.3.6 | Desenvolvimento, build e carregamento sob demanda |
| React Router DOM | 7.15.1 | Rotas da missão e do laboratório |
| TensorFlow.js | 4.22.0 | Treinamento, inferência e pesos reais |
| Recharts | 3.8.1 | Perfil dos atributos e curvas de treinamento |
| Lucide React | 0.544.0 | Ícones de navegação e controles |
| ESLint | 9.39.5 | Verificação dos arquivos incluídos em seu escopo |

O `package.json` declara `@tensorflow/tfjs: ^4.22.0`; o pacote não precisa ser acrescentado ou atualizado. Não foram encontradas dependências de KaTeX ou MathJax. Proposta inicial para fórmulas: MathML com descrição textual, conferindo acessibilidade nos navegadores usados na apresentação antes de considerar uma biblioteca adicional.

### Comandos existentes e limites

| Comando | Finalidade e escopo atual |
| --- | --- |
| `npm ci` | Instalar as versões do lockfile em um checkout sem dependências |
| `npm run dev` | Vite em `127.0.0.1`, normalmente porta 5173 |
| `npm test` | `node --test tests/*.test.js` |
| `npm run lint` | IAdivinha, `App.jsx`, `HomePage.jsx` e `ProjectCard.jsx`; não cobre automaticamente novas features |
| `npm run build` | Build de produção com Vite |
| `npm run preview` | Prévia do build pelo Vite |
| `npm run serve:dist` | Servidor local existente para `dist/` |

O ambiente desta inspeção disponibiliza Node 24.19.0, compatível com o requisito do Vite registrado no lockfile (`^20.19.0 || >=22.12.0`). Este worktree não tem `node_modules` e `npm` não foi encontrado no PATH. Isso não bloqueia o planejamento; a preparação do ambiente deve preceder os testes funcionais da Etapa 02. Nenhuma instalação foi necessária para esta alteração documental.

### Reaproveitamento e pontos de atenção

| Origem inspecionada | O que aproveitar | Adaptação necessária |
| --- | --- | --- |
| [App.jsx](../src/app/App.jsx) | `lazy`, `Suspense`, React Router e composição por rota | Hoje somente `/iadivinha` dispensa `Layout`; adicionar futuramente a família `/sonar` com correspondência exata de segmento |
| [HomePage.jsx](../src/pages/HomePage.jsx) e [ProjectCard.jsx](../src/components/ProjectCard.jsx) | Catálogos de projetos e jogos, capas e links | `kind="game"` fixa as tags “Desenho”, “10 segundos”, “IA”; aceitar tags por props mantendo esses defaults para o IAdivinha |
| [createIrisMlpModel.js](../src/features/iris-classification/lib/createIrisMlpModel.js) | Exemplo de camadas densas, ReLU, Softmax, Adam e cross-entropy | Criar fábrica própria para 60 entradas e duas saídas; não importar configuração de Iris |
| [trainIrisModel.js](../src/features/iris-classification/lib/trainIrisModel.js) | Uso da API de treinamento e callbacks | Não reutilizar o protocolo: calcula estatísticas antes do split e usa `test` em `validationData`; Sonar terá teste reservado e validação só no desenvolvimento |
| [loadDrawingModel.js](../src/features/iadivinha/lib/loadDrawingModel.js) e [predictDrawing.js](../src/features/iadivinha/lib/predictDrawing.js) | Import assíncrono, validação do artefato, aborto e descarte após leituras pendentes | Reaplicar o padrão no serviço Sonar; não importar pré-processamento de desenho, catálogo de classes ou classificador simulado |
| [calculateIrisMetrics.js](../src/features/iris-classification/lib/calculateIrisMetrics.js) | Referência para matriz de confusão e métricas por classe | Implementar métricas próprias independentes de Iris, incluindo macro-F1 e política explícita para denominadores zero |
| Recharts e gráficos dos laboratórios | Composição de eixos, legenda e curvas | Componentes Sonar com dados reais; não copiar preenchimentos de histórico vazio com zeros nem estilos específicos de outros módulos |
| `tests/*.test.js` e [validate_tfjs.mjs](../training/iadivinha/validate_tfjs.mjs) | `node:test`, assertivas e comparação de previsões após exportação | Novos testes Sonar, sem alterar os artefatos do IAdivinha |
| `training/` e `public/models/iadivinha/` | Separação entre geração de modelos e artefatos consumidos pelo navegador | Pipeline e diretórios próprios para Sonar |

`MetricCard` e `TheoryBlock` têm markup simples, mas dependem de classes globais. Não são uma dependência obrigatória do SonarLab. O reaproveitamento principal será de bibliotecas e padrões; extrações compartilhadas só se trouxerem benefício concreto sem ampliar o risco de regressão.

## 2. Requisitos fixos

### Dados e rigor acadêmico

- Fonte: **Connectionist Bench (Sonar, Mines vs. Rocks)**, UCI, DOI [10.24432/C5T01Q](https://doi.org/10.24432/C5T01Q). O catálogo oficial informa 208 registros, 60 atributos, 97 exemplos R e 111 M; licença CC BY 4.0. Esses números são expectativas da fonte, ainda não uma validação de arquivo local.
- Cada atributo representa energia em uma banda de frequência integrada em um intervalo de tempo, com valores entre 0 e 1. O vetor não é imagem, posição espacial ou gravação de áudio completa. Não atribuir frequências em Hz que a base não fornece.
- Classes em toda a aplicação e nos artefatos: **índice 0 = Rocha/R; índice 1 = Metal/M**. Explicar que “mine”, na nomenclatura original, corresponde aos cilindros metálicos usados na coleta.
- Entrada da rede: exclusivamente os 60 atributos, sem rótulo, ID, partição, palpite do jogador ou estado da missão.
- MLP com camadas ocultas densas ReLU, saída de dois neurônios Softmax, cross-entropy categórica e aprendizado por retropropagação. `60 → 16 → 8 → 2` é candidata, não arquitetura comprovadamente melhor.
- Teste reservado e estratificado, aproximadamente 20%; cinco folds apenas no desenvolvimento. Nenhum uso do teste para escolher arquitetura, épocas ou hiperparâmetros.
- Primeira versão com os valores originais em `[0,1]`. Qualquer transformação aprendida futura deve ser ajustada somente no treino de cada divisão.
- IDs das partições persistidos, seeds e ambiente registrados, arquivo identificado por SHA-256, métricas e históricos derivados de execução real. Não inventar resultados ou prometer uma acurácia mínima.
- Modelo oficial congelado separado de modelos experimentais. Sem fallback de previsão simulada.

### Produto

- Um núcleo compartilhado por **Sonar ou Azar?**, missão de cinco encontros, e **SonarLab**, laboratório de dados, treinamento, resultados e matemática.
- Missão: cinco exemplos distintos do teste já avaliado; palpite humano antes da previsão da IA; revelação posterior; um ponto por acerto para cada participante. A taxa da partida não é a acurácia científica.
- Antes da revelação, contato visual neutro e ausência de rótulo em texto, asset, alt text, tooltip ou estilo. Loss e gradientes dependentes do rótulo ficam indisponíveis nesse estado.
- Laboratório: experimentos somente no desenvolvimento; curvas vazias antes do treino; estados explícitos de carregamento, treinamento, conclusão, cancelamento e erro.
- Matemática ligada aos pesos e valores reais do modelo inspecionado. Ativações não serão apresentadas como explicação causal ou evidência de que um neurônio “detecta metal”.
- Sem backend obrigatório, login, ranking online, multiplayer, física complexa ou captura de sonar. Dados e modelo podem ser arquivos estáticos; esta demonstração local não protege rótulos contra inspeção do código.

## 3. Estrutura e rotas propostas

Os caminhos abaixo são **planejados**, não arquivos já criados. A implementação deve ocorrer conforme cada etapa for validada.

```text
docs/
  sonar-etapa-1.md                  # Este contexto e plano
  sonar-etapa-2.md ... sonar-etapa-6.md
  sonar/                           # Relatórios e evidências verificadas
src/features/sonar/
  pages/
    SonarHomePage.jsx               # Menu
    SonarMissionPage.jsx            # Missão
    SonarLabPage.jsx                # Seções do laboratório
  components/
    SonarLayout.jsx                 # Navegação própria, outlet e contexto
    EchoProfileChart.jsx            # Compartilhado por missão e laboratório
    TrainingHistoryChart.jsx
    PredictionBars.jsx
    ModelTracePanel.jsx             # Trace do mesmo modelo da previsão
    EncounterScene.jsx              # Ambientação e contato neutro
    MissionScore.jsx
  hooks/
    useSonarModel.js
    useSonarTraining.js
    useSonarMission.js
  data/
    sonarSchema.js                 # Classes, ordem e dimensão dos atributos
  lib/
    data/                          # Parser, validação, PRNG, splits e loaders
    model/                         # Fábrica, treino, inferência, trace e descarte
    evaluation/                    # Matriz de confusão e métricas
    mission/                       # Sequência e reducer, sem dependência React
  styles/
    sonar.css                      # Tokens e seletores locais
    sonarlab.css
training/sonar/
  README.md
  prepare-data.mjs                  # Aquisição e manifestos (Etapa 02)
  run-experiment.mjs                # Comparação no desenvolvimento (Etapa 03)
  evaluate-final.mjs                # Avaliação final registrada
  export-model.mjs                  # Artefatos do modelo escolhido
  config.json                      # Protocolo congelado antes dos resultados
  runs/                            # Temporários; definir ignore na Etapa 03
public/data/sonar/
  sonar.all-data                    # Original preservado
  provenance.json                  # Fonte, atribuição, licença, hash, schema
  partitions.json                  # IDs de desenvolvimento/teste/folds/lab
public/models/sonar/official/
  model.json
  weights.bin
  manifest.json                    # Model ID, hashes, classes e protocolo
  metrics.json                     # CV separada do teste final
  history.json                     # Históricos reais identificados por execução
tests/
  sonar-data.test.js
  sonar-model.test.js
  sonar-math.test.js
  sonar-mission.test.js
```

Os módulos em `lib/` não importam React, componentes, CSS ou DOM. O código de parsing, divisão e métricas deve funcionar tanto em Node quanto no navegador. O acesso ao filesystem fica nos scripts; `fetch` fica em loaders separados. React recebe objetos e arrays, não a responsabilidade de administrar tensores.

| Rota futura | Papel |
| --- | --- |
| `/sonar` | Menu de Sonar ou Azar?, regras e acesso ao laboratório |
| `/sonar/missao` | Cinco encontros e placar final; acesso direto inicia no estado seguro de preparação |
| `/sonar/lab` | Visão geral e situação do modelo oficial |
| `/sonar/lab/dados` | Fonte, distribuição e amostras do desenvolvimento |
| `/sonar/lab/treinamento` | Experimentos com partição fixa de desenvolvimento |
| `/sonar/lab/resultados` | CV e avaliação oficial final, em blocos distintos |
| `/sonar/lab/matematica` | Inspeção contextual de uma previsão |

O layout Sonar será carregado sob demanda e compartilhado pelas rotas dessa família, preservando a sessão ao alternar missão/laboratório. Refresh descarta a sessão em memória e mostra um estado explicativo; parâmetros de URL não autorizam revelar rótulos nem restaurar modelos experimentais inexistentes.

As rotas serão integradas somente quando houver conteúdo funcional. Na Etapa 04, o SonarLab pode ser acessado diretamente. Na Etapa 05, a Home ganha card do jogo em `/#jogos` e entrada acadêmica para o SonarLab; o cabeçalho global permanece genérico conforme a arquitetura existente. Identificar sempre a disciplina junto a “Trabalho 03”, evitando confusão com a numeração da trilha anterior.

## 4. Contratos entre dados, modelo, laboratório e missão

São contratos propostos, não implementações. Os nomes podem ser refinados sem alterar as garantias descritas.

### Dados

- `SonarSample = { id, features, label }`: `features` contém exatamente 60 números finitos em `[0,1]`; `label` é `R` ou `M`. A posição `features[0]` corresponde à coluna original 1 e `features[59]` à 60. A coluna 61 é o rótulo, mantido separadamente.
- ID estável proposto: `sonar-0001` até `sonar-0208`, correspondente à ordem original, vinculada ao hash da fonte. Não ordenar, deduplicar ou remover linhas silenciosamente.
- `provenance.json`: `schemaVersion`, dataset ID, URL, DOI, atribuição, licença, data de aquisição, SHA-256 dos bytes originais, `featureOrder`, `classOrder` e lista explícita de transformações (inicialmente nenhuma).
- `partitions.json`: `schemaVersion`, `datasetSha256`, algoritmo/seeds, `developmentIds`, `testIds`, `folds[{ trainIds, validationIds }]` e `lab{ trainIds, validationIds }`. Registrar contagens efetivas e validar disjunção/cobertura. Cada fold cobre o desenvolvimento; o teste nunca integra um fold ou a divisão do laboratório.
- Parser e validador retornam erros com linha/coluna; falhas não produzem uma base parcial utilizável. Investigar duplicatas antes do split, incluindo vetores iguais com rótulos conflitantes, e documentar a decisão.

### Modelo e inferência

O serviço carregado é dono de um modelo e expõe `predict(features, options)` e `dispose()`. `options` pode conter somente cancelamento e pedido de trace; não recebe a amostra inteira ou seu rótulo.

```text
Prediction {
  modelId,
  modelKind: 'official' | 'experimental',
  classOrder: ['R', 'M'],
  probabilities: [pRocha, pMetal],
  predictedIndex: 0 | 1,
  predictedLabel: 'R' | 'M',
  trace?: { input, layers, logits, probabilities }
}
```

As duas probabilidades devem ser finitas, estar em `[0,1]` e somar 1 dentro de tolerância numérica documentada. Argmax usa a mesma ordem de classes; em empate exato, índice 0, explicitado na documentação. Entrada inválida, artefato incompatível, aborto ou saída inválida geram erro; não retornam probabilidades padrão.

`manifest.json` liga o modelo à versão dos dados, partições e protocolo: `modelId`, `kind`, `datasetSha256`, `partitionsSha256`, `classOrder`, `inputSize`, arquitetura, configuração, seed, backend, versões e hashes dos pesos/topologia. O artefato oficial registra também seleção e estado/data da avaliação final.

O trace usa os mesmos pesos da previsão, sem aleatoriedade. Expõe entradas, somas ponderadas, bias, ReLU, logits e Softmax, com shapes e orientação das matrizes documentados. Na API Dense, o kernel usa a orientação de armazenamento `[entrada, saída]`; a apresentação didática deve explicitar a correspondência com `z = W a + b`. Validar equivalência com a inferência antes de exibi-lo.

O cálculo `explainLabeledPrediction(trace, label)` será separado: acrescenta one-hot, cross-entropy e `p - y` apenas quando a revelação for permitida. Não incluir loss no retorno padrão de `predict`.

### Treinamento e avaliação

- `trainExperiment({ config, trainSamples, validationSamples, signal, onEpoch })`: valida que os IDs pertencem à divisão de desenvolvimento autorizada. Rótulos são necessários ao treino, mas entram em tensor separado das features.
- Cada execução recebe `runId`; eventos `{ runId, epoch, loss, accuracy, valLoss, valAccuracy }` derivam dos logs reais. Campos ausentes são indisponíveis, nunca substituídos silenciosamente por zero.
- Somente um treino experimental por vez. Estados: `idle`, `loading`, `training`, `completed`, `cancelled`, `error`. Cancelamento preserva, se útil, o histórico parcial identificado como interrompido; não promove pesos parciais a modelo concluído.
- Resultados de execução antiga são ignorados após cancelar, sair ou iniciar outra sessão. A troca de modelo inspecionado invalida o trace anterior.
- Artefatos de métricas separam `crossValidation` (por candidato/fold, média e dispersão) de `finalTest` (uma avaliação do modelo oficial). Matriz: linhas verdadeiras, colunas previstas, ordem R/M. Incluir suporte, acurácia, precisão, recall, F1 por classe e macro-F1; denominador zero resulta em 0 acompanhado de indicação explícita.

### Missão e contexto do laboratório

- O núcleo sorteia cinco IDs sem reposição do teste oficial, sem filtrar acertos da IA. Entre partidas pode haver repetição.
- Estados propostos: `loading → awaitingGuess → predicting → awaitingReveal → revealed → finished`, com erro recuperável em inferência. O próximo encontro retorna a `awaitingGuess`.
- `GUESS` só vale uma vez em `awaitingGuess`; `REVEAL` só em `awaitingReveal`; pontuação só na primeira revelação; `NEXT` só em `revealed`. Inferência com falha preserva a amostra e o palpite, permitindo nova tentativa sem consumir o encontro.
- O controlador retém o rótulo e passa à UI anterior à revelação apenas `{ id, features }`. Mesmo a representação do contato não deve variar em função da classe.
- Contexto compartilhado com o laboratório: `{ sessionId, encounterId, sampleId, modelId, revealed, prediction }`. A matemática abre o trace daquela previsão; não executa a inferência com outro modelo.
- Antes do palpite, não permitir que o laboratório contextual exponha a previsão. Depois do palpite e antes da revelação, permitir trace sem rótulo/loss. A exploração livre de dados usa desenvolvimento; o teste é apresentado pelo resultado oficial e pelas amostras reveladas na missão.
- Se não existir sessão válida ao abrir um link contextual, mostrar estado vazio. Sem artefato oficial válido e avaliado, bloquear a missão e explicar como disponibilizá-lo; treino experimental não desbloqueia o modo oficial.

## 5. TensorFlow.js e protocolo proposto

**Decisão proposta: manter TensorFlow.js 4.22.0.** Os usos existentes de Dense/ReLU/Softmax, `categoricalCrossentropy`, Adam e carregamento de pesos são compatíveis com o problema tabular. A documentação oficial também oferece callbacks e execução cooperativa. Esta é uma avaliação de APIs e do código existente, não uma validação de treinamento Sonar já executado.

Para a primeira versão, propor `tf.sequential`, rótulos one-hot na ordem R/M e `categoricalCrossentropy`. O núcleo de criação/treino será compartilhado entre scripts Node e laboratório, com adaptação apenas de IO e agendamento. Não é necessário introduzir Python, `tfjs-node` ou binários nativos para essa base pequena: avaliar inicialmente o backend CPU do pacote já declarado em Node e exportação por IOHandler próprio.

No navegador, começar com treino cooperativo (`yieldEvery: 'batch'` e callbacks assíncronos), conferindo cancelamento e responsividade em dispositivo modesto. Caso a medição mostre bloqueios, mover o mesmo núcleo para Web Worker e registrar backend/limitações. Não presumir que um Worker terá WebGL. Não alterar o backend global do navegador, compartilhado pelos laboratórios anteriores.

Liberar tensores de entrada, rótulos, saídas, pesos copiados para trace, otimizadores e modelos em sucesso, erro e cancelamento. `tf.tidy` fica restrito a operações síncronas; leituras assíncronas usam `try/finally`. Aguardar operações pendentes antes de descartar o modelo. Não usar `tf.disposeVariables()` globalmente. Cobrir também a montagem/desmontagem repetida do React StrictMode.

### Proposta a congelar antes do experimento da Etapa 03

| Item | Escolha inicial proposta |
| --- | --- |
| Teste | Aproximadamente 20%, estratificado, seed 42; arredondamento global e distribuição proporcional documentados |
| Desenvolvimento | Demais amostras; folds estratificados com seed 43 |
| Laboratório | Holdout de 20% dentro do desenvolvimento, seed 44, separado da CV oficial |
| Candidatos | Baseline `60 → 2`; MLP `60 → 16 → 2`; MLP `60 → 16 → 8 → 2` |
| Treinamento | Adam, taxa 0,001, batch 16, orçamento fixo de 200 épocas por ajuste, sem early stopping inicial |
| Inicialização | Glorot com seeds explícitas derivadas de 4200 + índice do fold; seed final 4242; derivação por camada registrada |
| Ordem dos lotes | Embaralhamento determinístico controlado por execução/época; não depender de `shuffle: true` sem controle da seed |
| Comparação | Cinco folds por candidato, 15 ajustes; macro-F1 média, reportando dispersão e valores por fold |
| Desempate | Diferença de macro-F1 até `1e-4`: preferir menos parâmetros; depois ordem fixa dos candidatos |
| Modelo final | Retreinar a arquitetura escolhida em todo o desenvolvimento por 200 épocas; só então avaliar o teste uma vez |

Esses valores são propostas de planejamento, não resultados nem configuração já executada. Qualquer ajuste de orçamento antes do experimento deve gerar registro explícito. Não selecionar a melhor época usando o fold de avaliação; se futuramente houver early stopping, separar validação interna no treino de cada fold.

**Ambiguidade a resolver antes da seleção:** o prompt pede comparar também o baseline linear, mas exige uma MLP como produto acadêmico. Proposta: reportar o ranking completo, selecionar a melhor **MLP** por macro-F1 para a missão e tratar o baseline como referência. Se o baseline superar as MLPs, registrar isso claramente; não chamar a MLP de melhor modelo geral nem chamar a rede linear de MLP com camada oculta. Esta escolha está proposta para validação, não é uma alteração silenciosa do requisito.

Seeds não garantem resultados bit a bit entre CPU, WebGL, dispositivos e versões. Registrar ambiente e ordem das operações; testar repetição no ambiente escolhido e equivalência das previsões exportadas dentro de tolerância explícita. A avaliação final deve ter registro persistido para impedir sobrescrita/reavaliação acidental; novos experimentos não ajustam o oficial com base no teste já consultado.

## 6. Direção visual e integração

As imagens fornecidas são referências de identidade/composição, não assets de uma tela inteira nem fontes de números:

| Referência fornecida | Aplicação planejada |
| --- | --- |
| `10_45_37-1.png` — menu | Hero submarino, título expressivo, CTA amarelo, acesso ao laboratório, três passos em painel creme |
| `10_45_38-2.png` — missão | Cena e perfil do eco à esquerda; escolha/comparação à direita; reorganização vertical em telas pequenas |
| `10_45_40-3.png` — laboratório | Superfície clara, navegação lateral adaptável, configuração, rede e gráficos legíveis |

Paleta inicial proposta: marinho `#06263A`, turquesa `#08BDB5`, amarelo `#FFD34D`, creme `#FAF5E9`, coral `#FF6655`. Validar contraste dos pares de texto/fundo antes da UI final. Submarino amarelo, cartões arredondados e contornos expressivos na missão; decoração reduzida no laboratório. “Metal” terá ícone de cilindro, consistente com a coleta.

CSS sob `.sonar`/`.sonarlab`, tokens `--sonar-*` e animações com prefixo próprio. Não importar o CSS do IAdivinha, não modificar tokens globais e não usar seletores genéricos como `.card` ou `.button`. O CSS global já é carregado no entrypoint; o isolamento exige também conferir regras herdadas e o hook global de reveal, evitando suas classes genéricas dentro da feature quando desnecessárias.

Gráficos reais com X “Índice do atributo” (1–60) e Y “Energia normalizada”; usar segmentos que não inventem pontos intermediários como novas observações. Nenhuma curva/probabilidade das referências será copiada. Antes do treino, texto explicativo e área vazia, sem curvas decorativas. Softmax e cross-entropy aparecem como requisitos fixos, não seletores editáveis como no mockup.

Controles com teclado e foco visível, informações além da cor, estados anunciados, tabelas/descrições alternativas para os gráficos e suporte a `prefers-reduced-motion`. Som é opcional, iniciado por gesto permitido pelo navegador; um ping é ambientação, não reconstrução dos dados. Nenhum arquivo de música inexistente será referenciado.

## 7. Etapas e critérios de aceite

O documento de origem tem o título “Menu e missão” na Etapa 04, embora o corpo inteiro descreva SonarLab e determine parar antes do jogo. A Etapa 05 não tem subtítulo, mas contém menu e missão. A sequência abaixo segue **o conteúdo**, preservando a numeração.

| Etapa | Entrega | Critério de aceite para validar e avançar |
| --- | --- | --- |
| **01 — contexto e plano** | Este documento, inspeção e contratos propostos | Reuso, estrutura, rotas, dependências, requisitos, riscos e dúvidas registrados; nenhuma implementação funcional |
| **02 — dados e protocolo** | Original UCI, atribuição/licença, hash, parser, validação, IDs e manifestos | 208 × 60, `[0,1]`, R/M e contagens conferidos; duplicatas investigadas; splits/folds disjuntos, cobertura, proporções, repetição e ausência do rótulo em features testadas; sem métricas de modelo |
| **03 — núcleo MLP e artefatos** | Protocolo congelado, comparação controlada, treino final, avaliação e exportação | Logs reais, CV separada de teste, modelo oficial rastreável; probabilidades/argmax, entradas inválidas, extremos numéricos, independência do rótulo, cancelamento, descarte e equivalência de exportação verificados |
| **04 — SonarLab** | Dados, experimentos, resultados oficiais e matemática | Só desenvolvimento em experimentos; estados honestos; curvas reais; trace confere com inferência; Softmax/cross-entropy/gradiente testados com casos conhecidos; métricas e suporte conferem com matriz |
| **05 — menu e missão** | Cinco encontros, comparação, revelação, placar e integração da Home | Sem repetição interna ou seleção por acerto; escolha/pontuação únicas; sem rótulo antes da hora; modelo oficial obrigatório; erros, reinício, navegação e respostas antigas testados |
| **06 — revisão e apresentação** | Auditoria visual/científica, guia técnico, roteiro de 90 segundos e README | Testes/lint/build, acessibilidade, responsividade, recursos, navegação e regressão dos módulos anteriores conferidos; resultados reais e limitações explicitados; sem publicação automática |

Na Etapa 02, estender o comando e a configuração do lint aos módulos Sonar e testes/scripts pertinentes, com globals adequados a Node e navegador. Não ampliar regras retroativamente aos módulos legados. Os futuros `tests/sonar-*.test.js` entram no glob de `npm test`; não é necessário trocar o test runner.

Cada checkpoint deve informar arquivos, comandos, resultados efetivamente obtidos e limitações. Para UI, revisar ao menos desktop e larguras 320/390 px, navegação por teclado, movimento reduzido e erros/carregamento. Concluir cada etapa e aguardar a validação do usuário antes da seguinte.

## 8. Riscos, decisões pendentes e mitigação

| Risco | Tratamento proposto |
| --- | --- |
| Poucos exemplos para muitas entradas; alta variação e sobreajuste | Poucos candidatos, CV estratificada no desenvolvimento, dispersão reportada e teste reservado; sem meta artificial de acurácia |
| Coleta com múltiplos ângulos/condições; split por linha não prova generalização a novos objetos | Investigar metadados disponíveis na Etapa 02 e explicitar limites; não inventar grupos nem extrapolar resultados para uso real |
| Vazamento ao copiar fluxos antigos | Novo protocolo Sonar; nenhuma estatística aprendida sobre a base inteira; teste fora de callbacks/ajustes |
| Baseline eventualmente superar as MLPs | Decisão explícita sobre seleção acadêmica antes da Etapa 03; divulgar ranking sem ocultar o resultado |
| Inversão R/M, coluna extra ou troca de pesos | Schema único, validação de shapes/classes/hashes e testes de contrato |
| Navegação expor a resposta de um encontro | Contexto compartilhado com guards de palpite/revelação; exploração livre restrita ao desenvolvimento; loss somente após revelar |
| Travamento, treinos concorrentes e memória retida | Execução cooperativa inicialmente, identificação de execução, cancelamento, descarte e medição; Worker se necessário |
| CSS e runtime afetarem IAdivinha/Iris | Feature isolada, nenhuma reconfiguração global de backend e integração com testes dos consumidores existentes |
| Confundir confiança, explicação e avaliação | Probabilidades não garantem acerto; trace é cálculo observado; cinco encontros são demonstração do teste já avaliado |
| Ambiente local sem dependências instaladas | Preparar npm e instalar pelo lockfile antes da Etapa 02; não afirmar aprovação de build/testes sem executá-los |

**Não há dúvida que bloqueie a conclusão da Etapa 01 ou o planejamento dos dados.** Slug `/sonar`, JavaScript/JSDoc, memória de sessão, divisão sem normalização adicional e treino cooperativo são escolhas simples propostas neste documento. A política baseline versus MLP deve ser validada antes da seleção do modelo; desempenho/backends, integridade do arquivo e duplicatas dependem de medição futura, não de opinião do usuário.

## 9. Validação deste checkpoint

- Conferidos estrutura, rotas reais, componentes relevantes, scripts, configuração de lint/build, versões no lockfile e convenções de documentação.
- Consultadas a ficha oficial da UCI e a API TensorFlow.js 4.22.0. A base ainda não foi adquirida nem validada localmente; SHA-256, duplicatas e contagens por partição serão entregues na Etapa 02.
- Referências visuais analisadas como composição: os exemplos de probabilidades, curvas e placares não integram o planejamento como resultados.
- Alterações desta rodada limitadas à documentação. Verificações documentais: links locais existentes e `git diff --check`.
- Não executados `npm test`, `npm run lint` ou `npm run build`: não há mudança executável; este worktree está sem dependências instaladas/npm no PATH. Também não houve teste em navegador ou treinamento. A compatibilidade funcional do Sonar permanece pendente das etapas correspondentes.
- Próxima entrega, após validação: **somente a Etapa 02 — aquisição, validação e preparação dos dados e protocolo de avaliação**.

## 10. Fontes e referências

- [UCI — Connectionist Bench (Sonar, Mines vs. Rocks)](https://archive.ics.uci.edu/dataset/151/connectionist+bench+sonar+mines+vs+rocks): origem, significado das variáveis, contagens, atribuição e licença informada pelo catálogo; consultado em 30/09/2026.
- Sejnowski, T. & Gorman, R. (1988). *Connectionist Bench (Sonar, Mines vs. Rocks)* [Dataset]. UCI Machine Learning Repository. [DOI](https://doi.org/10.24432/C5T01Q).
- [TensorFlow.js API 4.22.0](https://js.tensorflow.org/api/4.22.0/): Layers/Dense, compile/fit, callbacks, `yieldEvery`, gestão de tensores e IO. A viabilidade também foi confrontada com os usos existentes no repositório.
- Requisitos de produto/entrega: `ProjetoSonar.md` e as três imagens anexadas pelo usuário nesta conversa. Os nomes abreviados das imagens estão na seção de direção visual; os anexos originais não são dependências de execução do site.

As referências oficiais detalhadas das fórmulas e da interpretação matemática serão incorporadas junto à implementação da Etapa 04; este checkpoint não apresenta resultados científicos nem exemplos numéricos de um modelo treinado.
