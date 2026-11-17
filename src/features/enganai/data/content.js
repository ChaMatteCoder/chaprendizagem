import {
  AudioWaveform,
  Dna,
  FlaskConical,
  History,
  House,
  Swords,
  Zap,
} from "lucide-react";

export const environments = [
  {
    path: "",
    title: "Central de Comando",
    short: "Central",
    icon: House,
    description: "Seu ponto de partida para a guerra dos pixels.",
  },
  {
    path: "arena",
    title: "Guerra dos Pixels",
    short: "Guerra dos Pixels",
    icon: Swords,
    tone: "coral",
    tag: "Aprenda jogando",
    action: "Entrar na arena",
    description:
      "Antes de investigar os pixels, conheça quem está por trás da disputa.",
  },
  {
    path: "lab",
    title: "GANLab",
    short: "GANLab",
    icon: FlaskConical,
    tone: "cyan",
    tag: "Entenda as redes",
    action: "Explorar o laboratório",
    description:
      "Do ruído à imagem: descubra o que acontece dentro de uma GAN.",
  },
  {
    path: "museu",
    title: "Museu da Evolução",
    short: "Museu da Evolução",
    icon: History,
    tone: "violet",
    tag: "Observe o processo",
    action: "Explorar a evolução",
    description: "Entenda como padrões podem surgir ao longo do aprendizado.",
  },
  {
    path: "mutacoes",
    title: "Laboratório de Mutações",
    short: "Mutações",
    icon: Dna,
    tone: "lime",
    tag: "Experimente ideias",
    action: "Explorar as sementes",
    description: "Conheça as sementes e as possibilidades do espaço latente.",
  },
  {
    path: "caos",
    title: "Câmara do Caos",
    short: "Câmara do Caos",
    icon: Zap,
    tone: "coral",
    description: "Investigue por que nem toda disputa termina em aprendizado.",
  },
];

export const quiz = [
  {
    question: "Quem transforma ruído em uma nova imagem?",
    hint: "Uma das redes recebe um vetor aleatório como ponto de partida.",
    answer: "fifi",
    explanation:
      "É a Fifi! O Gerador transforma um vetor de ruído z em uma imagem G(z). No início, ele ainda precisa aprender os padrões dos dados.",
  },
  {
    question: "Quem compara imagens reais e sintéticas?",
    hint: "Pense em quem examina as pistas dos pixels.",
    answer: "lupa",
    explanation:
      "É a Lupa! O Discriminador aprende com exemplos reais e sintéticos. Sua pontuação depende do treinamento; ela não é um detector universal de imagens de IA.",
  },
  {
    question: "Quem aprende a criar com o feedback da rival?",
    hint: "Ser descoberta também é uma oportunidade de melhorar.",
    answer: "fifi",
    explanation:
      "A Fifi usa o sinal da Lupa para ajustar seus próprios parâmetros. As redes são atualizadas alternadamente: é assim que a competição orienta o aprendizado.",
  },
];

export const labNetworks = {
  gerador: {
    title: "Da imaginação aos pixels.",
    character: "fifi",
    tone: "coral",
    formula: "x sintética = G(z)",
    intuitive:
      "A Fifi começa com números aleatórios. As camadas da rede transformam esses números em padrões e, por fim, em uma imagem. É uma criação nova, orientada pelo que a rede aprendeu.",
    technical:
      "O Gerador mapeia um vetor latente z para o espaço de imagens: G(z). Uma DCGAN utiliza convoluções transpostas para aumentar a resolução espacial. A proposta aqui é uma saída de 1 × 28 × 28 com Tanh e dados normalizados em [−1, 1].",
    steps: [
      {
        label: "Ruído",
        detail: "Vetor latente z",
        explanation:
          "Uma lista de números aleatórios é o ponto de partida. A mesma entrada, com os mesmos pesos e execução determinística, reproduz a mesma saída.",
      },
      {
        label: "Projeção",
        detail: "Representação inicial",
        explanation:
          "O vetor é transformado em uma representação com altura, largura e canais, preparando a construção espacial da imagem.",
      },
      {
        label: "Convoluções",
        detail: "Padrões e estrutura",
        explanation:
          "Convoluções transpostas aprendem a ampliar a representação. Formas e texturas surgem das transformações aprendidas.",
      },
      {
        label: "Imagem",
        detail: "28 × 28 · 1 canal",
        explanation:
          "A saída proposta é uma imagem em escala de cinza. Esta resolução é compatível com o Fashion-MNIST original.",
      },
    ],
  },
  discriminador: {
    title: "Cada pixel deixa uma pista.",
    character: "lupa",
    tone: "cyan",
    formula: "pontuação = sigmoid(D(x))",
    intuitive:
      "A Lupa observa imagens do dataset e imagens da Fifi. Ela procura padrões para distinguir as origens. Seu palpite ajuda a orientar a disputa, mas também pode estar errado.",
    technical:
      "O Discriminador recebe x e extrai características com convoluções. A proposta usa um logit por imagem e BCEWithLogitsLoss. A sigmoid pode converter o logit em uma pontuação de 0 a 1 para exibição, sem garantia de calibração.",
    steps: [
      {
        label: "Imagem",
        detail: "Real ou sintética",
        explanation:
          "Imagens reais e geradas precisam ter o mesmo formato e normalização. A origem conhecida serve como alvo do treinamento.",
      },
      {
        label: "Convoluções",
        detail: "Extração de padrões",
        explanation:
          "Filtros aprendidos extraem características dos pixels. A rede aprende com os dados disponíveis, sem regras universais de autenticidade.",
      },
      {
        label: "Características",
        detail: "Representação interna",
        explanation:
          "As características são combinadas para sustentar a decisão. Elas mudam à medida que os parâmetros são atualizados.",
      },
      {
        label: "Pontuação",
        detail: "Um logit por imagem",
        explanation:
          "Um logit é usado no cálculo da perda. Sua conversão para 0 a 1 é uma pontuação do modelo, não uma certeza sobre qualquer imagem.",
      },
    ],
  },
  treinamento: {
    title: "Rivais que aprendem juntas.",
    character: "fifi",
    tone: "violet",
    formula: "atualizar D → atualizar G → repetir",
    intuitive:
      "Primeiro, a Lupa aprende a separar exemplos reais e criações da Fifi. Depois, a Fifi recebe o feedback e melhora suas criações. O ciclo se repete; o equilíbrio importa mais do que uma vitória isolada.",
    technical:
      "Na atualização de D, as amostras G(z) são desacopladas do grafo do Gerador. Na atualização de G, o gradiente atravessa D até G, sem atualizar os pesos de D. As perdas devem ser interpretadas junto das amostras e da diversidade.",
    steps: [
      {
        label: "Amostras",
        detail: "Reais + G(z)",
        explanation:
          "Um lote de dados reais e um lote de imagens geradas alimentam a atualização do Discriminador.",
      },
      {
        label: "Atualizar D",
        detail: "Aprender a distinguir",
        explanation:
          "A perda do Discriminador compara suas saídas com as origens conhecidas. Só os parâmetros de D são atualizados nesta etapa.",
      },
      {
        label: "Atualizar G",
        detail: "Aprender a criar",
        explanation:
          "O Gerador usa o sinal do Discriminador para produzir amostras mais convincentes. O gradiente precisa chegar até G.",
      },
      {
        label: "Registrar",
        detail: "Salvar e comparar",
        explanation:
          "Histórico, configurações e checkpoints permitem analisar o processo. Usar o mesmo vetor z ajuda a comparar a evolução entre épocas.",
      },
    ],
  },
};

export const evolutionStages = [
  {
    title: "Tudo começa no ruído",
    short: "Ruído",
    detail:
      "No início, a rede ainda não aprendeu a distribuição das imagens. A prévia usa ruído procedural para ilustrar esse ponto.",
    amount: 0,
  },
  {
    title: "As primeiras pistas aparecem",
    short: "Contornos",
    detail:
      "Durante um treinamento bem-sucedido, padrões podem começar a aparecer. Esta imagem é um desenho procedural com menos ruído, não um checkpoint.",
    amount: 0.33,
  },
  {
    title: "Os padrões ganham espaço",
    short: "Padrões",
    detail:
      "A estrutura pode ficar mais reconhecível. O aprendizado real não é necessariamente linear ou estável como esta sequência conceitual.",
    amount: 0.67,
  },
  {
    title: "Reconhecível não é perfeito",
    short: "Estrutura",
    detail:
      "Qualidade visual e diversidade precisam ser avaliadas juntas. Um desenho reconhecível, por si só, não demonstra que a rede aprendeu toda a distribuição.",
    amount: 1,
  },
];

export const chaosScenarios = [
  {
    id: "collapse",
    title: "A Fifi repetitiva",
    subtitle: "Mode collapse",
    icon: AudioWaveform,
    text: "E se a Fifi encontrar uma única criação que engana a Lupa e começar a repetir a mesma ideia?",
    lesson:
      "Imagens convincentes podem esconder pouca diversidade. Observe se o Gerador cobre diferentes padrões dos dados.",
    control: "Repetição na ilustração",
    low: "Mais variedade",
    high: "Uma única ideia",
  },
  {
    id: "balance",
    title: "A Lupa imbatível",
    subtitle: "Desequilíbrio entre as redes",
    icon: Swords,
    text: "E se uma das redes avançar muito mais rápido do que a outra? A competição pode deixar de fornecer um sinal útil.",
    lesson:
      "Uma taxa de acerto alta do Discriminador, isoladamente, não indica uma GAN saudável. O contexto da disputa importa.",
    control: "Vantagem conceitual da Lupa",
    low: "Disputa equilibrada",
    high: "Lupa domina",
  },
  {
    id: "rate",
    title: "Passos grandes demais",
    subtitle: "Taxa de aprendizado",
    icon: Zap,
    text: "E se cada atualização mudar demais os parâmetros? O processo pode oscilar em vez de encontrar uma direção útil.",
    lesson:
      "A taxa de aprendizado influencia a estabilidade. Para concluir algo sobre uma configuração, são necessárias execuções reais e registradas.",
    control: "Intensidade da oscilação visual",
    low: "Passos menores",
    high: "Passos maiores",
  },
];

export const glossary = [
  [
    "GAN",
    "Rede generativa adversarial: duas redes que aprendem em uma dinâmica de competição.",
  ],
  [
    "Gerador (G)",
    "Rede que transforma um vetor latente em uma imagem sintética.",
  ],
  [
    "Discriminador (D)",
    "Rede treinada para distinguir amostras reais e geradas.",
  ],
  ["Espaço latente", "Espaço dos vetores usados como entrada do Gerador."],
  [
    "Semente",
    "Valor que inicializa um gerador de números pseudoaleatórios e ajuda na reprodução de um experimento.",
  ],
  [
    "Checkpoint",
    "Registro dos pesos e do estado de uma execução em determinado momento.",
  ],
  [
    "Época",
    "Uma passagem pelo conjunto de treinamento. Não equivale a uma única atualização.",
  ],
];
