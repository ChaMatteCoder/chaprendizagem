import {
  BookOpen,
  BrainCircuit,
  Calculator,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleHelp,
  Code2,
  Download,
  Eraser,
  ExternalLink,
  FileDown,
  History,
  Info,
  ListChecks,
  Minus,
  Network,
  Play,
  Plus,
  RefreshCcw,
  Sigma,
  SlidersHorizontal,
  Table2,
  Target,
  Trash2,
  TrendingDown,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import MetricCard from '../../../components/MetricCard.jsx';
import AdalineErrorChart from '../components/AdalineErrorChart.jsx';
import AdalineScatterChart from '../components/AdalineScatterChart.jsx';
import { b2Dataset } from '../data/b2Dataset.js';
import { buildDecisionBoundary, downloadSvgAsPng, trainAdaline } from '../lib/adalineTrainer.js';

const theoryHighlights = [
  {
    icon: BrainCircuit,
    title: 'Neurônio linear adaptativo',
    text: 'A Adaline combina entradas numéricas por pesos ajustáveis e usa uma saída linear durante o aprendizado.',
  },
  {
    icon: TrendingDown,
    title: 'Erro como guia',
    text: 'O treinamento mede o tamanho do erro antes da decisão final, permitindo ajustes graduais nos pesos.',
  },
  {
    icon: Sigma,
    title: 'Regra LMS',
    text: 'A regra de Widrow-Hoff atualiza pesos e bias para reduzir o erro quadrático ao longo das épocas.',
  },
];

const references = [
  {
    label: 'Widrow e Hoff, Adaptive Switching Circuits',
    href: 'https://isl.stanford.edu/~widrow/papers/c1960adaptiveswitching.pdf',
  },
  {
    label: 'Histórico de redes neurais - University of Amsterdam',
    href: 'https://staff.fnwi.uva.nl/r.vandenboomgaard/MachineLearning/LectureNotes/Classification/NeuralNetworks/NNhistory.html',
  },
  {
    label: 'Widrow e Lehr, 30 Years of Adaptive Neural Networks',
    href: 'https://www-isl.stanford.edu/~widrow/papers/j199030years.pdf',
  },
];

function rowsToCsv(rows, dimensions) {
  const inputKeys = Array.from({ length: dimensions }, (_, index) => `s${index + 1}`);
  return [
    [...inputKeys, 't'].join(','),
    ...rows.map((row) => [...inputKeys.map((key) => row[key]), row.t].join(',')),
  ].join('\n');
}

function validateRows(rows, dimensions) {
  return rows.map((row, index) => {
    const sample = {};

    for (let dimension = 1; dimension <= dimensions; dimension += 1) {
      const rawValue = row[`s${dimension}`];

      if (rawValue === '' || rawValue === null || rawValue === undefined) {
        throw new Error(`Linha ${index + 1}: preencha s${dimension} com um número válido.`);
      }

      const value = Number(rawValue);

      if (!Number.isFinite(value)) {
        throw new Error(`Linha ${index + 1}: preencha s${dimension} com um número válido.`);
      }

      sample[`s${dimension}`] = value;
    }

    if (row.t === '' || row.t === null || row.t === undefined) {
      throw new Error(`Linha ${index + 1}: o alvo t precisa ser -1 ou 1.`);
    }

    const target = Number(row.t);

    if (![-1, 1].includes(target)) {
      throw new Error(`Linha ${index + 1}: o alvo t precisa ser -1 ou 1.`);
    }

    return { ...sample, t: target };
  });
}

const infoCopy = {
  rate: 'A taxa de aprendizagem define o tamanho do ajuste nos pesos a cada erro observado. Valores maiores aprendem mais rápido, mas podem oscilar.',
  epochs: 'Uma época é uma passagem completa por todas as amostras da base de treinamento.',
  bias: 'O bias desloca a fronteira de decisão sem depender diretamente de uma entrada.',
  weight: 'Cada peso indica a influência da dimensão correspondente na saída linear do modelo.',
};

export default function AdalinePage() {
  const initialRows = b2Dataset.map((sample, index) => ({ id: index + 1, ...sample }));
  const [datasetRows, setDatasetRows] = useState(initialRows);
  const [dimensions, setDimensions] = useState(2);
  const [learningRate, setLearningRate] = useState(0.01);
  const [epochs, setEpochs] = useState(80);
  const [formError, setFormError] = useState('');
  const [activeInfo, setActiveInfo] = useState(null);
  const [dimensionModal, setDimensionModal] = useState(null);
  const [showAllPredictions, setShowAllPredictions] = useState(false);
  const [theoryExpanded, setTheoryExpanded] = useState(false);
  const [activeAlgorithmStep, setActiveAlgorithmStep] = useState(0);
  const [pythonModalOpen, setPythonModalOpen] = useState(false);
  const [simulation, setSimulation] = useState({
    dataset: b2Dataset,
    dimensions: 2,
    learningRate: 0.01,
    epochs: 80,
  });

  const parsedDataset = simulation.dataset;
  const inputColumns = Array.from({ length: dimensions }, (_, index) => `s${index + 1}`);

  const training = useMemo(
    () =>
      trainAdaline(parsedDataset, {
        learningRate: Number(simulation.learningRate),
        epochs: Number(simulation.epochs),
      }),
    [parsedDataset, simulation.learningRate, simulation.epochs],
  );

  const boundary = useMemo(
    () => buildDecisionBoundary(parsedDataset, training.weights, training.bias),
    [parsedDataset, training.weights, training.bias],
  );

  const resultAnalysis = useMemo(() => {
    const positives = parsedDataset.filter((sample) => sample.t === 1).length;
    const negatives = parsedDataset.filter((sample) => sample.t === -1).length;
    const initialError = training.errorHistory[0]?.error ?? 0;
    const finalError = training.errorHistory.at(-1)?.error ?? 0;
    const errorReduction = initialError > 0 ? ((1 - finalError / initialError) * 100).toFixed(1) : '0.0';
    const mistakes = training.predictions.filter((sample) => !sample.correct);

    const centroid = (target) => {
      const group = parsedDataset.filter((sample) => sample.t === target);
      const total = group.length || 1;
      return training.inputKeys.map((key) => ({
        key,
        value: Number((group.reduce((sum, sample) => sum + Number(sample[key] || 0), 0) / total).toFixed(3)),
      }));
    };

    return {
      positives,
      negatives,
      initialError,
      finalError,
      errorReduction,
      mistakes,
      positiveCentroid: centroid(1),
      negativeCentroid: centroid(-1),
    };
  }, [parsedDataset, training.errorHistory, training.inputKeys, training.predictions]);

  function resetDataset() {
    setDatasetRows(initialRows);
    setDimensions(2);
    setLearningRate(0.01);
    setEpochs(80);
    setFormError('');
    setActiveInfo(null);
    setDimensionModal(null);
    setShowAllPredictions(false);
    setSimulation({
      dataset: b2Dataset,
      dimensions: 2,
      learningRate: 0.01,
      epochs: 80,
    });
  }

  function clearDataset() {
    setDatasetRows((currentRows) =>
      currentRows.map((row) => {
        const cleared = { id: row.id, t: '' };

        for (let dimension = 1; dimension <= dimensions; dimension += 1) {
          cleared[`s${dimension}`] = '';
        }

        return cleared;
      }),
    );
    setFormError('');
    setActiveInfo(null);
    setShowAllPredictions(false);
  }

  function runSimulation() {
    try {
      const dataset = validateRows(datasetRows, dimensions);
      setFormError('');
      setSimulation({
        dataset,
        dimensions,
        learningRate: Number(learningRate),
        epochs: Number(epochs),
      });
    } catch (error) {
      setFormError(error.message);
    }
  }

  function downloadErrorChart() {
    const svg = document.querySelector('[data-chart="adaline-error"] svg');

    if (svg) {
      downloadSvgAsPng(svg, 'adaline-erro-quadratico.png');
    }
  }

  function downloadScatterChart() {
    const svg = document.querySelector('[data-chart="adaline-scatter"] svg');

    if (svg) {
      downloadSvgAsPng(svg, 'adaline-dados-fronteira.png');
    }
  }

  function downloadCsv() {
    const blob = new Blob([rowsToCsv(datasetRows, dimensions)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'base-b2-adaline.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  function updateDatasetCell(rowId, key, value) {
    setDatasetRows((currentRows) =>
      currentRows.map((row) => (row.id === rowId ? { ...row, [key]: value } : row)),
    );
  }

  function addDatasetRow() {
    setDatasetRows((currentRows) => [
      ...currentRows,
      {
        id: Math.max(...currentRows.map((row) => row.id), 0) + 1,
        s1: 0,
        s2: 0,
        ...Array.from({ length: Math.max(0, dimensions - 2) }, (_, index) => `s${index + 3}`).reduce(
          (extra, key) => ({ ...extra, [key]: 0 }),
          {},
        ),
        t: 1,
      },
    ]);
  }

  function removeDatasetRow(rowId) {
    setDatasetRows((currentRows) => (currentRows.length > 1 ? currentRows.filter((row) => row.id !== rowId) : currentRows));
  }

  function requestAddDimension() {
    if (dimensions >= 4) {
      setDimensionModal({
        type: 'limit',
        title: 'Limite de dimensões',
        nextDimension: dimensions + 1,
      });
      return;
    }

    setDimensionModal({
      type: 'add',
      title: `Adicionar s${dimensions + 1}`,
      nextDimension: dimensions + 1,
    });
  }

  function confirmAddDimension() {
    const nextDimension = dimensionModal?.nextDimension;

    if (!nextDimension || nextDimension > 4) {
      setDimensionModal(null);
      return;
    }

    setDimensions(nextDimension);
    setDatasetRows((currentRows) => currentRows.map((row) => ({ ...row, [`s${nextDimension}`]: row[`s${nextDimension}`] ?? 0 })));
    setDimensionModal(null);
  }

  function removeLastDimension() {
    if (dimensions <= 2) {
      return;
    }

    const removedKey = `s${dimensions}`;
    setDimensions((current) => current - 1);
    setDatasetRows((currentRows) =>
      currentRows.map((row) => {
        const { [removedKey]: _removed, ...rest } = row;
        return rest;
      }),
    );
  }

  const algorithmSteps = [
    {
      code: 'inicializar pesos e bias',
      title: 'Preparação do modelo',
      description:
        'Antes do treinamento começar, a Adaline precisa de pesos e bias iniciais. Eles são os parâmetros que serão ajustados para aproximar a saída calculada da saída desejada.',
    },
    {
      code: 'para cada época:',
      title: 'Repetição por épocas',
      description:
        'Uma época representa uma passagem completa por todas as amostras da base. Repetir esse ciclo permite que os pesos sejam refinados gradualmente.',
    },
    {
      code: 'erro_total = 0',
      title: 'Acumulador do erro',
      description:
        'No início de cada época, o erro total é zerado. Ao final da época, ele mostrará o quanto o modelo errou considerando todas as amostras.',
    },
    {
      code: 'para cada amostra (s1, s2, t):',
      title: 'Leitura das amostras',
      description:
        'Cada linha da base B2 possui duas entradas, s1 e s2, e uma saída desejada t. O treinamento atualiza os pesos usando uma amostra por vez.',
    },
    {
      code: 'y = bias + w1*s1 + w2*s2',
      title: 'Saída linear',
      description:
        'A Adaline calcula uma combinação linear das entradas. Essa saída ainda não é uma classe; ela é o valor usado para medir o erro do modelo.',
    },
    {
      code: 'erro = t - y',
      title: 'Cálculo do erro',
      description:
        'O erro compara a saída desejada t com a saída linear y. Essa diferença indica não só se o modelo errou, mas também o tamanho do erro.',
    },
    {
      code: 'bias = bias + taxa*erro',
      title: 'Atualização do bias',
      description:
        'O bias é deslocado na direção que reduz o erro. A taxa de aprendizagem controla o tamanho desse ajuste.',
    },
    {
      code: 'w1 = w1 + taxa*erro*s1',
      title: 'Atualização do peso w1',
      description:
        'O peso ligado à entrada s1 é ajustado proporcionalmente ao erro e ao valor de s1. Assim, entradas maiores influenciam mais o ajuste.',
    },
    {
      code: 'w2 = w2 + taxa*erro*s2',
      title: 'Atualização do peso w2',
      description:
        'O mesmo processo ocorre com o peso ligado à entrada s2. O modelo aprende alterando os pesos conforme cada amostra apresentada.',
    },
    {
      code: 'erro_total += erro²',
      title: 'Erro quadrático total',
      description:
        'O erro ao quadrado é somado ao acumulador da época. Esse valor gera o gráfico que mostra se o treinamento está convergindo.',
    },
  ];

  const pythonCode = `def treinar_adaline(base, taxa=0.01, epocas=80):
    quantidade_entradas = len(base[0]) - 1
    pesos = [0 for _ in range(quantidade_entradas)]
    bias = 0
    erros_por_epoca = []

    for epoca in range(epocas):
        erro_total = 0

        for amostra in base:
            entradas = amostra[:-1]
            t = amostra[-1]
            y = bias

            for i in range(quantidade_entradas):
                y = y + pesos[i] * entradas[i]

            erro = t - y

            bias = bias + taxa * erro

            for i in range(quantidade_entradas):
                pesos[i] = pesos[i] + taxa * erro * entradas[i]

            erro_total = erro_total + erro ** 2

        erros_por_epoca.append(erro_total)

    return pesos, bias, erros_por_epoca


def classificar(entradas, pesos, bias):
    y = bias

    for i in range(len(entradas)):
        y = y + pesos[i] * entradas[i]

    return 1 if y >= 0 else -1`;

  return (
    <div className="page adaline-page">
      <section className="page-hero adaline-hero">
        <div>
          <p className="eyebrow">Trabalho 05 - Classificação com Adaline</p>
          <h1>Adaline treinado com a base B2.</h1>
          <p>
            Página base para documentar a teoria, treinar o modelo, acompanhar o erro quadrático total e testar a rede
            neural treinada.
          </p>
        </div>
        <div className="model-orbit" aria-label="Visual abstrato do modelo Adaline">
          <span className="orbit-node orbit-node--a">s1</span>
          <span className="orbit-node orbit-node--b">s2</span>
          <span className="orbit-core">Σ</span>
          <span className="orbit-output">ŷ</span>
        </div>
      </section>

      <section className="wide-panel theory-panel reveal">
        <div className="section-heading">
          <p className="eyebrow">Fundamentação teórica</p>
          <h2>Adaline: o neurônio linear adaptativo.</h2>
          <p>
            A Adaline, sigla para <strong>Adaptive Linear Neuron</strong>, é um modelo de neurônio artificial de camada
            única desenvolvido por Bernard Widrow e Marcian Hoff no início da década de 1960. Sua estrutura lembra o
            Perceptron, mas o aprendizado usa a saída linear do neurônio antes da função de decisão.
          </p>
        </div>

        <div className="theory-highlight-grid">
          {theoryHighlights.map((item) => {
            const Icon = item.icon;

            return (
              <article className="theory-feature-card reveal" key={item.title}>
                <Icon size={30} />
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            );
          })}
        </div>

        <div className="theory-summary reveal">
          <p>
            Durante o treinamento, a Adaline compara a saída calculada com a saída desejada e ajusta pesos e bias para
            reduzir o erro quadrático. Essa ideia aproxima o estudo da Adaline de conceitos centrais de otimização,
            função de custo e treinamento supervisionado.
          </p>
          <button className="button button--primary" onClick={() => setTheoryExpanded((current) => !current)} type="button">
            {theoryExpanded ? 'Ler menos' : 'Ler mais'}
            {theoryExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>

        {theoryExpanded ? (
          <div className="theory-reader">
            <article className="theory-section reveal">
              <History size={28} />
              <div>
                <h3>Origem histórica da Adaline</h3>
                <p>
                  A Adaline foi desenvolvida por Bernard Widrow e Marcian Hoff na Universidade de Stanford, por volta
                  de 1959-1960. O trabalho clássico associado ao modelo é o artigo <em>Adaptive Switching Circuits</em>,
                  publicado em 1960, que apresentou circuitos adaptativos capazes de ajustar parâmetros a partir de
                  exemplos de entrada e saída.
                </p>
                <p>
                  O modelo surgiu em um momento em que pesquisadores buscavam construir máquinas capazes de aprender
                  com a experiência. Sua contribuição central foi usar uma regra de aprendizado baseada na redução do
                  erro quadrático, conhecida como regra de Widrow-Hoff, regra delta ou algoritmo LMS.
                </p>
              </div>
            </article>

            <article className="theory-section reveal">
              <Network size={28} />
              <div>
                <h3>Estrutura básica do modelo</h3>
                <p>
                  A estrutura de uma Adaline é formada por entradas, pesos sinápticos, bias, combinação linear, saída
                  linear e, quando usada para classificação, uma função de decisão.
                </p>
                <div className="math-block">
                  <span>x = [x₁, x₂, ..., xₙ]</span>
                  <span>u = Σ wᵢxᵢ + b</span>
                </div>
                <p>
                  Nessa expressão, <strong>u</strong> é a saída linear, <strong>wᵢ</strong> é o peso associado à entrada
                  <strong> xᵢ</strong>, e <strong>b</strong> é o bias. O bias desloca a fronteira de decisão e dá mais
                  flexibilidade ao modelo.
                </p>
                <div className="math-block math-block--decision">
                  <span>classe = +1, se u ≥ 0</span>
                  <span>classe = -1, se u &lt; 0</span>
                </div>
              </div>
            </article>

            <article className="theory-section reveal">
              <Target size={28} />
              <div>
                <h3>Diferença entre Perceptron e Adaline</h3>
                <p>
                  No Perceptron, a saída passa primeiro por uma função degrau e o erro é calculado com base na classe
                  prevista. Ele sabe se classificou certo ou errado. Na Adaline, o erro é calculado antes da função de
                  decisão, comparando a saída linear <strong>u</strong> com a saída desejada <strong>d</strong>.
                </p>
                <div className="comparison-table-wrap">
                  <table className="comparison-table">
                    <thead>
                      <tr>
                        <th>Modelo</th>
                        <th>Como calcula o erro</th>
                        <th>Ideia principal</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Perceptron</td>
                        <td>Usa a saída já classificada</td>
                        <td>Corrige quando erra a classe</td>
                      </tr>
                      <tr>
                        <td>Adaline</td>
                        <td>Usa a saída linear antes da decisão</td>
                        <td>Ajusta pesos para reduzir o erro numérico</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </article>

            <article className="theory-section reveal">
              <Calculator size={28} />
              <div>
                <h3>Função de erro da Adaline</h3>
                <p>
                  A Adaline utiliza uma função de erro baseada no erro quadrático. Para uma amostra, o erro é a
                  diferença entre a saída desejada e a saída linear calculada pelo neurônio.
                </p>
                <div className="math-block">
                  <span>e = d - u</span>
                  <span>E = 1/2(d - u)²</span>
                  <span>Etotal = Σ 1/2(dᵖ - uᵖ)²</span>
                </div>
                <p>
                  Plotar o erro quadrático total durante o treinamento permite observar se o modelo está aprendendo. Em
                  um treinamento adequado, espera-se que o erro diminua ao longo das épocas.
                </p>
              </div>
            </article>

            <article className="theory-section reveal">
              <Sigma size={28} />
              <div>
                <h3>Regra de aprendizado: Widrow-Hoff ou LMS</h3>
                <p>
                  A regra de Widrow-Hoff, também chamada de regra delta ou LMS (<em>Least Mean Squares</em>), ajusta os
                  pesos com o objetivo de reduzir o erro quadrático médio entre a saída calculada e a saída desejada.
                </p>
                <div className="math-block">
                  <span>wᵢ novo = wᵢ antigo + ηexᵢ</span>
                  <span>wᵢ novo = wᵢ antigo + η(d - u)xᵢ</span>
                  <span>b novo = b antigo + η(d - u)</span>
                </div>
                <p>
                  A taxa de aprendizagem <strong>η</strong> controla o tamanho dos ajustes. Uma taxa muito pequena pode
                  tornar o treinamento lento; uma taxa muito alta pode causar oscilação e dificultar a convergência.
                </p>
              </div>
            </article>

            <article className="theory-section reveal">
              <ListChecks size={28} />
              <div>
                <h3>Como ocorre o treinamento</h3>
                <ol className="theory-list">
                  <li>Inicializam-se pesos e bias, geralmente com valores pequenos.</li>
                  <li>Apresenta-se uma amostra de entrada ao modelo.</li>
                  <li>Calcula-se a saída linear u.</li>
                  <li>Compara-se u com a saída desejada d.</li>
                  <li>Calcula-se o erro e = d - u.</li>
                  <li>Atualizam-se pesos e bias usando a regra delta.</li>
                  <li>Repete-se o processo para todas as amostras da base.</li>
                  <li>Repete-se o treinamento por várias épocas.</li>
                  <li>Ao final, testa-se o modelo treinado.</li>
                </ol>
              </div>
            </article>

            <article className="theory-section reveal">
              <TrendingDown size={28} />
              <div>
                <h3>Interpretação do erro quadrático total</h3>
                <p>
                  O erro quadrático total indica o quanto as saídas calculadas estão distantes das saídas desejadas. Se
                  o erro é alto, os pesos ainda não representam bem os padrões. Se diminui com as épocas, há evidência
                  visual de aprendizado.
                </p>
                <p>
                  Caso o erro oscile ou não diminua, pode haver problemas como taxa de aprendizagem inadequada, dados
                  mal distribuídos ou dificuldade de separação linear.
                </p>
              </div>
            </article>

            <article className="theory-section reveal">
              <Table2 size={28} />
              <div>
                <h3>Adaline em classificação e relação com o Trabalho 05</h3>
                <p>
                  Embora calcule uma saída linear, a Adaline pode ser usada para classificação binária ao aplicar um
                  limiar em zero. Em duas dimensões, ela aprende uma fronteira de decisão linear; em mais dimensões,
                  essa fronteira se torna um hiperplano.
                </p>
                <p>
                  No Trabalho 05, essa teoria é aplicada à base B2. O objetivo é treinar a Adaline, registrar o erro
                  quadrático total por época, construir o gráfico de erro e testar se os pesos ajustados classificam
                  corretamente os padrões apresentados.
                </p>
              </div>
            </article>

            <article className="theory-section theory-section--references reveal">
              <BookOpen size={28} />
              <div>
                <h3>Referências sugeridas</h3>
                <ul className="reference-list">
                  <li>WIDROW, Bernard; HOFF, Marcian E. <em>Adaptive Switching Circuits</em>. IRE WESCON Convention Record, 1960.</li>
                  <li>
                    WIDROW, Bernard; LEHR, Michael A. <em>30 years of adaptive neural networks: perceptron, madaline,
                    and backpropagation</em>. Proceedings of the IEEE, 1990.
                  </li>
                  <li>HAYKIN, Simon. <em>Redes Neurais: Princípios e Prática</em>. 2. ed. Porto Alegre: Bookman, 2001.</li>
                  <li>
                    FAUSETT, Laurene. <em>Fundamentals of Neural Networks: Architectures, Algorithms, and Applications</em>.
                    Upper Saddle River: Prentice Hall, 1994.
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

      <section className="algorithm-panel reveal">
        <div className="algorithm-header">
          <p className="eyebrow">Modelo</p>
          <h2>Algoritmo principal.</h2>
        </div>
        <div className="algorithm-body">
          <div className="algorithm-code" aria-label="Algoritmo principal do Adaline">
            {algorithmSteps.map((step, index) => (
              <button
                className={index === activeAlgorithmStep ? 'is-active' : ''}
                key={step.code}
                onClick={() => setActiveAlgorithmStep(index)}
                type="button"
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                <code>{step.code}</code>
              </button>
            ))}
            <div
              className="algorithm-marker"
              style={{ '--step': activeAlgorithmStep, '--steps': algorithmSteps.length }}
            />
          </div>
          <aside className="algorithm-explainer">
            <span>
              Linha {activeAlgorithmStep + 1} de {algorithmSteps.length}
            </span>
            <h3>{algorithmSteps[activeAlgorithmStep].title}</h3>
            <p>{algorithmSteps[activeAlgorithmStep].description}</p>
            <div className="algorithm-controls">
              <button
                className="icon-button"
                disabled={activeAlgorithmStep === 0}
                onClick={() => setActiveAlgorithmStep((current) => Math.max(0, current - 1))}
                title="Linha anterior"
                type="button"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                className="icon-button"
                disabled={activeAlgorithmStep === algorithmSteps.length - 1}
                onClick={() =>
                  setActiveAlgorithmStep((current) => Math.min(algorithmSteps.length - 1, current + 1))
                }
                title="Próxima linha"
                type="button"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </aside>
        </div>
        <button className="button button--ghost python-button" onClick={() => setPythonModalOpen(true)} type="button">
          <span className="python-icon" aria-hidden="true">Py</span>
          Veja em Python <Code2 size={18} />
        </button>
      </section>

      {pythonModalOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setPythonModalOpen(false)}>
          <section
            aria-labelledby="python-modal-title"
            aria-modal="true"
            className="python-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Código cru</p>
                <h2 id="python-modal-title">Adaline em Python</h2>
              </div>
              <button className="icon-button" onClick={() => setPythonModalOpen(false)} title="Fechar" type="button">
                <ChevronUp size={18} />
              </button>
            </div>
            <pre className="python-code"><code>{pythonCode}</code></pre>
          </section>
        </div>
      ) : null}

      {dimensionModal ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setDimensionModal(null)}>
          <section
            aria-labelledby="dimension-modal-title"
            aria-modal="true"
            className="dimension-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="dimension-modal__icon">
              <Info size={28} />
            </div>
            <h2 id="dimension-modal-title">{dimensionModal.title}</h2>
            {dimensionModal.type === 'add' ? (
              <>
                <p>
                  Ao adicionar <strong>s{dimensionModal.nextDimension}</strong>, a Adaline passa a calcular a saída em
                  um espaço com mais dimensões. O modelo continua treinando normalmente, mas o gráfico de dados e
                  fronteira permanece como uma projeção em <strong>s1</strong> e <strong>s2</strong>.
                </p>
                <p>
                  Em três ou quatro dimensões, a fronteira deixa de ser apenas uma reta visual simples e passa a
                  representar um hiperplano. Por clareza, este painel limita a simulação a <strong>s4</strong>.
                </p>
                <div className="modal-actions">
                  <button className="button button--ghost" onClick={() => setDimensionModal(null)} type="button">
                    Cancelar
                  </button>
                  <button className="button button--primary" onClick={confirmAddDimension} type="button">
                    Adicionar dimensão
                  </button>
                </div>
              </>
            ) : (
              <>
                <p>
                  Cuidado: o modelo Adaline pode ser expandido para N dimensões em termos matemáticos, mas a
                  visualização clara na página ainda está limitada a uma projeção 2D. Para manter a simulação legível,
                  o limite desta interface é <strong>s4</strong>.
                </p>
                <div className="modal-actions">
                  <button className="button button--primary" onClick={() => setDimensionModal(null)} type="button">
                    Entendi
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      ) : null}

      <section className="workspace-grid simulation-section reveal">
        <div className="workspace-column">
          <section className="tool-panel simulation-panel">
            <div className="panel-heading">
              <h2>Simulação</h2>
              <span>Base editável</span>
            </div>
            <div className="settings-grid">
              <label className="field-with-info">
                <span>
                  Taxa de aprendizagem
                  <button className="tiny-info-button" onClick={() => setActiveInfo(activeInfo === 'rate' ? null : 'rate')} type="button">
                    <CircleHelp size={15} />
                  </button>
                </span>
                <input
                  min="0.001"
                  onChange={(event) => setLearningRate(event.target.value)}
                  step="0.001"
                  type="number"
                  value={learningRate}
                />
              </label>
              <label className="field-with-info">
                <span>
                  Épocas
                  <button className="tiny-info-button" onClick={() => setActiveInfo(activeInfo === 'epochs' ? null : 'epochs')} type="button">
                    <CircleHelp size={15} />
                  </button>
                </span>
                <input
                  min="1"
                  onChange={(event) => setEpochs(event.target.value)}
                  step="1"
                  type="number"
                  value={epochs}
                />
              </label>
            </div>
            {['rate', 'epochs'].includes(activeInfo) ? (
              <aside className="info-cloud simulation-info-cloud">
                <Info size={18} />
                <p>{infoCopy[activeInfo]}</p>
                <button className="info-cloud__close" onClick={() => setActiveInfo(null)} type="button" aria-label="Fechar informação">
                  <X size={14} />
                </button>
              </aside>
            ) : null}

            <div className="dataset-toolbar">
              <div>
                <h3>Base de dados</h3>
                <p>{datasetRows.length} linhas, {dimensions + 1} colunas</p>
              </div>
              <div className="dataset-actions">
                <button className="button button--ghost compact-button" onClick={addDatasetRow} type="button">
                  <Plus size={16} /> Linha
                </button>
                <button className="icon-button" onClick={requestAddDimension} title="Adicionar dimensão" type="button">
                  <Plus size={18} />
                </button>
                {dimensions > 2 ? (
                  <button className="icon-button icon-button--danger" onClick={removeLastDimension} title="Remover última dimensão" type="button">
                    <Minus size={18} />
                  </button>
                ) : null}
                <button className="button button--ghost compact-button" onClick={clearDataset} type="button">
                  <Eraser size={16} /> Limpar dados
                </button>
                <button className="button button--ghost compact-button" onClick={downloadCsv} type="button">
                  <FileDown size={16} /> CSV
                </button>
              </div>
            </div>

            <div className="editable-data-wrap">
              <table className="editable-data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    {inputColumns.map((column) => (
                      <th key={column}>{column.toUpperCase()}</th>
                    ))}
                    <th>T</th>
                    <th aria-label="Ações" />
                  </tr>
                </thead>
                <tbody>
                  {datasetRows.map((row, rowIndex) => (
                    <tr key={row.id}>
                      <td>{rowIndex + 1}</td>
                      {inputColumns.map((column) => (
                        <td key={column}>
                          <input
                            onChange={(event) => updateDatasetCell(row.id, column, event.target.value)}
                            step="0.001"
                            type="number"
                            value={row[column] ?? ''}
                          />
                        </td>
                      ))}
                      <td>
                        <select
                          onChange={(event) =>
                            updateDatasetCell(row.id, 't', event.target.value === '' ? '' : Number(event.target.value))
                          }
                          value={row.t}
                        >
                          <option value="">-</option>
                          <option value={1}>1</option>
                          <option value={-1}>-1</option>
                        </select>
                      </td>
                      <td>
                        <button className="table-action" onClick={() => removeDatasetRow(row.id)} title="Remover linha" type="button">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {formError ? <p className="form-error">{formError}</p> : null}
            <div className="control-row">
              <button className="button button--primary" onClick={runSimulation} type="button">
                <Play size={17} /> Simular
              </button>
              <button className="button button--ghost" onClick={resetDataset} type="button">
                <RefreshCcw size={17} /> Restaurar B2
              </button>
            </div>
          </section>

          <section className="tool-panel weights-panel">
            <div className="panel-heading">
              <h2>Pesos treinados</h2>
              <span>Resultado atual</span>
            </div>
            <div className="weights-summary weights-summary--interactive">
              <button onClick={() => setActiveInfo(activeInfo === 'bias' ? null : 'bias')} type="button">
                <span>bias <CircleHelp size={15} /></span>
                <strong>{training.bias}</strong>
              </button>
              {training.weights.map((weight, index) => (
                <button
                  key={`w${index + 1}`}
                  onClick={() => setActiveInfo(activeInfo === `w${index + 1}` ? null : `w${index + 1}`)}
                  type="button"
                >
                  <span>w{index + 1} <CircleHelp size={15} /></span>
                  <strong>{weight}</strong>
                </button>
              ))}
            </div>
            {activeInfo === 'bias' || activeInfo?.startsWith('w') ? (
              <aside className="info-cloud weights-info-cloud">
                <Info size={18} />
                <p>{activeInfo === 'bias' ? infoCopy.bias : infoCopy.weight}</p>
                <button className="info-cloud__close" onClick={() => setActiveInfo(null)} type="button" aria-label="Fechar informação">
                  <X size={14} />
                </button>
              </aside>
            ) : null}
          </section>
        </div>

        <div className="workspace-column">
          <div className="metrics-grid adaline-metrics">
            <MetricCard icon={SlidersHorizontal} label="Amostras" value={parsedDataset.length} />
            <MetricCard icon={BrainCircuit} label="Acurácia" value={`${training.accuracy}%`} />
          </div>
          <section className="tool-panel">
            <div className="panel-heading">
              <h2>Erro quadrático total</h2>
              <button className="icon-button" onClick={downloadErrorChart} title="Baixar gráfico" type="button">
                <Download size={18} />
              </button>
            </div>
            <AdalineErrorChart data={training.errorHistory} />
          </section>
          <section className="tool-panel">
            <div className="panel-heading">
              <h2>Dados e fronteira</h2>
              <button className="icon-button" onClick={downloadScatterChart} title="Baixar gráfico" type="button">
                <Download size={18} />
              </button>
            </div>
            {simulation.dimensions > 2 ? (
              <p className="helper-text">
                Visualização projetada em s1 e s2. As dimensões extras participam do treino e são fixadas pela média na fronteira.
              </p>
            ) : null}
            <AdalineScatterChart boundary={boundary} dataset={parsedDataset} />
          </section>
        </div>
      </section>

      <section className="wide-panel reveal">
        <div className="section-heading">
          <p className="eyebrow">Teste da rede</p>
          <h2>Amostras classificadas após o treinamento.</h2>
        </div>
        <div className="table-wrap">
          <table className="results-table">
            <thead>
              <tr>
                <th>#</th>
                {training.inputKeys.map((key) => (
                  <th key={key}>{key}</th>
                ))}
                <th>t</th>
                <th>saída</th>
                <th>classe</th>
              </tr>
            </thead>
            <tbody>
              {(showAllPredictions ? training.predictions : training.predictions.slice(0, 7)).map((sample) => (
                <tr className={sample.correct ? 'is-correct' : 'is-wrong'} key={sample.index}>
                  <td>{sample.index}</td>
                  {training.inputKeys.map((key) => (
                    <td key={key}>{sample[key]}</td>
                  ))}
                  <td>{sample.t}</td>
                  <td>{sample.output}</td>
                  <td>{sample.predicted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {training.predictions.length > 7 ? (
          <button className="button button--ghost table-toggle" onClick={() => setShowAllPredictions((current) => !current)} type="button">
            {showAllPredictions ? 'Ver menos' : 'Ver mais'}
            {showAllPredictions ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        ) : null}
      </section>

      <section className="wide-panel reveal">
        <div className="section-heading">
          <p className="eyebrow">Comentário dos resultados</p>
          <h2>Interpretação final.</h2>
          <p>
            A base B2 foi treinada com uma Adaline de camada única usando a regra de Widrow-Hoff. A leitura abaixo
            considera a simulação atual e resume o comportamento observado no erro, na fronteira linear e no teste.
          </p>
        </div>

        <div className="result-metrics-strip">
          <article>
            <span>Amostras</span>
            <strong>{parsedDataset.length}</strong>
          </article>
          <article>
            <span>Classe +1</span>
            <strong>{resultAnalysis.positives}</strong>
          </article>
          <article>
            <span>Classe -1</span>
            <strong>{resultAnalysis.negatives}</strong>
          </article>
          <article>
            <span>Erro final</span>
            <strong>{resultAnalysis.finalError.toFixed(4)}</strong>
          </article>
          <article>
            <span>Acurácia</span>
            <strong>{training.accuracy}%</strong>
          </article>
        </div>

        <div className="results-comment-grid">
          <article className="result-analysis-card">
            <Table2 size={24} />
            <h3>Distribuição da base B2</h3>
            <p>
              A base possui {parsedDataset.length} amostras distribuídas de forma equilibrada entre as classes
              <strong> +1</strong> e <strong> -1</strong>. Isso ajuda a interpretar a acurácia sem forte viés para uma
              classe dominante.
            </p>
            <div className="centroid-list">
              <span>
                Centro médio +1:{' '}
                {resultAnalysis.positiveCentroid.map((item) => `${item.key}=${item.value}`).join(', ')}
              </span>
              <span>
                Centro médio -1:{' '}
                {resultAnalysis.negativeCentroid.map((item) => `${item.key}=${item.value}`).join(', ')}
              </span>
            </div>
          </article>

          <article className="result-analysis-card">
            <TrendingDown size={24} />
            <h3>Evolução do treinamento</h3>
            <p>
              O erro quadrático total iniciou em {resultAnalysis.initialError.toFixed(4)} e terminou em{' '}
              {resultAnalysis.finalError.toFixed(4)}, uma redução aproximada de {resultAnalysis.errorReduction}% ao
              longo de {training.errorHistory.length} épocas executadas.
            </p>
            <p>
              Esse comportamento indica que os pesos foram ajustados na direção correta e que a taxa de aprendizagem
              atual produziu convergência estável para esta base.
            </p>
          </article>

          <article className="result-analysis-card">
            <Target size={24} />
            <h3>Fronteira de decisão</h3>
            <p>
              A fronteira aprendida separa os padrões por uma combinação linear das entradas. Com os pesos atuais
              ({training.weights.map((weight, index) => `w${index + 1}=${weight}`).join(', ')}) e bias={training.bias},
              o modelo classifica uma amostra como +1 quando a saída linear é maior ou igual a zero.
            </p>
          </article>

          <article className="result-analysis-card result-analysis-card--conclusion">
            <BrainCircuit size={24} />
            <h3>Conclusão do teste</h3>
            <p>
              No teste com a base B2, a rede alcançou <strong>{training.accuracy}% de acurácia</strong>
              {resultAnalysis.mistakes.length === 0
                ? ', classificando corretamente todas as amostras exibidas.'
                : `, com ${resultAnalysis.mistakes.length} amostra(s) divergente(s) da saída desejada.`}
            </p>
            <p>
              Para este conjunto, a Adaline se mostra adequada porque os dados apresentam separação compatível com uma
              fronteira linear. A análise do gráfico de erro e da tabela de teste sustenta que o treinamento foi
              consistente para os parâmetros escolhidos.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}
