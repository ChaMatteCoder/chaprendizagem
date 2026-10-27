# Pixel em Pânico! + PixelLab — Checkpoint da Etapa 05

Data: 20 de outubro de 2026. Escopo concluído: implementação completa do jogo **Pixel em Pânico!** (`/pixel/jogo`), tela de menu e instruções (`/pixel`), placar final e integração com o catálogo do ChAprendizagem.

## Regras e Fluxo Implementados

1. **Partidas de 5 rodadas distintas**:
   - `selectMatchRounds` em [pixelGame.js](../src/features/pixel/lib/pixelGame.js) sorteia 5 amostras distintas da partição de validação sem filtrar por acerto prévio da rede, aplicando um preset moderado de interferência (contraste, brilho e ruído aditivo com semente fixa por rodada).
   - A fotografia original e o rótulo verdadeiro permanecem em estado privado até a conclusão da rodada, evitando revelar a resposta em nomes de arquivos, `alt` ou tooltips.

2. **Previsão inicial e ferramentas reais de restauração (`32 × 32 × 3`)**:
   - Ao abrir a rodada, a CNN avalia exclusivamente os pixels corrompidos (`Uint8Array` de `3.072` valores) e exibe o Top 3 inicial e o `argmax` inicial.
   - O jogador dispõe de três ferramentas reais na resolução nativa `32 × 32`:
     - **Suavização `3 × 3`** (`0` a `1,00`, borda por repetição `replicate`).
     - **Contraste** (`0,50×` a `2,00×` em torno de `127,5`).
     - **Brilho** (`-80` a `+80`).
   - Os ajustes são sempre recalculados na ordem fixa `Suavização 3×3 → Contraste → Brilho → Clipping [0, 255]` a partir da imagem corrompida recebida, sem acumular erro de arredondamento.

3. **Orçamento de até 3 consultas (`TESTAR AJUSTES`)**:
   - Mover os controles atualiza a pré-visualização `32 × 32` em tempo real sem consultar a CNN automaticamente.
   - Clicar em **TESTAR AJUSTES** executa uma nova inferência real no modelo TensorFlow.js e consome 1 tentativa apenas quando a previsão retorna com sucesso (falhas técnicas preservam a tentativa e permitem repetição).
   - O botão **REDEFINIR FERRAMENTAS** retorna exatamente à imagem corrompida recebida no início da rodada, nunca à fotografia original.

4. **Conclusão da rodada e pontuação transparente**:
   - O jogador pode concluir a rodada a qualquer momento ou após a 3ª consulta.
   - Na conclusão são revelados: a fotografia original `32 × 32`, o rótulo verdadeiro, a comparação antes/depois (previsão inicial vs. previsão final confirmada), a entropia cruzada e o atalho para inspecionar o caso no **PixelLab**.
   - Pontuação: **100 pontos** se a previsão final confirmada coincidir com o rótulo verdadeiro (`0` caso contrário; máximo de **500 pontos** por partida), sem bônus por confiança.

5. **Contagem separada dos quatro desfechos**:
   - O placar acompanha e exibe separadamente:
     - **Acertou antes e depois** (`keptCorrect`)
     - **Passou de erro para acerto** (`fixedError`)
     - **Passou de acerto para erro** (`brokeCorrect`)
     - **Errou nas duas condições** (`keptError`)
   - O placar da partida é explicitamente distinguido da acurácia científica do modelo.

## Verificação Automatizada da Etapa 05

- `tests/pixel-game.test.js`: valida seleção de 5 rodadas distintas, orçamento de 3 consultas, preservação de tentativa em falha técnica, retorno de redefinição à imagem corrompida, ocultação do original antes da conclusão, pontuação única sem bônus de confiança e cancelamento de respostas atrasadas (`AbortController` / `operationId`).
