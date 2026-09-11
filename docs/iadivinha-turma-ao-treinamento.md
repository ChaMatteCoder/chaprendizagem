# Checkpoint — Turma do “ÃO” treinada e integrada

Treinamento autorizado em 10/09/2026, checkpoint concluído em 11/09/2026. Continuação da Etapa 5 e da ampliação de escopo; a Etapa 6 não foi iniciada. Sem commit, push ou deploy.

## Entrega

O jogo normal em `/iadivinha` agora carrega uma CNN real com oito saídas. Não precisa de `?preview=turma-ao`. O catálogo único está em `src/features/iadivinha/data/classCatalog.json` e alimenta Python, frontend e o manifesto exportado.

Ordem: gato, pato, sapato, pão, mão, balão de ar quente, avião, violão. `hot-air-balloon` é o identificador interno; `hot air balloon` é o nome do arquivo oficial. A prévia simulada permanece restrita ao desenvolvimento e não é utilizada para classificar no modo normal.

Cada partida contém cinco desafios principais e exatamente uma classe da Turma do “ÃO”, entre as rodadas 2 e 6. Todas as três principais aparecem; não há repetições adjacentes. O nome raro fica oculto na preparação, é revelado com seu desenho e só depois começa o prazo de dez segundos. Resultado e placar identificam a rodada rara. A trilha e o mute foram preservados.

## Experimento real

Oito arquivos oficiais Quick, Draw! verificados por SHA256, com novas fontes registradas em `training/iadivinha/sources.lock.json`. Amostragem balanceada: 10.000 imagens por classe, seed 42, exclusão de bitmaps vazios e duplicatas exatas entre classes. Total de 80.000 imagens: 64.000 treino, 8.000 validação e 8.000 teste.

Smoke de 100 imagens por classe e duas épocas passou antes do treinamento completo. MLP e CNN usam oito saídas, Adam 0,001, batch 128, até 15 épocas e early stopping por perda de validação (paciência 3), restaurando o melhor checkpoint. A escolha usa macro-F1 de validação; o teste não participa da seleção.

| Modelo | Acurácia de teste | F1 macro de teste | Parâmetros |
|---|---:|---:|---:|
| MLP | 88,16% | 88,17% | 109.256 |
| CNN — em uso | 93,60% | 93,60% | 121.800 |

| Classe especial | F1 no teste da CNN | Suporte |
|---|---:|---:|
| Pão | 91,38% | 1.000 |
| Mão | 95,66% | 1.000 |
| Balão de ar quente | 96,62% | 1.000 |
| Avião | 93,40% | 1.000 |
| Violão | 95,77% | 1.000 |

Essas métricas medem bitmaps Quick, Draw!, não a acurácia dos desenhos feitos por jogadores. Não demonstram calibração das probabilidades. O pré-processamento do canvas aproxima a geometria oficial, mas não foi demonstrada identidade pixel a pixel com o rasterizador original.

## Exportação e jogo

Pesos float32 da CNN: 487.200 bytes. Foram copiados localmente, junto de topologia, manifesto de oito classes, contrato de pré-processamento e métricas, para `public/models/iadivinha/`. Nenhum dado bruto foi colocado em `public/`.

As duas redes exportadas foram comparadas com Python em 82 entradas, três repetições por rede. Argmax idêntico, sem crescimento de tensores. Maior erro absoluto: MLP 3,87 × 10⁻⁷; CNN 3,58 × 10⁻⁷, abaixo da tolerância 10⁻⁴. Essa comparação foi executada em TensorFlow.js/Node, backend CPU; não é uma medição WebGL no navegador.

“Ver desempenho” usa o modelo selecionado nas métricas e apresenta a matriz 8×8 com rolagem horizontal. A tela inicial e as regras ativam a Turma do “ÃO” pelo manifesto real carregado.

## Validação da presença durante a partida

- `npm test`: 41 testes passaram, incluindo três partidas completas com inferência da CNN publicada, contrato de oito classes, 100 partidas com exatamente uma rara e os testes existentes de 3.000 sequências.
- Python: nove testes do pipeline passaram; smoke e treinamento completo/exportação concluídos.
- `npm run lint` e `npm run build`: passaram.
- `node training/iadivinha/validate-game-render.mjs`: cinco partidas com o manifesto publicado e os componentes React reais renderizados. Mão na rodada 3; balão na 2; avião e violão na 6; pão na 5. Em todos os casos: preparação esconde o nome, revelação contém o desafio sem canvas/cronômetro, desenho contém prompt/canvas/cronômetro e selo, placar contém seis cartões e exatamente um raro.

**Limite da conferência visual:** a automação de Chrome e do navegador integrado repetidamente expirou ao conectar/navegar, inclusive após reinicialização da sessão. Por isso, nesta entrega a presença foi verificada pelo fluxo real, inferência e renderização dos componentes, mas não por uma nova partida clicada no navegador. As capturas da prévia anterior são históricas e não foram apresentadas como capturas deste treinamento. A animação e a interação visual com o novo modelo ainda precisam dessa conferência; não houve alegação de validação auditiva ou em dispositivo físico.

## Evidências e reprodução

- [Métricas completas](iadivinha/training/eight-class/metrics.json)
- [Matriz de confusão CNN](iadivinha/training/eight-class/cnn-confusion.png)
- [Curvas CNN](iadivinha/training/eight-class/cnn-curves.png)
- [Configuração e hashes do treinamento](iadivinha/training/eight-class/training.json)
- [Paridade da exportação](iadivinha/training/eight-class/export-validation.json)
- [Verificação de renderização das cinco especiais](iadivinha/training/eight-class/game-render-validation.json)
- [Comandos de reprodução](../training/iadivinha/README.md)

Runs locais `eight-smoke` e `eight-full` preservam datasets, modelos e fixtures, ignorados no Git. Relatórios anteriores de três classes permanecem em `docs/iadivinha/training/full/`. Para conferir localmente, recarregue `/iadivinha`, inicie uma nova partida e avance até a rodada especial; ela sempre ocorre antes do fim da sexta rodada.
