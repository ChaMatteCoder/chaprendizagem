import {
  ArrowLeft,
  BookOpen,
  BrainCircuit,
  Calculator,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Code2,
  Download,
  ExternalLink,
  FunctionSquare,
  GitCompareArrows,
  History,
  Layers3,
  LineChart,
  ListChecks,
  Network,
  Sigma,
  Table2,
  Target,
  TrendingDown,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import FunctionalApproximationCharts from '../components/FunctionalApproximationCharts.jsx';
import FunctionalApproximationControls from '../components/FunctionalApproximationControls.jsx';
import SampledPointsTable from '../components/SampledPointsTable.jsx';
import TrainingSummaryCards from '../components/TrainingSummaryCards.jsx';
import { createSampledPointRows } from '../data/sampledPoints.js';
import { explainTrainingBehavior, trainMlpApproximator, validateFunctionalRows } from '../lib/mlpApproximator.js';
import { formatDecimal } from '../lib/metrics.js';

const defaultParameters = {
  hiddenNeurons: 7,
  learningRate: 0.035,
  epochs: 1800,
  activation: 'tanh',
  seed: 42,
};

const objectiveCards = [
  {
    icon: BrainCircuit,
    title: 'Treinar uma MLP',
    text: 'Usar os pontos amostrados pelo professor como pares de entrada e alvo para ajustar pesos e bias.',
  },
  {
    icon: LineChart,
    title: 'Visualizar a curva',
    text: 'Gerar uma linha contínua entre os pontos e comparar a saída estimada com a base real.',
  },
  {
    icon: TrendingDown,
    title: 'Acompanhar o erro',
    text: 'Observar o erro quadrático médio ao longo das épocas e avaliar a estabilidade do treinamento.',
  },
  {
    icon: GitCompareArrows,
    title: 'Testar cenários',
    text: 'Alterar neurônios, taxa, épocas, ativação, seed e até os próprios pontos da base.',
  },
];

const theoryHighlights = [
  {
    icon: FunctionSquare,
    title: 'Aproximação funcional',
    text: 'A rede aprende uma função aproximada y = f(x) a partir de pares observados, sem conhecer a equação real.',
  },
  {
    icon: Network,
    title: 'MLP feedforward',
    text: 'A informação passa da entrada para a camada oculta e depois para a saída, formando um aproximador não linear.',
  },
  {
    icon: Layers3,
    title: 'Camada oculta',
    text: 'Os neurônios ocultos combinam pesos, bias e ativações para formar curvas mais flexíveis que uma reta.',
  },
  {
    icon: TrendingDown,
    title: 'Erro como guia',
    text: 'O MSE mede a distância entre t e y, orientando os ajustes dos pesos por retropropagação do erro.',
  },
];

const references = [
  {
    label: 'Cybenko - Approximation by superpositions',
    href: 'https://link.springer.com/article/10.1007/BF02551274',
  },
  {
    label: 'Hornik, Stinchcombe & White - Universal approximators',
    href: 'https://www.cs.cmu.edu/~bhiksha/courses/deeplearning/Spring.2019/archive-f19/www-bak11-22-2019/document/reading/article1.pdf',
  },
  {
    label: 'Rumelhart, Hinton & Williams - Backpropagation',
    href: 'https://www.nature.com/articles/323533a0',
  },
  {
    label: 'Goodfellow, Bengio & Courville - Deep Learning',
    href: 'https://www.deeplearningbook.org/',
  },
  {
    label: 'Scikit-learn - Neural network models',
    href: 'https://scikit-learn.org/stable/modules/neural_networks_supervised.html',
  },
  {
    label: 'Scikit-learn - MLPRegressor',
    href: 'https://scikit-learn.org/stable/modules/generated/sklearn.neural_network.MLPRegressor.html',
  },
  {
    label: 'Nielsen - Neural Networks and Deep Learning',
    href: 'https://neuralnetworksanddeeplearning.com/',
  },
  {
    label: 'Pinkus - Approximation theory of the MLP model',
    href: 'https://pinkus.net.technion.ac.il/files/2021/02/acta.pdf',
  },
];

const algorithmSteps = [
  {
    title: 'Entrada x',
    text: 'Cada amostra entrega um único valor de entrada para a rede. Neste trabalho, x varia de 0 a 1 na base original.',
    code: 'entrada = x',
  },
  {
    title: 'Camada oculta',
    text: 'Cada neurônio oculto calcula uma combinação ponderada de x, soma um bias e aplica uma função de ativação.',
    code: 'h_j = f(w_j x + b_j)',
  },
  {
    title: 'Saída linear',
    text: 'A camada de saída combina os sinais ocultos e produz um valor contínuo, adequado para aproximar uma função.',
    code: 'y = soma(v_j h_j) + c',
  },
  {
    title: 'Erro',
    text: 'O valor desejado t é comparado com y. Essa diferença orienta o ajuste dos pesos.',
    code: 'erro = t - y',
  },
  {
    title: 'Backpropagation',
    text: 'O erro é propagado para trás para corrigir pesos da saída e pesos da camada oculta.',
    code: 'peso <- peso + taxa * gradiente',
  },
  {
    title: 'Repetição',
    text: 'Uma época percorre todos os pontos. Repetir várias épocas permite que a curva se refine gradualmente.',
    code: 'para época = 1 ... N',
  },
  {
    title: 'Curva aprendida',
    text: 'Ao final, a rede é consultada em muitos valores de x para desenhar a função aproximada.',
    code: 'y_predito = MLP(x)',
  },
];

const pythonCode = `# Trabalho 07 - Aproximação Funcional com MLP
# Implementação didática em Python puro, sem NumPy e sem bibliotecas de Machine Learning.
# A rede possui:
# - uma entrada escalar x;
# - uma camada oculta com ativação tanh;
# - uma saída linear y;
# - treinamento por backpropagation.

from math import tanh, sqrt


sampled_points = [
    {"x": 0.0, "t": -0.9602},
    {"x": 0.1, "t": -0.5770},
    {"x": 0.2, "t": -0.0729},
    {"x": 0.3, "t":  0.3771},
    {"x": 0.4, "t":  0.6405},
    {"x": 0.5, "t":  0.6600},
    {"x": 0.6, "t":  0.4609},
    {"x": 0.7, "t":  0.1336},
    {"x": 0.8, "t": -0.2013},
    {"x": 0.9, "t": -0.4344},
    {"x": 1.0, "t": -0.5000},
]


def gerador_aleatorio(seed):
    """Gerador determinístico simples para deixar o treino reproduzível."""
    estado = int(abs(seed)) % 2147483647
    if estado == 0:
        estado = 1

    def proximo():
        nonlocal estado
        estado = (estado * 16807) % 2147483647
        return (estado - 1) / 2147483646

    return proximo


def aleatorio_entre(gerador, minimo, maximo):
    return minimo + (maximo - minimo) * gerador()


def criar_rede(qtd_ocultos=7, seed=42):
    gerador = gerador_aleatorio(seed)
    return {
        "w_ocultos": [aleatorio_entre(gerador, -1.0, 1.0) for _ in range(qtd_ocultos)],
        "b_ocultos": [aleatorio_entre(gerador, -0.6, 0.6) for _ in range(qtd_ocultos)],
        "w_saida": [aleatorio_entre(gerador, -0.8, 0.8) for _ in range(qtd_ocultos)],
        "b_saida": aleatorio_entre(gerador, -0.2, 0.2),
    }


def prever(rede, x):
    """Propagação direta: entrada -> camada oculta -> saída linear."""
    ocultos = []

    for w, b in zip(rede["w_ocultos"], rede["b_ocultos"]):
        u = w * x + b
        ocultos.append(tanh(u))

    y = rede["b_saida"]
    for h, v in zip(ocultos, rede["w_saida"]):
        y += h * v

    return y, ocultos


def treinar_mlp(base, qtd_ocultos=7, taxa=0.035, epocas=1800, seed=42):
    rede = criar_rede(qtd_ocultos, seed)
    historico_erro = []

    for epoca in range(1, epocas + 1):
        soma_erros_quadrados = 0.0

        for amostra in base:
            x = amostra["x"]
            t = amostra["t"]

            y, ocultos = prever(rede, x)
            erro = t - y
            soma_erros_quadrados += erro ** 2

            # Guardamos os pesos antigos da saída porque eles entram no gradiente oculto.
            pesos_saida_antigos = rede["w_saida"][:]

            # Ajuste da camada de saída linear.
            for j in range(qtd_ocultos):
                rede["w_saida"][j] += taxa * erro * ocultos[j]

            rede["b_saida"] += taxa * erro

            # Ajuste da camada oculta.
            for j in range(qtd_ocultos):
                derivada_tanh = 1 - ocultos[j] ** 2
                gradiente_oculto = erro * pesos_saida_antigos[j] * derivada_tanh

                rede["w_ocultos"][j] += taxa * gradiente_oculto * x
                rede["b_ocultos"][j] += taxa * gradiente_oculto

        mse = soma_erros_quadrados / len(base)
        historico_erro.append({"epoca": epoca, "mse": mse})

    return rede, historico_erro


def avaliar(rede, base):
    linhas = []

    for amostra in base:
        y, _ = prever(rede, amostra["x"])
        erro = amostra["t"] - y
        linhas.append({
            "x": amostra["x"],
            "t": amostra["t"],
            "y_predito": y,
            "erro": erro,
            "erro_absoluto": abs(erro),
        })

    mse = sum(linha["erro"] ** 2 for linha in linhas) / len(linhas)
    mae = sum(linha["erro_absoluto"] for linha in linhas) / len(linhas)
    rmse = sqrt(mse)

    return linhas, {"mse": mse, "mae": mae, "rmse": rmse}


if __name__ == "__main__":
    rede, historico = treinar_mlp(sampled_points)
    resultados, metricas = avaliar(rede, sampled_points)

    print("MSE final:", metricas["mse"])
    print("MAE:", metricas["mae"])
    print("RMSE:", metricas["rmse"])
    print()

    for linha in resultados:
        print(
            "x={:.1f} | t={:.4f} | y={:.4f} | erro={:.4f}".format(
                linha["x"],
                linha["t"],
                linha["y_predito"],
                linha["erro"],
            )
        )`;

function downloadChart(chartId, filename) {
  const svg = document.querySelector(`[data-chart="${chartId}"] svg`);
  if (!svg) return;

  const serializer = new XMLSerializer();
  const clonedSvg = svg.cloneNode(true);
  const width = Math.max(1, Math.round(svg.getBoundingClientRect().width || 900));
  const height = Math.max(1, Math.round(svg.getBoundingClientRect().height || 520));

  clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clonedSvg.setAttribute('width', String(width));
  clonedSvg.setAttribute('height', String(height));

  const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  background.setAttribute('width', '100%');
  background.setAttribute('height', '100%');
  background.setAttribute('fill', '#fbfaf6');
  clonedSvg.insertBefore(background, clonedSvg.firstChild);

  const svgBlob = new Blob([serializer.serializeToString(clonedSvg)], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  const image = new Image();

  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = width * 2;
    canvas.height = height * 2;
    const context = canvas.getContext('2d');
    context.fillStyle = '#fbfaf6';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);

    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  image.src = url;
}

function getParameterWarning(parameters) {
  const learningRate = Number(parameters.learningRate);
  const hiddenNeurons = Number(parameters.hiddenNeurons);
  const epochs = Number(parameters.epochs);

  if (learningRate >= 0.25) {
    return 'Taxas muito altas podem fazer o erro oscilar ou aumentar. Use este preset para observar instabilidade.';
  }

  if (hiddenNeurons > 14 && epochs > 3000) {
    return 'Muitos neurônios e muitas épocas podem ajustar demais uma base pequena.';
  }

  if (epochs < 150) {
    return 'Poucas épocas ajudam a ver o início do aprendizado, mas podem deixar a curva subtreinada.';
  }

  return '';
}

function buildInitialSimulation(rows, parameters) {
  return trainMlpApproximator(validateFunctionalRows(rows), parameters);
}

export default function FunctionalApproximationPage() {
  const [workOpen, setWorkOpen] = useState(false);
  const [rows, setRows] = useState(createSampledPointRows);
  const [parameters, setParameters] = useState(defaultParameters);
  const [formError, setFormError] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [theoryExpanded, setTheoryExpanded] = useState(false);
  const [pythonModalOpen, setPythonModalOpen] = useState(false);
  const [hasTrained, setHasTrained] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [result, setResult] = useState(() => buildInitialSimulation(createSampledPointRows(), defaultParameters));
  const workContentRef = useRef(null);
  const resultsRef = useRef(null);

  const behaviorMessage = useMemo(() => explainTrainingBehavior(result), [result]);
  const warning = useMemo(() => getParameterWarning(parameters), [parameters]);
  const currentStep = algorithmSteps[activeStep];

  useEffect(() => {
    if (!workOpen) return;

    window.requestAnimationFrame(() => {
      workContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [workOpen]);

  function updatePoint(rowId, key, value) {
    setRows((currentRows) => currentRows.map((row) => (row.id === rowId ? { ...row, [key]: value } : row)));
    setHasTrained(false);
  }

  function addPoint() {
    setRows((currentRows) => {
      const lastX = Number(currentRows.at(-1)?.x ?? 1);
      return [
        ...currentRows,
        {
          id: Math.max(...currentRows.map((row) => row.id), 0) + 1,
          x: Number(Math.min(lastX + 0.1, 1.5).toFixed(4)),
          t: 0,
        },
      ];
    });
    setHasTrained(false);
  }

  function removePoint(rowId) {
    setRows((currentRows) => (currentRows.length > 3 ? currentRows.filter((row) => row.id !== rowId) : currentRows));
    setHasTrained(false);
  }

  function restoreProfessorData() {
    const professorRows = createSampledPointRows();
    setRows(professorRows);
    setParameters(defaultParameters);
    setFormError('');
    setResult(buildInitialSimulation(professorRows, defaultParameters));
    setHasTrained(false);
    setIsTraining(false);
  }

  function addNoise() {
    setRows((currentRows) =>
      currentRows.map((row, index) => {
        const noise = Math.sin((index + 1) * 2.31 + Number(parameters.seed)) * 0.045;
        return {
          ...row,
          t: Number((Number(row.t) + noise).toFixed(4)),
        };
      }),
    );
    setHasTrained(false);
  }

  function applyPreset(values) {
    setParameters(values);
    setHasTrained(false);
  }

  function trainNetwork() {
    try {
      const dataset = validateFunctionalRows(rows);
      setFormError('');
      setHasTrained(false);
      setIsTraining(true);
      window.requestAnimationFrame(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });

      window.setTimeout(() => {
        const nextResult = trainMlpApproximator(dataset, parameters);
        setResult(nextResult);
        setIsTraining(false);
        setHasTrained(true);
      }, 650);
    } catch (error) {
      setFormError(error.message);
      setIsTraining(false);
      setHasTrained(false);
    }
  }

  function goToPreviousStep() {
    setActiveStep((current) => (current - 1 + algorithmSteps.length) % algorithmSteps.length);
  }

  function goToNextStep() {
    setActiveStep((current) => (current + 1) % algorithmSteps.length);
  }

  return (
    <div className="page functional-page">
      <section className="page-hero functional-hero reveal-up">
        <div>
          <p className="eyebrow">Trabalho 07 - Aproximação Funcional</p>
          <h1>Aproximação funcional com MLP</h1>
          <p>
            Um laboratório para observar como uma rede neural multicamada aprende o comportamento de uma função mesmo
            conhecendo apenas alguns pontos amostrados.
          </p>
          <div className="hero-actions">
            <button className="button button--primary" onClick={() => setWorkOpen(true)} type="button">
              Iniciar laboratório <Calculator size={18} />
            </button>
            <Link className="button button--ghost" to="/adaline/regressao">
              <ArrowLeft size={18} /> Voltar ao Trabalho 06
            </Link>
          </div>
        </div>

        <div className="functional-hero-visual reveal-right" aria-label="Rede MLP aproximando uma curva">
          <svg viewBox="0 0 720 520" role="img" aria-hidden="true">
            <defs>
              <linearGradient id="functionalCurveGradient" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#a8fff1" />
                <stop offset="48%" stopColor="#f6d06f" />
                <stop offset="100%" stopColor="#e8ddff" />
              </linearGradient>
              <radialGradient id="functionalNodeGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.96" />
                <stop offset="100%" stopColor="#a8fff1" stopOpacity="0.1" />
              </radialGradient>
            </defs>

            <g className="functional-hero-grid-lines">
              {Array.from({ length: 8 }, (_, index) => (
                <line key={`v-${index}`} x1={72 + index * 82} x2={72 + index * 82} y1="64" y2="454" />
              ))}
              {Array.from({ length: 6 }, (_, index) => (
                <line key={`h-${index}`} x1="58" x2="666" y1={84 + index * 70} y2={84 + index * 70} />
              ))}
            </g>

            <g className="functional-network-sketch">
              <path className="functional-link functional-link--a" d="M104 158 L228 112 M104 158 L228 190 M104 158 L228 268" />
              <path className="functional-link functional-link--b" d="M104 260 L228 112 M104 260 L228 190 M104 260 L228 268" />
              <path className="functional-link functional-link--c" d="M252 112 L378 190 M252 190 L378 190 M252 268 L378 190" />
              <circle className="functional-node functional-node--input" cx="104" cy="158" r="28" />
              <circle className="functional-node functional-node--input" cx="104" cy="260" r="28" />
              <circle className="functional-node functional-node--hidden" cx="228" cy="112" r="24" />
              <circle className="functional-node functional-node--hidden" cx="228" cy="190" r="24" />
              <circle className="functional-node functional-node--hidden" cx="228" cy="268" r="24" />
              <circle className="functional-node functional-node--output" cx="378" cy="190" r="30" />
              <text x="104" y="166">x</text>
              <text x="378" y="198">y</text>
            </g>

            <g className="functional-signal-dots">
              <circle cx="104" cy="158" r="5" />
              <circle cx="104" cy="260" r="5" />
              <circle cx="228" cy="190" r="5" />
            </g>

            <g className="functional-chart-stage">
              <path className="functional-axis" d="M432 396 H652 M432 396 V96" />
              <path className="functional-shadow-path" d="M438 336 C474 170 526 116 568 212 C604 294 626 306 652 248" />
              <path className="functional-curve-path" d="M438 336 C474 170 526 116 568 212 C604 294 626 306 652 248" />
              {[448, 474, 500, 526, 552, 578, 604, 630, 652].map((cx, index) => (
                <circle
                  className="functional-sample-dot"
                  cx={cx}
                  cy={[336, 244, 160, 130, 184, 246, 302, 286, 248][index]}
                  key={cx}
                  r="7"
                />
              ))}
              <text className="functional-chart-label" x="432" y="438">pontos amostrados</text>
              <text className="functional-chart-label functional-chart-label--curve" x="528" y="84">curva MLP</text>
            </g>
          </svg>
        </div>
      </section>

      {workOpen ? (
        <div className="work-content-reveal" ref={workContentRef}>
          <section className="wide-panel reveal-up">
            <div className="section-heading">
              <p className="eyebrow">Objetivo do laboratório</p>
              <h2>Transformar a lista de observações em uma simulação de aprendizagem supervisionada.</h2>
              <p>
                O experimento treina uma MLP com a base original do professor, exibe a curva aprendida, compara valores
                reais e estimados, acompanha o erro por época e permite alterar dados e parâmetros para testar cenários.
              </p>
            </div>
            <div className="theory-highlight-grid functional-objective-grid stagger">
              {objectiveCards.map((item) => {
                const Icon = item.icon;

                return (
                  <article className="theory-feature-card" key={item.title}>
                    <Icon size={30} />
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="wide-panel theory-panel reveal-up">
            <div className="section-heading">
              <p className="eyebrow">Fundamentação teórica</p>
              <h2>Uma MLP pode aprender uma tendência curva a partir de poucos exemplos.</h2>
              <p>
                Aproximação funcional é a tarefa de construir um modelo capaz de representar uma relação desconhecida
                entre entrada e saída. No Trabalho 07, a rede recebe pares <strong>(x, t)</strong> e ajusta uma função
                aproximada <strong>y = f(x)</strong>, buscando produzir valores próximos aos alvos fornecidos pelo
                professor.
              </p>
            </div>

            <div className="theory-highlight-grid functional-objective-grid stagger">
              {theoryHighlights.map((item) => {
                const Icon = item.icon;

                return (
                  <article className="theory-feature-card" key={item.title}>
                    <Icon size={30} />
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </article>
                );
              })}
            </div>

            <div className="theory-summary">
              <p>
                A fundamentação deste laboratório conecta o enunciado do Trabalho 07 com três ideias centrais:
                capacidade aproximadora das redes feedforward, treinamento por backpropagation e interpretação cuidadosa
                do erro quando a base possui poucos pontos.
              </p>
              <button className="button button--primary" onClick={() => setTheoryExpanded((current) => !current)} type="button">
                {theoryExpanded ? 'Ler menos' : 'Ler mais'}
                {theoryExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
            </div>

            {theoryExpanded ? (
              <div className="theory-reader stagger">
                <article className="theory-section">
                  <FunctionSquare size={28} />
                  <div>
                    <h3>O que é aproximação funcional</h3>
                    <p>
                      Em aprendizagem supervisionada, a aproximação funcional busca aprender uma relação entre uma
                      entrada e uma saída usando apenas um conjunto finito de observações. Em vez de programar a fórmula
                      original da função, fornecemos exemplos e deixamos o modelo ajustar seus próprios parâmetros.
                    </p>
                    <p>
                      Neste trabalho, cada amostra possui uma entrada escalar <strong>x</strong> e um valor desejado
                      <strong> t</strong>. A rede aprende uma saída estimada <strong>y</strong> que deve ficar próxima
                      de <strong>t</strong>, formando uma curva contínua a partir de pontos discretos.
                    </p>
                    <div className="math-block">
                      <span>base = (x_i, t_i)</span>
                      <span>y_i = MLP(x_i)</span>
                      <span>erro_i = t_i - y_i</span>
                    </div>
                  </div>
                </article>

                <article className="theory-section">
                  <Table2 size={28} />
                  <div>
                    <h3>A base do Trabalho 07</h3>
                    <p>
                      O enunciado do Trabalho 07 informa que o experimento consiste em treinar uma rede neural
                      multicamada MLP para aproximar uma função a partir de pontos amostrados. Na base fornecida, x varia
                      de 0 a 1 e os valores de t não formam uma reta: a sequência cresce até aproximadamente x = 0,5 e
                      depois decresce.
                    </p>
                    <p>
                      Esse formato torna o exercício especialmente didático. Um modelo linear simples tende a perder a
                      curvatura da função, enquanto uma MLP com camada oculta consegue representar melhor a subida, o
                      ponto de mudança e a queda posterior.
                    </p>
                  </div>
                </article>

                <article className="theory-section">
                  <Layers3 size={28} />
                  <div>
                    <h3>Interpolar pontos não é o mesmo que aprender uma tendência</h3>
                    <p>
                      Interpolar significa construir uma curva que passa exatamente pelos pontos conhecidos. Aprender uma
                      tendência é um objetivo um pouco diferente: a rede tenta capturar o comportamento geral que explica
                      as observações, aceitando pequenos erros quando isso produz uma aproximação mais estável.
                    </p>
                    <p>
                      Essa diferença importa porque a base é pequena. Se a rede tentar contornar todos os pontos com
                      excesso de flexibilidade, pode memorizar ruídos ou detalhes locais. Se tiver pouca capacidade, pode
                      produzir uma curva simples demais. O laboratório permite observar esse equilíbrio na prática.
                    </p>
                  </div>
                </article>

                <article className="theory-section">
                  <Network size={28} />
                  <div>
                    <h3>Estrutura de uma MLP feedforward</h3>
                    <p>
                      Uma MLP é uma rede do tipo <em>feedforward</em>: a informação percorre a arquitetura em uma única
                      direção, da entrada para a camada oculta e da camada oculta para a saída. Para este problema, a
                      entrada é o valor x, a camada oculta transforma esse valor por pesos, bias e ativação, e a saída
                      linear gera o valor aproximado y.
                    </p>
                    <div className="math-block">
                      <span>h_j = φ(w_j x + b_j)</span>
                      <span>y = Σ v_j h_j + c</span>
                    </div>
                    <p>
                      Os pesos <strong>w</strong> e <strong>v</strong> controlam a influência das conexões. Os bias
                      deslocam as respostas dos neurônios. A função <strong>φ</strong> introduz não linearidade.
                    </p>
                  </div>
                </article>

                <article className="theory-section">
                  <Sigma size={28} />
                  <div>
                    <h3>Por que a ativação não linear é indispensável</h3>
                    <p>
                      Sem funções de ativação não lineares, várias camadas lineares empilhadas continuariam equivalentes
                      a uma única transformação linear. Isso impediria a rede de representar curvas como a do Trabalho
                      07. Funções como tangente hiperbólica, sigmoide e ReLU tornam a MLP capaz de formar respostas
                      curvas.
                    </p>
                    <p>
                      A tangente hiperbólica é uma escolha didática para este laboratório porque produz respostas suaves
                      entre -1 e 1, faixa compatível com os valores da base. A sigmoide também é clássica na literatura,
                      enquanto a ReLU é muito comum em redes modernas.
                    </p>
                  </div>
                </article>

                <article className="theory-section">
                  <BookOpen size={28} />
                  <div>
                    <h3>Teorema da Aproximação Universal</h3>
                    <p>
                      Os trabalhos clássicos de Cybenko e de Hornik, Stinchcombe e White ajudam a justificar por que MLPs
                      são usadas como aproximadoras de funções. De forma simplificada, redes feedforward com pelo menos
                      uma camada oculta e ativação não linear adequada podem aproximar funções contínuas em conjuntos
                      compactos com precisão arbitrária, desde que tenham neurônios suficientes.
                    </p>
                    <p>
                      Esse resultado não promete que qualquer rede pequena encontrará automaticamente a melhor solução.
                      Ele afirma a existência de uma configuração de pesos capaz de aproximar a função. Na prática,
                      encontrar bons pesos depende do algoritmo de treinamento, da taxa de aprendizagem, da inicialização,
                      da arquitetura e dos dados disponíveis.
                    </p>
                  </div>
                </article>

                <article className="theory-section">
                  <TrendingDown size={28} />
                  <div>
                    <h3>Erro quadrático médio e função de custo</h3>
                    <p>
                      Em regressão e aproximação funcional, uma função de custo comum é o erro quadrático médio, ou MSE.
                      Ele calcula a média dos quadrados das diferenças entre os valores desejados e os valores estimados.
                      Como os erros são elevados ao quadrado, desvios maiores recebem mais peso na avaliação.
                    </p>
                    <div className="math-block">
                      <span>MSE = 1/n Σ(t_i - y_i)²</span>
                      <span>RMSE = √MSE</span>
                      <span>MAE = 1/n Σ|t_i - y_i|</span>
                    </div>
                    <p>
                      Quando o gráfico de erro diminui ao longo das épocas, há indício de que os pesos estão sendo
                      ajustados em uma direção útil. Quando o erro oscila ou cresce, a taxa de aprendizagem pode estar
                      alta demais ou a configuração pode estar instável.
                    </p>
                  </div>
                </article>

                <article className="theory-section">
                  <History size={28} />
                  <div>
                    <h3>Backpropagation e ajuste iterativo dos pesos</h3>
                    <p>
                      O algoritmo de backpropagation, popularizado por Rumelhart, Hinton e Williams, calcula como o erro
                      da saída se distribui pelas conexões da rede. A partir dessa informação, os pesos são ajustados por
                      uma forma de gradiente descendente, buscando reduzir a função de custo.
                    </p>
                    <ol className="theory-list">
                      <li>Inicializam-se pesos e bias, preferencialmente de forma reprodutível por seed.</li>
                      <li>Propaga-se cada valor de x pela rede até obter y.</li>
                      <li>Calcula-se o erro entre t e y.</li>
                      <li>Propaga-se esse erro para trás, estimando gradientes.</li>
                      <li>Atualizam-se os pesos de saída, pesos ocultos e bias.</li>
                      <li>Repete-se o processo por várias épocas.</li>
                    </ol>
                  </div>
                </article>

                <article className="theory-section">
                  <Target size={28} />
                  <div>
                    <h3>Subajuste, sobreajuste e generalização</h3>
                    <p>
                      Com poucos neurônios ou poucas épocas, a rede pode sofrer subajuste: a curva aprendida fica simples
                      demais e não acompanha a estrutura dos dados. Com muitos neurônios e uma base pequena, pode ocorrer
                      sobreajuste: a curva se prende demais às observações e pode ficar sensível a pequenas alterações.
                    </p>
                    <p>
                      Por isso, as métricas precisam ser lidas junto com o gráfico. Um erro baixo nos pontos conhecidos
                      não garante que a rede entendeu a função real fora da região observada. O objetivo didático é
                      perceber como arquitetura, taxa e épocas mudam a forma da curva.
                    </p>
                  </div>
                </article>

                <article className="theory-section theory-section--references">
                  <BookOpen size={28} />
                  <div>
                    <h3>Referências utilizadas</h3>
                    <ul className="reference-list">
                      <li>
                        Enunciado do Trabalho 07 — <em>Aproximação Funcional</em>. Material da disciplina anexado ao
                        projeto, com a proposta de treinar uma MLP para aproximar uma função a partir de pontos
                        amostrados.
                      </li>
                      <li>
                        CYBENKO, George. <em>Approximation by superpositions of a sigmoidal function</em>. Mathematics
                        of Control, Signals and Systems, 1989.
                      </li>
                      <li>
                        HORNIK, Kurt; STINCHCOMBE, Maxwell; WHITE, Halbert. <em>Multilayer feedforward networks are
                        universal approximators</em>. Neural Networks, 1989.
                      </li>
                      <li>
                        RUMELHART, David E.; HINTON, Geoffrey E.; WILLIAMS, Ronald J. <em>Learning representations by
                        back-propagating errors</em>. Nature, 1986.
                      </li>
                      <li>
                        GOODFELLOW, Ian; BENGIO, Yoshua; COURVILLE, Aaron. <em>Deep Learning</em>. MIT Press, 2016.
                      </li>
                      <li>
                        NIELSEN, Michael. <em>Neural Networks and Deep Learning</em>. Livro online, 2015.
                      </li>
                      <li>
                        SCIKIT-LEARN. <em>Neural network models supervised</em> e <em>MLPRegressor</em>. Documentação
                        oficial sobre MLPs supervisionadas para regressão e classificação.
                      </li>
                      <li>
                        PINKUS, Allan. <em>Approximation theory of the MLP model in neural networks</em>. Acta Numerica,
                        1999.
                      </li>
                    </ul>
                    <div className="source-links">
                      {references.map((reference) => (
                        <a href={reference.href} key={reference.href} rel="noreferrer" target="_blank">
                          {reference.label} <ExternalLink size={15} />
                        </a>
                      ))}
                    </div>
                  </div>
                </article>
              </div>
            ) : null}
          </section>

          <section className="wide-panel reveal-up">
            <div className="section-heading">
              <p className="eyebrow">Como o algoritmo funciona</p>
              <h2>Da entrada escalar até a curva aproximada.</h2>
              <p>
                A simulação usa uma rede com uma camada oculta, ativação configurável e saída linear. O treinamento é
                feito por backpropagation em JavaScript puro.
              </p>
            </div>
            <div className="regression-steps functional-steps">
              <article className="timeline-stage">
                <div className="timeline-stage__meta">
                  <span>
                    Etapa {String(activeStep + 1).padStart(2, '0')} de {algorithmSteps.length}
                  </span>
                  <strong>{currentStep.title}</strong>
                </div>
                <p>{currentStep.text}</p>
                <code>{currentStep.code}</code>
                <div className="timeline-controls">
                  <button className="icon-button" onClick={goToPreviousStep} title="Etapa anterior" type="button">
                    <ChevronLeft size={19} />
                  </button>
                  <div className="timeline-progress" aria-hidden="true">
                    <span style={{ width: `${((activeStep + 1) / algorithmSteps.length) * 100}%` }} />
                  </div>
                  <button className="icon-button" onClick={goToNextStep} title="Próxima etapa" type="button">
                    <ChevronRight size={19} />
                  </button>
                </div>
              </article>
              <div className="timeline-track" aria-label="Etapas da MLP">
                {algorithmSteps.map((step, index) => (
                  <button
                    className={[
                      'timeline-step',
                      index === activeStep ? 'is-active' : '',
                      index < activeStep ? 'is-complete' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    key={step.title}
                    onClick={() => setActiveStep(index)}
                    type="button"
                  >
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <small>{step.title}</small>
                  </button>
                ))}
              </div>
            </div>
            <button className="button button--ghost python-button" onClick={() => setPythonModalOpen(true)} type="button">
              <span className="python-icon" aria-hidden="true">
                Py
              </span>
              Ver código em Python <Code2 size={18} />
            </button>
          </section>

          <section className="wide-panel reveal-up">
            <div className="section-heading">
              <p className="eyebrow">Simulação com a base de observações</p>
              <h2>Edite pontos, escolha parâmetros e treine novamente.</h2>
              <p>
                A base original permanece como ponto de partida. Depois de alterar dados ou parâmetros, clique em
                Treinar MLP para recalcular curva, erro e métricas.
              </p>
            </div>
            <div className="functional-workspace stagger">
              <FunctionalApproximationControls
                formError={formError}
                onAddNoise={addNoise}
                onApplyPreset={applyPreset}
                onRestore={restoreProfessorData}
                onTrain={trainNetwork}
                parameters={parameters}
                pointCount={rows.length}
                setParameters={setParameters}
                isTraining={isTraining}
                warning={warning}
              />
              <SampledPointsTable
                onAddPoint={addPoint}
                onRemovePoint={removePoint}
                onUpdatePoint={updatePoint}
                rows={rows}
              />
            </div>
          </section>

          <div ref={resultsRef}>
            {isTraining ? (
              <section className="wide-panel functional-loading-panel reveal-scale" aria-live="polite">
                <div className="functional-loader" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <div>
                  <p className="eyebrow">Treinamento em andamento</p>
                  <h2>A MLP está ajustando pesos e bias.</h2>
                  <p>
                    A rede está percorrendo a base, calculando o erro, retropropagando gradientes e preparando os
                    gráficos para a configuração atual.
                  </p>
                </div>
              </section>
            ) : null}

            {hasTrained ? (
              <>
                <section className="wide-panel functional-results-panel reveal-up">
                  <div className="section-heading section-heading--with-actions">
                    <div>
                      <p className="eyebrow">Gráficos</p>
                      <h2>Curva aprendida e erro por época.</h2>
                    </div>
                    <div className="chart-section-actions">
                      <button className="button button--ghost" onClick={() => downloadChart('functional-curve', 'aproximacao-funcional-curva.png')} type="button">
                        <Download size={17} /> Curva
                      </button>
                      <button className="button button--ghost" onClick={() => downloadChart('functional-error', 'aproximacao-funcional-erro.png')} type="button">
                        <Download size={17} /> Erro
                      </button>
                    </div>
                  </div>
                  <FunctionalApproximationCharts
                    curve={result.curve}
                    curveActions={null}
                    dataset={result.dataset}
                    errorActions={null}
                    errorHistory={result.errorHistory}
                  />
                  <article className="result-analysis-card result-analysis-card--conclusion functional-feedback">
                    <Target size={24} />
                    <div>
                      <h3>Leitura do treinamento</h3>
                      <p>{behaviorMessage}</p>
                    </div>
                  </article>
                </section>

                <section className="wide-panel reveal-up">
                  <div className="section-heading">
                    <p className="eyebrow">Resultados numéricos</p>
                    <h2>Métricas recalculadas após o treinamento.</h2>
                  </div>
                  <TrainingSummaryCards result={result} />
                  <div className="result-metrics-strip functional-parameter-strip">
                    <article>
                      <span>Taxa de aprendizagem</span>
                      <strong>{formatDecimal(result.learningRate, 4)}</strong>
                    </article>
                    <article>
                      <span>Ativação</span>
                      <strong>{result.activationLabel}</strong>
                    </article>
                    <article>
                      <span>Seed</span>
                      <strong>{result.seed}</strong>
                    </article>
                    <article>
                      <span>Primeiro MSE</span>
                      <strong>{formatDecimal(result.errorHistory[0]?.mse ?? 0, 6)}</strong>
                    </article>
                    <article>
                      <span>Último MSE</span>
                      <strong>{formatDecimal(result.errorHistory.at(-1)?.mse ?? 0, 6)}</strong>
                    </article>
                  </div>
                </section>

                <section className="wide-panel reveal-up">
                  <div className="section-heading">
                    <p className="eyebrow">Comparação tabela/estimativas</p>
                    <h2>Valor real, valor predito e erro individual.</h2>
                  </div>
                  <div className="table-wrap">
                    <table className="results-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>x</th>
                          <th>t desejado</th>
                          <th>y predito</th>
                          <th>erro</th>
                          <th>|erro|</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.predictions.map((row) => (
                          <tr key={`${row.index}-${row.x}`}>
                            <td>{row.index}</td>
                            <td>{formatDecimal(row.x, 4)}</td>
                            <td>{formatDecimal(row.t, 4)}</td>
                            <td>{formatDecimal(row.yPredicted, 6)}</td>
                            <td>{formatDecimal(row.error, 6)}</td>
                            <td>{formatDecimal(row.absoluteError, 6)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            ) : null}
          </div>

          <section className="wide-panel reveal-up">
            <div className="section-heading">
              <p className="eyebrow">Comentário sobre a base de observações</p>
              <h2>Por que uma MLP faz sentido aqui?</h2>
            </div>
            <div className="results-comment-grid stagger">
              <article className="result-analysis-card">
                <Table2 size={24} />
                <h3>Poucos pontos, comportamento não linear</h3>
                <p>
                  A base possui poucos pontos, com x variando de 0 a 1. Os valores de t sobem até aproximadamente
                  x = 0,5 e depois caem, formando um comportamento curvo que uma reta simples não representa bem.
                </p>
              </article>
              <article className="result-analysis-card">
                <Network size={24} />
                <h3>Camada oculta como fonte de flexibilidade</h3>
                <p>
                  A camada oculta permite combinar respostas não lineares. Por isso, a MLP consegue acompanhar melhor o
                  formato de subida e descida observado na base do que um modelo puramente linear.
                </p>
              </article>
              <article className="result-analysis-card result-analysis-card--conclusion">
                <ListChecks size={24} />
                <h3>Cuidado com ajuste excessivo</h3>
                <p>
                  Como existem poucas observações, muitos neurônios ou muitas épocas podem produzir uma curva muito
                  presa aos pontos. O laboratório permite testar esse efeito alterando parâmetros e adicionando ruído.
                </p>
              </article>
            </div>
          </section>

        </div>
      ) : null}

      {pythonModalOpen ? (
        <div className="modal-backdrop modal-backdrop--viewport" role="presentation" onClick={() => setPythonModalOpen(false)}>
          <section
            aria-labelledby="functional-python-modal-title"
            aria-modal="true"
            className="python-modal functional-python-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Código didático</p>
                <h2 id="functional-python-modal-title">MLP para aproximação funcional em Python</h2>
              </div>
              <button className="icon-button" onClick={() => setPythonModalOpen(false)} title="Fechar" type="button">
                <ChevronUp size={18} />
              </button>
            </div>
            <p className="helper-text">
              A versão abaixo replica a ideia do laboratório com Python puro: base do professor, inicialização por seed,
              propagação direta, backpropagation, MSE, MAE e RMSE.
            </p>
            <pre className="python-code"><code>{pythonCode}</code></pre>
          </section>
        </div>
      ) : null}
    </div>
  );
}
