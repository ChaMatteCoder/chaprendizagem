import { CheckCircle2, FlaskConical, Play, Sigma, Sparkles } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import KMeansCentroidTable from '../components/KMeansCentroidTable.jsx';
import KMeansControls from '../components/KMeansControls.jsx';
import KMeansDatasetEditor from '../components/KMeansDatasetEditor.jsx';
import KMeansErrorChart from '../components/KMeansErrorChart.jsx';
import KMeansHero from '../components/KMeansHero.jsx';
import KMeansIterationPanel from '../components/KMeansIterationPanel.jsx';
import KMeansKSelectionPanel from '../components/KMeansKSelectionPanel.jsx';
import KMeansScatterPlot from '../components/KMeansScatterPlot.jsx';
import KMeansTheory from '../components/KMeansTheory.jsx';
import { cloneObservationsClusterDataset } from '../data/observationsClusterDataset.js';
import { formatDatasetText, parseDatasetText } from '../lib/datasetParser.js';
import { computeTotalSquaredError, runKMeans, squaredDistance } from '../lib/kmeans.js';
import { evaluateKRange } from '../lib/kmeansMetrics.js';

const defaultOptions = {
  k: 4,
  maxIterations: 50,
  tolerance: 0.0001,
  initialization: 'didactic',
  seed: 42,
};

function createPlaybackFrames(result, points) {
  const frames = [];
  const first = result.iterations[0];

  frames.push({
    phase: 'initialize',
    iteration: 0,
    historyIndex: -1,
    shortLabel: 'Início',
    title: `${result.k} centroides entram no espaço`,
    description: 'Os pontos ainda não pertencem a nenhum grupo. Primeiro, observe onde o método de inicialização colocou cada referência.',
    eqt: null,
    duration: 1700,
    snapshot: first,
  });

  for (let index = 0; index < result.iterations.length - 1; index += 1) {
    const current = result.iterations[index];
    const next = result.iterations[index + 1];

    frames.push({
      phase: 'assign',
      iteration: current.iteration,
      historyIndex: index,
      shortLabel: `Atribuir ${index + 1}`,
      title: 'Cada observação procura o centroide mais próximo',
      description: 'As cores aparecem quando as distâncias são comparadas. As linhas revelam cada associação temporária.',
      eqt: current.totalSquaredError,
      duration: 1850,
      snapshot: current,
    });

    const movedError = computeTotalSquaredError(points, current.labels, next.centroids);
    frames.push({
      phase: 'move',
      iteration: next.iteration,
      historyIndex: index + 1,
      shortLabel: `Mover ${index + 1}`,
      title: 'Os centroides caminham para a média dos seus grupos',
      description: `Atualização ${index + 1}: os centros se reposicionam e o EQT responde ao novo arranjo.`,
      eqt: movedError,
      duration: 1900,
      snapshot: {
        iteration: next.iteration,
        centroids: next.centroids,
        labels: current.labels,
        totalSquaredError: movedError,
      },
    });
  }

  const final = result.iterations.at(-1);
  frames.push({
    phase: 'complete',
    iteration: final.iteration,
    historyIndex: result.errorHistory.length - 1,
    shortLabel: 'Estável',
    title: 'Nenhum centroide precisa mais mudar',
    description: 'A tolerância foi atingida. Agora o resultado, a curva completa de EQT e a análise de K podem ser examinados.',
    eqt: final.totalSquaredError,
    duration: 1000,
    snapshot: final,
  });

  return frames;
}

function summarizeSnapshot(points, snapshot) {
  return snapshot.centroids.map((centroid, cluster) => {
    const members = points.filter((_, index) => snapshot.labels[index] === cluster);
    return {
      cluster,
      count: members.length,
      totalSquaredError: members.reduce((sum, point) => sum + squaredDistance(point, centroid), 0),
    };
  });
}

export default function KMeansPage() {
  const [isLabOpen, setIsLabOpen] = useState(false);
  const [points, setPoints] = useState(cloneObservationsClusterDataset);
  const [options, setOptions] = useState(defaultOptions);
  const [datasetText, setDatasetText] = useState(() => formatDatasetText(cloneObservationsClusterDataset()));
  const [datasetErrors, setDatasetErrors] = useState([]);
  const [experiment, setExperiment] = useState(null);
  const [selectedFrame, setSelectedFrame] = useState(0);
  const [playbackComplete, setPlaybackComplete] = useState(false);
  const [showConnections, setShowConnections] = useState(false);
  const runIdRef = useRef(0);

  const frames = useMemo(
    () => (experiment ? createPlaybackFrames(experiment.result, experiment.points) : []),
    [experiment],
  );
  const currentFrame = frames[selectedFrame] ?? frames[0] ?? null;
  const currentSummaries = useMemo(
    () => (currentFrame && currentFrame.phase !== 'initialize'
      ? summarizeSnapshot(experiment.points, currentFrame.snapshot)
      : null),
    [currentFrame, experiment],
  );
  const visibleErrorHistory = experiment && currentFrame?.historyIndex >= 0
    ? experiment.result.errorHistory.slice(0, currentFrame.historyIndex + 1)
    : [];
  const kSelection = useMemo(
    () => (experiment && playbackComplete
      ? evaluateKRange(experiment.points, {
          maxK: 8,
          maxIterations: experiment.options.maxIterations,
          tolerance: experiment.options.tolerance,
        })
      : []),
    [experiment, playbackComplete],
  );

  const handleFrameChange = useCallback((index) => {
    setSelectedFrame(index);
    if (index < frames.length - 1) setPlaybackComplete(false);
  }, [frames.length]);
  const handlePlaybackComplete = useCallback(() => setPlaybackComplete(true), []);

  function openLab() {
    setIsLabOpen(true);
    window.setTimeout(() => {
      document.getElementById('kmeans-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }

  function invalidateExperiment() {
    setExperiment(null);
    setPlaybackComplete(false);
    setSelectedFrame(0);
  }

  function handleOptionsChange(nextOptions) {
    setOptions(nextOptions);
    invalidateExperiment();
  }

  function handleApplyDataset() {
    const parsed = parseDatasetText(datasetText);
    setDatasetErrors(parsed.errors);
    if (parsed.errors.length) return;

    setPoints(parsed.points);
    setOptions((current) => ({ ...current, k: Math.min(current.k, parsed.points.length, 8) }));
    invalidateExperiment();
  }

  function handleRestoreDataset() {
    const original = cloneObservationsClusterDataset();
    setPoints(original);
    setDatasetText(formatDatasetText(original));
    setDatasetErrors([]);
    invalidateExperiment();
  }

  function startExperiment() {
    const experimentPoints = points.map((point) => ({ ...point }));
    const experimentOptions = { ...options };
    const result = runKMeans(experimentPoints, experimentOptions);
    runIdRef.current += 1;
    setSelectedFrame(0);
    setPlaybackComplete(false);
    setShowConnections(false);
    setExperiment({ id: runIdRef.current, points: experimentPoints, options: experimentOptions, result });
    window.setTimeout(() => {
      document.getElementById('kmeans-execution')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  const result = experiment?.result ?? null;
  const activeGroups = result?.clusterSummaries.filter((cluster) => cluster.count > 0).length ?? 0;

  return (
    <div className="page kmeans-page">
      <KMeansHero isOpen={isLabOpen} onOpenLab={openLab} />

      {isLabOpen ? (
        <div className="kmeans-lab-content" id="kmeans-content">
          <KMeansTheory />

          <section className="kmeans-section reveal-up" id="laboratorio-kmeans">
            <div className="section-heading">
              <p className="eyebrow">Laboratório interativo</p>
              <h2>Primeiro configure. Depois acompanhe o algoritmo pensar.</h2>
              <p>O resultado permanece oculto até você iniciar. Alterar qualquer parâmetro prepara uma nova execução.</p>
            </div>

            <div className="kmeans-setup-grid">
              <KMeansControls onChange={handleOptionsChange} options={options} pointCount={points.length} />
              <KMeansDatasetEditor
                errors={datasetErrors}
                onApply={handleApplyDataset}
                onChange={setDatasetText}
                onRestore={handleRestoreDataset}
                pointCount={points.length}
                value={datasetText}
              />
            </div>

            <div className="kmeans-launch-card">
              <div>
                <span>Etapa 3 de 3</span>
                <strong>Pronto para observar Lloyd em ação?</strong>
                <p>K = {options.k} · {points.length} pontos · inicialização {options.initialization} · seed {options.seed}</p>
              </div>
              <button className="button button--primary" onClick={startExperiment} type="button">
                <Play size={18} /> Iniciar K-Means
              </button>
            </div>
          </section>

          {experiment && currentFrame ? (
            <div className="kmeans-experiment-reveal" id="kmeans-execution">
              <section className="kmeans-section kmeans-execution-section">
                <div className="section-heading section-heading--with-actions">
                  <div>
                    <p className="eyebrow">Execução cinematográfica</p>
                    <h2>O modelo está construindo os grupos.</h2>
                    <p>Pause, avance ou volte para examinar cada decisão.</p>
                  </div>
                  <span className={`kmeans-live-badge ${playbackComplete ? 'is-complete' : ''}`}>
                    <i /> {playbackComplete ? 'execução concluída' : 'modelo pensando'}
                  </span>
                </div>

                <KMeansIterationPanel
                  autoPlayKey={experiment.id}
                  frames={frames}
                  onChange={handleFrameChange}
                  onComplete={handlePlaybackComplete}
                  selectedFrame={selectedFrame}
                />

                <div className="kmeans-lab-grid">
                  <KMeansScatterPlot
                    onToggleConnections={() => setShowConnections((value) => !value)}
                    phase={currentFrame.phase}
                    points={experiment.points}
                    showConnections={showConnections}
                    snapshot={currentFrame.snapshot}
                  />
                  <aside className="kmeans-lab-sidebar kmeans-lab-sidebar--cinema">
                    <article className={`kmeans-thinking-card is-${currentFrame.phase}`}>
                      <span><Sparkles size={20} /></span>
                      <small>O que o modelo faz agora</small>
                      <h3>{currentFrame.title}</h3>
                      <p>{currentFrame.description}</p>
                      <div>
                        <span>Iteração <strong>{currentFrame.iteration}</strong></span>
                        <span>EQT <strong>{currentFrame.eqt == null ? '—' : currentFrame.eqt.toFixed(4)}</strong></span>
                      </div>
                    </article>
                    <KMeansCentroidTable centroids={currentFrame.snapshot.centroids} summaries={currentSummaries} />
                  </aside>
                </div>
              </section>

              <section className="kmeans-section reveal-up">
                <div className="section-heading">
                  <p className="eyebrow">Erro quadrático total</p>
                  <h2>A curva é revelada junto com o raciocínio.</h2>
                </div>
                <div className="kmeans-error-layout">
                  {visibleErrorHistory.length ? (
                    <KMeansErrorChart errorHistory={visibleErrorHistory} />
                  ) : (
                    <div className="kmeans-error-placeholder">
                      <Sigma size={26} />
                      <strong>O EQT aparecerá após a primeira atribuição</strong>
                      <p>Antes disso, os pontos ainda não pertencem a nenhum centroide.</p>
                    </div>
                  )}
                  <article className="kmeans-formula-card">
                    <span><Sigma size={22} /></span><p>Função objetivo</p>
                    <strong>EQT = Σ ‖xᵢ − μ<sub>cᵢ</sub>‖²</strong>
                    <p>Para cada ponto xᵢ, usamos o centroide μ do cluster atribuído e somamos a distância ao quadrado.</p>
                    <div><span>Não é distância simples</span><b>é distância²</b></div>
                  </article>
                </div>
              </section>

              {playbackComplete ? (
                <div className="kmeans-results-reveal">
                  <section className="kmeans-section"><KMeansKSelectionPanel results={kSelection} /></section>
                  <section className="kmeans-conclusion reveal-scale">
                    <span><CheckCircle2 size={28} /></span>
                    <div>
                      <p className="eyebrow">Conclusão automática</p><h2>O que este experimento encontrou</h2>
                      <p>Com <strong>K = {result.k}</strong>, o algoritmo formou <strong>{activeGroups} grupos</strong>, {result.converged ? 'convergiu' : 'parou no limite'} em <strong>{result.iterations.length - 1} iterações</strong> e atingiu EQT final de <strong>{result.totalSquaredError.toFixed(4)}</strong>.</p>
                      <small>Os clusters descrevem proximidade geométrica; interpretar o que eles significam ainda depende do contexto.</small>
                    </div>
                    <button className="button button--light" onClick={startExperiment} type="button"><FlaskConical size={17} /> Executar novamente</button>
                  </section>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
