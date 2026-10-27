# Pixel em Pânico! + PixelLab — contexto e plano da Etapa 01

Status: inspeção concluída e plano de implementação registrado.
Data: 19 de outubro de 2026.

Este documento estabelece o contexto técnico, o protocolo científico e a arquitetura de implementação do módulo **Pixel em Pânico!** e **PixelLab** para a disciplina **Aprendizagem Profunda de Modelos Generativos**, integrando treinamento real de uma Rede Neural Convolucional (CNN) na base **CIFAR-10** com inferência e inspeção matemática verificáveis no navegador.

## 1. Inspeção do repositório

A cópia local foi inspecionada antes de qualquer alteração:

- Árvore Git limpa na partida (`git status -s` vazio). Não há arquivo `AGENTS.md` no repositório; as convenções oficiais estão documentadas em [README.md](../README.md), [docs/architecture.md](architecture.md), [docs/sonar-etapa-1.md](sonar-etapa-1.md) e [docs/convolucao.md](convolucao.md).
- Os 140 testes existentes (`npm test`) e a verificação de lint (`npm run lint`) executam sem erros ou avisos.
- O projeto utiliza JavaScript ESM + React 19 + Vite 7 + React Router DOM 7 + `@tensorflow/tfjs` 4.22.0 + Recharts 3 + Lucide React.
- Os módulos anteriores — especialmente **IAdivinha!** (`/iadivinha`), **Sonar ou Azar? + SonarLab** (`/sonar/*`) e **Convolução 2D** (`/convolucao`) — seguem isolamento por feature em `src/features/<modulo>/` com carregamento `lazy` em [src/app/App.jsx](../src/app/App.jsx).

### Ambiente observado

| Recurso | Versão / Estado | Papel no módulo |
| --- | --- | --- |
| Node.js / npm | v24.20.0 / 11.19.0 | Execução de scripts, validação de artefatos TensorFlow.js e suíte `node:test` |
| `@tensorflow/tfjs` | 4.22.0 | Inferência no navegador/Node, extração de ativações reais e validação de paridade |
| Python | 3.12.14 / 3.14.4 | Pipeline offline de preparação do CIFAR-10, treinamento da CNN, avaliação e exportação |
| Recharts / Lucide React | 3.2.1 / 0.544.0 | Curvas reais de treinamento/validação, barras de probabilidade e iconografia da estação |

## 2. Conceito do produto e núcleo científico compartilhado

O módulo une duas experiências sobre o **mesmo checkpoint treinado** e as **mesmas funções puras de processamento de pixels**:

1. **Pixel em Pânico! (`/pixel/jogo`)**: o usuário opera uma estação de manutenção de imagens que recebe fotografias reais $32 \times 32$ do CIFAR-10 afetadas por interferências reproduzíveis (brilho, contraste e ruído aditivo leve). Em cinco rodadas por partida, ajusta brilho, contraste e suavização para tentar melhorar a classificação da CNN em até três consultas ao botão **Testar ajustes**, sem acesso ao rótulo verdadeiro nem à imagem original antes de concluir a rodada.
2. **PixelLab (`/pixel/lab`)**: laboratório interativo que acompanha a imagem pelas camadas da CNN, inspeciona convoluções e ativações reais passo a passo, apresenta os resultados do treinamento e explora a sensibilidade do modelo congelado a perturbações controladas.

## 3. Base de dados CIFAR-10 e protocolo experimental

- **Fonte oficial**: [CIFAR-10 — Alex Krizhevsky (2009)](https://www.cs.toronto.edu/~kriz/cifar.html), *Learning Multiple Layers of Features from Tiny Images*.
- **Composição**: 60.000 imagens RGB de $32 \times 32$ pixels em `uint8` ($[0, 255]$), divididas oficialmente em 50.000 imagens de treinamento (`data_batch_1` a `data_batch_5`) e 10.000 imagens no teste oficial (`test_batch`).
- **Ordem canônica das 10 classes** (preservada em índices, pesos, manifestos, métricas e interface):
  - `0`: `airplane` → Avião
  - `1`: `automobile` → Automóvel
  - `2`: `bird` → Pássaro
  - `3`: `cat` → Gato
  - `4`: `deer` → Cervo
  - `5`: `dog` → Cachorro
  - `6`: `frog` → Sapo
  - `7`: `horse` → Cavalo
  - `8`: `ship` → Navio
  - `9`: `truck` → Caminhão
- **Protocolo de partição sem vazamento**:
  - O **teste oficial (10.000 imagens)** permanece intocado durante todo o desenvolvimento e é avaliado uma única vez com o checkpoint final congelado.
  - O conjunto de treinamento oficial (50.000 imagens) é dividido de forma **estratificada e reproduzível** (seed fixa `42`) em **45.000 imagens de treino** (4.500 por classe) e **5.000 imagens de validação** (500 por classe).
  - Todas as decisões de treinamento, early stopping e seleção de checkpoint usam exclusivamente a validação.
  - **Pacote de demonstração web (`public/data/pixel/`)**: como a base completa não deve ir para o Git nem para o bundle web, o pipeline exporta um pacote compacto e auditável de amostras reais da partição de validação (ex.: 100 amostras estratificadas, 10 por classe, em formato binário/JSON verificável por SHA-256, com pixels originais em `uint8` sem recompressão JPEG), claramente identificadas como exemplos de demonstração da validação.

## 4. Arquitetura da CNN e contrato do modelo

Arquitetura candidata avaliada e confirmada em `@tensorflow/tfjs` 4.22.0:

```text
Input(32, 32, 3)
→ Conv2D(32, 3×3, padding="same", activation="relu")          # saída [32, 32, 32],   896 parâmetros
→ MaxPooling2D(2×2, strides=2)                                # saída [16, 16, 32],     0 parâmetros
→ Conv2D(64, 3×3, padding="same", activation="relu")          # saída [16, 16, 64], 18.496 parâmetros
→ MaxPooling2D(2×2, strides=2)                                # saída [ 8,  8, 64],     0 parâmetros
→ Conv2D(64, 3×3, padding="same", activation="relu")          # saída [ 8,  8, 64], 36.928 parâmetros
→ GlobalAveragePooling2D(dataFormat="channelsLast")           # saída [64],             0 parâmetros
→ Dense(64, activation="relu")                                # saída [64],          4.160 parâmetros
→ Dense(10, activation="softmax")                             # saída [10],            650 parâmetros
Total: 61.130 parâmetros treináveis
```

- **Pré-processamento**: conversão de `uint8` $[0, 255]$ para `float32` $[0, 1]$ por divisão exata por $255$, layout `NHWC` (`[1, 32, 32, 3]`), canais na ordem `R, G, B`.
- **Função de perda e otimização**: cross-entropy categórica compatível com a saída Softmax (sem aplicar Softmax duas vezes), otimizador Adam, early stopping monitorando a perda de validação com restauração do melhor checkpoint, além de modo `--smoke` explícito e bloqueado para publicação em produção.
- **Contrato de inferência**:
  - Recebe exclusivamente os pixels $32 \times 32 \times 3$ (nunca recebe rótulo, ID, estado da partida ou resposta esperada).
  - Retorna as 10 probabilidades (validadas quanto a finitude, faixa $[0, 1]$ e soma $\approx 1$), classe vencedora (`argmax`), identificação do modelo (`modelId`), logits pré-Softmax e, quando solicitado pelo PixelLab, ativações reais das camadas internas (`preReLU`, `postReLU`, `postPool`, `gap`, `dense1`, `logits`) com descarte rigoroso de tensores (`tf.tidy` / `dispose`).

## 5. Processamento real dos pixels e mecânica do jogo

Todas as perturbações e ferramentas de restauração operam sobre uma representação canônica de pixels $32 \times 32 \times 3$ em `uint8` / `float32`, compartilhada entre Python, testes Node, jogo e PixelLab:

1. **Interferência inicial da rodada** (aplicada sobre a imagem original oculta, com semente determinística da rodada):
   - Deslocamento de brilho ($\Delta b_{\text{corr}}$), ganho de contraste ($\alpha_{\text{corr}}$ em torno do ponto médio $127{,}5$ ou $0{,}5$) e ruído aditivo determinístico ($\eta(x, y, c)$ gerado por PRNG Mulberry32 com seed fixa da rodada), seguido de clipping em $[0, 255]$ e arredondamento inteiro para produzir a **imagem recebida** `corrupted`.
2. **Ferramentas do jogador** (sempre recalculadas a partir da imagem recebida `corrupted`, nunca acumulando erros a cada movimento de slider):
   - Ordem fixa e documentada:
     1. **Suavização** ($\lambda \in [0, 1]$): mistura convexa entre o pixel de `corrupted` e a média $3 \times 3$ por canal com borda refletida (`reflect`), preservando resolução $32 \times 32$.
     2. **Contraste** ($\alpha \in [0{,}5, 1{,}8]$): escala em torno de $127{,}5$: $v' = 127{,}5 + \alpha \cdot (v - 127{,}5)$.
     3. **Brilho** ($\beta \in [-60, +60]$ em escala $[0, 255]$): deslocamento aditivo $v'' = v' + \beta$.
     4. **Clipping e quantização**: limitação a $[0, 255]$ e arredondamento para `uint8`, garantindo que a prévia exibida no canvas (ampliada com `image-rendering: pixelated`) contenha exatamente os mesmos pixels enviados à CNN.
3. **Regras da partida**:
   - 5 imagens distintas sorteadas sem filtrar por acerto prévio da rede.
   - Sliders atualizam a prévia em tempo real sem consumir tentativas; o botão **Testar ajustes** executa a inferência real e consome 1 das 3 consultas apenas se a previsão concluir com sucesso.
   - O botão **Redefinir ajustes** restaura os sliders ao estado neutro (voltando à imagem recebida `corrupted`, nunca revelando a original).
   - Ao concluir a rodada (antecipadamente ou após a 3ª consulta), revelam-se a fotografia original, o rótulo verdadeiro e a comparação entre previsão inicial e previsão final.
   - Pontuação: **100 pontos** se a previsão final corresponder ao rótulo verdadeiro, **0** caso contrário (máximo de 500 pontos), contabilizando separadamente: (1) acertou antes e depois, (2) passou de erro para acerto, (3) passou de acerto para erro e (4) errou nas duas condições.

## 6. Estrutura de arquivos planejada

```text
docs/
  pixel-etapa-1.md ... pixel-etapa-6.md
  pixel-guia-professor.md
  pixel/                                  # Evidências e exemplo matemático exportado
training/pixel/
  README.md
  config.json
  sources.lock.json
  prepare_cifar10.py                      # Download/verificação SHA-256, split 45k/5k/10k e pacote demo
  train_cnn.py                            # Treinamento real, histórico, avaliação e exportação TF.js
  verify_official.mjs                     # Verificação de paridade Python ↔ TF.js, hashes e pacote demo
  explain_example.mjs                     # Reprodução passo a passo de convolução, pooling, GAP e Softmax
public/
  data/pixel/
    provenance.json
    demo-samples.json                     # Amostras reais 32×32 de validação (sem recompressão JPEG)
  models/pixel/official/
    manifest.json
    model.json
    weights.bin
    metrics.json
    history.json
    robustness.json
    parity-fixtures.json
src/features/pixel/
  data/
    cifar10Schema.js                      # 10 classes, nomes PT/EN, limites de ferramentas e arquitetura
  lib/
    pixelOps.js                           # Brilho, contraste, ruído seeded, suavização 3×3 e canais RGB
    cnnMath.js                            # Correlação cruzada 3×3×3 passo a passo, ReLU, MaxPool 2×2, GAP, Softmax, CE
    loadPixelArtifacts.js                 # Loader validado do modelo e das amostras reais
    predictPixel.js                       # Inferência feature-only, extração de ativações e gestão de tensores
    pixelGame.js                          # Máquina de estados das 5 rodadas, 3 consultas, ocultação e placar
  hooks/
    PixelGameContext.js
    usePixelGame.js
    usePixelLab.js
  components/
    PixelChrome.jsx
    PixelCanvas.jsx                       # Renderização 32×32 nítida com grade opcional e canais RGB
    PixelLabDataSection.jsx               # Seção A: Dados e previsões
    PixelLabNetworkSection.jsx            # Seção B: Por dentro da CNN (filtros e mapas de ativação)
    PixelLabConvSection.jsx               # Seção C: Convolução e MaxPooling passo a passo
    PixelLabResultsSection.jsx            # Seção D: Curvas reais, matriz 10×10 e métricas por classe
    PixelLabRobustnessSection.jsx         # Seção E: Resistência a alterações (interativo + agregado)
  pages/
    PixelApp.jsx                          # Contexto compartilhado e sub-rotas /pixel/*
    PixelMenuPage.jsx                     # Menu da estação de manutenção + Como funciona
    PixelGamePage.jsx                     # Jogo de 5 rodadas, revelação da rodada e placar final
    PixelLabPage.jsx                      # Laboratório completo com as seções A–E
  styles/
    pixel.css
tests/
  pixel-data-ops.test.js
  pixel-model-math.test.js
  pixel-game.test.js
```

## 7. Sequência incremental de entrega

1. **Etapa 01 (este documento)**: inspeção do repositório, definição da arquitetura, contratos e plano.
2. **Etapa 02**: pipeline de dados CIFAR-10, divisão estratificada 45.000 / 5.000 / 10.000, pacote de demonstração real e funções puras de processamento de pixels (`pixelOps.js`).
3. **Etapa 03**: treinamento real da CNN, avaliação única no teste oficial, estudo agregado de robustez na validação, exportação para TensorFlow.js e verificação de paridade (`verify_official.mjs`).
4. **Etapa 04**: implementação do **PixelLab** com todas as cinco seções (Dados e previsões, Por dentro da CNN, Convolução passo a passo, Resultados do treinamento e Resistência a alterações).
5. **Etapa 05**: implementação completa do jogo **Pixel em Pânico!** integrado ao mesmo modelo e ao PixelLab, além dos atalhos na Home e rotas em `App.jsx`.
6. **Etapa 06**: inspeção matemática reproduzível (`explain_example.mjs`), revisão de acessibilidade e responsividade, testes automatizados completos, lint, build e guia técnico para apresentação ao professor (`docs/pixel-guia-professor.md`).
