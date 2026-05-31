import {
  ArrowLeft,
  BrainCircuit,
  Calculator,
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
  Download,
  Eraser,
  GitCompareArrows,
  ListChecks,
  Plus,
  RefreshCcw,
  Shuffle,
  Sigma,
  Table2,
  Trash2,
  TrendingDown,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import MetricCard from '../../../components/MetricCard.jsx';
import {
  AdalineRegressionLineChart,
  ClassicRegressionLineChart,
  ComparisonRegressionChart,
  RegressionErrorChart,
} from '../components/RegressionCharts.jsx';
import { observationsText } from '../data/observationsDataset.js';
import {
  buildLineData,
  calculateClassicRegression,
  calculatePearson,
  classifyCorrelation,
  formatNumber,
  generateRegressionComment,
  parseObservations,
  trainRegressionAdaline,
  validateRegressionRows,
} from '../lib/regressionAdaline.js';

const originalDataset = parseObservations(observationsText);

const theoryCards = [
  {
    icon: Sigma,
    title: 'Regressão linear simples',
    text: 'Busca uma reta para descrever a relação entre a entrada x e o valor observado y.',
  },
  {
    icon: BrainCircuit,
    title: 'Adaline como reta',
    text: 'Com uma única entrada, a saída estimada também representa uma reta. O que muda é o modo de ajustar peso e bias.',
  },
  {
    icon: TrendingDown,
    title: 'Erro quadrático',
    text: 'A regra delta ajusta peso e bias usando a diferença entre valor observado e valor estimado.',
  },
  {
    icon: Sigma,
    title: 'Pearson e R²',
    text: 'Pearson mede força e direção da relação linear. O R² indica quanto da variação de y é explicada pela reta.',
  },
];

const steps = [
  {
    title: 'Carregar dados',
    text: 'Ler os pares observados da base, separando cada valor de entrada x e cada saída real y.',
    code: 'base = [(x1, y1), ...]',
  },
  {
    title: 'Normalizar x',
    text: 'Colocar a entrada em uma escala mais confortável para o treinamento iterativo da Adaline.',
    code: 'x_norm = (x - x̄) / σ',
  },
  {
    title: 'Iniciar parâmetros',
    text: 'Começar com peso e bias iguais a zero para deixar o experimento reproduzível.',
    code: 'w = 0, b = 0',
  },
  {
    title: 'Percorrer a época',
    text: 'Apresentar todas as observações ao modelo. Uma passagem completa pela base forma uma época.',
    code: 'para cada (x, y)',
  },
  {
    title: 'Estimar a saída',
    text: 'Usar a reta atual da Adaline para gerar uma previsão linear para o ponto observado.',
    code: 'ŷ = w x + b',
  },
  {
    title: 'Medir o erro',
    text: 'Comparar o valor real com o valor estimado para saber a direção do ajuste.',
    code: 'e = y - ŷ',
  },
  {
    title: 'Ajustar peso e bias',
    text: 'Mover os parâmetros um pouco na direção que reduz o erro para aquela observação.',
    code: 'w ← w + η e x',
  },
  {
    title: 'Somar erro quadrático',
    text: 'Acumular o erro ao quadrado para acompanhar se a época melhorou o ajuste.',
    code: 'E ← E + e²',
  },
  {
    title: 'Repetir épocas',
    text: 'Executar várias épocas até a reta ficar estável ou o número configurado terminar.',
    code: 'época 1 ... N',
  },
  {
    title: 'Comparar as retas',
    text: 'Converter os coeficientes para a escala original e comparar Adaline com a regressão clássica.',
    code: 'w, b ≈ a, b',
  },
];

function Formula({ children }) {
  return <div className="math-formula">{children}</div>;
}

function Fraction({ top, bottom }) {
  return (
    <span className="math-fraction">
      <span>{top}</span>
      <span>{bottom}</span>
    </span>
  );
}

function makeRandomDataset(size) {
  const count = Math.max(2, Math.min(200, Number(size) || 20));
  const slope = 0.45 + Math.random() * 0.8;
  const intercept = -1.5 + Math.random() * 3;
  const noise = 0.35 + Math.random() * 1.1;

  return Array.from({ length: count }, (_, index) => {
    const x = -5 + (10 * index) / Math.max(1, count - 1);
    const wave = Math.sin(index * 1.7) * noise * 0.45;
    const jitter = (Math.random() - 0.5) * noise;
    const y = slope * x + intercept + wave + jitter;

    return {
      id: index + 1,
      x: Number(x.toFixed(4)),
      y: Number(y.toFixed(4)),
    };
  });
}

export default function AdalineRegressionPage() {
  const [rows, setRows] = useState(originalDataset);
  const [learningRate, setLearningRate] = useState(0.01);
  const [epochs, setEpochs] = useState(100);
  const [randomCount, setRandomCount] = useState(30);
  const [error, setError] = useState('');
  const [simulation, setSimulation] = useState(null);
  const chartsRef = useRef(null);
  const [workOpen, setWorkOpen] = useState(false);
  const workContentRef = useRef(null);
  const [activeRegressionStep, setActiveRegressionStep] = useState(0);
  const [comparisonZoom, setComparisonZoom] = useState(1);
  const [showAdalineCurve, setShowAdalineCurve] = useState(true);
  const [showClassicCurve, setShowClassicCurve] = useState(true);
  const [chartDisplayMode, setChartDisplayMode] = useState('simplified');
  const activeStep = steps[activeRegressionStep];

  const metrics = useMemo(() => {
    if (!simulation) return null;

    const rSquared = simulation.pearson ** 2;
    const comment = generateRegressionComment({ ...simulation, rSquared });

    return {
      rSquared,
      correlationLabel: classifyCorrelation(simulation.pearson),
      comment,
      slopeDistance: Math.abs(simulation.classic.slope - simulation.adaline.weight),
      biasDistance: Math.abs(simulation.classic.intercept - simulation.adaline.bias),
    };
  }, [simulation]);

  useEffect(() => {
    if (!simulation) return;

    window.requestAnimationFrame(() => {
      chartsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [simulation]);

  useEffect(() => {
    if (!workOpen) return;

    window.requestAnimationFrame(() => {
      workContentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [workOpen]);

  function updateCell(rowId, key, value) {
    setRows((currentRows) => currentRows.map((row) => (row.id === rowId ? { ...row, [key]: value } : row)));
  }

  function addPoint() {
    setRows((currentRows) => [
      ...currentRows,
      {
        id: Math.max(...currentRows.map((row) => row.id), 0) + 1,
        x: 0,
        y: 0,
      },
    ]);
    setSimulation(null);
  }

  function removePoint(rowId) {
    setRows((currentRows) => currentRows.filter((row) => row.id !== rowId));
    setSimulation(null);
  }

  function resetSimulation() {
    setRows((currentRows) => currentRows.map((row, index) => ({ id: row.id ?? index + 1, x: '', y: '' })));
    setSimulation(null);
    setError('');
  }

  function restoreOriginalData() {
    setRows(originalDataset);
    setLearningRate(0.01);
    setEpochs(100);
    setError('');
    setSimulation(null);
  }

  function useRandomData() {
    setRows(makeRandomDataset(randomCount));
    setError('');
    setSimulation(null);
  }

  function goToPreviousStep() {
    setActiveRegressionStep((current) => (current - 1 + steps.length) % steps.length);
  }

  function goToNextStep() {
    setActiveRegressionStep((current) => (current + 1) % steps.length);
  }

  function downloadChart(chartId, filename) {
    const chartSvgs = Array.from(document.querySelectorAll(`[data-chart="${chartId}"] .chart-frame svg`));
    const svg =
      chartSvgs.find((item) => item.getAttribute('role') === 'application') ??
      chartSvgs
        .map((item) => ({ item, rect: item.getBoundingClientRect() }))
        .sort((a, b) => b.rect.width * b.rect.height - a.rect.width * a.rect.height)[0]?.item;

    if (!svg) return;

    const serializer = new XMLSerializer();
    const clonedSvg = svg.cloneNode(true);
    const chartRect = svg.getBoundingClientRect();
    const width = Math.max(1, Math.round(chartRect.width || Number(svg.getAttribute('width')) || 900));
    const height = Math.max(1, Math.round(chartRect.height || Number(svg.getAttribute('height')) || 520));

    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clonedSvg.setAttribute('width', String(width));
    clonedSvg.setAttribute('height', String(height));

    if (!clonedSvg.getAttribute('viewBox')) {
      clonedSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    }

    const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    background.setAttribute('x', '0');
    background.setAttribute('y', '0');
    background.setAttribute('width', '100%');
    background.setAttribute('height', '100%');
    background.setAttribute('fill', '#fbfaf6');
    clonedSvg.insertBefore(background, clonedSvg.firstChild);

    const svgText = serializer.serializeToString(clonedSvg);
    const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
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
      link.href = canvas.toDataURL('image/png');
      link.download = filename;
      link.click();
    };

    image.src = url;
  }

  function downloadAllCharts() {
    [
      ['regression-error', 'adaline-regressao-erro.png'],
      ['regression-adaline', 'adaline-regressao-reta-adaline.png'],
      ['regression-classic', 'adaline-regressao-reta-classica.png'],
      ['regression-comparison', 'adaline-regressao-comparacao.png'],
    ].forEach(([chartId, filename], index) => {
      window.setTimeout(() => downloadChart(chartId, filename), index * 250);
    });
  }

  function runSimulation() {
    try {
      const dataset = validateRegressionRows(rows);
      const adaline = trainRegressionAdaline(dataset, Number(learningRate), Number(epochs));
      const classic = calculateClassicRegression(dataset);
      const pearson = calculatePearson(dataset);
      const adalineLine = buildLineData(dataset, adaline.weight, adaline.bias, 'adaline');
      const classicLine = buildLineData(dataset, classic.slope, classic.intercept, 'classic');
      const comparisonLine = adalineLine.map((item, index) => ({
        ...item,
        classic: classicLine[index].classic,
      }));

      setError('');
      setSimulation({
        dataset,
        adaline,
        classic,
        pearson,
        adalineLine,
        classicLine,
        comparisonLine,
        learningRate: Number(learningRate),
        epochs: Number(epochs),
      });
    } catch (validationError) {
      setSimulation(null);
      setError(validationError.message);
    }
  }

  return (
    <div className="page adaline-page regression-page">
      <section className="page-hero adaline-hero regression-hero">
        <div>
          <p className="eyebrow">Trabalho 06 - Regressão Linear com Adaline</p>
          <h1>Regressão Linear com Adaline</h1>
          <p>
            Como um neurônio linear adaptativo pode aprender uma reta a partir de dados observados e comparar seu ajuste
            com a regressão linear clássica.
          </p>
          <div className="hero-actions">
            <button className="button button--primary" onClick={() => setWorkOpen(true)} type="button">
              Abrir Trabalho 06 <Calculator size={18} />
            </button>
            <Link className="button button--ghost" to="/adaline">
              <ArrowLeft size={18} /> Voltar ao Trabalho 05
            </Link>
          </div>
        </div>
        <div className="regression-hero-visual" aria-label="Animação da Adaline ajustando uma reta de regressão">
          <svg className="regression-hero-svg" viewBox="0 0 720 520" role="img" aria-hidden="true">
            <defs>
              <linearGradient id="regressionHeroBg" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#007a78" />
                <stop offset="58%" stopColor="#244546" />
                <stop offset="100%" stopColor="#171b1d" />
              </linearGradient>
              <linearGradient id="regressionLineGradient" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#ffe8a5" />
                <stop offset="100%" stopColor="#f6c85f" />
              </linearGradient>
              <filter id="heroGlow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="8" result="blur" />
                <feColorMatrix
                  in="blur"
                  result="glow"
                  values="0 0 0 0 0.45 0 0 0 0 0.22 0 0 0 0 1 0 0 0 0.95 0"
                />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="lineGlow" x="-30%" y="-80%" width="160%" height="260%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feColorMatrix
                  in="blur"
                  result="glow"
                  values="0 0 0 0 1 0 0 0 0 0.82 0 0 0 0 0.32 0 0 0 0.75 0"
                />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <rect width="720" height="520" rx="8" fill="url(#regressionHeroBg)" />
            <g className="regression-grid">
              {Array.from({ length: 9 }, (_, index) => (
                <line key={`v-${index}`} x1={80 + index * 70} x2={80 + index * 70} y1="70" y2="430" />
              ))}
              {Array.from({ length: 6 }, (_, index) => (
                <line key={`h-${index}`} x1="70" x2="650" y1={95 + index * 62} y2={95 + index * 62} />
              ))}
            </g>

            <g className="regression-axis">
              <path d="M82 424 H650" />
              <path d="M82 424 V72" />
              <text x="630" y="456">x</text>
              <text x="50" y="90">y</text>
            </g>

            <g className="adaline-node">
              <circle cx="118" cy="92" r="34" />
              <text x="118" y="100">Σ</text>
              <path d="M152 92 C205 92 218 130 255 160" />
              <path d="M154 84 C220 58 265 72 302 108" />
            </g>

            <g className="residuals">
              <path className="residual residual--1" d="M205 325 V349" />
              <path className="residual residual--2" d="M287 279 V292" />
              <path className="residual residual--3" d="M371 235 V215" />
              <path className="residual residual--4" d="M468 186 V203" />
              <path className="residual residual--5" d="M572 132 V154" />
            </g>

            <path className="regression-fit-line regression-fit-line--shadow" d="M115 371 L628 92" />
            <path className="regression-fit-line" d="M115 371 L628 92" />

            <g className="regression-points" filter="url(#heroGlow)">
              <circle className="point point--1" cx="158" cy="335" r="9" />
              <circle className="point point--2" cx="205" cy="349" r="9" />
              <circle className="point point--3" cx="287" cy="292" r="9" />
              <circle className="point point--4" cx="371" cy="215" r="9" />
              <circle className="point point--5" cx="468" cy="203" r="9" />
              <circle className="point point--6" cx="572" cy="154" r="9" />
            </g>

            <g className="learning-pulse">
              <circle cx="318" cy="312" r="18" />
              <circle cx="318" cy="312" r="36" />
              <text x="318" y="319">η</text>
            </g>

            <g className="epoch-chip">
              <rect x="458" y="356" width="158" height="58" rx="8" />
              <text x="482" y="381">erro ↓</text>
              <path d="M482 398 C510 386 530 406 556 390 C574 378 590 382 606 366" />
            </g>
          </svg>
        </div>
      </section>

      {workOpen ? (
        <div className="work-content-reveal" ref={workContentRef}>
      <section className="wide-panel">
        <div className="section-heading">
          <p className="eyebrow">Objetivo do laboratório</p>
          <h2>Estudar a relação entre x e y usando duas formas de chegar à mesma ideia: uma reta.</h2>
          <p>
            A regressão linear modela a relação entre duas variáveis numéricas. A Adaline também pode aprender essa
            relação, mas faz isso por ajuste iterativo dos pesos ao longo das épocas de treinamento.
          </p>
        </div>
        <div className="theory-highlight-grid regression-objective-grid">
          {theoryCards.map((item) => {
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

      <section className="wide-panel">
        <div className="section-heading">
          <p className="eyebrow">Fundamentação teórica</p>
          <h2>Da fórmula fechada ao aprendizado por gradiente.</h2>
        </div>
        <div className="regression-theory-grid">
          <article className="result-analysis-card">
            <h3>O que é regressão linear</h3>
            <p>
              A regressão linear simples procura uma reta que relacione uma variável de entrada com uma variável de
              saída.
            </p>
            <Formula>
              <span>y</span>
              <span>=</span>
              <span>a</span>
              <span>x</span>
              <span>+</span>
              <span>b</span>
            </Formula>
            <p>
              O valor <code>a</code> é o coeficiente angular, <code>b</code> é o intercepto, <code>x</code> é a entrada
              e <code>y</code> é o valor
              estimado.
            </p>
            <p>
              Se <code>a</code> é positivo, a reta cresce. Se é negativo, a reta decresce. Se fica perto de zero, a
              relação linear tende a ser quase horizontal.
            </p>
          </article>
          <article className="result-analysis-card">
            <h3>Fórmulas clássicas</h3>
            <Formula>
              <span>a</span>
              <span>=</span>
              <Fraction
                top={
                  <>
                    Σ (x<sub>i</sub> - x̄)(y<sub>i</sub> - ȳ)
                  </>
                }
                bottom={
                  <>
                    Σ (x<sub>i</sub> - x̄)<sup>2</sup>
                  </>
                }
              />
            </Formula>
            <Formula>
              <span>b</span>
              <span>=</span>
              <span>ȳ</span>
              <span>-</span>
              <span>a x̄</span>
            </Formula>
            <p>Essas fórmulas calculam diretamente a melhor reta dos mínimos quadrados para regressão linear simples.</p>
          </article>
          <article className="result-analysis-card">
            <h3>Adaline aplicada à regressão</h3>
            <Formula>
              <span>ŷ</span>
              <span>=</span>
              <span>w</span>
              <span>x</span>
              <span>+</span>
              <span>b</span>
            </Formula>
            <Formula>
              <span>e</span>
              <span>=</span>
              <span>y</span>
              <span>-</span>
              <span>ŷ</span>
            </Formula>
            <Formula>
              <span>E</span>
              <span>=</span>
              <span>Σ e²</span>
            </Formula>
            <p>
              O peso <code>w</code> representa o coeficiente angular aprendido. O bias representa o intercepto aprendido.
              A Adaline ajusta esses valores aos poucos.
            </p>
          </article>
          <article className="result-analysis-card">
            <h3>Pearson e determinação</h3>
            <Formula>
              <span>r</span>
              <span>=</span>
              <Fraction
                top={
                  <>
                    Σ (x<sub>i</sub> - x̄)(y<sub>i</sub> - ȳ)
                  </>
                }
                bottom={
                  <>
                    √[Σ (x<sub>i</sub> - x̄)<sup>2</sup> · Σ (y<sub>i</sub> - ȳ)<sup>2</sup>]
                  </>
                }
              />
            </Formula>
            <Formula>
              <span>R²</span>
              <span>=</span>
              <span>r²</span>
            </Formula>
            <p>
              O coeficiente <code>r</code> varia de -1 a +1 e mede força e direção da relação linear. O <code>R²</code>
              indica a parcela da variação de y explicada pela reta.
            </p>
          </article>
        </div>
        <div className="comparison-table-wrap">
          <table className="results-table">
            <thead>
              <tr>
                <th>Regressão linear clássica</th>
                <th>Adaline</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Calcula a e b diretamente por fórmulas fechadas.</td>
                <td>Aprende w e b iterativamente usando o erro.</td>
              </tr>
              <tr>
                <td>Encontra a solução ótima para regressão linear simples.</td>
                <td>Pode se aproximar muito da solução clássica quando bem treinada.</td>
              </tr>
              <tr>
                <td>Não depende de taxa de aprendizagem nem de épocas.</td>
                <td>Depende de taxa, normalização e número de épocas.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="wide-panel">
        <div className="section-heading">
          <p className="eyebrow">Como o algoritmo funciona</p>
          <h2>Treinamento da Adaline para regressão.</h2>
          <p>
            A normalização ajuda a evitar instabilidade no treino. No gráfico final, os coeficientes são convertidos de
            volta para a escala original da base.
          </p>
        </div>
        <div className="regression-steps regression-timeline">
          <article className="timeline-stage">
            <div className="timeline-stage__meta">
              <span>
                Etapa {String(activeRegressionStep + 1).padStart(2, '0')} de {steps.length}
              </span>
              <strong>{activeStep.title}</strong>
            </div>
            <p>{activeStep.text}</p>
            <code>{activeStep.code}</code>
            <div className="timeline-controls">
              <button className="icon-button" onClick={goToPreviousStep} title="Etapa anterior" type="button">
                <ChevronLeft size={19} />
              </button>
              <div className="timeline-progress" aria-hidden="true">
                <span style={{ width: `${((activeRegressionStep + 1) / steps.length) * 100}%` }} />
              </div>
              <button className="icon-button" onClick={goToNextStep} title="Próxima etapa" type="button">
                <ChevronRight size={19} />
              </button>
            </div>
          </article>

          <div className="timeline-track" aria-label="Etapas do treinamento da Adaline">
            {steps.map((step, index) => (
              <button
                className={[
                  'timeline-step',
                  index === activeRegressionStep ? 'is-active' : '',
                  index < activeRegressionStep ? 'is-complete' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                key={step.title}
                onClick={() => setActiveRegressionStep(index)}
                type="button"
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                <small>{step.title}</small>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="wide-panel">
        <div className="section-heading">
          <p className="eyebrow">Simulação com a base de observações</p>
          <h2>Ajuste a taxa, edite pontos e gere os resultados.</h2>
          <p>
            Os dados presentes na base <code>x</code> e <code>y</code> são exemplos para ilustrar a regressão. Você é
            livre para alterar os valores, limpar a tabela ou gerar novos pontos.
          </p>
        </div>
        <div className="regression-workspace">
          <section className="tool-panel regression-controls">
            <div className="panel-heading">
              <h2>Parâmetros</h2>
              <span>{rows.length} pontos</span>
            </div>
            <label>
              Taxa de aprendizagem
              <input
                min="0.0001"
                onChange={(event) => setLearningRate(event.target.value)}
                step="0.001"
                type="number"
                value={learningRate}
              />
            </label>
            <label>
              Épocas
              <input
                min="1"
                onChange={(event) => setEpochs(event.target.value)}
                step="1"
                type="number"
                value={epochs}
              />
            </label>
            <div className="random-data-row">
              <label>
                N dos dados aleatórios
                <input
                  min="2"
                  max="200"
                  onChange={(event) => setRandomCount(event.target.value)}
                  step="1"
                  type="number"
                  value={randomCount}
                />
              </label>
              <button className="button button--ghost" onClick={useRandomData} type="button">
                <Shuffle size={17} /> Gerar dados aleatórios
              </button>
            </div>
            <div className="control-row regression-action-stack">
              <button className="button button--primary" onClick={runSimulation} type="button">
                <Calculator size={17} /> Simular
              </button>
              <button className="button button--ghost" onClick={resetSimulation} type="button">
                <Eraser size={17} /> Resetar simulação
              </button>
              <button className="button button--ghost" onClick={restoreOriginalData} type="button">
                <RefreshCcw size={17} /> Usar dados originais
              </button>
            </div>
            {error ? <p className="form-error">{error}</p> : null}
          </section>

          <section className="tool-panel">
            <div className="panel-heading">
              <h2>Base x e y</h2>
              <button className="button button--ghost" onClick={addPoint} type="button">
                <Plus size={17} /> Adicionar ponto
              </button>
            </div>
            <div className="table-wrap regression-table-wrap">
              <table className="results-table editable-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>x</th>
                    <th>y</th>
                    <th aria-label="Ações" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.id}>
                      <td>{index + 1}</td>
                      <td>
                        <input
                          onChange={(event) => updateCell(row.id, 'x', event.target.value)}
                          step="0.0001"
                          type="number"
                          value={row.x}
                        />
                      </td>
                      <td>
                        <input
                          onChange={(event) => updateCell(row.id, 'y', event.target.value)}
                          step="0.0001"
                          type="number"
                          value={row.y}
                        />
                      </td>
                      <td>
                        <button className="table-action" onClick={() => removePoint(row.id)} title="Remover ponto" type="button">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>

      {simulation && metrics ? (
        <>
          <section className="wide-panel regression-results-panel" ref={chartsRef}>
            <div className="section-heading section-heading--with-actions">
              <div>
                <p className="eyebrow">Gráficos</p>
                <h2>Erro, retas individuais e comparação.</h2>
              </div>
              <div className="chart-section-actions">
                <div className="segmented-control" aria-label="Formato dos gráficos">
                  <button
                    className={chartDisplayMode === 'simplified' ? 'is-active' : ''}
                    onClick={() => setChartDisplayMode('simplified')}
                    type="button"
                  >
                    Simplificada
                  </button>
                  <button
                    className={chartDisplayMode === 'academic' ? 'is-active' : ''}
                    onClick={() => setChartDisplayMode('academic')}
                    type="button"
                  >
                    Acadêmica
                  </button>
                </div>
                <button className="button button--ghost" onClick={downloadAllCharts} type="button">
                  <Download size={17} /> Baixar todos
                </button>
              </div>
            </div>
            <div className="regression-chart-grid">
              <RegressionErrorChart
                actions={
                  <button
                    className="icon-button"
                    onClick={() => downloadChart('regression-error', 'adaline-regressao-erro.png')}
                    title="Baixar gráfico de erro"
                    type="button"
                  >
                    <Download size={18} />
                  </button>
                }
                data={simulation.adaline.errorHistory}
                displayMode={chartDisplayMode}
              />
              <AdalineRegressionLineChart
                actions={
                  <button
                    className="icon-button"
                    onClick={() => downloadChart('regression-adaline', 'adaline-regressao-reta-adaline.png')}
                    title="Baixar gráfico da Adaline"
                    type="button"
                  >
                    <Download size={18} />
                  </button>
                }
                data={simulation.adalineLine}
                dataset={simulation.dataset}
                displayMode={chartDisplayMode}
              />
              <ClassicRegressionLineChart
                actions={
                  <button
                    className="icon-button"
                    onClick={() => downloadChart('regression-classic', 'adaline-regressao-reta-classica.png')}
                    title="Baixar gráfico da regressão clássica"
                    type="button"
                  >
                    <Download size={18} />
                  </button>
                }
                data={simulation.classicLine}
                dataset={simulation.dataset}
                displayMode={chartDisplayMode}
              />
              <ComparisonRegressionChart
                actions={
                  <div className="comparison-chart-actions">
                    <button
                      className="icon-button"
                      onClick={() => downloadChart('regression-comparison', 'adaline-regressao-comparacao.png')}
                      title="Baixar gráfico de comparação"
                      type="button"
                    >
                      <Download size={18} />
                    </button>
                  </div>
                }
                data={simulation.comparisonLine}
                dataset={simulation.dataset}
                displayMode={chartDisplayMode}
                showAdaline={showAdalineCurve}
                showClassic={showClassicCurve}
                zoomLevel={comparisonZoom}
              />
            </div>
            <div className="comparison-study-panel">
              <div>
                <span>Zoom da comparação</span>
                <div className="segmented-control" aria-label="Zoom do gráfico de comparação">
                  {[1, 1.5, 2, 3].map((zoom) => (
                    <button
                      className={comparisonZoom === zoom ? 'is-active' : ''}
                      key={zoom}
                      onClick={() => setComparisonZoom(zoom)}
                      type="button"
                    >
                      {zoom}x
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span>Camadas visíveis</span>
                <div className="curve-toggle-row">
                  <label>
                    <input
                      checked={showAdalineCurve}
                      onChange={(event) => setShowAdalineCurve(event.target.checked)}
                      type="checkbox"
                    />
                    Adaline
                  </label>
                  <label>
                    <input
                      checked={showClassicCurve}
                      onChange={(event) => setShowClassicCurve(event.target.checked)}
                      type="checkbox"
                    />
                    Regressão clássica
                  </label>
                </div>
              </div>
            </div>
          </section>

          <section className="wide-panel regression-results-panel">
            <div className="section-heading">
              <p className="eyebrow">Resultados numéricos</p>
              <h2>Coeficientes, erro e correlação.</h2>
            </div>
            <div className="metrics-grid regression-metrics">
              <MetricCard icon={Sigma} label="a clássico" value={formatNumber(simulation.classic.slope)} />
              <MetricCard icon={Calculator} label="b clássico" value={formatNumber(simulation.classic.intercept)} />
              <MetricCard icon={BrainCircuit} label="w Adaline" value={formatNumber(simulation.adaline.weight)} />
              <MetricCard icon={BrainCircuit} label="bias Adaline" value={formatNumber(simulation.adaline.bias)} />
              <MetricCard icon={GitCompareArrows} label="|a - w|" value={formatNumber(metrics.slopeDistance)} />
              <MetricCard icon={GitCompareArrows} label="|b - bias|" value={formatNumber(metrics.biasDistance)} />
              <MetricCard icon={TrendingDown} label="Erro final" value={formatNumber(simulation.adaline.finalError)} />
              <MetricCard icon={ChartNoAxesCombined} label="Pearson r" value={formatNumber(simulation.pearson)} />
              <MetricCard icon={Sigma} label="R²" value={formatNumber(metrics.rSquared)} />
              <MetricCard icon={ListChecks} label="Correlação" value={metrics.correlationLabel} />
            </div>
          </section>

          <section className="wide-panel regression-results-panel">
            <div className="section-heading">
              <p className="eyebrow">Comentário sobre a base de observações</p>
              <h2>Interpretação automática dos resultados.</h2>
            </div>
            <article className="result-analysis-card result-analysis-card--conclusion regression-comment">
              <Table2 size={24} />
              <p>{metrics.comment}</p>
            </article>
          </section>
        </>
      ) : null}
        </div>
      ) : null}
    </div>
  );
}
