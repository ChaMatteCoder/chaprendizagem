# Etapa 01 — especificação visual e editorial

Fonte de referência: [dez telas aprovadas](../proposta-v2/README.md). Fonte dos valores: [tokens.v1.json](tokens.v1.json). Status: especificado para implementação na etapa 02.

## Identidade

| Item | Decisão |
| --- | --- |
| Nome | enGAN.AI; preservar caixa e ponto |
| Leitura | engana aí |
| Assinatura | Engana aí. Aprende aqui. |
| Universo | Ateliê de Investigação dos Pixels |
| Nome da disputa | A Guerra dos Pixels |
| Promessa | Explorar como duas redes aprendem em uma dinâmica adversarial |
| Papel do jogador | Investigar a origem das amostras e conectar a experiência ao experimento |

O nome ChAprendizagem continua identificando o projeto que abriga o módulo. A marca enGAN.AI funciona como acesso ao início; o nome acessível do link será “enGAN.AI, voltar ao início”. Na forma principal, usar marfim e destacar apenas `.AI` em âmbar. A versão monocromática é adequada onde o âmbar já identifica outra ação.

## Cores e materiais

| Token | Cor | Uso |
| --- | --- | --- |
| scene | `#141923` | Fundo e profundidade do ateliê |
| panel | `#252A32` | Instrumentos e bases opacas de leitura |
| paper | `#E4D2AF` | Evidências, cadernos e etiquetas |
| ink | `#241D18` | Texto em papel e botão âmbar |
| text | `#EEE9DD` | Texto principal em superfícies escuras |
| muted | `#BAB6AC` | Texto secundário em painel |
| fifi | `#775569` | Figurino e opção associada à Fifi |
| lupaAccent | `#487578` | Figurino e detalhes decorativos da Lupa |
| lupaControl | `#375F63` | Fundo de controle com texto marfim |
| primary | `#E5B664` | Próxima ação principal |
| focus | `#F7CD82` | Foco em superfície escura; sobre papel usar ink |

O petróleo de referência tem contraste de aproximadamente 4,24:1 com o marfim. Por isso, os controles recebem `lupaControl`, mais escuro. Os sete pares permitidos estão medidos em [VALIDACAO.json](VALIDACAO.json); as verificações usam valores sem arredondar para decidir a aprovação.

Texto de corpo deve atingir pelo menos 4,5:1. O foco deve ser visível e distinguir o componente da superfície. Essas checagens de cores sólidas orientam a implementação; a tela completa ainda precisa ser conferida sobre seus fundos reais. [Referência do W3C para contraste de texto](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

Madeira, metal e papel dão materialidade às bordas e ao cenário. As áreas de texto mantêm uma superfície calma. Usar aproximadamente 80% de tons neutros, 15% de identidade das personagens e 5% de destaque de ação como orientação de composição, sem transformar isso em uma métrica automática por pixel.

## Tipografia, medidas e foco

- **Lilita One, peso 400:** marca e títulos curtos. É naturalmente encorpada; evitar negrito sintético, parágrafos longos e todo o conteúdo em caixa alta.
- **Manrope, pesos 400/600/700:** instruções, botões, labels e detalhes técnicos.
- Corpo inicial de 16 px, labels de 14 px e notas de 12 px. Informação essencial não deve ficar em notas pequenas.
- Títulos iniciais de 48 px no desktop e 30 px no celular, ajustáveis para quebra de linha.
- Escala de espaços: 4, 8, 12, 16, 24, 32, 48 e 64 px.
- Controles de toque com área de 48 × 48 px ou maior. Espaço entre as duas respostas para evitar toque acidental.
- Foco de 3 px, deslocamento de 4 px; manter contraste no papel e no painel. Foco não depende do hover.

As fontes e suas licenças já existem no repositório. `tokens.v1.json` registra seus caminhos. A implementação pode reutilizar esses arquivos sem baixar fontes externas.

## Componentes a implementar

| Componente | Estados e comportamento |
| --- | --- |
| Botão principal | Âmbar com texto escuro; padrão, hover, foco, pressionado, carregando, indisponível |
| Respostas de origem | Papel e ameixa, igualmente legíveis; nenhuma aparenta ser “a certa” antes da resposta |
| Pasta de missão | Disponível, selecionada, concluída, bloqueada por progressão, artefato indisponível |
| Moldura de evidência | Imagem quadrada, ampliação e descrição; sem procedência visível antes da resposta |
| Caderno de revelação | Escolha humana, origem registrada, palpite da Lupa e procedência em blocos separados |
| Instrumento científico | Dados centrais, abas discretas e detalhes sob demanda |
| Caixa de diálogo | Título claro, cancelamento por Escape, foco contido e devolvido ao acionador |
| Preferências | Som desligado inicialmente; movimento do sistema/reduzido; explicação intuitiva/técnica |
| Aviso de indisponibilidade | Explica o que falta e oferece retorno, aquecimento ou nova tentativa, conforme o caso |

Contornos luminosos, texturas, sons e animações são decoração. Labels, foco, gráficos, tabelas e botões ficam em HTML/SVG/CSS. A arte de uma tela inteira não será usada como interface única com regiões clicáveis.

## Personagens e reações

Fifi mantém capuz ameixa, boina com paleta, pincel, carcaça marfim e olhos coral. Lupa mantém chapéu petróleo com laço, casaco castanho com cinto, lente e olhos turquesa. Preservar formato do rosto, materiais e proporções em todas as poses.

| Momento | Fifi | Lupa | Regra |
| --- | --- | --- | --- |
| Entrada | Repouso acolhedor | Repouso curioso | Convida a explorar |
| Mural | Repouso discreto | Pensamento | A pasta selecionada domina a atenção |
| Investigação | Repouso | Pensamento neutro | A pose não varia em função da origem oculta |
| Revelação | Reação ao evento já revelado | Reação ao próprio palpite | Não antecipar o gabarito pela expressão |
| Acerto humano | Comemoração discreta ou repouso | Comemoração discreta | Texto explica o acerto; sem humilhar no erro |
| Erro da Lupa | Satisfação travessa quando coerente | Surpresa/erro | A rivalidade mostra que o Discriminador é falível |
| Relatório | Encerramento acolhedor | Encerramento acolhedor | Toda missão concluída recebe fechamento positivo |
| Laboratório | Repouso ou pensamento | Repouso ou pensamento | Não encobrir dados e controles |

As [folhas de referência](referencias/) fixam quatro expressões por personagem. Elas não são animações prontas. Pivôs, alinhamento, recortes e transições serão preparados na etapa 02.

## Composição por tela

| Tela | Elemento dominante | Ação principal | Informação sob demanda |
| --- | --- | --- | --- |
| Entrada | Rivalidade dentro do ateliê | Começar missão | Guia e preferências |
| Mural | Três pastas e o caso selecionado | Iniciar missão | Histórico da missão |
| Investigação | Uma amostra | Escolher a origem | Ampliação, sem revelar origem |
| Revelação | Resultado e origem | Próxima imagem / Ver relatório | Semente, checkpoint e D(x) |
| Relatório | Acertos e cinco amostras | Voltar ao mural | Revisão de cada resposta |
| GANLab | Amostra e fluxo | Acompanhar o percurso | Camadas, tensores, fórmulas e histórico |
| Museu | Comparação entre checkpoints | Comparar checkpoints | Execução, vetores e configuração |
| Mutações | Imagem e semente | Gerar imagem | Vetor e modelo; guardar é ação secundária |
| Caos | Execuções lado a lado | Comparar execuções | Configuração e limitações |

## Responsividade e movimento

320–759 px: uma coluna, margem mínima de 16 px, evidência antes das escolhas e personagens reduzidas nas margens. Não exigir orientação horizontal. Evidência inicial de pelo menos 240 px quando houver espaço, com ampliação disponível.

760–1099 px: composição intermediária, mantendo evidência e ações juntas. No tablet em retrato, usar a organização móvel quando duas colunas prejudicarem a leitura.

A partir de 1100 px: cenário amplo, margens mínimas de 32 px e evidência com até 448 px de largura. Personagens ocupam espaços laterais, sem sobrepor escolhas. Textos e controles podem fazer a página crescer; não prender tudo a uma altura fixa que corte conteúdo ao ampliar a fonte.

Transições de tela de 240 ms e feedback de 160 ms; reações de até 360 ms. Movimento reduzido desliga parallax, flutuação e loops e apresenta a mudança de estado imediatamente. A animação não atrasa a correção da resposta ou o acesso ao próximo controle.

## Voz e conteúdo

Usar “imagem real” e “criação da Fifi” na escolha. Explicar que “real” indica origem no dataset, sem transformar a palavra em julgamento de veracidade de qualquer conteúdo digital.

| Situação | Texto de referência |
| --- | --- |
| Entrada | Uma cria. A outra investiga. E você entra nessa disputa. |
| Instrução | Observe e escolha a origem. Pode olhar com calma. |
| Acerto | Boa investigação! |
| Erro | Uma nova pista para você. |
| Origem sintética | Esta imagem foi criada pelo Gerador. |
| Origem real | Esta imagem veio da partição da arena do dataset. |
| D indisponível | O palpite da Lupa não está disponível. Seu resultado foi mantido. |
| Modelo ausente | O experimento ainda não está conectado. Você pode fazer o aquecimento ou explorar o GANLab. |
| Encerramento | Cada descoberta deixa uma nova pista. |

Não apresentar o Discriminador como detector universal de IA, os erros visuais como prova de origem ou o placar do jogador como avaliação científica do modelo. Explicações técnicas são acessíveis livremente, sem obrigar o usuário a vencer o jogo.
