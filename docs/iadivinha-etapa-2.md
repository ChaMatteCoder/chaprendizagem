# IAdivinha! — checkpoint da Etapa 2

## Entrega

Partida completa em `/iadivinha`: preparação, desenho, processamento, acerto/erro, próxima rodada e resumo final.
Seis rodadas com duas ocorrências de cada classe, sem classes iguais consecutivas. Dez segundos por desenho,
término antecipado, 100 pontos por acerto e máximo de 600. Reinício gera uma nova sequência e zera o histórico.

Canvas com Pointer Events para mouse, toque e caneta, captura de ponteiro, ponto isolado, desfazer por traço,
limpar e pincel de 4 a 18 pixels. O bitmap interno permanece em 560 × 560 ao mudar o tamanho visual.
O prazo é absoluto (`performance.now()`), consultado a cada 100 ms e ao retornar à aba.
O tempo começa somente após “Vamos lá!”. Um timeout captura também um traço ainda em andamento.

**Demonstração explícita:** o simulador gera uma distribuição determinística a partir do hash dos pixels RGBA.
Não reconhece desenhos e não mede sua qualidade. A tela inicial, os resultados e o resumo indicam essa limitação.
O classificador recebe somente imagem e sinal de cancelamento; o desafio é usado separadamente para pontuar.
Canvas vazio bloqueia envio manual. No timeout vazio, a rodada termina com zero pontos e sem chamada ao classificador.

## Arquivos desta etapa

Novos:

- `public/models/iadivinha/classes.json`: fonte única de IDs, rótulos e ordem das saídas.
- `src/features/iadivinha/lib/loadClasses.js`: carregamento/validação do manifesto.
- `src/features/iadivinha/lib/gameSequence.js`: sorteio entre sequências equilibradas válidas, sem laço de tentativas ilimitado.
- `src/features/iadivinha/lib/gameReducer.js`: transições, histórico e pontuação.
- `src/features/iadivinha/lib/drawingImage.js`: detecção de tinta e cálculo do tempo restante.
- `src/features/iadivinha/lib/mockDrawingClassifier.js`: simulador independente do desafio e cancelável.
- `src/features/iadivinha/hooks/useGameSession.js`: sessão, trava síncrona de envio, tokens de requisição e descarte de respostas tardias.
- `src/features/iadivinha/components/RoundPreparation.jsx`, `DrawingScreen.jsx`, `DrawingCanvas.jsx`, `GameTimer.jsx`, `PredictionResult.jsx`, `ProbabilityBars.jsx`, `FinalScore.jsx`.
- `tests/iadivinha.test.js`: 12 testes de regras e contratos.
- Este checkpoint e capturas `docs/iadivinha/screenshots/etapa-2-*.png`.

Atualizados: `IAdivinhaPage.jsx`, `HomeScreen.jsx`, `GameHeader.jsx`, `styles/iadivinha.css`, `src/pages/HomePage.jsx` e `README.md`.
As modificações da Etapa 1 já presentes foram preservadas. Nenhuma nova dependência foi instalada nesta etapa.
Nenhum arquivo de treinamento, peso ou métrica de IA foi criado.

## Decisões técnicas

- Estado do jogo isolado dos componentes visuais; envio duplicado por clique/timeout não conta duas vezes.
- Cancelamento em retorno ao início, reinício e desmontagem. Falha preserva o desenho para tentar novamente.
- Histórico guarda a miniatura real de cada rodada; dados não são enviados a um servidor nem persistidos.
- Textos e estilos exclusivos da feature; laboratórios antigos e CSS global não foram refatorados.
- Foco no conteúdo a cada transição. Aviso discreto nos últimos três segundos; botões e controles têm nomes acessíveis.
- “Sobre” e “Como funciona” ficam desabilitados durante desenho/processamento para não encobrir o cronômetro com um modal.
- “Ver desempenho” científico permanece para a etapa prevista no prompt: não há resultados de modelo a exibir.

## Validação executada

Comandos: `npm run dev`, `npm run lint`, `npm test`, `npm run build`, `git status --short`, `git diff --check`.

- **27 testes aprovados**: 15 existentes e 12 novos.
- **Lint aprovado**, sem avisos, no escopo configurado da feature e integração.
- **Build de produção aprovado**. A feature não importa TensorFlow.js nesta etapa.
- Build final: 46,83 s; chunk JS da feature 22,53 kB (7,90 kB gzip) e CSS 17,29 kB (4,57 kB gzip), além dos recursos compartilhados e fontes.
- `git diff --check` sem erros de whitespace.
- Testes automatizados: balanceamento e variedade de sequência, limite de 600 pontos, acerto/erro, reinício,
  transições inválidas, resposta atrasada, submissão duplicada, vazio/transparência, prazo absoluto,
  retry e cancelamento, manifesto e independência entre desafio e previsão.
- Chrome desktop 1440 × 1000: uma partida completa, sequência Sapato/Pato/Gato/Pato/Sapato/Gato,
  com dois acertos e 200/600 pontos. Esse número é apenas o placar da simulação de QA.
- Verificados bloqueio de vazio, timeout vazio, envio antecipado, desfazer até vazio, limpar,
  ponto isolado, abertura do pincel e ajuste para 18 px, resultados de acerto/erro e resumo de seis rodadas.
- Eventos de mouse, touch e pen enviados pelas ferramentas do navegador, sem alterar relógio, código ou estado interno do jogo.
- Reinício verificado: rodada 1, zero pontos; novo desenho feito em 390 × 844, sem transbordamento horizontal detectado.
- Resultado também conferido em 320 × 740, sem transbordamento horizontal; retorno à Home preserva foco no conteúdo.
- As capturas registram rabiscos de teste, não desenhos classificados por uma rede real.

Capturas: [desenho](iadivinha/screenshots/etapa-2-desenho.png), [erro](iadivinha/screenshots/etapa-2-resultado.png),
[acerto](iadivinha/screenshots/etapa-2-acerto.png), [placar](iadivinha/screenshots/etapa-2-final.png),
[mobile](iadivinha/screenshots/etapa-2-mobile.png).

## Limitações e riscos restantes

- Não existe IA real nesta entrega. Probabilidades e acertos são demonstrativos; não são métricas acadêmicas.
- Touch e caneta foram emulados no Chrome. Dispositivos físicos, Safari/Firefox e leitores de tela reais não foram testados.
- Desenhar exige dispositivo apontador; os botões e o pincel aceitam teclado, mas não há desenho por teclado.
- Falha/retry e cancelamento do classificador foram verificados por testes de lógica, sem provocar falha artificial na interface.
- A validação da nova etapa não equivale a uma auditoria funcional completa dos módulos antigos.
- Os avisos de dependências registrados na Etapa 1 continuam pendentes; não houve atualização ampla.
- O bitmap atual serve à demonstração. A equivalência com Quick, Draw! e a entrada 28 × 28 do modelo serão tratadas nas Etapas 3 e 4.

## Próxima etapa — somente após aprovação

Etapa 3: download oficial de cat/duck/shoe, 10.000 imagens por classe, split estratificado 80/10/10 e semente fixa;
treinar MLP baseline e CNN, comparar com evidências, gerar métricas/curvas/matriz e exportar para TensorFlow.js.
Incluir smoke test reduzido e ignorar dados brutos. Não substituir ainda o simulador no jogo nem fabricar resultados.

## Referências

- [MDN — Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events)
- [MDN — performance.now](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now)
