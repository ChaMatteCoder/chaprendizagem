# IAdivinha — arquitetura e execução

## Executar

Na raiz: `npm install`, depois `npm run dev`. Abra `/iadivinha`. Para validar: `npm run lint`, `npm test` e `npm run build`. Para servir a versão compilada: `npm run serve:dist`.

O treinamento Python e sua reprodução estão em [training/iadivinha/README.md](../training/iadivinha/README.md). O frontend não precisa executar Python: os artefatos exportados estão em `public/models/iadivinha/`.

## Fluxo

`IAdivinhaPage` compõe as telas e os diálogos. `useDrawingModel` carrega o serviço TensorFlow.js, controla estados de carregamento/erro/repetição e libera o modelo ao desmontar. `useGameSession` mantém a sessão e coordena o classificador, enquanto `gameReducer` valida transições e pontuação.

As fases são início, preparação, revelação especial, desenho, processamento, resultado e fim; uma falha de inferência permite repetir a mesma imagem. Cada sessão tem seis rodadas, cinco principais e exatamente uma especial entre as posições 2 e 6, sem classes consecutivas iguais. Cada acerto vale 100 pontos. Preparação não consome tempo; o prazo absoluto de dez segundos começa ao ativar “Vamos lá!” nas principais e somente após a revelação nas especiais.

`DrawingCanvas` armazena traços em coordenadas 560×560 e produz uma imagem RGBA. Mouse, caneta, toque e teclado alimentam os mesmos traços. O cursor de teclado é um elemento visual sobreposto e não entra na imagem enviada à IA. Desfazer remove um traço; limpar apaga todos. Espaço alterna desenho/movimento, setas deslocam 8 unidades e Shift + seta desloca 24.

`preprocessDrawing` usa os traços copiados do canvas para gerar 28×28×1, centralizando e normalizando a espessura conforme a referência Quick, Draw! (256 unidades, diâmetro 16, padding 16). A escolha de pincel permanece visual. Rasterização com supersampling 8×; entradas sem traços mantêm o fallback RGBA. A captura original continua no resultado. `predictDrawing` recebe apenas pixels e cancelamento. O desafio fica na sessão e só é comparado à previsão após a inferência. `classes.json` define o mapeamento dos índices.

## Recursos e descarte

O cronômetro consulta um prazo absoluto, sem somar ticks. Seu efeito remove o intervalo de 100 ms e o listener de visibilidade ao desmontar. O estado sincronizado e os tokens da sessão impedem envio duplicado por clique/timeout e respostas atrasadas.

Carregamentos e previsões obsoletos são cancelados. Tensores temporários são descartados em sucesso, erro e cancelamento; o modelo aguarda leituras em andamento antes de ser descartado. Reinício e volta ao início limpam resultados/imagem retida. Não há persistência das partidas nem backend de inferência.

`ModelPerformance` busca `metrics.json` quando montado e apresenta comparação MLP/CNN, matriz de confusão, explicações e download do JSON. A busca é cancelada ao desmontar e possui erro/repetição. O diálogo nativo oferece fechamento com Escape, contenção de foco e retorno ao acionador; a troca de conteúdo foca seu título.

## Acessibilidade e limites

Controles têm nomes, foco visível e navegação por teclado. Tabelas têm títulos e cabeçalhos de linha/coluna. Estados de carregamento, processamento e tempo têm anúncios sem anunciar cada tick. Animações respeitam movimento reduzido. O desenho continua sendo uma atividade visual com prazo de dez segundos; suporte ao teclado não equivale a uma experiência não visual completa. Não foi realizada homologação com NVDA/VoiceOver ou certificação WCAG.

O modelo conhece gato, pato, sapato, pão, mão, balão de ar quente, avião e violão: rabiscos de outras categorias ainda recebem uma dessas oito saídas. Confiança não garante acerto. As métricas Quick, Draw! medem bitmaps de teste, não desenhos dos jogadores. A conversão RGBA do canvas aproxima a geometria dos bitmaps e não demonstrou identidade pixel a pixel com a rasterização original. Essa ressalva da Etapa 4 permanece.

TensorFlow.js é importado de forma assíncrona e compartilha o runtime com outros laboratórios. O pacote completo mantém compatibilidade de backends/kernels; uma redução manual exige nova validação dos demais módulos. Não houve inclusão de dependências na Etapa 5. As fontes do jogo e os pesos são locais; o primeiro carregamento precisa alcançar os arquivos do site. Não há promessa de funcionamento offline sem cache.
