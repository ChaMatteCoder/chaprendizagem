# Guia Técnico para Apresentação — Pixel em Pânico! & PixelLab (CNN + CIFAR-10)

## 1. Objetivo, Dados e Arquitetura Real

O módulo **Pixel em Pânico!** (`/pixel/jogo`) e **PixelLab** (`/pixel/lab`) demonstra o funcionamento completo de uma **Rede Neural Convolucional (CNN)** real para classificação de imagens coloridas `32 × 32 × 3` (RGB) nas 10 categorias da base oficial **CIFAR-10**.

### Base de Dados Oficial
- **Fonte**: *CIFAR-10 (Python version)* — Alex Krizhevsky (*Learning Multiple Layers of Features from Tiny Images*, Technical Report, University of Toronto, 2009).
- **Integridade**: arquivo `cifar-10-python.tar.gz` (`170.498.071` bytes, SHA-256 `6d958be074577803d12ecdefd02955f39262c83c16fe9348329d7fe0b5c001ce`).
- **Dimensão nativa**: $32 \times 32 \times 3$ valores inteiros `uint8` em $[0, 255]$ (`3.072` valores por imagem).
- **Particionamento reproduzível (`seed = 42`, PRNG Mulberry32 + Fisher–Yates)**:
  - **Treino**: `45.000` imagens (`4.500` por classe).
  - **Validação**: `5.000` imagens (`500` por classe, disjuntas do treino).
  - **Teste oficial**: `10.000` imagens (`1.000` por classe do `test_batch` oficial, avaliadas uma única vez ao final).
  - **Pacote interativo (`public/data/pixel/demo-samples.json`)**: `100` amostras reais da validação (`10` por classe) sem compressão com perdas, para execução local no navegador sem versionar `60.000` arquivos no Git.

### Arquitetura da CNN (`cifar10-compact-cnn-v1`)

| Camada | Configuração | Entrada | Saída | Parâmetros |
| --- | --- | --- | --- | ---: |
| `input_rgb` | Entrada normalizada | `32 × 32 × 3` | `32 × 32 × 3` | `0` |
| `conv2d_1` | `32` filtros `3 × 3`, `padding='same'`, `ReLU` | `32 × 32 × 3` | `32 × 32 × 32` | `896` |
| `max_pooling2d_1` | Janela `2 × 2`, `stride = 2` | `32 × 32 × 32` | `16 × 16 × 32` | `0` |
| `conv2d_2` | `64` filtros `3 × 3`, `padding='same'`, `ReLU` | `16 × 16 × 32` | `16 × 16 × 64` | `18.496` |
| `max_pooling2d_2` | Janela `2 × 2`, `stride = 2` | `16 × 16 × 64` | `8 × 8 × 64` | `0` |
| `conv2d_3` | `64` filtros `3 × 3`, `padding='same'`, `ReLU` | `8 × 8 × 64` | `8 × 8 × 64` | `36.928` |
| `global_average_pooling2d_1` | Média espacial `8 × 8` por canal | `8 × 8 × 64` | `64` | `0` |
| `dense_1` | `64` neurônios densos, `ReLU` | `64` | `64` | `4.160` |
| `dense_2` | `10` neurônios de saída, `Softmax` | `64` | `10` | `650` |
| **Total** | | | | **61.130** |

---

## 2. Fórmulas Matemáticas e Relação com Valores Reais

Os cálculos abaixo são reproduzidos por `npm run explain:pixel -- --save` sobre a amostra de validação `cifar10-val-00077` (classe verdadeira: `0 — Avião`), utilizando o modelo oficial congelado `pixel-cifar10-cnn-f27ef7d52038`.

### 2.1. Normalização
Cada byte inteiro $x_{\text{uint8}} \in [0, 255]$ é convertido para ponto flutuante de 32 bits em $[0, 1]$:
$$x_{i,j,c} = \frac{x_{\text{uint8}}[i,j,c]}{255{,}0}$$
Na amostra `cifar10-val-00077`, o pixel central $(i=15, j=15)$ possui valores `uint8` $(R=188, G=194, B=194)$, resultando em $(0{,}7373,\; 0{,}7608,\; 0{,}7608)$.

### 2.2. Convolução 2D Multicanal (Correlação Cruzada) e ReLU
Em bibliotecas de aprendizagem profunda (PyTorch, Keras e TensorFlow.js), a camada `Conv2D` calcula a **correlação cruzada** multicanal sem inverter o kernel. Com `padding='same'` (1 pixel de zeros nas bordas de $32 \times 32$), para a posição $(i, j)$ e filtro $k$:
$$z_{i,j,k} = b_k + \sum_{u=0}^{2} \sum_{v=0}^{2} \sum_{c \in \{R,G,B\}} W_{u,v,c,k} \cdot x_{\text{pad}}[i + u - 1,\; j + v - 1,\; c]$$
$$a_{i,j,k} = \text{ReLU}(z_{i,j,k}) = \max(0,\; z_{i,j,k})$$

**Valores medidos em `cifar10-val-00077` para $(i=15, j=15, k=0)$**:
- Soma no canal $R$: $-0{,}084916$
- Soma no canal $G$: $+0{,}297362$
- Soma no canal $B$: $-0{,}185254$
- Soma dos 27 produtos ($\sum W \cdot x$): $+0{,}027192$
- Bias do filtro $0$ ($b_0$): $-0{,}012028$
- Pré-ReLU ($z_{15,15,0}$): $0{,}027192 - 0{,}012028 = +0{,}015164$
- Pós-ReLU ($a_{15,15,0}$): $\max(0,\; +0{,}015164) = +0{,}015164$
- Diferença absoluta em relação ao tensor extraído do modelo: $4{,}45 \times 10^{-8}$.

### 2.3. Max Pooling 2D (`2 × 2`, passo `2`)
Reduz a resolução espacial pela metade selecionando o maior valor em cada janela $2 \times 2$ disjunta:
$$p_{r,c,k} = \max_{u \in \{0,1\},\; v \in \{0,1\}} a_{2r+u,\; 2c+v,\; k}$$
Na janela $(r=7, c=7)$ do filtro $k=0$ (cobrindo linhas $14..15$ e colunas $14..15$), as quatro ativações são $\{0,\; 0,\; 0,\; 0{,}015164\}$, selecionando a posição vencedora $(15, 15)$ com valor $0{,}015164$ (diferença `0` em relação ao tensor do modelo).

### 2.4. Global Average Pooling 2D (GAP)
Na saída da 3ª convolução ($8 \times 8 \times 64$), cada canal $k$ é resumido pela média aritmética de suas 64 posições espaciais, evitando uma camada densa gigante:
$$g_k = \frac{1}{64} \sum_{i=0}^{7} \sum_{j=0}^{7} a^{(3)}_{i,j,k}$$
No canal $k=0$ de `cifar10-val-00077`, a soma espacial é $11{,}720068$, produzindo $g_0 = 11{,}720068 / 64 = 0{,}183126$ (diferença de $6{,}26 \times 10^{-9}$).

### 2.5. Softmax Numericamente Estável
Para converter os 10 logits $z_0, \dots, z_9$ em probabilidades sem risco de *overflow* exponencial, subtrai-se $m = \max_j z_j$:
$$p_k = \frac{\exp(z_k - m)}{\sum_{j=0}^{9} \exp(z_j - m)}$$
Em `cifar10-val-00077`, o maior logit é $z_0 = +0{,}276576$ (`Avião`), o denominador deslocado é $3{,}258958$, e as maiores probabilidades são:
1. `0 — Avião`: $30{,}68\%$
2. `8 — Navio`: $20{,}24\%$
3. `7 — Cavalo`: $19{,}88\%$

### 2.6. Entropia Cruzada (Cross-Entropy), Retropropagação e Otimizador Adam
Para o rótulo verdadeiro $y \in \{0, \dots, 9\}$ (codificado em *one-hot* $y_k = 1$ se $k=y$, $0$ caso contrário):
$$\mathcal{L}(y, \mathbf{p}) = -\sum_{k=0}^{9} y_k \ln(p_k) = -\ln(p_y)$$
O gradiente da perda em relação a cada logit de saída tem a forma simples:
$$\frac{\partial \mathcal{L}}{\partial z_k} = p_k - y_k$$
Em `cifar10-val-00077` ($y = 0$), $\mathcal{L} = -\ln(0{,}306846) = 1{,}1814$, e $\partial \mathcal{L} / \partial z_0 = 0{,}3068 - 1 = -0{,}6932$ (indicando que o logit da classe correta deve aumentar). Durante o treinamento offline, a **retropropagação** propaga esses gradientes pelas camadas densas e convolucionais via regra da cadeia, e o otimizador **Adam** atualiza os `61.130` pesos combinando médias móveis de 1º momento (direção média do gradiente) e 2º momento (escala adaptativa por parâmetro). Durante o jogo e no PixelLab, os pesos permanecem **congelados**.

### 2.7. Acurácia, Precisão, Recall e Macro-F1
$$\text{Acurácia} = \frac{1}{N}\sum_{n=1}^{N} \mathbb{I}(\arg\max_k p^{(n)}_k = y^{(n)}), \quad \text{Precisão}_c = \frac{TP_c}{TP_c + FP_c}, \quad \text{Recall}_c = \frac{TP_c}{TP_c + FN_c}, \quad F1_c = \frac{2 \cdot \text{Precisão}_c \cdot \text{Recall}_c}{\text{Precisão}_c + \text{Recall}_c}$$

---

## 3. Resultados Efetivamente Medidos

### 3.1. Desempenho Global (`pixel-cifar10-cnn-f27ef7d52038`)
- **Validação (`5.000` imagens)**: `3.393` acertos, acurácia **67,86%**, Macro-F1 **67,56%**, Cross-Entropy **0,9106**.
- **Teste Oficial (`10.000` imagens, avaliação única)**: `6.753` acertos, acurácia **67,53%**, Macro-F1 **67,34%**, Cross-Entropy **0,9242**.

### 3.2. Desempenho por Classe no Teste Oficial (`10.000` imagens)

| Índice e Classe | Precisão | Recall | F1-Score | Acertos / Suporte |
| --- | ---: | ---: | ---: | ---: |
| `0 — Avião (airplane)` | `63,61%` | `74,10%` | `68,45%` | `741 / 1000` |
| `1 — Automóvel (automobile)` | `84,05%` | `78,50%` | `81,18%` | `785 / 1000` |
| `2 — Pássaro (bird)` | `56,02%` | `60,00%` | `57,94%` | `600 / 1000` |
| `3 — Gato (cat)` | `49,29%` | `41,80%` | `45,24%` | `418 / 1000` |
| `4 — Cervo (deer)` | `71,29%` | `49,90%` | `58,71%` | `499 / 1000` |
| `5 — Cachorro (dog)` | `52,80%` | `63,20%` | `57,53%` | `632 / 1000` |
| `6 — Sapo (frog)` | `74,44%` | `76,00%` | `75,21%` | `760 / 1000` |
| `7 — Cavalo (horse)` | `72,87%` | `70,90%` | `71,87%` | `709 / 1000` |
| `8 — Navio (ship)` | `75,55%` | `82,20%` | `78,74%` | `822 / 1000` |
| `9 — Caminhão (truck)` | `78,46%` | `78,70%` | `78,58%` | `787 / 1000` |

### 3.3. Protocolo Agregado de Robustez (`5.000` imagens de validação)

| Condição | Acurácia | $\Delta$ vs. Original | Macro-F1 | Cross-Entropy |
| --- | ---: | ---: | ---: | ---: |
| Original (sem alteração) | `67,86%` | `0,00 p.p.` | `67,56%` | `0,9106` |
| Brilho `-36` (subexposição) | `65,76%` | `-2,10 p.p.` | `65,09%` | `0,9645` |
| Brilho `+36` (superexposição) | `64,40%` | `-3,46 p.p.` | `64,61%` | `0,9957` |
| Contraste `0,65×` (baixo contraste) | `58,60%` | `-9,26 p.p.` | `59,12%` | `1,1588` |
| Contraste `1,40×` (alto contraste) | `64,06%` | `-3,80 p.p.` | `62,61%` | `1,0311` |
| Ruído aditivo leve (`±16`) | `65,16%` | `-2,70 p.p.` | `64,69%` | `0,9829` |
| Ruído aditivo moderado (`±28`) | `54,78%` | `-13,08 p.p.` | `54,42%` | `1,2824` |
| Estação: Subexposição com granulação | `61,32%` | `-6,54 p.p.` | `61,26%` | `1,1038` |

---

## 4. Principais Arquivos e Responsabilidades

| Arquivo | Responsabilidade |
| --- | --- |
| [cifar10Schema.js](../src/features/pixel/data/cifar10Schema.js) | Classes canônicas CIFAR-10, arquitetura de `61.130` parâmetros e limites das ferramentas |
| [pixelOps.js](../src/features/pixel/lib/pixelOps.js) | Normalização, interferência e ferramentas reais de restauração `32×32×3` |
| [cnnMath.js](../src/features/pixel/lib/cnnMath.js) | Correlação cruzada `3×3×3` passo a passo, `MaxPool 2×2`, `GAP`, `Softmax` estável e `Cross-Entropy` |
| [predictPixel.js](../src/features/pixel/lib/predictPixel.js) | Inferência TensorFlow.js sem rótulo, extração de mapas de ativação e descarte de tensores |
| [pixelGame.js](../src/features/pixel/lib/pixelGame.js) | Máquina de estados de **Pixel em Pânico!** (5 rodadas, 3 consultas, 4 desfechos, original privado) |
| [PixelGamePage.jsx](../src/features/pixel/pages/PixelGamePage.jsx) | Interface da estação de manutenção, controles `32×32`, revelação e placar final |
| [PixelLabPage.jsx](../src/features/pixel/pages/PixelLabPage.jsx) | Laboratório científico **PixelLab** com navegação guiada em Entrada, Camadas, Cálculo, Avaliação e Alterações |
| [prepare_cifar10.py](../training/pixel/prepare_cifar10.py) e [train_cnn.py](../training/pixel/train_cnn.py) | Preparação reprodutível do CIFAR-10, treinamento offline, avaliação única e exportação TF.js |
| [verify_official.mjs](../training/pixel/verify_official.mjs) e [explain_example.mjs](../training/pixel/explain_example.mjs) | Auditoria de paridade Python ↔ TF.js e geração do exemplo matemático passo a passo |

---

## 5. Limitações Metodológicas e Distinções Epistemológicas

1. **Cálculo observado vs. interpretação didática vs. hipótese**:
   - *Cálculo observado*: produtos $W \cdot x$, ativações pós-ReLU, logits e probabilidades Softmax.
   - *Interpretação didática*: leitura de sensibilidade espacial de um filtro a gradientes de cor ou borda.
   - *Hipótese*: supor que determinada região ou ajuste de brilho estabilizará a classe correta.
2. **Mapas de ativação não são explicações causais**: um mapa ativo não significa que um filtro "entende" ou "detecta semanticamente" um objeto; ele apenas mede a correlação cruzada numérica com os pesos aprendidos.
3. **Confiança não é acurácia nem probabilidade calibrada**: a CNN pode atribuir alta confiança a uma classe incorreta sob ruído ou baixo contraste, ou acertar com confiança moderada.
4. **Resolução nativa `32 × 32`**: ferramentas de suavização, brilho e contraste não recuperam informação espacial perdida na captura; o módulo não usa super-resolução ou IA generativa.

---

## 6. Roteiro oral de 90 segundos e navegação

A versão refeita usa a identidade visual clara do ChAprendizagem. A entrada fica em `/pixel`, o jogo em `/pixel/jogo` e o laboratório em `/pixel/lab`. Ative **Modo apresentação** (ou abra `/pixel/lab?apresentacao=1`) para consultar falas curtas em cada etapa.

**0–15 s — Proposta.** “Este módulo mostra uma CNN classificando imagens reais do CIFAR-10. Cada imagem tem 32 por 32 pixels, três canais de cor e pertence a uma de dez classes.”

**15–40 s — Uma rodada.** Abra o jogo, leia as três regras e clique em **Começar partida**. “À esquerda está a foto recebida com interferência. À direita vejo minha prévia. Vou alterar o brilho e clicar em Testar ajustes. Posso fazer até três testes. O palpite só muda quando eu testo.” Revele. “Agora comparo imagem recebida, última imagem testada e original. O último palpite correto vale cem pontos, sem bônus por confiança.”

**40–65 s — Da demonstração ao cálculo.** Clique em **Por que a rede respondeu assim?**. “O laboratório recebe os mesmos pixels efetivamente testados nesta rodada. Em Entrada vemos os canais RGB e as dez probabilidades. Em Camadas acompanhamos os mapas reais. Em Cálculo escolho um filtro e uma posição: nove produtos em cada canal, soma do bias e ReLU. Comparamos o resultado com a ativação da própria rede.”

**65–90 s — Avaliação e limites.** Abra **Avaliação**. “A CNN possui 61.130 parâmetros. O treinamento usou 45 mil imagens, com outras 5 mil para validação. No teste oficial de 10 mil imagens, o checkpoint publicado registrou 67,53% de acurácia. O jogo é uma demonstração, não uma medição desse desempenho. Em Alterações mostramos a sensibilidade aos pixels e comparamos com o experimento agregado. Mais confiança não garante acerto.”

### Etapas do PixelLab

1. **Entrada** — imagem em estudo, canais RGB e dez probabilidades; detalhes da normalização e das partições sob demanda.
2. **Camadas** — visão geral da arquitetura, mapas antes/depois de ReLU e pooling, filtros aprendidos e tabela completa de parâmetros.
3. **Cálculo** — posição e filtro selecionáveis, 27 produtos RGB, bias, ReLU e comparação com o modelo; exemplos de pooling, GAP, Softmax e cross-entropy.
4. **Avaliação** — métricas e curvas reais, matriz de confusão, resultados por classe e configuração do treinamento.
5. **Alterações** — brilho, contraste, ruído e suavização; comparação individual e resultados agregados predefinidos.

O seletor de imagem permanece no topo em todas as etapas. Ao sair da comparação da rodada para explorar outra imagem, os controles voltam ao estado neutro. Na comparação importada do jogo, os controles de alterações ficam bloqueados até clicar em **Explorar a partir do original**, evitando mostrar parâmetros que não representam os pixels importados.

## 7. Referências
- Krizhevsky, A. (2009). *Learning Multiple Layers of Features from Tiny Images*. Technical Report, University of Toronto.
- Goodfellow, I., Bengio, Y., & Courville, A. (2016). *Deep Learning*. MIT Press (Cap. 9: Convolutional Networks).
- Kingma, D. P., & Ba, J. (2015). *Adam: A Method for Stochastic Optimization*. ICLR.
