export const ATELIER_ASSETS = "/images/enganai/atelier";

export const missions = [
  {
    id: "primeiros-rastros",
    title: "Primeiros rastros",
    subtitle: "Tudo começa com uma pista.",
    description:
      "Conheça as primeiras criações da Fifi e investigue a origem de cada amostra.",
    requires: null,
    specimen: 0,
    checkpointRole: "initial",
    // Provisional chronological link to a registered checkpoint (stage 04).
    checkpointEpoch: 1,
  },
  {
    id: "novos-padroes",
    title: "Novos padrões",
    subtitle: "O olhar fica mais atento.",
    description: "Observe novas estruturas e compare seu olhar com o da Lupa.",
    requires: "primeiros-rastros",
    specimen: 1,
    checkpointRole: "intermediate",
    checkpointEpoch: 4,
  },
  {
    id: "grande-duelo",
    title: "O grande duelo",
    subtitle: "Cada pixel pode surpreender.",
    description:
      "Reúna o que aprendeu em mais uma investigação entre as rivais.",
    requires: "novos-padroes",
    specimen: 2,
    checkpointRole: "advanced",
    checkpointEpoch: 8,
  },
];

// Stage 04 connects verified ONNX inference; playable rounds arrive in stage 05.
export const experiment = Object.freeze({ status: "inference-ready", mission: "pending" });

export const destinations = [
  {
    to: "/enganai/missoes",
    title: "Mural de missões",
    description: "Escolha o próximo caso.",
    icon: "map",
  },
  {
    to: "/enganai/aquecimento",
    title: "Aquecimento",
    description: "Conheça quem cria e quem investiga.",
    icon: "quiz",
  },
  {
    to: "/enganai/lab",
    title: "GANLab",
    description: "Descubra o caminho dos dados.",
    icon: "lab",
  },
  {
    to: "/enganai/museu",
    title: "Museu da Evolução",
    description: "Explore a ideia de aprender com o tempo.",
    icon: "museum",
  },
  {
    to: "/enganai/mutacoes",
    title: "Ateliê de Mutações",
    description: "Investigue sementes e vetores.",
    icon: "mutations",
  },
  {
    to: "/enganai/caos",
    title: "Câmara do Caos",
    description: "E se a disputa perder o equilíbrio?",
    icon: "chaos",
  },
];
