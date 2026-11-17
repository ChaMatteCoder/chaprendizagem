# enGAN.AI — proposta de evolução visual e lógica

Status: direção aprovada pelo usuário; etapas [01 — Direção e contratos](../etapa-01/README.md), [02 — Cena e navegação](../etapa-02/README.md), [03 — DCGAN real](../etapa-03/README.md), [04 — Inferência na aplicação](../etapa-04/README.md) e [05 — Missão jogável](../etapa-05/README.md) concluídas. As imagens deste diretório são mockups gerados com ChatGPT Imagem. As capturas de interface estão na etapa 02, as saídas reais da GAN e curvas registradas na etapa 03, a bancada com G/D rodando no navegador na etapa 04 e a missão completa na etapa 05.

## 1. Diagnóstico do projeto atual

A implementação em `src/features/enganai/` já fornece seis rotas, conteúdo didático, personagens reconhecíveis, estilos isolados, navegação por teclado e componentes reutilizáveis. Isso permite evoluir o módulo sem reconstruir o ChAprendizagem.

A sensação de interface web vem principalmente de quatro decisões de composição:

- O menu lateral permanente e o cabeçalho com breadcrumbs colocam a navegação acima da narrativa.
- A Central distribui a atenção entre apresentação, configuração, quatro cartões de ambientes e explicações. O jogador precisa ler o catálogo antes de viver uma missão.
- Fifi e Lupa aparecem como ilustrações dentro de um painel. Ainda não habitam um cenário nem reagem a acontecimentos.
- Todas as páginas usam uma estrutura semelhante de título, painel, explicação e aviso. Falta uma linguagem própria para jogar, investigar e experimentar.

Na lógica, a arena atual é um quiz de três perguntas conceituais. `illustration.js` produz desenhos procedurais e vetores ilustrativos; ele não contém uma GAN. A coleção salva sementes no navegador. Não existem ainda treinamento, pesos, checkpoints, inferência ou histórico científico do enGAN.AI. Esses limites orientam a ordem das próximas entregas.

## 2. O que aproveitar das sete referências

| Referência | O que aproveitar | Como adaptar |
| --- | --- | --- |
| 1 | Laboratório com atmosfera, personagens em lados opostos e convite claro para jogar | Um cenário mais silencioso, com iluminação localizada e menos painéis simultâneos |
| 2 | Rivalidade compreensível e botão principal fácil de encontrar | Apresentação curta, sem repetir a mesma explicação em vários cartões |
| 3 | Capuz, lupa e figurinos que comunicam os papéis das personagens | Fifi artista travessa; Lupa investigadora. Expressões mais simples e materiais menos brilhantes |
| 4 | Sequência de entrada, investigação, resposta, aprendizado e conclusão | Um fluxo de missão curto, com feedback útil e procedência verificável |
| 5 | Identidade forte e sensação de aventura | Menos cores concorrentes; conquistas e progresso aparecem quando forem relevantes |
| 6 | Mapa de missões e desbloqueio visível | Progresso local simples; os ambientes científicos continuam acessíveis livremente |
| 7 | Personagens grandes integrados ao mundo e foco na disputa | Principal referência de composição, trocando excesso de neon por profundidade e contraste controlados |

As referências misturam GAN, imagens sintéticas, deepfakes e detecção geral de IA. A experiência proposta mantém o conteúdo alinhado ao experimento: imagens do domínio Fashion-MNIST, Gerador e Discriminador treinados nesse domínio e origem das amostras registrada. O dataset trabalha com roupas e acessórios em imagens 28 × 28 em escala de cinza. [Fonte: documentação do PyTorch](https://docs.pytorch.org/tutorials/beginner/basics/data_tutorial.html).

Assim, a missão pergunta **de onde veio a imagem**. A resposta vem da procedência; o palpite da Lupa é uma comparação adicional. A narrativa não deve prometer que observar defeitos visuais ou consultar o Discriminador permite identificar qualquer imagem de IA.

## 3. Direção de arte: Ateliê de Investigação dos Pixels

O jogador entra no ateliê onde a Fifi cria e a Lupa investiga. Bancada, fotografias de evidências, pastas, instrumentos e um mural de casos fazem parte do mesmo lugar. Os controles ocupam posições previsíveis dentro dessa ambientação.

### Paleta e hierarquia

| Função | Direção proposta |
| --- | --- |
| Fundo | Carvão e azul profundo `#141923` |
| Superfícies | Grafite `#252A32`, madeira escura e papel envelhecido |
| Texto | Marfim `#EEE9DD`; texto de apoio mais discreto, com contraste verificado |
| Fifi | Ameixa dessaturada `#775569` e coral localizado no rosto |
| Lupa | Petróleo `#487578`, marfim e tecido castanho |
| Ação principal | Âmbar `#E5B664`, concentrado no próximo passo |
| Resultado | Ícone e mensagem explícitos; cor usada como reforço |

Como orientação de composição, aproximadamente 80% da tela permanece em tons neutros. O brilho se concentra nas expressões e em poucos instrumentos. Evitar contornos luminosos em todos os elementos, gradientes em cada cartão, partículas constantes e várias ações amarelas competindo entre si.

### Personagens e assets

- **Fifi:** preserva a identidade de artista, com capuz ameixa, boina, pincel e expressão travessa. Ela representa uma rede geradora, não uma vilã da desinformação.
- **Lupa:** casaco de investigação, chapéu em petróleo, lente e postura curiosa. Ela também pode errar.
- Criar poses consistentes de repouso, pensamento, comemoração e reação ao erro para cada personagem. Evitar gerar um rosto diferente para cada tela.
- Preparar cenários separados para a entrada, mural de missões e bancada. Reutilizar iluminação, enquadramentos e objetos para reforçar continuidade.
- Textos, botões, gráficos, foco e elementos interativos serão implementados em HTML/SVG. Os mockups não serão usados como uma imagem única clicável.
- Animações breves de olhos, mãos e instrumentos; movimento reduzido oferece estados estáticos equivalentes. Áudio começa desligado e depende de ação do usuário.

### Regras de interação

Uma tarefa principal por tela. Na rodada: observar e responder. Na revelação: entender a origem e avançar. No laboratório: manipular uma variável e examinar seu efeito. Explicações técnicas aparecem sob demanda, sem desaparecer do produto.

O menu lateral atual dará lugar a uma navegação compacta. A entrada parece um menu de jogo; a arena privilegia a amostra; o laboratório oferece instrumentos legíveis. A ambientação muda sem exigir que o jogador reaprenda os controles.

## 4. Telas propostas

| ID | Tela | Papel no sistema |
| --- | --- | --- |
| 01 | Entrada imersiva | Apresentar as rivais e oferecer “Começar missão” e “Explorar o GANLab” |
| 02 | Mural de missões | Mostrar três casos, disponibilidade e progresso real do jogador |
| 03 | Investigação | Exibir uma amostra ampliável, rodada e duas escolhas de origem |
| 04 | Revelação | Separar escolha do jogador, origem registrada e palpite da Lupa |
| 05 | Relatório da missão | Resumir acertos, pontos e amostras revisitáveis |
| 06 | GANLab | Explicar redes, acompanhar o percurso de uma amostra e consultar treinamento registrado |
| 07 | Museu da Evolução | Comparar checkpoints reais com o mesmo vetor latente |
| 08 | Ateliê de Mutações | Gerar por semente, interpolar vetores e guardar criações |
| 09 | Câmara do Caos | Comparar experimentos registrados de estabilidade e diversidade |
| 10 | Arena no celular | Reorganizar evidência, escolhas e feedback em uma coluna confortável |

Os exemplos de amostras, pontuação e épocas dos mockups são ilustrativos. Valores e imagens serão preenchidos pelos registros reais na implementação. Texto e medidas finais serão ajustados no código para legibilidade.

## 5. Plano de implementação por etapas

| Etapa | Evolução visual | Evolução lógica | Critério de conclusão |
| --- | --- | --- | --- |
| **1. Direção e contratos — concluída** | Mockups consolidados, paleta, tipografia, figurinos, quatro expressões por personagem e regras móveis | Doze contratos, estados, pontuação, progressão e separação de exemplos/resultados | [Especificação, exemplos e validação](../etapa-01/README.md) publicados |
| **2. Cena e navegação de jogo — concluída** | Entrada, mural e bancada, três cenários e personagens de produção, controles compactos e nova identidade dos instrumentos | Navegação, preferências, foco, movimento reduzido e aquecimento separado | [Fluxos, capturas e verificações](../etapa-02/README.md); arena aguarda experimento real |
| **3. DCGAN real — concluída** | Amostras com z fixo nas épocas 0/1/4/8, figuras de evolução e perdas sem retoque | Fashion-MNIST verificado, duas execuções PyTorch, checkpoints, histórico, diagnóstico de desenvolvimento e retomada reproduzível | [Pesos, procedência, figuras e validação](../etapa-03/README.md); teste oficial preservado |
| **4. Inferência na aplicação — concluída** | Estados de carregamento, indisponibilidade e tentativa novamente dentro da bancada | ONNX dos quatro checkpoints, manifesto v1, paridade PyTorch/ORT, worker com ONNX Runtime Web, geração e palpite do Discriminador | [Tolerâncias, paridade no Python, Node e Chromium e estados de falha](../etapa-04/README.md); erro máximo ≈ 10⁻⁶ para limite 10⁻⁴ |
| **5. Missão jogável completa — concluída** | Investigar → revelar → relatório, com reações das personagens e mapa atualizado | Rodadas com fotos da partição arena e G(z) ao vivo, resposta única, pontuação calculada e progresso local | [Missão de cinco rodadas, revisão, reinício sem duplicatas e conformidade com os contratos](../etapa-05/README.md) |
| **6. GANLab e Museu** | Bancada científica, diagrama legível, linha do tempo e comparações | Consumir arquitetura, histórico e checkpoints registrados; preservar a mesma amostra entre jogo e laboratório | Cada visualização aponta para sua execução; comparações usam os mesmos vetores e escalas |
| **7. Mutações reais** | Sementes, galeria e interpolação com foco nas imagens | Executar G(z), interpolar no espaço latente, salvar vetor/modelo e exportar a criação | Reabrir uma criação reproduz a amostra; o controle gera saídas intermediárias da rede |
| **8. Câmara do Caos** | Casos comparáveis, efeitos observáveis e conclusão curta | Conectar execuções controladas e registradas; distinguir hipótese de evidência | Cada conclusão indica sua configuração, comparação e limites; resultados não são encenados |
| **9. Acabamento e validação** | Ajustar contraste, tipografia, enquadramentos, áudio opcional e microinterações | Verificar fluxos, falhas, cancelamento, memória, persistência e regressões do ChAprendizagem | Testes e revisão visual aprovados nas telas principais e nos estados de erro |

A produção de assets da etapa 2 e o treinamento da etapa 3 podem avançar em paralelo. A arena definitiva depende da validação de inferência da etapa 4. O primeiro marco completo reúne **entrada, mural, GAN real, missão, relatório, GANLab e Museu**. Mutações e Caos ampliam esse núcleo depois.

## 6. Arquitetura lógica recomendada

### Treinamento e artefatos

Manter o frontend React/Vite/Router. Criar `training/enganai/` para preparação, modelos, configuração, treinamento, avaliação e exportação. Publicar os artefatos do experimento em `public/models/enganai/` e os dados necessários à experiência em `public/data/enganai/`.

A proposta inicial é uma DCGAN compacta, incondicional, com vetor latente de dimensão configurável e saída `1 × 28 × 28`. Uma configuração inicial pode projetar o vetor para `128 × 7 × 7` e ampliar até `28 × 28`; o Discriminador reduz a imagem e produz um logit. Isso precisa ser testado, não tratado como configuração ótima. Usar saída Tanh com normalização compatível, perdas estáveis e atualização alternada das redes, preservando corretamente o caminho dos gradientes. O tutorial oficial fornece uma referência para essa dinâmica; a arquitetura precisa ser adaptada ao tamanho do Fashion-MNIST. [Referência: DCGAN em PyTorch](https://docs.pytorch.org/tutorials/beginner/dcgan_faces_tutorial.html).

Registrar configuração, versões, sementes, divisão dos dados, pesos, épocas e histórico. Reservar amostras para a arena sem usá-las no treinamento; manter o teste final separado das escolhas de configuração. Comparações de evolução usam um conjunto fixo de vetores reais salvo como artefato. Um número de semente isolado não garante que geradores aleatórios de linguagens diferentes produzam o mesmo vetor.

### Ponte para o navegador

Recomendo validar **PyTorch → ONNX → ONNX Runtime Web** antes de construir a integração definitiva. O runtime oferece inferência em JavaScript, com execução por WebAssembly e opções de GPU. A compatibilidade das operações, o tamanho dos pesos e o desempenho do modelo exportado precisam ser verificados com o modelo efetivo. [Documentação oficial do ONNX Runtime Web](https://onnxruntime.ai/docs/get-started/with-javascript/web.html).

Começar com um teste técnico de exportação e paridade numérica de G e D. Usar um worker para evitar bloquear a interação, carregar o runtime somente quando necessário e considerar GPU como otimização posterior. Se a exportação não atender ao contrato, avaliar um serviço de inferência PyTorch; essa alternativa exige infraestrutura própria e muda a entrega estática atual. **Decisão da etapa 4:** a exportação atendeu ao contrato, com operações simples, lote dinâmico, bytes reproduzíveis e erro máximo de cerca de 10⁻⁶. A entrega continua estática, com ONNX Runtime Web (WASM) em um worker. [Evidências](../etapa-04/README.md).

### Contratos mínimos

- **Manifesto do modelo:** versão, identificação/hash dos pesos, arquitetura, formato dos tensores, dimensão/distribuição latente, normalização, configuração e origem do experimento.
- **Amostra:** identificador, pixels, origem conhecida e referência ao dataset ou ao modelo/checkpoint/vetor que a produziu. A origem não aparece na interface antes da resposta.
- **Checkpoint:** execução, época registrada, pesos, vetores fixos e amostras correspondentes.
- **Histórico:** eventos de treinamento identificados, perdas, configuração e unidade de registro. Sem pontos inventados para completar curvas.
- **Sessão:** missão, amostras, escolhas, revelações, pontos e estado de conclusão. Placar do jogador e avaliação do modelo ficam separados.
- **Criação salva:** modelo/checkpoint, vetor z, metadados de semente e miniatura. Reproduzir exige o mesmo modelo, não apenas o mesmo número de semente.

### Organização da implementação

Preservar as rotas atuais e acrescentar `/enganai/missoes` para o mural. Investigação, revelação e relatório podem ser estados de `/enganai/arena`, preservando a sessão ao avançar. O quiz atual passa a ser um aquecimento opcional, com placar próprio.

Reaproveitar `GanShell.jsx` para o novo enquadramento e manter o conteúdo didático de `data/content.js`. Introduzir uma sessão de jogo independente da apresentação, um carregador validado dos artefatos e um worker de inferência. As funções de demonstração de `lib/illustration.js` continuam separadas das funções do modelo real.

O Museu pode consumir imagens já produzidas e registradas por cada checkpoint; não precisa baixar todos os pesos para exibir a linha do tempo. Geração e interpolação usam os pesos do checkpoint selecionado, carregados quando necessários. Isso reduz o custo de navegação sem substituir resultados reais por desenhos.

## 7. Regras da missão e do progresso

O fluxo principal será `mural → instrução curta → carregamento → investigação → revelação → próxima rodada → relatório`. O jogador pode sair; uma confirmação local informa a perda de uma sessão não concluída quando aplicável.

Proposta inicial: cinco imagens por missão, sem cronômetro, 100 pontos por acerto e máximo de 500. Essa regra é nova para a arena de imagens; o aquecimento conceitual pode ser mantido como tutorial separado. Amostras são escolhidas sem repetição dentro da missão, com origens variadas e seleção reproduzível para depuração.

Após uma resposta, a escolha fica registrada e os botões não pontuam novamente. Só então aparecem a origem verdadeira e o palpite da Lupa. O feedback explica o registro da amostra; não inventa “pistas” como prova de que uma imagem é sintética. O link ao GANLab conserva o identificador da mesma amostra.

O mural começa com três casos associados a estágios de treinamento: **Primeiros rastros**, **Novos padrões** e **O grande duelo**. Os nomes indicam a narrativa, sem garantir que uma época posterior sempre produza melhor qualidade. Se os registros não sustentarem diferença entre os casos, ajustar a dificuldade com base nos resultados observados.

O progresso persiste localmente com versão do esquema e opção de limpar. Registrar conclusão, melhor resultado e revisão de casos. Conquistas simples podem reconhecer ações verificáveis, como concluir a primeira missão ou comparar checkpoints. Ranking online, conta, moedas, notificações e avatar personalizado ficam fora do primeiro marco: eles acrescentam sistema de identidade e operação sem melhorar o aprendizado central nessa fase.

## 8. Laboratório, evolução e experimentos

**GANLab:** preserva as explicações intuitiva/técnica já escritas, mas organiza a tela em torno de uma amostra e de um fluxo. O diagrama mostra dados e etapas; uma animação de aprendizado é identificada como explicação. Valores de perdas e saídas de D vêm dos artefatos. Detalhes das camadas e fórmulas ficam disponíveis sem preencher a primeira visão com texto.

As curvas do mockup são apenas ocupação visual do painel. A implementação não pressupõe que as duas perdas diminuam juntas ou continuamente; a interpretação considera as amostras, a diversidade e o contexto da execução.

**Museu:** substitui a transição procedural atual por checkpoints registrados. Mesmos vetores, normalização e escala nas comparações. A reprodução avança por estados realmente salvos. Se faltar um checkpoint, a interface informa a indisponibilidade e permite escolher outro, sem criar um quadro intermediário fictício.

**Mutações:** substitui os oito números ilustrativos por vetores do modelo. Cada posição do controle define `z(t) = (1−t)zA + tzB`; o resultado exibido é `G(z(t))`. Aplicar controle de frequência e descartar respostas antigas ao arrastar rapidamente. Um indicador discreto informa geração pendente, sem trocar o resultado por uma imagem de outra semente.

**Caos:** começa com poucas execuções comparáveis. Registrar o que mudou, o que ficou fixo e quais diferenças foram observadas. Uma falha de diversidade precisa aparecer nas amostras de uma execução real; não será simulada repetindo desenhos e chamada de resultado. Explorações conceituais existentes podem continuar disponíveis como tal até haver experimentos suficientes.

## 9. Responsividade, acessibilidade e performance

- Desktop: cenário amplo, evidência central e personagens nas margens. As áreas de leitura permanecem calmas e com contraste próprio.
- Celular: uma coluna, personagens menores, evidência primeiro e respostas próximas. O cenário se recorta em vez de encolher toda a tela. Não exigir orientação horizontal.
- Tipografia de corpo com meta inicial de 16 px; controles de toque com área confortável de pelo menos 44 px. Conferir o resultado real no navegador.
- Botões e escolhas acessíveis por teclado; foco previsível após resposta, revelação e troca de tela. Resultados anunciados por texto e sem dependência exclusiva de cor ou áudio.
- Movimento reduzido desativa parallax, flutuação e celebrações. Som opcional com estado persistente; nenhum áudio deve ser necessário para entender a missão.
- Assets em tamanhos adequados, transparência onde necessária, carregamento progressivo e animações sem bloquear o jogo. O menu inicial não precisa carregar modelos de inferência.
- Erro no carregamento ou inferência apresenta tentativa novamente, contexto preservado e mensagem clara. Nunca substituir a falha por uma previsão ou imagem fabricada.

## 10. Critérios para considerar a evolução concluída

1. A entrada é reconhecível como ambiente de jogo e o primeiro passo fica evidente sem ler vários cartões.
2. Uma missão completa usa amostras com procedência conhecida, calcula pontos de fato e oferece revisão.
3. G e D executam inferência com pesos registrados e passam por validação de paridade.
4. GANLab e Museu usam dados reais; criações e comparações identificam o experimento responsável.
5. O caminho da amostra até a explicação é consistente entre arena, relatório e laboratório.
6. Celular, teclado, movimento reduzido e falhas de carregamento são verificados.
7. A identidade visual é coerente entre cenas, com personagens estáveis e cor reservada para orientar a atenção.

O próximo passo é a **etapa 6 — GANLab e Museu**: consumir arquitetura, histórico e checkpoints registrados e levar o identificador da amostra da revelação até o laboratório.
