import {
  ArrowLeft,
  BrainCircuit,
  Calculator,
  ChartNoAxesCombined,
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
  'Carregar os dados x e y.',
  'Normalizar x para facilitar o treinamento.',
  'Inicializar peso w e bias b em zero.',
  'Percorrer todas as observações em cada época.',
  'Calcular a saída estimada pela reta da Adaline.',
  'Calcular o erro entre o valor observado e o valor estimado.',
  'Atualizar peso e bias proporcionalmente ao erro.',
  'Acumular o erro quadrático total da época.',
  'Repetir até terminar o número de épocas.',
  'Converter a reta da Adaline para a escala original e comparar.',
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
        <div className="regression-hero-visual" aria-label="Reta ajustada sobre pontos observados">
          <span />
          <i />
          <b />
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
        <div className="theory-highlight-grid">
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
        <div className="regression-steps">
          {steps.map((step, index) => (
            <article key={step}>
              <span>{index + 1}</span>
              <p>{step}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="wide-panel">
        <div className="section-heading">
          <p className="eyebrow">Simulação com a base de observações</p>
          <h2>Ajuste a taxa, edite pontos e gere os resultados.</h2>
          <p>
            Os dados do arquivo <code>basedeobservacoes_trabalho06.txt</code> já foram carregados. Os gráficos aparecem
            somente após clicar em Simular.
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

          <section className="wide-panel regression-results-panel" ref={chartsRef}>
            <div className="section-heading">
              <p className="eyebrow">Gráficos obrigatórios</p>
              <h2>Erro, retas individuais e comparação.</h2>
            </div>
            <div className="regression-chart-grid">
              <RegressionErrorChart data={simulation.adaline.errorHistory} />
              <AdalineRegressionLineChart data={simulation.adalineLine} dataset={simulation.dataset} />
              <ClassicRegressionLineChart data={simulation.classicLine} dataset={simulation.dataset} />
              <ComparisonRegressionChart data={simulation.comparisonLine} dataset={simulation.dataset} />
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
