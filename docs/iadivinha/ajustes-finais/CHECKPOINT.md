# IAdivinha — ajustes finais da base

12/09/2026. Integra as animações da etapa anterior, a correção da carta rara e a pontuação por confiança aprovada pelo usuário.

## Mudanças

- A revelação rara usa um ornamento SVG único, na cor da tinta dos contornos. Foram removidos os três símbolos multicoloridos e suas sombras coloridas. O mesmo componente atende às cinco cartas.
- Somente acertos pontuam: `Math.round(confidence * 100)`. Exemplos: 86% → 86, 78,1% → 78, 100% → 100. Um palpite de outra figura ou folha vazia continua valendo zero. Máximo de 600 pontos nas seis rodadas.
- Cada miniatura do placar mostra seus pontos reais; os rótulos acessíveis, a explicação de regras e a contagem animada também usam a nova regra. O número de acertos continua sendo contado separadamente.
- Porcentagens passam a ter até uma casa decimal. Valores próximos de um aparecem como `>99,9%`; uma saída float32 igual a um aparece como `≈100%`, sem sugerir certeza absoluta. Probabilidades pequenas não são silenciosamente apresentadas como impossíveis: `0 < p < 0,0005` aparece como `<0,1%`.
- Os pontos são arredondados para o inteiro mais próximo. Portanto, uma confiança acima de 99,5% ainda pode render 100 pontos; isso é a regra do jogo, não uma garantia sobre o palpite.

## Auditoria do modelo

Não foi encontrado sinal de saída fixa ou exportação desconfigurada. Os pesos públicos correspondem por SHA256 ao experimento treinado e selecionado. Nenhum peso, dataset ou parâmetro de inferência foi modificado.

O script `training/iadivinha/audit_confidence.py` reexecutou a CNN nos 8.000 exemplos de validação e 8.000 de teste originais. Não treinou nem ajustou calibração usando esses conjuntos.

| Medida no teste Quick, Draw! | Resultado |
| --- | ---: |
| Acurácia reproduzida | 93,60% |
| Confiança média | 94,32% |
| Erro de calibração esperado, 10 intervalos | 0,79 ponto percentual |
| Resultados que a interface antiga arredondava para 100% | 5.463 / 8.000 (68,29%) |
| Saídas numericamente iguais a 1 em float32 | 521 / 8.000 (6,51%) |
| Erros entre os resultados arredondados para 100% | 6 |
| Menor confiança observada | 16,04% |

Todas as oito classes aparecem nas previsões. Probabilidades são finitas, estão em [0,1] e somam um. Quatro entradas sintéticas (branco, preenchido, linha e ruído) produziram confianças entre 24% e 41%; são sondagens de funcionamento, não testes de acurácia. O jogo bloqueia folha vazia antes da inferência.

A validação independente Python ↔ TensorFlow.js foi repetida para ambas as redes em 82 entradas, três vezes: argmax idêntico, sem vazamento de tensores e erro máximo da CNN de `3,58 × 10⁻⁷`, abaixo da tolerância de `10⁻⁴`.

**Interpretação:** há muitas previsões muito concentradas nas classes conhecidas, ampliadas pelo arredondamento da interface antiga. Não há justificativa nesses resultados para retreinar ou reduzir artificialmente as confianças apenas para variar o placar. O conjunto Quick, Draw! não representa todos os rabiscos possíveis do jogador; resultados confiantes ainda podem estar errados. Confiança softmax não mede semelhança geométrica nem qualidade artística. A distinção entre acurácia e calibração está descrita em [Guo et al., ICML 2017](https://proceedings.mlr.press/v70/guo17a.html).

Dados completos: [auditoria de confiança](confidence-audit.json) e [paridade de exportação](export-validation.json).

## Validação da interface e pontuação

- `npm run lint`: aprovado, zero avisos.
- `npm test`: 48 testes aprovados; cobre pontos fracionários arredondados, acerto/erro, total de seis rodadas, duplicação de envio, reinício e formatação dos extremos de probabilidade.
- Testes Python do pipeline: 9 aprovados.
- `npm run build`: aprovado.
- Partida real no navegador: o mesmo desenho parcial de gato recebeu 78,1% em todas as rodadas; apenas as duas rodadas com desafio Gato receberam 78 pontos. Total exibido: **156/600**, com dois acertos. Isso também confirma que o desafio não influencia a previsão.
- Carta rara: ornamento na cor `rgb(23,42,45)`, sem `text-shadow`, sem cronômetro durante a revelação.
- Desktop e mobile de 390 px verificados; placar e barras sem overflow horizontal ou corte de porcentagens. Reiniciar limpa pontuação e volta à primeira rodada.
- As animações, acessibilidade e cancelamentos da etapa anterior foram preservados.

Evidências: [carta rara](carta-rara.png), [acerto de 78 pontos](pontuacao-acerto.png), [placar de 156 pontos](placar.png), [placar mobile](placar-mobile.png), [resultado mobile](resultado-mobile.png) e [registro da partida](partida-real.json).

## Reprodução

```powershell
.venv/Scripts/python.exe training/iadivinha/audit_confidence.py
node training/iadivinha/validate_tfjs.mjs training/iadivinha/runs/eight-full
npm run lint
npm test
npm run build
```

A auditoria completa depende dos artefatos locais em `training/iadivinha/runs/eight-full`, que continuam fora do Git. Seus resultados compactos e o script são versionados.
