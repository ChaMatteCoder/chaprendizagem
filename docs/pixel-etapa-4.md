# Pixel em Pânico! + PixelLab — Checkpoint da Etapa 04

Data: 20 de outubro de 2026. Escopo concluído: implementação do laboratório científico **PixelLab** (`/pixel/lab`) com cinco seções interativas operando sobre a CNN oficial e as amostras reais do CIFAR-10.

## Entrega

O **PixelLab** (`/pixel/lab`) foi construído como ambiente de inspeção científica e didática acoplado ao mesmo modelo TensorFlow.js (`61.130` parâmetros) e ao mesmo motor de processamento de pixels (`32 × 32 × 3`) utilizado em **Pixel em Pânico!**. Quando aberto a partir de uma rodada ou do placar final do jogo, o laboratório recebe automaticamente a amostra em estudo.

## As 5 Seções do PixelLab

### A. Dados e previsões ([PixelLabDataSection.jsx](../src/features/pixel/components/PixelLabDataSection.jsx))
- Exibe proveniência oficial da base CIFAR-10, contagem das partições (`45.000` treino, `5.000` validação, `10.000` teste oficial) e seletor das 100 amostras reais do pacote de validação (10 por classe).
- Renderiza a imagem `32 × 32` com ampliação nítida (`image-rendering: pixelated`), comparando a imagem original, a imagem sob transformação ativa e a decomposição nos três canais (`R`, `G` e `B`) em cor ou intensidade monocromática.
- Lista as 10 probabilidades com destaque para o **Top 3**, `argmax`, cross-entropy e quadro conceitual diferenciando **confiança** (maior probabilidade de uma amostra), **acerto individual** (`argmax(p) == y`) e **acurácia** (proporção de acertos em um conjunto avaliado).

### B. Por dentro da CNN ([PixelLabNetworkSection.jsx](../src/features/pixel/components/PixelLabNetworkSection.jsx))
- Tabela completa da arquitetura real (`Input(32,32,3) → Conv2D(32) → MaxPool(16×16×32) → Conv2D(64) → MaxPool(8×8×64) → Conv2D(64) → GAP(64) → Dense(64) → Dense(10)`), com shapes de entrada/saída e contagem de parâmetros por camada (`896`, `18.496`, `36.928`, `4.160`, `650`; total `61.130`).
- Grade dos filtros `3 × 3 × 3` da 1ª camada convolucional com pesos reais por canal (`R`, `G`, `B`), viés $b_k$ e atalho para abrir o filtro diretamente na seção C.
- Mapas de ativação paginados (8 canais por vez para preservar legibilidade e desempenho) nas camadas `conv2d_1` (pré-ReLU e pós-ReLU), `max_pooling2d_1`, `conv2d_2`, `max_pooling2d_2` e `conv2d_3`, acompanhados de escala explícita (`min`, `max`, média e fração ativa) e aviso metodológico quando normalizados individualmente.

### C. Convolução passo a passo ([PixelLabConvSection.jsx](../src/features/pixel/components/PixelLabConvSection.jsx))
- Permite selecionar qualquer um dos 32 filtros da 1ª camada (`k ∈ [0, 31]`) e qualquer coordenada espacial $(i, j) \in [0, 31]^2$ clicando diretamente sobre a imagem `32 × 32` ou usando os controles numéricos.
- Exibe as três matrizes `3 × 3` de entrada normalizada nos canais `R`, `G` e `B` (indicando explicitamente células de *zero-padding* nas bordas `padding='same'`), os três kernels reais `3 × 3` de pesos $W_{u,v,c,k}$ e as três matrizes de produtos elemento a elemento.
- Mostra a soma por canal, soma total dos 27 produtos, adição do bias $b_k$, valor pré-ReLU $z_{i,j,k}$, valor pós-ReLU $a_{i,j,k} = \max(0, z_{i,j,k})$ e a comparação com a ativação real extraída da rede (`|z_didático - z_modelo| <= 1e-6`).
- Inclui inspeção real da janela `2 × 2` correspondente no `MaxPooling2D` (`16 × 16 × 32`), destacando a célula vencedora, e do `GlobalAveragePooling2D` (`8 × 8 → 1`).

### D. Resultados do treinamento ([PixelLabResultsSection.jsx](../src/features/pixel/components/PixelLabResultsSection.jsx))
- Curvas reais de perda (*cross-entropy*) e acurácia por época em treino e validação.
- Matriz de confusão `10 × 10` (treino, validação e avaliação final única no teste oficial de 10.000 imagens).
- Tabela de precisão, recall, F1-score e suporte por classe, além de Macro-F1, época selecionada por validação, hiperparâmetros e limitações conhecidas.

### E. Resistência a alterações ([PixelLabRobustnessSection.jsx](../src/features/pixel/components/PixelLabRobustnessSection.jsx))
- Bancada interativa de perturbação e restauração com o modelo congelado (contraste, brilho, ruído com semente fixa e suavização `3 × 3`), comparando lado a lado as probabilidades antes e depois da alteração.
- Relatório agregado de robustez pré-computado sobre o conjunto de validação com condições, intensidades e sementes fixas, distinguindo claramente demonstração interativa em uma amostra e métrica agregada em conjunto.
