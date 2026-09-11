# Checkpoint — Etapa 5: qualidade e acabamento

Data: 10/09/2026. Escopo: Etapa 5, sem iniciar relatório acadêmico, publicar ou realizar commit/push.

## Entrega

- Modal **Ver desempenho**, acessível por Sobre e pelo placar final. Busca as métricas exportadas, mostra acurácia/F1 macro de MLP e CNN, matriz de confusão da CNN, explicações e download do JSON. Possui carregamento, erro, repetição e cancelamento da busca ao desmontar.
- Desenho por teclado: Tab até a folha, setas movem, Espaço inicia/encerra um traço e Shift + seta aumenta o deslocamento. Cursor visível, separado dos pixels enviados ao modelo; sair da folha encerra o traço. Instruções disponíveis antes do cronômetro e durante o desenho.
- Foco visível em controles e canvas; título do diálogo recebe foco ao trocar seu conteúdo. Escape fecha o modal e o foco retorna ao acionador. Tabelas possuem caption e cabeçalhos de linha/coluna.
- Aviso explícito de tempo esgotado na região de status. Mantidos prazo absoluto, indicação visual dos últimos três segundos, estado de processamento e respeito a movimento reduzido.
- [Guia de arquitetura, execução e limitações](iadivinha-arquitetura.md) e README atualizados.

## Validação

`npm run lint` passou sem avisos; `npm test` passou com 33 testes e zero falhas. O teste existente da CNN foi ampliado para percorrer três sessões de seis rodadas com o reducer real: reinício limpa placar/resultados, pontuação confere com as previsões, a contagem de tensores se mantém após cada inferência e retorna ao valor inicial após descarte. Essa cobertura é CPU/Node; a medição WebGL da Etapa 4 permanece documentada separadamente.

No navegador integrado, antes da interrupção:

- Três partidas consecutivas (18 rodadas) com desenhos por teclado e inferência real, sem alterar o prazo: placares 300/600, 200/600 e 200/600. Cada reinício exibiu rodada 1 e zero pontos. Rabiscos de teste foram repetidos entre desafios: os placares não estimam acurácia humana.
- “Ver desempenho” abriu por Sobre e pelo placar. Dados exibidos conferidos: MLP 91,77% de acurácia e 91,78% de F1 macro; CNN 95,23% em ambos. Matriz: gato 956/28/16, pato 51/931/18, sapato 15/15/970.
- A troca para desempenho focou o título. Escape retornou a Sobre ou VER DESEMPENHO, conforme o acionador.
- Layout desktop e 320×740 revisados. Em 320 pixels, largura da página 310 e canvas 278; modal com conteúdo de mesma largura interna (246), sem transbordamento horizontal. O modal usa rolagem vertical para manter as tabelas legíveis.
- Volta ao início durante desenho funcionou. A revisão do código confirmou remoção do intervalo e listener de visibilidade no cleanup; tokens e guardas de sessão cobertos pelos testes impedem respostas atrasadas e pontuação duplicada.

Capturas verificadas: [desempenho desktop](iadivinha/etapa-5/desempenho-desktop.png), [desempenho 320 px](iadivinha/etapa-5/desempenho-320.png), [canvas 320 px](iadivinha/etapa-5/desenho-320.png). As capturas de resultados das três classes e partida completa da [Etapa 4](iadivinha-etapa-4.md) continuam como histórico funcional.

## Build e dependências

`npm run build` passou: 3.749 módulos, 3 min 51 s nesta execução local. Página IAdivinha: 30,75 kB JS (10,77 kB gzip) e 18,01 kB CSS (4,74 kB gzip). Comparada à Etapa 4, a página acrescenta aproximadamente 1,36 kB gzip de JavaScript. O chunk de registro de kernels permaneceu em 932,27 kB (244,70 kB gzip).

A revisão manteve TensorFlow.js completo, importado assincronamente, para preservar os backends/kernels compartilhados com outros laboratórios. Não foram incluídas bibliotecas de gráficos ou de diálogos: as métricas usam tabelas HTML e o diálogo nativo. `git diff --check` passou; avisos de conversão LF/CRLF do Git não são erros de build.

## Arquivos alterados

Novo componente `src/features/iadivinha/components/ModelPerformance.jsx`. Alterados `DrawingCanvas.jsx`, `GameTimer.jsx`, `RoundPreparation.jsx`, `FinalScore.jsx`, `pages/IAdivinhaPage.jsx`, `styles/iadivinha.css`, `tests/iadivinha-model.test.js`, README e documentação desta etapa. Pesos, dataset, treinamento e dependências não foram alterados.

## Limitações

Acessibilidade revisada por estrutura semântica, foco e uso do teclado; não homologada com NVDA/VoiceOver. Desenhar continua sendo uma atividade visual com dez segundos. Não foram testados aparelhos físicos ou Safari/Firefox. A ressalva da Etapa 4 sobre ausência de identidade pixel a pixel com a rasterização original permanece e aparece também em Ver desempenho. Métricas Quick, Draw! não representam a acurácia do canvas.

## Próxima etapa

Somente após aprovação: **Etapa 6 — Relatório acadêmico**, estruturando o LaTeX com problema, dataset, pré-processamento, comparação MLP/CNN, arquitetura, curvas, matriz de confusão, métricas, erros, limitações e referências. Usar os resultados reais registrados; não transformar o placar das partidas de QA em métrica de generalização.
