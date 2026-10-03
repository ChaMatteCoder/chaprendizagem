# Sonar ou Azar? + SonarLab — guia para apresentação

Versão final, 30/09/2026. Modelo: `sonar-mlp-16-8a825d3f32f9`. Os resultados abaixo vêm dos [artefatos congelados](../public/models/sonar/official/manifest.json), não das imagens de referência. [Auditoria final](sonar-etapa-6.md) · [Reprodução](../training/sonar/README.md).

## 1. Objetivo e atendimento ao trabalho

O Trabalho 03 de Aprendizagem Profunda de Modelos Generativos foi implementado como classificação supervisionada: uma MLP recebe um vetor de sonar e decide entre Rocha e Metal. O nome da disciplina não transforma este classificador em modelo generativo.

O projeto entrega dados reais, preparação auditável, treinamento com retropropagação, comparação de arquiteturas, avaliação separada, inferência no navegador e explicação matemática com os pesos usados na previsão. A missão de cinco encontros convida o usuário a comparar seu palpite com a rede. O SonarLab permite experimentar e examinar as contas. Seu placar é uma demonstração e não substitui o relatório científico.

## 2. Fonte e significado dos dados

A base [UCI Connectionist Bench — Sonar, Mines vs. Rocks](https://archive.ics.uci.edu/dataset/151/connectionist+bench+sonar+mines+vs+rocks), de Sejnowski e Gorman (1988), contém 208 exemplos: 97 de rocha e 111 de cilindro metálico. Cada registro traz 60 energias em bandas de frequência, integradas em intervalos de tempo, e um rótulo. Os valores estão em [0,1]. São descritores de ecos; não são áudio nem 60 frequências físicas disponíveis em Hz. A atribuição e a licença CC BY 4.0 estão na [proveniência](../public/data/sonar/provenance.json).

O arquivo original é preservado em bytes: 87.776 bytes, SHA-256 `e90434cdbf00fcf93ffa911fe447ae25606979658e60f1d32e155c3b5240234d`. O parser exige exatamente 60 números finitos e o rótulo R/M. Foram encontrados zero grupos duplicados, zero vetores iguais e zero conflitos. Não houve imputação, exclusão, padronização aprendida ou arredondamento dos dados. Os IDs seguem a linha original: `sonar-0001` a `sonar-0208`.

## 3. Arquitetura, neurônios e parâmetros

O oficial é **60 → 16 → 2**: entrada com 60 dimensões, uma camada oculta Dense/ReLU de 16 neurônios e uma camada Dense/Softmax de duas saídas, sempre na ordem **R=0, M=1**.

| Parte | Pesos | Biases | Parâmetros treináveis |
| --- | ---: | ---: | ---: |
| Oculta, 60 → 16 | 960 | 16 | 976 |
| Saída, 16 → 2 | 32 | 2 | 34 |
| Total | 992 | 18 | **1.010** |

Há **duas camadas treináveis**, sendo **uma oculta**. Se incluirmos a entrada no desenho, vemos três níveis; a entrada não adiciona parâmetros. Neurônio, camada e parâmetro são conceitos diferentes. Esta é uma MLP pequena, não uma rede muito profunda. O candidato com duas ocultas 16/8 também foi medido, mas o selecionado foi o de uma oculta.

## 4. Como o treinamento acontece

Os pesos começam com GlorotUniform e biases zero. Cada época embaralha deterministicamente os exemplos de treino; cada mini-batch tem até 16 registros. A rede calcula a previsão, a cross-entropy compara a saída com o one-hot verdadeiro, a diferenciação automática retropropaga o erro e Adam atualiza pesos e biases. A validação apenas mede o resultado; não atualiza parâmetros.

Configuração registrada: TensorFlow.js **4.22.0**, backend **CPU**, Adam, taxa **0,001**, β₁=0,9, β₂=0,999, ε=10⁻⁷, **200 épocas fixas**, sem early stopping. Seeds de folds 4200–4204, iguais entre candidatos; seed final 4242. O checkpoint é sempre a época 200. O [histórico](../public/models/sonar/official/history.json) armazena curvas reais, não curvas ilustrativas.

O laboratório usa 133 exemplos de treino e 33 de validação, aceita parâmetros limitados e conserva o último modelo experimental completo na sessão. Cancelar descarta os pesos parciais. Experimentos não substituem o oficial e não recebem os 42 exemplos de teste.

## 5. Fórmulas e símbolos

Para uma entrada em coluna a, a camada calcula **z = Wa + b**. `W[j,i]` liga a entrada i ao neurônio j; b é o bias e z é a pré-ativação. A oculta produz **hⱼ = max(0, zⱼ)**. Para o oficial, W¹ tem shape [16,60] e W² [2,16]. O kernel do TensorFlow.js é armazenado transposto: [entrada, saída], respectivamente [60,16] e [16,2].

A saída produz dois logits s. A [Softmax](https://www.tensorflow.org/api_docs/python/tf/nn/softmax) estável é:

```text
m = max(sR, sM)
pk = exp(sk − m) / Σj exp(sj − m),     k,j ∈ {R,M}
classe prevista = argmax(pR, pM)
```

Subtrair m preserva a distribuição e evita exponenciais grandes. O argmax retorna a maior probabilidade; em empate o projeto escolhe R. A probabilidade de um exemplo não é a acurácia do modelo e não foi calibrada.

A [cross-entropy para classes exclusivas](https://www.tensorflow.org/api_docs/python/tf/nn/softmax_cross_entropy_with_logits), com y one-hot, é **L = −Σₖ yₖ ln(pₖ) = −ln(p da classe verdadeira)**. Para um mini-batch de B registros, usamos a média das perdas. Derivando a composição Softmax/cross-entropy para um exemplo: **∂L/∂sₖ = pₖ − yₖ**.

Na saída, `∂L/∂W²[k,j] = (pk − yk) hj` e `∂L/∂b²[k] = pk − yk`. Na oculta, o erro é propagado por W² e multiplicado pela derivada da ReLU, 1 para z>0 e 0 para z<0; a implementação usa 0 em z=0. A regra da cadeia leva o gradiente até W¹. A média do lote acrescenta o fator 1/B.

Adam utiliza o gradiente gₜ da perda média para cada parâmetro θ. Com m₀=v₀=0, calcula:

```text
mt = β1 mt−1 + (1−β1) gt
vt = β2 vt−1 + (1−β2) gt²
m̂t = mt / (1−β1ᵗ);     v̂t = vt / (1−β2ᵗ)
θt = θt−1 − α m̂t / (√v̂t + ε)
```

α é a taxa de aprendizado; t conta atualizações de lotes, não épocas. As operações são por parâmetro. Referência: [Kingma e Ba, Adam, ICLR 2015, algoritmo 1](https://arxiv.org/pdf/1412.6980). O ε do projeto é explicitamente 10⁻⁷. A interface mostra gradientes dos logits; inspecionar uma previsão não executa atualização.

Para conferir a API efetivamente utilizada: [Dense](https://js.tensorflow.org/api/4.22.0/#layers.dense), [Adam](https://js.tensorflow.org/api/4.22.0/#train.adam) e [fit](https://js.tensorflow.org/api/4.22.0/#LayersModel.fit). A referência TensorFlow Python acima explica as fórmulas, não a linguagem da implementação.

## 6. Protocolo experimental e prevenção de vazamento

| Conjunto | Rocha | Metal | Total | Finalidade |
| --- | ---: | ---: | ---: | --- |
| Desenvolvimento | 77 | 89 | 166 | Comparação, treino final e laboratório |
| Teste reservado | 20 | 22 | 42 | Avaliação final única |
| Laboratório, treino | 62 | 71 | 133 | Atualizar modelo experimental |
| Laboratório, validação | 15 | 18 | 33 | Medir experimento |

As [partições persistidas](../public/data/sonar/partitions.json) usam Mulberry32/Fisher–Yates estratificado, seeds 42 para teste, 43 para cinco folds e 44 para laboratório. Cada fold valida 33/34 exemplos e treina nos outros 132/133 do desenvolvimento. Cada exemplo entra na validação de um fold exatamente uma vez.

Foram comparados três candidatos com o mesmo orçamento. A regra anterior aos resultados escolheu a maior macro-F1 média entre MLPs; empates até 0,0001 favorecem menos parâmetros e depois a ordem registrada. A baseline sem oculta é reportada como referência. Após selecionar, o treino final usou todos os 166 exemplos de desenvolvimento, sem validação para escolher época. A avaliação de teste foi concluída uma vez em **30/09/2026, 22:48:53 UTC**, e está congelada.

Seeds, IDs, configuração, pesos e hashes ficam registrados. A repetição do fold 1 do selecionado reproduziu histórico e probabilidades no ambiente CPU original. Isso não garante igualdade bit a bit em todo hardware/backend.

IDs e rótulos não entram na inferência. A missão sorteia cinco IDs distintos do teste **já avaliado**, sem escolher os casos por acerto da IA. Revelar a resposta nessa demonstração não autoriza retreinar ou selecionar pelo teste. Como os artefatos são públicos e locais, o ocultamento do jogo protege o fluxo didático, não é segurança contra inspecionar arquivos.

## 7. Resultados medidos e interpretação

Média ± desvio-padrão **amostral** dos cinco folds; DP não é intervalo de confiança:

| Arquitetura | Parâmetros | Macro-F1 | Acurácia |
| --- | ---: | ---: | ---: |
| 60 → 2, baseline linear | 122 | 73,95% ± 1,48 p.p. | 74,69% ± 1,81 p.p. |
| **60 → 16 → 2, selecionada** | **1.010** | **77,97% ± 7,09 p.p.** | **78,32% ± 7,18 p.p.** |
| 60 → 16 → 8 → 2 | 1.130 | 77,31% ± 4,46 p.p. | 77,74% ± 4,39 p.p. |

A diferença de cerca de 0,65 p.p. entre as MLPs satisfaz a regra registrada; não prova superioridade universal da arquitetura menor.

Teste final do oficial: **32/42 acertos**, **acurácia 76,19%**, **macro-F1 75,69%**, **cross-entropy média 0,394608**. [Métricas originais](../public/models/sonar/official/metrics.json).

| Verdadeiro ↓ / Previsto → | Rocha | Metal |
| --- | ---: | ---: |
| Rocha | 13 | 7 |
| Metal | 3 | 19 |

| Classe | Suporte | Precisão | Recall | F1 |
| --- | ---: | ---: | ---: | ---: |
| Rocha | 20 | 81,25% | 65,00% | 72,22% |
| Metal | 22 | 73,08% | 86,36% | 79,17% |

Acurácia = (13+19)/42. Para cada classe, precisão = TP/(TP+FP), recall = TP/(TP+FN), F1 = 2PR/(P+R); macro-F1 é a média das duas F1. Denominador zero resulta em 0 e é identificado; não ocorreu aqui. A rede perdeu sete rochas e três metais. O recall de Rocha menor evidencia uma limitação que a acurácia global sozinha oculta. Os 95,78% de acurácia no próprio treino final são resubstituição, não evidência de generalização.

## 8. Uma previsão real, passo a passo

Exemplo **sonar-0001**, do **desenvolvimento**, com pesos oficiais. O [JSON completo](sonar/etapa-6-exemplo.json) contém os 60 atributos, kernels, biases, ativações, todos os produtos do primeiro neurônio e das duas saídas. Não há pesos inventados. Reproduzir sem treinar nem avaliar o teste:

```sh
npm run explain:sonar
# Para regenerar somente o JSON didático:
npm run explain:sonar -- --id=sonar-0001 --save
```

1. **Entrada:** os cinco primeiros atributos são [0,0200; 0,0371; 0,0428; 0,0207; 0,0954]. Todos os 60 entram no lote [1,60]; a resposta R não entra. Os tensores convertem os números para float32.
2. **Oculta, neurônio 1:** os três primeiros pesos são [0,40497559; 0,47638348; 0,12558486]. Seus produtos são [0,00809951; 0,01767383; 0,00537503]. A soma dos **60** produtos é 1,39146921; bias −0,09376509; z observado **1,29770410**. ReLU mantém esse valor. No neurônio 4, z=−0,57285964 e a ativação vira 0. Os demais neurônios também são calculados.
3. **Saída:** usando as 16 ativações, a soma para R é 0,50162871, bias +0,06472260, logit **0,56635129**. Para M: soma 0,51806100, bias −0,06472260, logit **0,45333838**.
4. **Softmax:** máximo 0,56635129; exponenciais deslocadas [1; 0,89313913], soma 1,89313913. A saída float32 é **[0,52822322; 0,47177681]**, ou Rocha **52,82%**, Metal **47,18%**.
5. **Argmax:** índice 0, Rocha. Só agora acrescentamos o verdadeiro R, one-hot [1,0]. A perda por log-sum-exp é **0,63823637**; gradiente dos logits **[−0,47177678; +0,47177681]**. Este cálculo não atualiza o modelo.

Números acima foram arredondados apenas para leitura. O acúmulo dos produtos em JavaScript double dá z₁=1,2977041251, enquanto o kernel float32 registra 1,2977041006. A Softmax recalculada em double também difere em poucos dígitos. A tolerância trace/inferência é 10⁻⁵. A matemática didática usa log-sum-exp sem clipping; a perda média oficial segue o clipping float32 da biblioteca conforme registrado.

Para demonstrar na interface, abra `/sonar/lab`, mantenha `sonar-0001` e o modelo oficial, clique em **Ver cálculo passo a passo**, carregue o trace e abra as etapas. A cross-entropy só aparece depois de revelar o rótulo. Em **Eco da missão**, a revelação precisa ocorrer primeiro na missão e a inspeção reutiliza a mesma previsão.

## 9. Limitações e melhorias possíveis

São poucos exemplos e apenas 42 no teste. A divisão estratificada por linha não demonstra independência entre objetos, ângulos ou condições de coleta. Não há metadados suficientes para afirmar generalização a objetos novos. A tarefa cobre rocha/cilindro metálico do corpus; não detecta qualquer material no oceano. O desenho submarino e o ping opcional são recursos visuais/sonoros, não sensores.

As probabilidades não foram calibradas. O trace descreve operações numéricas e não prova que um neurônio detecta uma propriedade física específica. Melhorias futuras incluem mais dados com grupos de coleta identificados, avaliação por grupo e investigação de regularização/calibração em desenvolvimento. Um novo estudo exige protocolo e teste novos; os resultados congelados deste trabalho não devem orientar ajustes retroativos.

As artes do cenário somam 4.201.189 bytes. A capa e as três faixas adicionadas posteriormente estão descritas no [registro de mídia](sonar-midia.md). Há chunks compartilhados grandes de TensorFlow.js. Otimização de entrega de imagens e execução em worker merecem estudo futuro. A auditoria confirmou navegação/cancelamento e viewport responsivo, mas não mediu Core Web Vitals, rede móvel real ou desempenho em aparelhos físicos.

## 10. Arquivos principais e responsabilidades

| Arquivo/diretório | Responsabilidade |
| --- | --- |
| [Schema](../src/features/sonar/data/sonarSchema.js), [parser](../src/features/sonar/lib/data/sonarDataset.js) | 60 atributos, classes R/M, leitura estrita e entradas sem rótulo |
| [Partições](../public/data/sonar/partitions.json), [proveniência](../public/data/sonar/provenance.json) | IDs persistidos, seeds, fonte e integridade |
| [Configuração](../training/sonar/config.json), [experimento](../training/sonar/run-experiment.mjs) | Orçamento, CV, seleção e treino final |
| [Treinador](../src/features/sonar/lib/model/trainSonarModel.js) | Fit real, histórico, aborto e liberação de recursos |
| [Preditor](../src/features/sonar/lib/model/predictSonar.js), [artefatos](../src/features/sonar/lib/model/sonarArtifacts.js) | Inferência feature-only, trace e carregamento validado |
| [Oficial](../public/models/sonar/official/manifest.json), [verificação](../training/sonar/verify-official.mjs) | Identidade/pesos/resultados congelados e checagem sem nova avaliação de teste |
| [Missão](../src/features/sonar/lib/mission/sonarMission.js), [SonarApp](../src/features/sonar/pages/SonarApp.jsx) | Cinco encontros, revelação, placares, contexto e rotas |
| [Sessão do laboratório](../src/features/sonar/lib/lab/sonarLabSession.js), [página](../src/features/sonar/pages/SonarLabPage.jsx) | Oficial separado do experimental e interface |
| [Matemática](../src/features/sonar/lib/math/sonarMath.js), [painel](../src/features/sonar/components/SonarMathPanel.jsx) | Produtos, ReLU, Softmax, perda/gradiente após revelação |
| [Exemplo reproduzível](../training/sonar/explain-example.mjs), [testes](../tests/sonar-example.test.js) | Exemplo de desenvolvimento com pesos oficiais e guardas de integridade |
| [Artes e prompts](sonar/etapa-5-artes.md) | Imagens locais geradas para manter o estilo das referências |

## Roteiro oral — aproximadamente 90 segundos

> Nosso projeto classifica ecos de sonar como rocha ou metal usando a base UCI, com 208 exemplos e 60 atributos de energia por exemplo. Criamos uma missão em que a pessoa observa o sinal, faz seu palpite e compara com a rede. O jogo apresenta os resultados; o laboratório permite examinar a matemática e treinar modelos experimentais.
>
> Separamos 166 exemplos para desenvolvimento e 42 para teste. Comparamos uma baseline e duas MLPs por validação cruzada em cinco folds. A regra registrada escolheu a MLP 60, 16, 2: uma camada oculta ReLU, duas saídas Softmax e 1.010 parâmetros. Adam ajustou os pesos por retropropagação, com cross-entropy, durante 200 épocas fixas.
>
> Depois da seleção, treinamos no desenvolvimento inteiro e avaliamos o teste uma única vez. Obtivemos 32 acertos em 42, acurácia de 76,19% e macro-F1 de 75,69%. A matriz mostra sete rochas confundidas com metal e três metais confundidos com rocha.
>
> No SonarLab mostramos os pesos reais, a soma ponderada, ReLU, logits e Softmax da própria previsão. A rede recebe somente os atributos; o rótulo entra depois para calcular a perda. Os experimentos do navegador não alteram o oficial. Como a base é pequena e não identifica grupos de coleta, esses resultados não garantem acerto em novos objetos ou condições.

## Perguntas prováveis do professor

**Onde está o Deep Learning?** Na implementação de aprendizagem neural: camadas densas, ativação não linear, perda diferenciável e retropropagação com Adam. O oficial tem uma oculta; cabe descrevê-lo como MLP pequena, sem exagerar sua profundidade ou chamá-lo de generativo.

**Por que MLP?** Os dados são um vetor tabular de 60 descritores. Camadas densas permitem aprender combinações não lineares e atendem ao requisito acadêmico. A comparação incluiu uma baseline linear; a escolha específica foi baseada na macro-F1 de desenvolvimento.

**Por que duas saídas Softmax numa tarefa binária?** É uma representação válida de duas classes exclusivas, com probabilidades na ordem R/M e one-hot correspondente. Uma saída sigmoide também seria possível, mas mudaria o contrato registrado; não há promessa de vantagem inerente da Softmax.

**Confiança e acurácia são iguais?** Não. A probabilidade Softmax descreve uma previsão individual; acurácia é a fração de acertos num conjunto rotulado. Aqui não validamos calibração, portanto 80% numa previsão não garante 80% de chance empírica de acerto.

**Como evitaram vazamento?** Salvamos divisões disjuntas, selecionamos e treinamos apenas no desenvolvimento e congelamos a avaliação final. Não usamos o teste para escolher arquitetura, época ou transformação. A inferência lê somente features; o laboratório experimental nunca recebe IDs de teste.

**O que a cross-entropy mede?** Penaliza a baixa probabilidade atribuída ao rótulo verdadeiro: −ln(p verdadeiro). Uma resposta errada muito confiante recebe perda maior. A média orienta o treinamento; ela é diferente da contagem de acertos.

**Como os pesos são ajustados?** A diferenciação automática aplica a regra da cadeia da perda até cada peso/bias. Adam usa o gradiente médio do lote, momentos de primeira/segunda ordem e correção de viés para atualizar os parâmetros. O trace apenas explica a previsão; não treina nem altera o oficial.
