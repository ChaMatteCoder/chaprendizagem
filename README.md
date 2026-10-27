# Chaprendizagem de Máquina

Chaprendizagem é um laboratório digital sobre aprendizagem de máquina. O projeto combina explicações teóricas, visualizações interativas e pequenos experimentos de código para transformar conceitos de modelos em páginas navegáveis e fáceis de revisar.

Os módulos incluem **Perceptron**, **Adaline**, **MLP**, **K-Means**, **Convolução** e **CNN CIFAR-10 (PixelLab)**, além dos jogos **Pixel em Pânico!**, **IAdivinha!** e **Sonar ou Azar?**. Cada trilha reúne explicações e experimentos interativos.

## Stack

- **React + Vite** para uma base leve, rápida e simples de expandir.
- **React Router** para navegação entre páginas e módulos.
- **Lucide React** para ícones consistentes.
- **Recharts** para gráficos de treinamento e métricas.
- **Python** em `experiments/` para preservar implementações e estudos de apoio.

## Estrutura do projeto

```text
chaprendizagem/
|-- docs/                         # Documentação técnica e decisões de organização
|-- experiments/                  # Experimentos e protótipos fora da interface React
|   `-- perceptron-python/         # Implementação original do Perceptron em Python
|-- scripts/                      # Utilitários locais
|-- src/
|   |-- app/                      # Composição principal e rotas
|   |-- assets/                   # Recursos estáticos do app
|   |-- components/               # Componentes reutilizáveis entre módulos
|   |-- features/                 # Módulos de estudo organizados por assunto
|   |   |-- adaline/
|   |   |-- functional-approximation/
|   |   `-- perceptron/
|   |       |-- components/
|   |       |-- data/
|   |       |-- lib/
|   |       `-- pages/
|   |-- pages/                    # Páginas globais, como a Home
|   `-- styles/                   # CSS global
|-- index.html
|-- package.json
`-- vite.config.js
```

## Como rodar

### Pixel em Pânico! + PixelLab — CNN real e CIFAR-10

Acesse `/pixel` pelo card **Pixel em Pânico!** em Jogos (`/#jogos`), pelo card **PixelLab — CNN e CIFAR-10** em Projetos (`/#projetos`) ou pelo **Módulo 06** em Módulos (`/#modulos`). Em `/pixel/jogo`, cada partida apresenta cinco casos distintos `32 × 32` RGB da partição de validação do **CIFAR-10** afetados por contraste, brilho ou ruído reproduzível: observe a previsão inicial da CNN (`61.130` parâmetros), aplique ferramentas reais de restauração (suavização `3 × 3`, contraste e brilho), realize até três consultas (`TESTAR AJUSTES`) e conclua a rodada para revelar a fotografia original, o rótulo verdadeiro e os quatro desfechos possíveis (100 pontos por acerto final, máximo 500, sem bônus por confiança).

Em `/pixel/lab`, inspecione a mesma CNN em cinco etapas: **Entrada** (canais RGB, probabilidades e diferença entre confiança, acerto e acurácia), **Camadas** (arquitetura, parâmetros, filtros `3×3×3` e mapas de ativação com escalas explícitas), **Cálculo** (convolução nos três canais, ReLU, pooling e classificação), **Avaliação** (curvas reais, matriz de confusão `10×10` e precisão/recall/F1 por classe) e **Alterações** (exploração interativa e relatório agregado de robustez). O **Modo apresentação** oferece falas curtas para cada etapa.

Comandos: `npm run check:pixel`, `npm run verify:pixel`, `npm run explain:pixel` e `npm run test:pixel`. Documentação: [guia para o professor](docs/pixel-guia-professor.md), [roteiro de apresentação](docs/apresentacao/roteiro-apresentacao-pixel.md), [slides com notas de fala](docs/apresentacao/apresentacao-pixel.pptx), [pipeline de treinamento](training/pixel/README.md), checkpoints ([Etapa 01](docs/pixel-etapa-1.md) a [Etapa 05](docs/pixel-etapa-5.md)) e [exemplo matemático verificável](docs/pixel/etapa-6-exemplo.json).

### Trabalho 05 — Convolução

Acesse `/convolucao` pelo catálogo ou pelo **Módulo 05** na Home. Abra o laboratório, escolha um dos dois exemplos ou envie uma imagem PNG, JPEG ou WebP e aplique um filtro. O módulo compara a original e a convolução em **RGB e escala de cinza**, com oito filtros, kernel editável 3×3 ou 5×5, divisor, deslocamento, módulo e três tratamentos de borda. Clique em um pixel para acompanhar sua vizinhança, o kernel girado em 180°, os produtos e a resposta; também é possível informar coordenadas e canal pelo teclado. Exporte cada resultado em PNG.

O processamento roda localmente em Web Worker. Uploads têm limite de 20 MB e 40 megapixels, são reduzidos proporcionalmente para até 640 px no maior lado e recebem fundo branco nas transparências. Alterar a configuração exige uma nova aplicação. O número Trabalho 05 segue o enunciado de processamento de imagens e é independente da numeração da trilha Adaline.

Implementação, convenções matemáticas e limites: [guia do módulo](docs/convolucao.md). Testes específicos: `npm run test:convolution`; validação geral: `npm test`, `npm run lint` e `npm run build`.

### Sonar ou Azar? + SonarLab — missão e laboratório

O Trabalho 03 de Aprendizagem Profunda de Modelos Generativos está concluído na **Etapa 06**. Acesse `/sonar` pelo card **Sonar ou Azar?** na seção Jogos da Home. Cada missão sorteia cinco exemplos distintos do teste já avaliado: observe os 60 atributos, escolha Rocha ou Metal, compare com a MLP oficial e revele o resultado para pontuar. O resumo permite revisar cada encontro no SonarLab, com o mesmo trace; a cross-entropy só fica disponível após a revelação. O placar de cinco encontros não é a acurácia científica do modelo.

Em `/sonar/lab`, explore os dados, configure e treine uma MLP real e consulte os resultados oficiais. Experimentos usam somente desenvolvimento (133/33); o modelo oficial **60 → 16 → 2** permanece congelado, com **32/42 acertos**, acurácia **76,19%** e macro-F1 **75,69%** no teste. As artes do cenário foram geradas com a ferramenta de imagem integrada; a capa e as três músicas foram fornecidas pelo usuário. Menu, missão e laboratório têm faixas próprias em loop, com botão de som e mute mantido entre as telas. Quando o navegador bloqueia autoplay, o primeiro clique permite reproduzir. O movimento reduzido é respeitado.

A capa fica em `public/images/sonar/cover.png` e as músicas em `public/audio/sonar/`. O card aparece ao lado do IAdivinha em Jogos (`/#jogos`), com os dois cards empilhados no celular. Nomes originais, destinos e validação: [organização da mídia](docs/sonar-midia.md).

Confira dados, pesos e testes com `npm run check:sonar`, `npm run verify:sonar` e `npm run test:sonar`. `npm run explain:sonar` reproduz o exemplo matemático do guia com pesos oficiais e uma amostra de desenvolvimento, sem treinar ou fazer inferência no teste. Para reproduzir a comparação sem avaliar novamente o teste: `npm run train:sonar -- --run=reproducao-01`. O oficial e a avaliação concluída estão em `public/models/sonar/official/`.

Apresentação, fórmulas, exemplo real, roteiro oral e perguntas: [guia para o professor](docs/sonar-guia-professor.md). Verificações e limites: [auditoria final — Etapa 06](docs/sonar-etapa-6.md). Fonte, licença, hashes, partições e comandos: [guia de reprodução](training/sonar/README.md). Histórico: [plano](docs/sonar-etapa-1.md), [dados](docs/sonar-etapa-2.md), [MLP/artefatos](docs/sonar-etapa-3.md), [SonarLab](docs/sonar-etapa-4.md) e [menu/missão](docs/sonar-etapa-5.md).

### IAdivinha! — Turma do “ÃO”

Na página inicial, encontre o card com capa própria na seção **Jogos** (`/#jogos`), separado dos projetos acadêmicos. As tags são Desenho, 10 segundos e IA.

Acesse `/iadivinha` para jogar **Gato, pato ou sapato?** com uma CNN executada localmente pelo TensorFlow.js.
São seis rodadas: cinco de gato/pato/sapato e uma surpresa da Turma do “ÃO” (pão, mão, balão de ar quente, avião ou violão), entre as rodadas 2 e 6. São dez segundos para desenhar, contados após a revelação, e até 600 pontos.
O canvas aceita mouse, toque e caneta, com desfazer, limpar e espessura de pincel.
Também aceita teclado: Tab até a folha, setas movem o cursor, Espaço inicia/encerra um traço e Shift + seta move mais rápido.
“Ver desempenho”, disponível em Sobre e no placar final, apresenta as métricas reais e a matriz de confusão do experimento.
O início fica disponível após carregar o modelo; falhas exibem uma opção de tentar novamente.
O desafio não é enviado ao classificador; a ordem das classes vem de `public/models/iadivinha/classes.json`.
Rodadas vazias por tempo esgotado valem zero e não são classificadas.
As partidas ficam apenas na memória do navegador; recarregar ou voltar ao início descarta a sessão.
O pipeline de treinamento fica em `training/iadivinha/`. Os desenhos não são enviados a um servidor;
a classificação usa os pesos treinados para as oito categorias. Não há backend de inferência.
Os laboratórios anteriores permanecem disponíveis nas suas rotas.

Validação: `npm test`, `npm run lint` e `npm run build`. O lint cobre a nova feature e os pontos de integração
`App.jsx` e `HomePage.jsx`, sem impor regras retroativamente aos módulos antigos.
Treinamento, dados e reprodução: [training/iadivinha/README.md](training/iadivinha/README.md).
Checkpoint atual: [reconhecimento, cards e áudio](docs/iadivinha-ajustes-finos.md).
Arquitetura e limitações: [guia do módulo](docs/iadivinha-arquitetura.md).
Histórico da ampliação: [Turma do “ÃO” — prévia de oito classes](docs/iadivinha-turma-ao.md).
Trilha em loop no menu e na partida; faixa final toca uma vez, com mute: [checkpoint de áudio](docs/iadivinha-trilha-sonora.md).
Histórico: [Etapa 1](docs/iadivinha-etapa-1.md), [Etapa 2](docs/iadivinha-etapa-2.md) e [Etapa 3](docs/iadivinha-etapa-3.md).

Instale as dependências:

```bash
npm install
```

Execute em modo desenvolvimento:

```bash
npm run dev
```

Acesse:

```text
http://127.0.0.1:5173/
```

Gere a versão de produção:

```bash
npm run build
```

Sirva o build localmente:

```bash
npm run serve:dist
```

### Newsletter com Resend

A base da newsletter usa Vercel Functions e Resend com confirmação de inscrição. Copie `.env.example` para `.env`, preencha as variáveis e execute `npx vercel dev` para disponibilizar tanto o Vite quanto as rotas em `/api`. O `npm run dev` comum continua servindo apenas a interface.

Fluxo disponível:

- `POST /api/newsletter/subscribe`: valida o e-mail e envia o link de confirmação.
- `GET /api/newsletter/confirm`: confirma o token e adiciona o contato ao segmento configurado.
- `POST /api/newsletter/announce`: cria um Broadcast protegido por segredo. Com `NEWSLETTER_SEND_ENABLED=false`, ele permanece como rascunho.

Para criar o anúncio do lançamento atual do K-Means:

```bash
npm run newsletter:announce
```

O script usa o preset `/kmeans` por padrão. Também é possível ser explícito com `npm run newsletter:announce -- --preset=kmeans` ou enviar todos os campos manualmente com `--slug`, `--title`, `--description` e `--url`. Use `--endpoint=https://seu-dominio.com/api/newsletter/announce` quando quiser chamar explicitamente o ambiente de produção. Antes do primeiro envio, verifique o domínio no Resend, crie um segmento para a newsletter e replique as variáveis da `.env` nas configurações do projeto na Vercel.

## Rotas atuais

- `/` - Landing page do laboratório, com projetos em carrossel.
- `/sobre` - História, motivação e proposta do projeto.
- `/contato` - Sobre mim e links principais.
- `/convolucao` - Trabalho 05 de processamento de imagens: filtros em RGB e cinza, kernels editáveis, comparação, inspeção numérica e PNG.
- `/pixel` - Menu e instruções de **Pixel em Pânico!** e **PixelLab** (CNN real sobre CIFAR-10).
- `/pixel/jogo` - Estação de jogo **Pixel em Pânico!**: 5 rodadas `32×32` RGB, ferramentas reais de restauração e até 3 consultas à CNN.
- `/pixel/lab` - Laboratório científico **PixelLab** com 5 seções (dados, camadas/mapas, convolução passo a passo, métricas de treinamento e robustez).
- `/adaline` - Trabalho 05 com teoria, simulação, erro quadrático e teste da rede.
- `/adaline/regressao` - Trabalho 06 com regressão linear usando Adaline, comparação com regressão clássica, Pearson e R².
- `/aproximacao-funcional` - Trabalho 07 com MLP para aproximação funcional, pontos editáveis, curva aproximada, erro por época e métricas.
- `/mlp/classificacao-iris` - Classificação multiclasse da base Iris com uma MLP didática.
- `/kmeans/hub` - Hub da família K-Means com cards separados para os Trabalhos 10 e 11.
- `/kmeans` - Laboratório de agrupamento não supervisionado com centroides, curva EQT e análise do cotovelo.
- `/kmeans/plusplus` - Trabalho 11 com comparação K-Means clássico × K-Means++, curva dupla de EQT e MiniBatchKMeans.
- `/perceptron/teoria` - Base teórica do Perceptron.
- `/perceptron/modelo` - Modelo visual com matriz interativa.
- `/perceptron/resultados` - Painel de treinamento, métricas e resultados.

## Funcionalidades em destaque

- Abertura progressiva dos trabalhos, para apresentar primeiro a capa e revelar a experiência quando o usuário inicia o estudo.
- Card contextual de próximo trabalho no fim das páginas, com animações contínuas e indicação do próximo conteúdo da trilha.
- Botão global `ScrollToTop`, exibido após rolagem em páginas longas para voltar suavemente ao topo.
- Simuladores editáveis para testar dados, parâmetros e resultados diretamente na interface.
- Gráficos com modos **Simplificada** e **Acadêmica**, alternando entre leitura arredondada e maior precisão numérica.
- Download dos gráficos gerados em PNG, respeitando o estado atual da visualização, incluindo zoom, dados alterados e curvas ocultas.

## Organização dos módulos

Cada novo assunto deve entrar em `src/features/<nome-do-modulo>/`, separando:

- `pages/` para telas do módulo.
- `components/` para componentes específicos do módulo.
- `data/` para bases, mocks e constantes.
- `lib/` para regras de negócio, simulações e integrações.

Componentes compartilhados entre vários assuntos ficam em `src/components/`. Experimentos, scripts acadêmicos e protótipos que não fazem parte direta da interface ficam em `experiments/`.

## Dados e integração

- Os dígitos 0 a 9 estão em `src/features/perceptron/data/digits.js`, convertidos a partir da base Python.
- A previsão visual da interface está isolada em `src/features/perceptron/lib/perceptronSimulator.js`.
- Os dados do painel de resultados estão mockados em `src/features/perceptron/data/mockResults.js`.
- A implementação Python original foi preservada em `experiments/perceptron-python/`.
- A base B2 do Adaline está em `src/features/adaline/data/b2Dataset.js`, convertida a partir da planilha `Basedados_B2.xlsx`.
- O treinamento do Adaline roda em `src/features/adaline/lib/adalineTrainer.js`.
- A base do Trabalho 06 está em `src/features/adaline/data/observationsDataset.js`.
- As funções matemáticas da regressão com Adaline estão em `src/features/adaline/lib/regressionAdaline.js`.
- Os gráficos do Trabalho 06 estão em `src/features/adaline/components/RegressionCharts.jsx`.
- A base do Trabalho 07 está em `src/features/functional-approximation/data/sampledPoints.js`.
- A MLP didática do Trabalho 07 está em `src/features/functional-approximation/lib/mlpApproximator.js`.
- As métricas do Trabalho 07 estão em `src/features/functional-approximation/lib/metrics.js`.

## Trabalho 06 - Regressão Linear com Adaline

O Trabalho 06 fica dentro do módulo Adaline e mostra como um neurônio linear adaptativo pode ajustar uma reta a uma base de observações bidimensionais.

A página permite:

- treinar uma Adaline por regra delta;
- comparar a reta aprendida com a regressão linear clássica;
- calcular coeficientes angular e linear;
- calcular correlação de Pearson e coeficiente de determinação;
- editar, limpar, restaurar ou gerar dados aleatórios;
- acompanhar o erro quadrático total por época;
- alternar curvas no gráfico de comparação;
- aplicar zoom no gráfico comparativo;
- exportar os gráficos no estado atual da visualização.

## Trabalho 07 - Aproximação Funcional

O Trabalho 07 fica na rota `/aproximacao-funcional` e apresenta uma rede neural MLP treinada para aproximar uma função a partir de pontos amostrados.

A página permite:

- treinar uma MLP com entrada escalar, camada oculta configurável e saída linear;
- editar, adicionar, remover, restaurar ou perturbar os pontos da base do professor;
- alterar quantidade de neurônios ocultos, taxa de aprendizagem, épocas, função de ativação e seed;
- usar presets como modelo suave, aprendizado rápido, aprendizado instável, mais neurônios e poucas épocas;
- visualizar os pontos reais e a curva aproximada pela rede;
- acompanhar o erro quadrático médio por época;
- comparar `x`, `t`, `y_predito`, erro e erro absoluto em tabela;
- calcular MSE, erro quadrático total, RMSE, MAE, R² e extremos do erro absoluto;
- exportar os gráficos de curva e erro em PNG.
