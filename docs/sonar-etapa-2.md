# Sonar ou Azar? + SonarLab — checkpoint da Etapa 02

Data: 30 de setembro de 2026. Escopo concluído: aquisição, validação, preparação dos dados e protocolo de avaliação. Continuação do [plano da Etapa 01](sonar-etapa-1.md).

## Entrega

O original UCI foi obtido da fonte oficial e preservado sem conversão. Foram implementados módulos JavaScript puros para parsing, validação, auditoria de duplicatas, seleção por ID, preparação de features, divisão estratificada e geração/validação de manifestos. Eles não importam React, TensorFlow.js ou APIs do DOM.

O pipeline verifica integridade antes de preparar dados e preserva manifestos existentes. Foram acrescentados comandos de reprodução e lint dos arquivos Sonar, sem alterar versões de dependências ou o lockfile. Os módulos anteriores permanecem com seu código original.

## Dados efetivamente verificados

| Verificação | Resultado |
| --- | --- |
| Arquivo | `public/data/sonar/sonar.all-data` |
| Bytes | 87.776 |
| Registros | 208 |
| Atributos por registro | 60 números finitos |
| Intervalo observado | mínimo 0, máximo 1 |
| Rocha/R | 97 |
| Metal/M | 111 |
| Duplicatas de registros/vetores | 0 grupos / 0 grupos |
| Vetores iguais com rótulos conflitantes | 0 grupos |
| Linhas removidas/imputações/normalização aprendida | Nenhuma |
| Classes | índice 0 = Rocha/R; índice 1 = Metal/M |

Hash SHA-256 do original:

```text
e90434cdbf00fcf93ffa911fe447ae25606979658e60f1d32e155c3b5240234d
```

IDs `sonar-0001` a `sonar-0208` seguem a linha original. Os atributos mantêm a ordem `Attribute1` a `Attribute60`, e o rótulo da coluna 61 fica separado. O [manifesto de proveniência](../public/data/sonar/provenance.json) inclui fonte, DOI, atribuição, licença, aquisição, política de IDs, ordem e relatório de validação.

Fonte e licença consultadas: [UCI — Sonar](https://archive.ics.uci.edu/dataset/151/connectionist+bench+sonar+mines+vs+rocks), DOI [10.24432/C5T01Q](https://doi.org/10.24432/C5T01Q), CC BY 4.0. “M” mantém a classe original de cilindros metálicos. A atribuição completa e o link da licença estão no [lock](../training/sonar/source.lock.json) e na proveniência distribuída com os dados.

## Partições persistidas

| Divisão | Rocha | Metal | Total |
| --- | ---: | ---: | ---: |
| Desenvolvimento | 77 | 89 | 166 |
| Teste reservado | 20 | 22 | 42 |
| Laboratório — treino | 62 | 71 | 133 |
| Laboratório — validação | 15 | 18 | 33 |

O teste corresponde a aproximadamente 20,19% do corpus. O laboratório subdivide exclusivamente o desenvolvimento.

| Fold da CV | Treino (R / M / total) | Validação (R / M / total) |
| --- | --- | --- |
| 1 | 61 / 71 / 132 | 16 / 18 / 34 |
| 2 | 61 / 72 / 133 | 16 / 17 / 33 |
| 3 | 62 / 71 / 133 | 15 / 18 / 33 |
| 4 | 62 / 71 / 133 | 15 / 18 / 33 |
| 5 | 62 / 71 / 133 | 15 / 18 / 33 |

O [manifesto de partições](../public/data/sonar/partitions.json) contém todos os IDs e o protocolo `sonar-evaluation-v1`. Seeds: 42 (teste), 43 (CV), 44 (laboratório). PRNG Mulberry32, embaralhamento Fisher–Yates e regra de arredondamento estão documentados no [guia de reprodução](../training/sonar/README.md). Nenhuma divisão depende de inferência, acertos ou escolha manual de exemplos.

SHA-256 de `partitions.json` neste checkpoint:

```text
890311ad91fa13a0b30ce165e004c65eba2af19c836a9a07df35f9c934353f1e
```

Treino e validação são disjuntos dentro de cada fold; cada ID do desenvolvimento valida uma vez ao longo dos cinco folds. O teste é excluído de todos. A divisão do laboratório é independente do papel dos folds, embora use o mesmo conjunto de desenvolvimento.

## Arquivos principais

| Arquivo | Responsabilidade |
| --- | --- |
| [sonarSchema.js](../src/features/sonar/data/sonarSchema.js) | Dimensões, ordem dos atributos/classes e índices dos rótulos |
| [sonarDataset.js](../src/features/sonar/lib/data/sonarDataset.js) | Parsing estrito, validação, duplicatas, resolução de IDs e entrada sem rótulo |
| [stratifiedSplit.js](../src/features/sonar/lib/data/stratifiedSplit.js) | PRNG, holdout proporcional e folds estratificados |
| [sonarManifests.js](../src/features/sonar/lib/data/sonarManifests.js) | Protocolo, geração e validação de manifestos |
| [prepare-data.mjs](../training/sonar/prepare-data.mjs) e [source-file.mjs](../training/sonar/source-file.mjs) | CLI de aquisição/reprodução e verificação de hash |
| [sonar-data.test.js](../tests/sonar-data.test.js) | 19 testes do pipeline e seus contratos |
| [.gitattributes](../.gitattributes) | Preservação dos bytes originais e LF dos manifestos |
| [package.json](../package.json) e [eslint.config.js](../eslint.config.js) | Comandos e lint dos novos arquivos, com ambientes Node/puro separados |

Também foram atualizados README e índice de arquitetura para localizar a entrega.

## Reprodução e validação executada

Ambiente: Windows, Node 24.19.0 e npm 11.19.0. As dependências foram instaladas com `npm ci` a partir do lockfile existente; npm foi localizado em `C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js`, sem instalação ou atualização global.

| Verificação executada | Resultado |
| --- | --- |
| `npm run prepare:sonar -- --download` | Download oficial conferido contra o hash; originais e manifestos preservados |
| `npm run check:sonar` | Integridade e reprodução dos dois JSONs aprovadas, sem rede ou escrita |
| `npm test` | **72 testes aprovados, 0 falhas**, incluindo 19 testes Sonar |
| `npm run lint` | Aprovado, zero avisos |
| `npm run build` | Aprovado, 42,33 s |
| Conferência de `dist/data/sonar/` | Original e dois JSONs idênticos byte a byte aos arquivos de entrada |
| `git diff --check` | Aprovado |
| Comparação de `package-lock.json` | Sem alteração |

Os testes incluem dados reais, valores/dimensões inválidos, linhas vazias, coerções numéricas indevidas, IDs repetidos/desconhecidos, duplicatas equivalentes, conflitos de rótulo, cobertura, distribuição por classe, disjunção, corrupção de manifestos e vazamento do teste. Testam também múltiplas seeds/proporções/números de folds, ordem de entrada invertida, ausência de mutação, falhas HTTP/hash e CLI offline fora da raiz do projeto.

A entrada numérica recebe somente as 60 features: um teste usa getters de `label` e `id` que lançam erro se forem lidos. Isso verifica o adaptador de entrada desta etapa; independência da inferência real ainda será testada com o modelo na Etapa 03.

Não houve teste visual em navegador porque não foi criada interface. O build e a suíte existente passaram, mas isso não equivale a uma revisão manual completa dos módulos anteriores.

## Limitações e próximo checkpoint

- A divisão é estratificada por linha. Não há informação de ângulo físico ou agrupamento por objeto em `sonar.all-data` para provar independência entre novas condições de coleta. Esse limite está documentado; não foram inventados grupos.
- Nenhuma transformação aprendida foi aplicada. Se a Etapa 03 introduzir padronização, ela deverá ser ajustada exclusivamente no treino de cada fold/divisão.
- O teste foi inspecionado apenas para integridade, contagem e preparação do protocolo. Não foi usado para treinar, escolher arquitetura, ajustar hiperparâmetros ou gerar métricas de modelo.
- Sem treinamento, pesos, curvas, previsões, métricas de acurácia ou rotas Sonar neste checkpoint.
- Próxima etapa, após validação: **Etapa 03 — MLP real, comparação somente no desenvolvimento, treinamento e artefatos oficiais**. O orçamento e a política de seleção devem ser congelados antes de medir resultados.
