# Checkpoint — Etapa 4: integração com TensorFlow.js

Data: 09/09/2026. Escopo executado: Etapa 4. A Etapa 5 não foi iniciada.

## Resultado

O jogo em `/iadivinha` carrega a CNN exportada na Etapa 3 e classifica os pixels do canvas no navegador. As três classes foram reconhecidas em desenhos feitos no canvas. Uma partida completa terminou com 400/600 pontos, incluindo um erro intencional e uma rodada vazia por tempo esgotado. Não existe fallback para palpites simulados.

O início aguarda o carregamento do modelo. Falhas mostram mensagem e botão para repetir o carregamento. A ordem das saídas é validada contra `classes.json`; o serviço de classificação recebe somente imagem e opções de cancelamento, sem o desafio ou a pontuação. A interface mostra probabilidades e tempo de inferência local, com ressalva de que confiança não é certeza.

## Implementação e decisões

- Importação assíncrona de TensorFlow.js, carregamento de metadados/pesos, validação de entrada/saída e aquecimento antes de liberar o jogo. O backend compartilhado é respeitado.
- Entrada RGBA composta sobre branco, conversão do traço azul-escuro para intensidade, detecção do retângulo ocupado, recorte e centralização sem girar ou espelhar. O maior lado visível ocupa 25 pixels em uma imagem 28×28; a redução integra áreas para preservar traços finos.
- Tensor `float32` com forma `[1, 28, 28, 1]`, fundo 0, tinta 1 e níveis quantizados em `uint8/255`, correspondentes ao contrato do treino. Imagens vazias são rejeitadas.
- Saída validada antes do mapeamento das três probabilidades. Tensores temporários são descartados inclusive em erros e cancelamentos; o modelo só é descartado após encerrar leituras pendentes.
- O hook cancela carregamentos obsoletos e libera o serviço ao desmontar. Os estados de carregamento, erro e repetição substituem a demonstração na interface.

**Limite do requisito de identidade do pré-processamento:** o treino usa bitmaps oficiais já rasterizados, enquanto o canvas fornece RGBA. Formato, polaridade, escala de intensidade e normalização coincidem; não foi demonstrada identidade pixel a pixel com a rasterização Cairo original. A adaptação geométrica foi validada como aproximação: o proxy de 30 bitmaps manteve todas as classes, mas teve erro médio absoluto de pixels de 0,04484. Portanto, a integração funcional está validada; a exigência literal de rasterização idêntica permanece uma ressalva explícita deste checkpoint.

Referências técnicas: [rasterização oficial Quick, Draw!](https://github.com/googlecreativelab/quickdraw-dataset/issues/19#issuecomment-402247262), [ambiente e memória TensorFlow.js](https://www.tensorflow.org/js/guide/platform_environment) e [loadLayersModel](https://js.tensorflow.org/api/latest/#loadLayersModel).

## Validação executada

| Verificação | Resultado |
| --- | --- |
| `npm run lint` | Passou |
| `npm test` | 33 testes passaram, 0 falhas; 6 testes novos da integração |
| `npm run build` | Passou em 25,92 s |
| CNN exportada vs. Python, 32 entradas | Erro absoluto máximo 1,1921×10⁻⁷; tolerância 10⁻⁴ |
| Bitmap → canvas → pré-processamento, 30 entradas | 30/30 classes mantidas; erro médio absoluto de pixels 0,04484 |
| Inferência aquecida, 50 execuções WebGL | Mediana 6,75 ms; p95 9,20 ms; mínimo 5,90 ms; máximo 16,80 ms |
| Pré-processamento + inferência, mesmas 50 execuções | Mediana 11,40 ms; p95 16,00 ms |
| Tensores na página isolada | 0 antes, 8 após carregar, 8 após prever, 0 após descartar |

Medições em Chrome 152 no Windows, backend WebGL, uma execução local. Não representam dispositivos móveis físicos nem latência de carregamento a frio. O relatório bruto está em [browser-validation.json](iadivinha/etapa-4/browser-validation.json).

Os testes automatizados cobrem invariância a translação/escala, orientação, transparência, branco, dimensões inválidas, ponto na borda, contrato de classes/metadados, CNN real, independência do desafio, cancelamento e descarte mesmo com saída inválida.

No navegador:

- Mouse, caneta emulada e toque emulado produziram classificações reais. Gato chegou a 99%, sapato a 98% e pato a 95% nos desenhos registrados.
- O mesmo desenho de pato, com pixels idênticos em duas rodadas, recebeu a mesma previsão tanto no desafio gato quanto no desafio pato. Apenas a pontuação mudou, de 0 para 100.
- Partida de seis rodadas concluída e reinício verificado com pontuação zerada. O cronômetro real permaneceu ativo; atrasos na automação deixaram alguns desenhos incompletos e uma tentativa de caneta fora da área visível resultou em rodada vazia.
- Bloqueio deliberado de `weights.bin` confirmou início desabilitado, mensagem de erro e repetição bem-sucedida após desbloqueio. As configurações temporárias de rede foram restauradas.
- Emulação 390×844: desenho por toque reconhecido como gato (98%), inferência de 15,1 ms e ausência de rolagem horizontal. Não equivale a teste em aparelho físico.

O bundle gerado separa a página IAdivinha (26,32 kB; 9,41 kB gzip) e o registro de kernels TensorFlow.js (932,27 kB; 244,70 kB gzip). A revisão de bundle permanece no escopo da Etapa 5. Os pesos e as métricas de treinamento da Etapa 3 não foram alterados.

## Arquivos desta etapa

Novos:

- `src/features/iadivinha/lib/preprocessDrawing.js`
- `src/features/iadivinha/lib/predictDrawing.js`
- `src/features/iadivinha/lib/loadDrawingModel.js`
- `src/features/iadivinha/hooks/useDrawingModel.js`
- `tests/iadivinha-model.test.js`
- `training/iadivinha/browser-validation.html`
- Este checkpoint e evidências em `docs/iadivinha/etapa-4/` e `docs/iadivinha/screenshots/etapa-4-*.png`.

Atualizados: `IAdivinhaPage.jsx`, `HomeScreen.jsx`, `PredictionResult.jsx`, `ProbabilityBars.jsx`, `FinalScore.jsx`, `src/pages/HomePage.jsx`, README principal e README de treinamento. O classificador simulado antigo permanece apenas como apoio aos testes históricos, sem importação no fluxo de produção. Alterações anteriores do repositório foram preservadas; esta etapa não adicionou dependências.

## Reprodução e capturas

Execute `npm run dev` e abra `/iadivinha`. Para repetir a comparação numérica, é necessário ter executado o pipeline completo da Etapa 3, que gera `training/iadivinha/runs/full/parity-fixtures.json` (ignorado no Git). Abra `/training/iadivinha/browser-validation.html` no servidor de desenvolvimento e use o botão de validação. Essa página é uma ferramenta local, sem rota no aplicativo nem entrada no build de produção.

Capturas: [gato](iadivinha/screenshots/etapa-4-gato.png), [sapato](iadivinha/screenshots/etapa-4-sapato.png), [erro intencional](iadivinha/screenshots/etapa-4-erro.png), [pato](iadivinha/screenshots/etapa-4-pato.png), [fim da partida](iadivinha/screenshots/etapa-4-final.png), [mobile emulado](iadivinha/screenshots/etapa-4-mobile.png) e [comparação do pré-processamento](iadivinha/etapa-4/preprocessing-browser.png).

## Limitações e próxima etapa

As métricas de teste Quick, Draw! da Etapa 3 não medem acurácia dos desenhos de jogadores. A amostra de canvas é uma verificação funcional pequena, sem estimativa estatística de generalização. O proxy bitmap não substitui avaliação com desenhos humanos. Firefox, Safari, aparelhos físicos e muitas partidas consecutivas ainda não foram avaliados.

Próxima etapa proposta, somente após aprovação: **Etapa 5 — Qualidade e acabamento**, com revisão de responsividade, teclado/leitores de tela, feedback de tempo/processamento, timers e tensores em partidas consecutivas, lint/testes/build, bundle/dependências, página ou modal “Ver desempenho”, documentação e capturas finais. Nenhuma publicação, commit ou push foi realizado.
