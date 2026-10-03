# Sonar ou Azar? + SonarLab — checkpoint da Etapa 04

Data: 30 de setembro de 2026. **SonarLab implementado em `/sonar/lab`**, usando o [núcleo real da Etapa 03](sonar-etapa-3.md). `/sonar` redireciona para o laboratório enquanto o menu da missão ainda não existe. Há um card SonarLab na Home, na lista de projetos acadêmicos.

O título da Etapa 04 no documento de origem menciona menu/missão, mas seu corpo pede SonarLab e determina parar antes do jogo. Esta entrega segue esse conteúdo; menu, encontros e placar continuam na Etapa 05.

## Interface entregue

| Seção | Comportamento |
| --- | --- |
| Visão geral | Contagens reais, configuração experimental, fluxo da rede, histórico inicialmente vazio e inspeção de previsão |
| Dados | Fonte UCI, atribuição/CC BY 4.0, distribuição das classes e contagens de cada partição calculadas dos registros/IDs |
| Treinamento | Uma ou duas camadas ReLU; neurônios, taxa, épocas e seed limitados/validados; iniciar, progresso e cancelar |
| Resultados oficiais | Configuração e arquitetura congeladas, CV por candidato/fold separada do teste, matriz e métricas por classe |
| Matemática | Trace do modelo selecionado: entrada, neurônio e soma ponderada, ReLU, logits, Softmax, argmax; perda/gradiente após revelar o rótulo |

A identidade visual usa marinho, turquesa, creme, amarelo e coral, navegação lateral adaptável, cartões e botões grandes. Submarino e recife são SVGs próprios e decorativos. A imagem do laboratório fornecida serviu como referência de composição; nenhum número ou curva ilustrativa foi copiado.

O CSS permanece sob `.sonarlab`, com tokens locais. A rota dispensa o Layout global apenas na família `/sonar`; os módulos anteriores mantêm suas rotas. O carregamento da página e do TensorFlow.js usa lazy/dynamic import, sem mudar o backend compartilhado.

## Dados e modelo selecionado

O carregador verifica status HTTP, SHA-256/tamanho dos JSONs utilizados, hash do original, coerência da configuração, partições persistidas e métricas finais. Não há novo sorteio de IDs nem transformação aprendida.

A exploração e a inspeção livre disponibilizam **somente os 166 exemplos de desenvolvimento**. Cada opção identifica se a amostra pertence ao treino ou à validação do laboratório. O gráfico usa segmentos lineares entre os 60 pontos originais: X “Índice do atributo”, Y “Energia normalizada”, escala [0,1], tooltip e tabela acessível dos valores. A interface esclarece que isso não é gravação de áudio ou reconstrução física, sem inventar Hz.

O seletor distingue **oficial congelado** e **experimental**. O experimental só fica disponível após um treino concluído. Trocar amostra/modelo invalida a previsão e o trace antigos. Os erros não recebem previsões de contingência.

## Treinamento experimental

O formulário e o motor validam:

- Uma ou duas camadas ocultas, de 1 a 64 neurônios cada.
- Taxa de aprendizado de 0,00001 a 0,1; épocas de 1 a 500; seed inteira de 0 a 4.294.967.295.
- Batch fixo 16, Adam, ReLU nas ocultas, Softmax na ordem R/M e cross-entropy categórica.

O experimento usa os **133 IDs de treino e 33 de validação do laboratório**, todos no desenvolvimento. Não seleciona checkpoints pelo teste e não escreve nos artefatos oficiais. A configuração do formulário permanece ao navegar entre seções; o treino usa uma cópia validada dos valores ao iniciar.

As curvas de perda/acurácia vêm dos callbacks reais, incluindo treino e validação. Antes da primeira época, há uma área vazia explicativa. O usuário pode alternar métrica e consultar a tabela de épocas. Um histórico cancelado é identificado como interrompido; as épocas completas registradas permanecem, mas os pesos parciais são descartados.

Estados explícitos: aguardando, carregando, treinando, concluído, cancelado e erro. O formulário fica bloqueado durante o treino; o botão cancelar permanece disponível. O motor cede execução entre lotes, aceita `AbortSignal` e impede concorrência. A sessão possui os serviços/modelos, aborta ao sair e usa identificadores para suprimir callbacks/previsões tardias. Iniciar novo treino descarta o experimental anterior e, se ele estava selecionado, volta à inferência oficial.

Os experimentos ficam na memória da sessão. Recarregar ou sair descarta esse estado; não há persistência, upload ou substituição do modelo oficial. Sementes não garantem igualdade bit a bit entre CPU, WebGL e dispositivos.

## Matemática observada e acessível

As fórmulas usam **MathML nativo**, rótulos acessíveis e explicações em texto, sem instalar biblioteca adicional. Etapas expansíveis permitem abrir progressivamente:

1. Vetor original [60], lote de inferência [1,60], sem rótulo.
2. Camada oculta e neurônio selecionáveis; todos os produtos, bias, soma observada e ReLU.
3. Dois logits reais [2], Softmax estável e probabilidades, sempre na ordem Rocha/R, Metal/M.
4. Argmax e política de empate no índice 0.
5. Rótulo one-hot, cross-entropy e gradiente dos logits, somente após acionar “Revelar rótulo e calcular perda”.

Para `z = W a + b`, W didático tem shape [saída, entrada]. O kernel TensorFlow.js armazena sua transposta [entrada, saída], calculando o vetor de linha `aW+b`. A tabela explicita essa orientação. O acúmulo dos termos em JavaScript pode diferir levemente do kernel float32, e ambos os valores são identificados.

São mostradas `ReLU(z)=max(0,z)`, a Softmax com subtração do maior logit, `L=−Σ yₖ ln(pₖ)` e `∂L/∂zₖ=pₖ−yₖ`. Símbolos, shapes e classes são explicados. A perda didática é calculada dos logits por log-sum-exp, sem clipping, para permanecer finita quando uma probabilidade sofre underflow. A média oficial usa o clipping da biblioteca conforme o protocolo, distinção explícita na tela. Nenhum número arredondado para exibição é reutilizado nos cálculos; valores muito pequenos usam notação científica.

Minimizar cross-entropy equivale a maximizar a verossimilhança dos rótulos corretos. A retropropagação aplica a regra da cadeia; a tela identifica Adam como otimizador e não apresenta gradiente descendente simples como sua atualização completa. O trace é inspeção da computação; ativações não são explicações causais, e não se afirma que um neurônio “detecta metal”.

Referências de origem: [TensorFlow — Softmax](https://www.tensorflow.org/api_docs/python/tf/nn/softmax), [TensorFlow — cross-entropy a partir de logits](https://www.tensorflow.org/api_docs/python/tf/nn/softmax_cross_entropy_with_logits), [Dive into Deep Learning — verossimilhança, cross-entropy e gradiente](https://d2l.ai/chapter_linear-classification/softmax-regression.html). Motor/gestão de recursos: [API TensorFlow.js 4.22.0](https://js.tensorflow.org/api/4.22.0/). Referências consultadas em 30/09/2026; as fórmulas também constam nos requisitos fornecidos pelo usuário.

## Resultados oficiais preservados

O modelo continua **60 → 16 → 2**, 1.010 parâmetros. A UI lê os valores do registro; abrir resultados não executa avaliação do teste.

| Avaliação | Macro-F1 | Acurácia | Exemplos |
| --- | ---: | ---: | ---: |
| CV da MLP selecionada, média de cinco folds | 77,97% ± 7,09 p.p. | 78,32% ± 7,18 p.p. | 166 no desenvolvimento |
| Teste final congelado | 75,69% | 76,19% (32 acertos) | 42 |

A matriz permanece `[[13,7],[3,19]]`, linhas verdadeiras e colunas previstas R/M. Suporte, precisão, recall e F1 por classe são exibidos, junto com a política de denominadores zero. A UI informa que há poucos dados, que probabilidades não foram calibradas e que esses resultados não garantem desempenho em novos objetos/condições.

## Verificações efetivamente executadas

- **98 testes passaram**: os 90 anteriores e oito novos em [sonar-lab.test.js](../tests/sonar-lab.test.js).
- Softmax/perda com casos conhecidos e logits ±1000; perda finita para a classe com probabilidade zero por underflow; política de revelação e rejeição de distribuição incompatível.
- Gradiente `p−y` comparado com diferenças finitas e autodiferenciação real do TensorFlow.js; soma/bias/orientação conferidos em um caso conhecido.
- Loader com os arquivos reais, HTTP 503, alteração de bytes e aborto; restrição ao desenvolvimento, respostas antigas, saída durante carregamento, concorrência, cancelamento e restart.
- Sessão com motores reais: treino experimental concluído, trace/perda, troca de modelos e retorno à mesma previsão oficial, sem tensores retidos após descarte.
- **Lint sem avisos**, **build de produção aprovado** (23,72 s na execução final) e `git diff --check` aprovado. Sem alteração de dependências/lockfile.
- `verify:sonar` conferiu 12 hashes de arquivos, 498 registros CV, 42 resultados de teste já salvos e paridade em 166 amostras de desenvolvimento; **zero novas previsões de teste**. Os 13 arquivos oficiais, incluindo manifesto, permaneceram idênticos no build, e os hashes do código do experimento registrado não mudaram.

No navegador integrado Chromium, foram verificados desktop 1440 px, celular 390 px e largura 320 px: sem rolagem horizontal da página. Tabelas extensas possuem região rolável com foco de teclado. Foco visível, navegação por Tab, link de pular conteúdo, nomes dos controles, estados anunciados, tabelas alternativas e preferência de movimento reduzido foram conferidos.

Foram concluídos um treino de oito épocas com uma camada e outro de dez épocas com duas camadas; as curvas reais apareceram e o experimental pôde ser inspecionado. O cancelamento interrompeu um treino de orçamento 500, descartou pesos e reabilitou o formulário. Foram abertas soma/ReLU, Softmax e perda revelada, conferidas as métricas oficiais e simulada falha de carregamento de dados com bloqueio temporário da requisição; a tentativa seguinte recuperou a página. Bloqueio e emulação de movimento foram removidos, e o viewport temporário foi restaurado.

O **build servido por `vite preview`** também carregou os dados/modelo e exibiu o trace oficial, sem warnings ou erros de console nessa verificação. Evidências locais: [desktop](sonar/etapa-4-desktop.jpg) e [mobile](sonar/etapa-4-mobile.jpg). A captura desktop mostra o experimento real de dez épocas, não as curvas de avaliação oficial nem uma reprodução da imagem de referência.

Não foi medida latência máxima de lotes ou desempenho em hardware móvel físico. A verificação de acessibilidade foi por semântica, teclado e observação; não constitui auditoria completa com leitores de tela de todas as plataformas.

## Como validar

```bash
npm run dev -- --port 5174
# Abrir http://127.0.0.1:5174/sonar/lab
npm run test:sonar
npm test
npm run lint
npm run verify:sonar
npm run build
npm run preview -- --port 4174
# Abrir http://127.0.0.1:4174/sonar/lab
```

Abra Dados, troque a amostra e consulte o perfil/tabela. Em Treinamento, use poucas épocas para uma primeira conferência, inicie, observe loss/acurácia e teste cancelar. Após concluir, selecione Experimental e abra o cálculo; revele o rótulo apenas na última etapa. Compare a seção Resultados oficiais com o registro congelado.

Arquivos de implementação: [página](../src/features/sonar/pages/SonarLabPage.jsx), [componentes](../src/features/sonar/components/SonarMathPanel.jsx), [CSS](../src/features/sonar/styles/sonarlab.css), [sessão](../src/features/sonar/lib/lab/sonarLabSession.js), [loader](../src/features/sonar/lib/data/loadSonarLabData.js), [matemática](../src/features/sonar/lib/math/sonarMath.js) e [hook](../src/features/sonar/hooks/useSonarLab.js).

**Etapa 04 concluída. Próxima entrega, após validação: Etapa 05 — menu e missão com cinco encontros, palpites, revelação e placar.** Não houve publicação do site.
