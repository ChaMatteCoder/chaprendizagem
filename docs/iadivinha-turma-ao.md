# Checkpoint — Turma do “ÃO”

> Registro histórico da prévia. O treinamento foi posteriormente autorizado e a integração real está documentada no [novo checkpoint](iadivinha-turma-ao-treinamento.md). As pendências e referências a três saídas abaixo descrevem aquela entrega.

## Etapa e limite desta entrega

O repositório estava na Etapa 5 concluída. `git status` foi consultado antes das alterações; não foi encontrado AGENTS.md aplicável. Todas as alterações anteriores foram preservadas. A Etapa 6 não foi iniciada.

A especificação amplia o produto para oito classes. Como os pesos atuais têm três saídas e o pedido condiciona o novo treinamento à autorização, esta entrega prepara a lógica e a interface em **prévia de desenvolvimento explicitamente simulada**. O jogo normal mantém a CNN real e as regras antigas enquanto não houver um modelo compatível. Não se atribui ao modelo atual capacidade de reconhecer as cinco novas categorias.

## Como conferir

Execute `npm run dev` e abra `/iadivinha?preview=turma-ao`. O cabeçalho informa que se trata de uma prévia com oito classes simuladas. A URL só ativa a prévia quando `import.meta.env.DEV` é verdadeiro; ela não ativa simulação no build de produção. `/iadivinha` continua usando os pesos reais atuais.

## Configuração e sorteio

`src/features/iadivinha/data/classCatalog.js` é a fonte de configuração para os oito desafios: identificador, nome do dataset, rótulo, artigo, prompt, tipo, índice e cor. Ordem planejada: cat, duck, shoe, bread, hand, hot air balloon, airplane, guitar. O identificador interno do balão é `hot-air-balloon`; o nome de download permanece `hot air balloon`. Manifestos históricos de três classes e métricas não foram reescritos.

O sorteio escolhe primeiro uma das cinco classes especiais com probabilidade 1/5 e uma posição entre 2 e 6 com probabilidade 1/5. Adiciona as três principais e mais duas principais sorteadas independentemente. Enumera as permutações legais para essa posição especial e escolhe uma sem repetições consecutivas. Assim, nenhum sorteio precisa ser repetido até “dar certo”, e a posição não condiciona a escolha da classe rara. Aceita função aleatória injetada e oferece gerador com semente.

## Revelação e acessibilidade

`SpecialRoundReveal` mostra papel claro, selo amarelo, tinta escura, doodle, confetes gráficos leves e o desafio. Usa somente CSS/transform/opacity, sem dependência adicional. A sequência dura 2.400 ms; com movimento reduzido, fica estática por 700 ms. Não há flash nem partículas em canvas.

A preparação de uma classe especial oculta seu nome. Ao ativar “Vamos lá!”, o reducer entra em `revealing`, sem deadline. Apenas `REVEAL_DONE` da rodada atual cria o canvas e o prazo de dez segundos. Novos BEGIN/SUBMIT e conclusões duplicadas são ignorados. O timeout é cancelado no cleanup; o callback é estável, de modo que renderizações comuns não reiniciam a revelação. Reinício e volta ao início desmontam o componente e limpam o estado.

Uma região de status anuncia rodada rara e desafio. Não há armadilha de foco: a região principal recebe foco, e o início permanece acessível para abandonar a partida. Artigos e nomes vêm do catálogo, incluindo “DESENHE UMA MÃO!” e “DESENHE UM BALÃO DE AR QUENTE!”.

O ponto opcional `playUnlockSound(audio)` exige áudio habilitado, mute desligado e interação inicial já registrada. Aceita adaptador com `playUnlock({ duckGameplay: true })`, isolando futuras decisões de mixagem. Captura falhas síncronas e assíncronas. Nenhum áudio foi criado, baixado ou reproduzido; o jogo funciona sem adaptador.

Resultados mostram apenas as três maiores probabilidades originais, sem renormalizá-las, e selo RARO. O resumo destaca exatamente um cartão com borda amarela e estrela. A pontuação continua em 100 por acerto, no máximo 600.

## Validação

- `npm run lint`: passou, sem avisos.
- `npm test`: 38 testes passaram, zero falhas. Cinco testes novos cobrem 3.000 sequências, obrigatoriedade das principais, rara única/posição, distribuição, semente, adjacências, registro das classes, prazo pós-revelação, reentrância, reinício, cancelamento, movimento reduzido, áudio e top 3. Há também rejeição explícita de modelo de três saídas para manifesto de oito classes.
- `npm run build`: passou em 28,88 s; página 36,81 kB JS (12,98 kB gzip), CSS 19,98 kB (5,22 kB gzip). Nenhuma nova dependência.
- No navegador, rodada rara de violão: durante a revelação `canvas=false`, `timer=false`; após a saída, `reveal=false`, cronômetro `10` e desafio correto.
- Movimento reduzido emulado: `animationName=none`, sem canvas durante a revelação e cronômetro `10` ao final. Resultado raro exibiu exatamente três barras. Emulação restaurada após o teste.
- Partida completa na prévia: seis cartões, exatamente um raro e placar 0/600 com os rabiscos de teste; reinício permitiu nova revelação. O placar simulado não é resultado de aprendizagem de máquina.

Capturas: [revelação](iadivinha/turma-ao/revelacao.png), [rodada](iadivinha/turma-ao/rodada.png), [movimento reduzido](iadivinha/turma-ao/movimento-reduzido.png), [placar](iadivinha/turma-ao/placar.png).

## Arquivos

Novos: `data/classCatalog.js`, `lib/rareReveal.js`, `components/SpecialRoundReveal.jsx`, `tests/iadivinha-rare.test.js` e este checkpoint/capturas. Caminhos de código relativos a `src/features/iadivinha/`, exceto testes e docs.

Atualizados: `lib/gameSequence.js`, `lib/gameReducer.js`, `lib/mockDrawingClassifier.js`, `lib/loadClasses.js`, `lib/loadDrawingModel.js`, hooks da sessão/modelo, página do jogo, HomeScreen, RoundPreparation, DrawingScreen, ProbabilityBars, PredictionResult, FinalScore, ClassDoodle, CSS e README.

## Pendente de autorização: novo treinamento

Não houve download de dataset, treinamento, alteração de pesos/métricas, commit, push, deploy ou PR nesta entrega. Para ativar as novas regras no jogo real será necessário:

1. Fazer o pipeline consumir a ordem do catálogo, com oito classes e quantidades iguais por classe.
2. Executar smoke test reduzido; depois treinamento definitivo MLP/CNN com até 10.000 exemplos por classe e oito saídas.
3. Gerar métricas por classe, matriz 8×8 e seleção pela validação, sem usar o teste para selecionar.
4. Exportar pesos e classes.json compatíveis, validar paridade e desenhos reais, atualizar Ver desempenho e os textos de regras para o modo real de oito classes.
5. Retirar a necessidade da prévia para demonstrar a Turma do “ÃO” e revisar a documentação histórica sem apresentar resultados antigos como resultados de oito classes.

A ativação real e o treino não foram presumidos a partir da aprovação antiga da Etapa 3. Próximo passo recomendado: autorizar essa extensão do treinamento e integração antes do relatório acadêmico. Limitações anteriores de pré-processamento e homologação com leitores de tela/dispositivos físicos permanecem.
