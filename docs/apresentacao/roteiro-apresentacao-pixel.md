# Roteiro de apresentação — Pixel em Pânico! e PixelLab

**Duração sugerida:** 9 minutos de apresentação principal, com tempo adicional para perguntas.

**Material:** os slides 1–12 formam a apresentação principal. Os slides 13–15 são apoio para perguntas e referências. Cada slide contém notas com a fala sugerida e as ações na aplicação.

## Preparação antes da aula

1. Na pasta do projeto, execute `npm run dev` e abra o endereço mostrado pelo Vite, normalmente [http://127.0.0.1:5173/pixel](http://127.0.0.1:5173/pixel).
2. Abra o PowerPoint em modo de apresentação e use a visualização do apresentador para ler as notas. Mantenha o navegador em outra janela.
3. Carregue o jogo e o laboratório uma vez antes de apresentar. Os pesos e as amostras já acompanham a aplicação.
4. No PixelLab, o botão **Modo apresentação** mostra falas curtas. O atalho é [abrir roteiro guiado](http://127.0.0.1:5173/pixel/lab?apresentacao=1).
5. Ensaie uma rodada, mas evite decorar uma resposta. As cinco imagens da partida variam, e a rede pode errar.

## Mapa rápido

| Tempo | Slides | Onde mostrar |
| --- | --- | --- |
| 0:00–1:05 | 1–2 | Título e proposta |
| 1:05–2:25 | 3 | Uma rodada no jogo |
| 2:25–3:45 | 4–5 | Entrada e configuração do treino |
| 3:45–6:20 | 6–8 | Camadas e cálculo de uma convolução |
| 6:20–7:50 | 9–10 | Avaliação e matriz de confusão |
| 7:50–9:00 | 11–12 | Alterações e conclusão |

## Slide 1 — Pixel em Pânico! e PixelLab

**Tempo:** 0:00–0:30. **Tema:** Abertura.

### Fala sugerida

> Este projeto usa uma rede neural convolucional para classificar imagens reais do CIFAR-10. A experiência tem duas partes: o jogo Pixel em Pânico!, onde eu altero uma imagem e observo os palpites, e o PixelLab, onde eu explico as camadas e os resultados do modelo.

### Ação na aplicação

Apresente o título. Deixe o site aberto em outra janela. Não comece a partida ainda.

### Base dos valores e afirmações

public/models/pixel/official/manifest.json e metrics.json. Imagem: public/images/pixel/sample-0.png, derivada do pacote real de validação.

## Slide 2 — Classificação sob interferências

**Tempo:** 0:30–1:05. **Tema:** Objetivo.

### Fala sugerida

> A pergunta que conduz a demonstração é: mudar a iluminação, o contraste ou a granulação altera a classificação? O jogo permite experimentar. O laboratório mostra as probabilidades, os filtros e a avaliação. Os dois usam o mesmo checkpoint. A rede recebe os pixels e só depois comparamos o palpite com o rótulo verdadeiro.

### Ação na aplicação

Mostre a entrada /pixel. Aponte as opções Vamos jogar e Explorar a CNN. Depois retorne ao slide.

### Base dos valores e afirmações

src/features/pixel/pages/PixelGamePage.jsx e src/features/pixel/lib/pixelGame.js. src/features/pixel/pages/PixelLabPage.jsx e src/features/pixel/lib/predictPixel.js.

## Slide 3 — Demonstração de uma rodada

**Tempo:** 1:05–2:25. **Tema:** Jogo ao vivo.

### Fala sugerida

> Vou começar uma partida. À esquerda está a imagem com interferência e, à direita, minha prévia. Primeiro observo a foto e escolho um ajuste de brilho, contraste ou suavização. Mover o controle não gasta teste. Ao clicar em Testar ajustes, a rede analisa os novos pixels. Posso testar até três vezes e revelar a qualquer momento. A última previsão efetivamente testada vale para o resultado. Agora revelo a resposta e comparo as três imagens. Um palpite final correto vale cem pontos. Se a previsão continuar errada ou piorar, isso também mostra a sensibilidade da rede.

### Ação na aplicação

Abra /pixel/jogo, clique em Começar partida, faça um ajuste moderado e clique em Testar ajustes. Revele a resposta. Clique em Por que a rede respondeu assim? para abrir os mesmos pixels no PixelLab. Demonstre apenas uma rodada para manter o tempo. Se o botão de teste estiver desabilitado, mude um controle primeiro.

### Base dos valores e afirmações

src/features/pixel/pages/PixelGamePage.jsx e src/features/pixel/lib/pixelGame.js. Captura: docs/pixel/remake/game-desktop.png.

## Slide 4 — CIFAR-10 e divisão dos dados

**Tempo:** 2:25–3:05. **Tema:** Dados.

### Fala sugerida

> O CIFAR-10 reúne sessenta mil imagens coloridas de 32 por 32 pixels, distribuídas em dez classes. Cada imagem fornece 3.072 valores de cor. O pipeline usa 45 mil imagens para ajustar os pesos, cinco mil para validação e dez mil no teste oficial. A validação orienta a escolha do checkpoint. As imagens do jogo vêm de um pacote de cem amostras da validação, identificado como demonstração. Os pixels entram na rede divididos por 255.

### Ação na aplicação

No PixelLab, abra Entrada e o detalhe Normalização, classes e origem dos dados. Mostre os canais RGB. Não permaneça na tabela completa durante a fala.

### Base dos valores e afirmações

public/data/pixel/provenance.json, partitions.json e demo-samples.json. Referência bibliográfica: Alex Krizhevsky, 2009, CIFAR-10.

## Slide 5 — Treinamento do checkpoint

**Tempo:** 3:05–3:45. **Tema:** Treinamento.

### Fala sugerida

> A CNN compacta foi treinada do zero em Python com PyTorch, em CPU, e exportada para o navegador com TensorFlow.js. O treinamento usa Adam e entropia cruzada. A retropropagação calcula como a perda depende de cada parâmetro, e o otimizador atualiza os pesos. O registro contém vinte épocas, com o melhor checkpoint na época vinte. O early stopping tinha paciência quatro e não encerrou antes do limite. O tempo registrado foi de aproximadamente doze minutos e vinte segundos. Esta versão não usa aumento de dados.

### Ação na aplicação

Na etapa Avaliação, abra Consultar configuração de treino e verificação da exportação. Explique que o visitante carrega pesos prontos e não precisa treinar o modelo.

### Base dos valores e afirmações

public/models/pixel/official/manifest.json e metrics.json. training/pixel/train_cnn.py. Tempo exato registrado: 739,565 segundos. Configuração: seed 42, CPU, 6 threads.

## Slide 6 — Arquitetura da CNN

**Tempo:** 3:45–4:35. **Tema:** Camadas.

### Fala sugerida

> A rede começa com três canais RGB. A primeira convolução produz 32 mapas. O pooling reduz altura e largura pela metade. A segunda convolução produz 64 mapas, seguida de outra redução. A terceira mantém 64 mapas com oito por oito posições. A média global transforma cada mapa em um número. Duas camadas densas combinam esses valores, e a Softmax fornece dez probabilidades. Ao todo são 61.130 parâmetros. Os filtros são aprendidos durante o treinamento.

### Ação na aplicação

Abra Camadas. Aponte a arquitetura e alterne os mapas antes da ReLU, depois da ReLU e depois do pooling. Mostre um canal ou uma página de canais. Não atribua significado semântico a um filtro isolado.

### Base dos valores e afirmações

public/models/pixel/official/manifest.json e metrics.json. src/features/pixel/data/cifar10Schema.js.

## Slide 7 — Cálculo real de uma convolução

**Tempo:** 4:35–5:35. **Tema:** Cálculo.

### Fala sugerida

> Para tornar a conta reproduzível, vou selecionar o avião cifar10-val-00077, sem alterações, e manter linha quinze, coluna quinze e filtro zero. O filtro usa uma janela de três por três em cada canal. São nove multiplicações em vermelho, nove em verde e nove em azul. Somo os 27 produtos e acrescento o bias do filtro. Neste exemplo o resultado é aproximadamente 0,015164. O laboratório compara a conta com a ativação extraída do próprio modelo. A pequena diferença numérica vem da precisão de ponto flutuante e da ordem de cálculo.

### Ação na aplicação

Escolha Avião · cifar10-val-00077 em Imagem em estudo para usar o original, sem contexto da rodada. Abra Cálculo. Confirme filtro 0, linha 15 e coluna 15. Expanda um canal para mostrar patch, pesos e produtos. Ao trocar a imagem, os valores mudam. Use os valores deste slide somente nessa amostra original.

### Base dos valores e afirmações

docs/pixel/etapa-6-exemplo.json, amostra cifar10-val-00077. Filtro 0, linha 15, coluna 15. Diferença absoluta medida: 4,452744428729005e-8. Valores exibidos arredondados.

## Slide 8 — Ativações e decisão

**Tempo:** 5:35–6:20. **Tema:** Mecanismo.

### Fala sugerida

> A ReLU mantém valores positivos e zera os negativos. Neste exemplo ela mantém o resultado 0,015164. O max pooling escolhe o maior valor de uma janela de dois por dois. Mais adiante, a média global resume cada um dos 64 mapas. As camadas densas combinam esses valores e a Softmax converte os escores em probabilidades. Na imagem original do avião, a classe vencedora recebe cerca de 30,68%. Esse é um exemplo de acerto com confiança moderada. O modelo recebe apenas os pixels.

### Ação na aplicação

Continue em Cálculo e mostre o exemplo de pooling. Se houver tempo, mostre Softmax e cross-entropy. A confiança deste slide pertence ao avião original do slide anterior.

### Base dos valores e afirmações

docs/pixel/etapa-6-exemplo.json, amostra cifar10-val-00077. maxPool1Check, gapChannelCheck e probabilities.

## Slide 9 — Desempenho no teste oficial

**Tempo:** 6:20–7:05. **Tema:** Avaliação.

### Fala sugerida

> Depois de escolher o checkpoint pela validação, o registro de avaliação usa as dez mil imagens do teste oficial. O modelo acertou 6.753, resultando em 67,53% de acurácia. O macro-F1 foi de aproximadamente 67,34%. O gráfico mostra as perdas reais de treino e validação ao longo das vinte épocas. A função de perda é entropia cruzada, que penaliza a baixa probabilidade atribuída à classe correta. O placar de uma partida com cinco fotos representa somente aquela demonstração.

### Ação na aplicação

Abra Avaliação. Aponte a acurácia, o número de exemplos e as curvas. Se perguntarem sobre desempenho, use os valores do teste oficial e identifique separadamente a validação.

### Base dos valores e afirmações

public/models/pixel/official/manifest.json e metrics.json. public/models/pixel/official/history.json. Acurácia = 6753 / 10000. Macro-F1 é a média dos F1 por classe. O gráfico usa os valores registrados com arredondamento a 6 casas decimais para a planilha editável.

## Slide 10 — Erros por classe

**Tempo:** 7:05–7:50. **Tema:** Matriz de confusão.

### Fala sugerida

> Na matriz de confusão, cada linha representa a classe verdadeira e cada coluna representa o palpite. Os valores na diagonal são acertos. Por exemplo, dos mil gatos do teste, a rede acertou 418 e classificou 268 como cachorro. Isso ajuda a entender por que uma acurácia global não descreve todas as classes. A rede alcança desempenhos diferentes conforme a classe. A tabela do laboratório também apresenta precisão, recall e F1 para cada uma.

### Ação na aplicação

Na etapa Avaliação, mantenha Teste oficial e aponte a linha Gato, a coluna Gato e a coluna Cachorro. Explique os índices usando a mesma ordem da tabela. Evite ler todas as células.

### Base dos valores e afirmações

public/models/pixel/official/manifest.json e metrics.json. officialTest.confusionMatrix. Linhas verdadeiras e colunas previstas, 1.000 exemplos em cada linha.

## Slide 11 — Sensibilidade a alterações

**Tempo:** 7:50–8:40. **Tema:** Robustez.

### Fala sugerida

> Para medir a sensibilidade além de uma foto, o registro compara oito condições nas mesmas cinco mil imagens de validação. Sem alterações, a acurácia foi de 67,86%. Com contraste reduzido para 0,65, caiu para 58,60%. Com ruído uniforme de amplitude 28, caiu para 54,78%. A diferença é de pontos percentuais. Essas medições pertencem à validação e às condições registradas. Uma imagem interativa isolada não mede a robustez geral. Durante a exploração a rede mantém os mesmos pesos.

### Ação na aplicação

Abra Alterações. Se estiver vendo uma imagem do jogo, clique em Explorar a partir do original. Mova um controle moderadamente. Depois aponte a tabela agregada. A previsão individual pode mudar ou permanecer igual.

### Base dos valores e afirmações

public/models/pixel/official/robustness.json, 5.000 imagens de validação. Todas as condições registradas aparecem na tabela. Resultado agregado na validação, não no teste oficial.

## Slide 12 — Conclusão

**Tempo:** 8:40–9:00. **Tema:** Encerramento.

### Fala sugerida

> O projeto conecta uma experiência interativa a uma CNN real e a cálculos verificáveis. Os ajustes podem mudar o palpite, inclusive para pior. O laboratório permite verificar os pixels, as camadas e os resultados do mesmo checkpoint. A avaliação oficial registra 67,53% de acurácia. O principal aprendizado é distinguir a confiança em uma imagem, o acerto daquele caso e o desempenho do modelo no conjunto de teste.

### Ação na aplicação

Encerre a apresentação principal. Use os próximos slides apenas se surgirem perguntas. Não é necessário terminar as cinco rodadas ao vivo.

### Base dos valores e afirmações

public/models/pixel/official/manifest.json e metrics.json. src/features/pixel/pages/PixelGamePage.jsx e src/features/pixel/lib/pixelGame.js. public/models/pixel/official/robustness.json, 5.000 imagens de validação.

## Slide 13 — Perguntas para a discussão

**Tempo:** Opcional. **Tema:** Apoio.

### Fala sugerida

> Este slide serve como consulta durante as perguntas. O modelo é uma CNN classificadora supervisionada. Os pesos ficam congelados no jogo. A confiança corresponde à saída Softmax e não garante acerto. Uma alteração pode ajudar ou atrapalhar porque muda a entrada que a rede processa. As operações de brilho, contraste e suavização não recuperam informação que já se perdeu.

### Ação na aplicação

Consulte somente a pergunta pertinente. Responda com um exemplo da demonstração ou com o registro de avaliação, conforme o caso.

### Base dos valores e afirmações

public/models/pixel/official/manifest.json e metrics.json. src/features/pixel/pages/PixelGamePage.jsx e src/features/pixel/lib/pixelGame.js. src/features/pixel/lib/pixelOps.js.

## Slide 14 — Execução e rastreabilidade

**Tempo:** Opcional. **Tema:** Apoio técnico.

### Fala sugerida

> O site carrega o modelo exportado e o pacote pequeno de amostras. Não exige que o visitante treine a CNN ou baixe toda a base. Para executar a aplicação local, uso npm run dev. A verificação do modelo confere a equivalência numérica com as referências do Python. O comando de explicação reproduz a conta de uma amostra de validação. Os arquivos do checkpoint também registram a arquitetura, a configuração e as métricas.

### Ação na aplicação

Execute os comandos antes da aula. Durante a fala, use o navegador já aberto. Se a porta 5173 estiver ocupada, use o endereço mostrado pelo Vite no terminal. Para abrir as notas do PPTX, use a visualização do apresentador.

### Base dos valores e afirmações

package.json. training/pixel/verify_official.mjs. training/pixel/explain_example.mjs. public/models/pixel/official/manifest.json.

## Slide 15 — Referências e evidências

**Tempo:** Consulta. **Tema:** Referências.

### Fala sugerida

> Os valores apresentados vêm dos artefatos locais do checkpoint e do exemplo matemático registrado. A base CIFAR-10 é de Alex Krizhevsky. As referências de aprendizagem profunda e do Adam sustentam os conceitos. As capturas representam a aplicação e não servem como origem das métricas.

### Ação na aplicação

Use os caminhos no repositório para responder perguntas sobre origem e reprodução. O roteiro em Markdown reúne os atalhos e as falas dos slides.

### Base dos valores e afirmações

Alex Krizhevsky. Learning Multiple Layers of Features from Tiny Images, 2009. https://www.cs.toronto.edu/~kriz/cifar.html
Goodfellow, Bengio e Courville. Deep Learning, 2016, capítulo 9. https://www.deeplearningbook.org/
Kingma e Ba. Adam: A Method for Stochastic Optimization, 2015. https://arxiv.org/abs/1412.6980
Artefatos locais citados em cada slide.

## Exemplo fixo para a explicação matemática

Selecione **Avião · cifar10-val-00077** no laboratório, sem interferência. Use **filtro 0**, **linha 15**, **coluna 15**. Ao selecionar a imagem no topo, o laboratório limpa as alterações da imagem anterior.

| Quantidade | Valor de referência |
| --- | ---: |
| Soma dos produtos no canal R | -0,084916 |
| Soma dos produtos no canal G | 0,297362 |
| Soma dos produtos no canal B | -0,185254 |
| Soma dos 27 produtos | 0,027192 |
| Bias | -0,012028 |
| Resultado antes e depois de ReLU | 0,015164 |
| Máximo da janela de pooling | 0,015164 |
| Média global no canal 0 | 0,183126 |
| Probabilidade de Avião | 30,68% |

Os valores pertencem ao original dessa amostra. Uma imagem do jogo contém interferência e pode gerar outras contas e probabilidades. A exibição arredonda os valores, mas o modelo calcula com ponto flutuante.

## Se algo acontecer durante a demonstração

| Situação | Como conduzir |
| --- | --- |
| A rede erra antes e depois | Diga: “Esses ajustes não corrigiram o palpite. O modelo tem limitações e esse é um caso observado.” Revele e prossiga. |
| A rede acerta e o ajuste a faz errar | Diga: “A mudança dos pixels alterou a decisão para pior. Isso mostra sensibilidade à entrada.” |
| A classe prevista permanece igual | Compare as probabilidades. Elas podem mudar mesmo quando a classe vencedora continua igual. |
| Testar ajustes está desabilitado | Altere um controle. Depois de três testes, revele a resposta. O botão também fica bloqueado durante a inferência. |
| Você alterou a prévia mas não testou | Explique que vale o último teste confirmado. A tela de revelação descarta a prévia pendente. |
| O PixelLab mostra outra conta | Confirme a imagem selecionada, se ela é original ou transformada, a posição e o filtro. Use o exemplo fixo acima. |
| Os controles de Alterações estão bloqueados | Clique em **Explorar a partir do original** para sair da comparação dos pixels importados da rodada. |
| O modelo não carrega | Use **Tentar novamente**. Se persistir, siga pelos slides e identifique a captura como registro da aplicação, sem apresentar um palpite inventado. |
| O tempo fica curto | Demonstre apenas uma rodada. Priorize os slides 1, 3, 4, 7, 9 e 12. |

## Perguntas adicionais para ensaiar

**Por que usar uma CNN em imagens?**
Os filtros processam vizinhanças e compartilham pesos em posições diferentes da imagem. Assim, a arquitetura explora a estrutura espacial dos pixels.

**O projeto usa um modelo pré-treinado de terceiros?**
O checkpoint do projeto registra uma CNN compacta treinada do zero. O navegador recebe a exportação desses pesos e executa a inferência em TensorFlow.js.

**Esse módulo gera imagens?**
A tarefa implementada é classificação supervisionada. O projeto usa convoluções estudadas na disciplina, e as ferramentas alteram os pixels de entrada. Não há geração de novas imagens por um modelo generativo.

**Como a rede aprende?**
A entropia cruzada mede o erro em relação ao rótulo. A retropropagação calcula os gradientes e o Adam usa esses gradientes para atualizar pesos e biases durante o treinamento.

**Qual a diferença entre treino, validação e teste?**
O treino ajusta os parâmetros. A validação orienta a escolha do checkpoint. O teste oficial fornece a avaliação final registrada. As amostras interativas do laboratório pertencem à validação.

**O que significa Macro-F1?**
Para cada classe, calculamos precisão, recall e F1. O Macro-F1 é a média aritmética dos F1 das dez classes. Acurácia e Macro-F1 descrevem aspectos distintos do desempenho.

**Por que não chamar uma ativação de “detector de gato”?**
O mapa registra respostas numéricas aos filtros. Essa observação, isoladamente, não demonstra significado semântico nem uma explicação causal da decisão.

**O laboratório reproduz a conta do modelo?**
O exemplo registra a soma dos produtos, bias, ReLU e comparação com as ativações reais. O manifesto também registra a verificação de equivalência da exportação.

**O jogo mede a acurácia do modelo?**
O placar descreve cinco imagens com interferência. A acurácia de 67,53% vem das dez mil imagens do teste oficial. A tabela de alterações usa cinco mil imagens de validação.

## Versão curta de 90 segundos

> Este projeto usa uma CNN real para classificar imagens do CIFAR-10. Cada foto tem 32 por 32 pixels em três canais de cor. No jogo, uma imagem chega com interferência. Eu ajusto brilho, contraste e suavização, testo até três vezes e revelo a resposta. O último palpite confirmado vale para o resultado. Um ajuste pode ajudar ou atrapalhar. No PixelLab, abro os mesmos pixels testados, vejo os canais RGB e acompanho as camadas da rede. A convolução da primeira camada usa 27 produtos por posição, nove em cada canal, mais um bias. Depois aplicamos ReLU e seguimos até as dez probabilidades. A CNN tem 61.130 parâmetros e o treinamento usou 45 mil imagens, com outras cinco mil para validação. O checkpoint registrou 67,53% de acurácia nas dez mil imagens do teste oficial. O principal é distinguir confiança em uma foto, acerto individual e desempenho no conjunto.

## Arquivos para consulta

- [Guia técnico detalhado](../pixel-guia-professor.md).
- [Métricas do checkpoint](../../public/models/pixel/official/metrics.json).
- [Histórico de treinamento](../../public/models/pixel/official/history.json).
- [Manifesto do modelo](../../public/models/pixel/official/manifest.json).
- [Resultados de alterações](../../public/models/pixel/official/robustness.json).
- [Exemplo matemático](../pixel/etapa-6-exemplo.json).
- [Pipeline e comandos](../../training/pixel/README.md).
