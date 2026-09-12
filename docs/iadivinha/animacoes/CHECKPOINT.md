# Checkpoint — animações e microinterações

Registro histórico desta etapa. A integração aprovada e a nova pontuação por confiança estão no [checkpoint de ajustes finais](../ajustes-finais/CHECKPOINT.md).

Concluído em 12/09/2026. Implementação local, pronta para revisão. Sem commit, push, deploy ou PR nesta etapa.

## Entrega

Os SVGs existentes ganharam movimentos próprios, entradas escalonadas, reação a hover e foco, feedback de botões e transições de tela. A apresentação do cronômetro e do placar acompanha os valores reais. Modelo, dataset, treinamento, áudio, sorteio, seis rodadas e regras de pontuação permanecem iguais.

| Personagem | Movimento |
| --- | --- |
| Gato | Balanço de ±3°, orelhas discretas, piscadas espaçadas e inclinação curiosa no hover/foco. O desenho é uma cabeça, sem cauda. |
| Pato | Caminhada curta com pés alternados, balanço vertical, asa e sombra sincronizada aos passos; retorno suave. |
| Sapato | Dois pequenos saltos, apoio alternado na ponta/calcanhar, cadarços e sombra; reação mais expressiva ao hover/foco. |
| Pão | Respiração elástica e linhas de aroma que sobem e desaparecem. |
| Mão | Dois acenos a partir do pulso, seguidos de pausa. |
| Balão | Flutuação vertical com inclinação e cesta atrasada. |
| Avião | Planada curta e linhas de movimento. |
| Violão | Balanço ritmado, cordas discretas e notas decorativas, sem som adicional. |

As durações variam de 3,1 a 4,6 segundos e as partidas dos loops são desencontradas. As piscadas alternam intervalos de aproximadamente 4,5 e 6,5 segundos.

## Interface e decisões técnicas

- A entrada da home dura até 780 ms: logotipo, título, cards e CTA. O botão não depende da animação para funcionar.
- O card controla hover/foco/pressão, um wrapper controla a entrada, e grupos SVG separados controlam reação e loop. Não há disputa de `transform` entre essas camadas.
- Os cards do catálogo continuam sendo ilustrações sem ação de navegação, com cursor padrão; podem receber foco para a mesma reação visual oferecida ao mouse.
- Transições de fase de 260 ms, sem temporizador de saída ou atraso artificial da inferência. Durante o desenho, somente fade de entrada, cronômetro e feedback dos controles.
- A barra do timer usa `scaleX`, atualizado pelo prazo absoluto já existente; a cor muda suavemente e a pulsação aparece nos últimos três segundos.
- Desfazer/limpar mostram feedback curto por Web Animations, cancelado na próxima edição ou desmontagem. Nenhuma transformação é aplicada ao canvas.
- Acerto: salto do título, carimbo, barras crescendo por `scaleX` e 12 confetes em execução única. Erro: balanço pequeno, sem tremor ou áudio adicional.
- Placar: seis entradas escalonadas, pop nos acertos e contagem de 650 ms. O número final permanece disponível para leitores de tela, e o espaço dos dígitos é reservado para evitar mudança de largura. A contagem não escreve no estado do jogo.
- Revelação rara preservada em 2,4 s (700 ms com movimento reduzido); selo entra primeiro, personagem começa após 650 ms, cronômetro só existe após a revelação.
- Nenhuma dependência nova. Loops em CSS/SVG usam transformações/opacidade; não há estado React atualizado por frame decorativo. O contador usa `requestAnimationFrame` com cancelamento.
- `visibilitychange` pausa animações CSS e conclui a contagem visual ao ocultar o documento. Listeners, intervalos e frames são removidos na desmontagem.

## Movimento reduzido

`prefers-reduced-motion: reduce` desliga todos os loops, passos, saltos e efeitos de partículas. Entradas usam fades de 120 ms, barras mostram o valor final e a revelação fica estática. O placar mostra imediatamente a pontuação real. O feedback de edição é apenas um fade curto; o teclado e as informações continuam disponíveis.

## Validação

- `npm run lint`: aprovado, zero avisos.
- `npm test`: **45 testes aprovados**, incluindo os 30 do IAdivinha. Os dois novos testes verificam valor final exato, monotonicidade, frame atrasado e cancelamento do contador.
- `npm run build`: aprovado após os ajustes finais; Vite, 3.762 módulos.
- `git diff --check`: sem erros de whitespace.
- Navegador integrado: home desktop 1280 px e mobile 390 px sem overflow horizontal. Oito amostras por personagem confirmaram movimento com largura/altura constantes.
- Hover do pato manteve `iad-duck-walk` e dimensões de 243 × 248 px. Tab levou o foco de Gato a Pato com outline sólido visível.
- Movimento reduzido emulado: oito loops com `animation-name: none`, oito entradas com opacidade final 1.
- Partida real, sem mock: Sapato → Pato → Gato → Pão (rara) → Sapato → Gato. Os rabiscos de teste foram classificados como Gato; apenas as duas rodadas de Gato pontuaram, total **200/600**. Reiniciar voltou à rodada 1 e zero pontos.
- Na revelação rara capturada: selo visível, ausência de timer, animação do personagem com atraso de 650 ms; primeira leitura após a revelação: **10 segundos restantes**.
- Mouse e teclado produziram traços; desfazer e limpar desabilitaram corretamente o envio depois de esvaziar o canvas.
- Toque testado no Chrome com `Input.dispatchTouchEvent`: traço visível e controles habilitados. O navegador integrado não suporta esse comando, por isso foi usado o Chrome.
- Timer observado até a expiração, com barra decrescente e transição para resultado vazio após aproximadamente dez segundos. As amostras têm resolução de cerca de um segundo e não representam benchmark de precisão por frame.

## Evidências

- [Home desktop](home-desktop.png) e [mobile](home-mobile.png).
- [Hover do pato](hover-pato.png), [foco pelo teclado](foco-teclado.png) e dois instantes dos passos: [A](passos-1.png), [B](passos-5.png).
- [Revelação rara](rodada-rara.png), [acerto em entrada](resultado-acerto.png), [erro](resultado-erro.png) e [placar](placar-final.png).
- [Canvas mobile](canvas-mobile.png), [traço por toque no Chrome](canvas-toque.png) e [movimento reduzido](movimento-reduzido.png).
- Registros: [movimentos e dimensões](movimentos.json), [partida](partida.json), [cronômetro e edição](cronometro.json), [foco](foco.json).

## Arquivos de implementação

- `src/features/iadivinha/styles/motion.css`: movimentos e acessibilidade.
- `src/features/iadivinha/lib/characterMotions.js`: mapa central de personagens.
- `src/features/iadivinha/lib/animateScore.js` e `components/AnimatedScore.jsx`: contador de apresentação.
- Componentes alterados: `ClassDoodle.jsx`, `HomeScreen.jsx`, `GameHeader.jsx`, `GameTimer.jsx`, `DrawingCanvas.jsx`, `PredictionResult.jsx` e `FinalScore.jsx`.
- `src/features/iadivinha/pages/IAdivinhaPage.jsx`: entrada por fase e pausa de visibilidade.
- `tests/iadivinha-motion.test.js`: testes do contador e cancelamento.

## Limites e possíveis melhorias futuras

As capturas registram instantes; não foi produzido vídeo nem benchmark de FPS. A automação manteve `document.hidden=false` nas tentativas de ocultar/trocar de aba, portanto a pausa por aba invisível foi revisada no código, mas não confirmada por esse teste visual; [registro da tentativa](visibilidade.json). O toque foi emulado no Chrome, sem teste em aparelho físico. A inferência rápida pode concluir antes que os pontos de processamento fiquem perceptíveis; não foi adicionado atraso para exibi-los.

Opcionalmente, uma próxima revisão pode calibrar a intensidade dos movimentos após uso em celular físico e registrar uma demonstração em vídeo. Nenhuma dessas extensões foi iniciada nesta etapa.

**Checkpoint encerrado; aguardando aprovação do usuário.**
