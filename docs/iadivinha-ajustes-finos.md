# Checkpoint — reconhecimento, cards e áudio

Etapa concluída em 11/09/2026. Sem novo treinamento, commit, push ou deploy.

## Gato confundido com pão

O problema foi reproduzido. O canvas usava um pincel de 8 pixels, reduzido junto da imagem. Para desenhos grandes, a entrada da CNN tinha traços muito mais finos que os bitmaps usados no treino. A referência do Quick, Draw! normaliza as coordenadas para 256 unidades e rasteriza com diâmetro 16 e padding 16.

Agora a captura conserva uma cópia dos traços, e a classificação normaliza a geometria e a espessura antes da rasterização em 28×28. Usa supersampling 8× e quantização uint8/255. O pincel escolhido continua determinando a aparência do desenho; a imagem original continua no resultado. Entradas que só possuem RGBA mantêm o caminho anterior. O modelo recebe somente o desenho, nunca a categoria pedida.

Diagnóstico fixo com os primeiros 30 desenhos vetoriais oficiais de cada uma das oito classes, total 240, usando os mesmos pesos:

| Resultado | Antes | Traços normalizados |
|---|---:|---:|
| Classificações corretas | 59/240 | 224/240 |
| Gatos corretos | 9/30 | 29/30 |
| Gatos classificados como pão | 21/30 | 1/30 |

O caminho anterior foi reproduzido com desenho equivalente a 440 pixels de extensão e pincel de 8 pixels, em um canvas de 560 pixels. Esta amostra é um diagnóstico de rasterização, não um conjunto independente de desenhos humanos, nem uma nova métrica de teste do treinamento. Não foi verificada sobreposição com os dados de treinamento. As métricas originais da CNN permanecem 93,60% de acurácia em 8.000 bitmaps de teste. Não foi demonstrada igualdade pixel a pixel com Cairo, e a confiança do modelo não é calibrada.

No navegador, um gato foi desenhado por eventos de mouse, com o pincel padrão e sem modificar pixels ou estado interno. Repetido nas seis rodadas, foi reconhecido como gato nas seis, mesmo quando o desafio era outra categoria. A interface arredondou sua confiança para 100%; isso não significa garantia geral de acerto. Essa evidência sustenta corrigir a entrada antes de considerar mais treinamento.

Fonte: [rasterizador publicado pelos responsáveis pelo Quick, Draw!](https://github.com/googlecreativelab/quickdraw-dataset/issues/19#issuecomment-402247262). Dados Google/Quick, Draw!, CC BY 4.0. [Diagnóstico completo](iadivinha/training/eight-class/stroke-diagnostic.json).

Reprodução local:

```powershell
.\.venv\Scripts\python.exe training/iadivinha/download_diagnostic_vectors.py
node training/iadivinha/diagnose-strokes.mjs
```

## Cards e nomes

Implementados ícones SVG inspirados na referência: pão oval com cortes, mão aberta, balão listrado, avião inclinado e violão com cordas. Cards marrom, lilás, azul, verde e rosa. A galeria usa cinco colunas no desktop, três em telas intermediárias e duas em telas estreitas; as notas decorativas não se sobrepõem aos cards. A revelação usa a cor da categoria.

O rótulo é **Balão**, com “DESENHE UM BALÃO!”. Identificador `hot-air-balloon`, dataset `hot air balloon`, ordem das oito saídas e pesos permanecem iguais. Catálogo e manifesto público foram sincronizados; somente os campos de apresentação das classes mudaram nas métricas públicas. Evidências históricas do treinamento foram preservadas. O pipeline compara a identidade dos datasets, permitindo mudanças de apresentação sem invalidar os dados treinados.

## Música

Som habilitado a cada entrada no jogo, sem restaurar um mute antigo. O controlador tenta autoplay; se o navegador exigir gesto, retoma no primeiro clique/toque/tecla. O usuário pode mutar e desmutar a qualquer momento. Menu e partida ficam em loop; `That's a Wrap!` toca uma única vez no placar. Depois de terminar, mutar/desmutar não reinicia a faixa. Uma nova partida permite um novo encerramento musical.

No navegador: autoplay inicialmente bloqueado; clique em Jogar iniciou música com `muted=false`, `paused=false`, `loop=true`. No placar, a faixa final começou com `loop=false`, terminou naturalmente em 11,8535 segundos e permaneceu encerrada após mute/unmute. Retornar ao início retomou o menu em loop. Mute pausou a reprodução. Verificação pelas propriedades do elemento de áudio; não se alega avaliação auditiva da qualidade sonora.

O primeiro gesto pode ser necessário por [política do navegador](https://developer.chrome.com/blog/autoplay/); a aplicação não desabilita essa proteção.

## Validação e evidências

- 43 testes JavaScript passaram, incluindo normalização de traços e ciclo de áudio.
- Nove testes Python passaram.
- Lint e build passaram.
- Renderização das cinco especiais passou.
- Partida real completa: sequência Pato, Sapato, Pato, **Avião**, Pato, Gato; exatamente um raro na rodada 4. Desenhado o mesmo gato nas seis rodadas para verificar independência do desafio; placar 100/600, corretamente.
- Layout conferido em 1280 e 390 pixels; sem overflow horizontal na tela estreita.

[Cards desktop](iadivinha/ajustes-finos/cards-desktop.png) · [Cards mobile](iadivinha/ajustes-finos/cards-mobile.png) · [Gato reconhecido](iadivinha/ajustes-finos/gato-reconhecido.png) · [Rodada rara](iadivinha/ajustes-finos/rodada-rara.png) · [Placar](iadivinha/ajustes-finos/placar.png) · [Verificações do navegador](iadivinha/ajustes-finos/browser-validation.json).

A conferência visual pendente do checkpoint anterior foi realizada nesta entrega. A próxima etapa acadêmica não foi iniciada.
