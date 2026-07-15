import { CheckCircle2, FlaskConical, GitCompareArrows, Sigma, Sparkles } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import KMeansCentroidComparisonTable from '../components/KMeansCentroidComparisonTable.jsx';
import KMeansComparisonControls from '../components/KMeansComparisonControls.jsx';
import KMeansComparisonErrorChart from '../components/KMeansComparisonErrorChart.jsx';
import KMeansComparisonMetrics from '../components/KMeansComparisonMetrics.jsx';
import KMeansComparisonScatter from '../components/KMeansComparisonScatter.jsx';
import KMeansDatasetEditor from '../components/KMeansDatasetEditor.jsx';
import KMeansExperimentSwitcher from '../components/KMeansExperimentSwitcher.jsx';
import KMeansPlusKSelection from '../components/KMeansPlusKSelection.jsx';
import KMeansPlusPlusHero from '../components/KMeansPlusPlusHero.jsx';
import KMeansPlusPlusTheory from '../components/KMeansPlusPlusTheory.jsx';
import KMeansPlusStepPanel from '../components/KMeansPlusStepPanel.jsx';
import MiniBatchKMeansLab from '../components/MiniBatchKMeansLab.jsx';
import { cloneObservationsKmeansPlusDataset } from '../data/observationsKmeansPlusDataset.js';
import { formatDatasetText, parseDatasetText } from '../lib/datasetParser.js';
import { runKMeansComparison } from '../lib/kmeansComparison.js';
import { evaluateKRange } from '../lib/kmeansMetrics.js';

const defaultOptions = {
  k: 4,
  maxIterations: 60,
  tolerance: 0.0001,
  seed: 42,
  classicInitialization: 'random',
};

function clampIteration(value, result) {
  return Math.min(Math.max(0, value), result.iterations.length - 1);
}

function IterationScrubber({
  comparison,
  synchronizeIterations,
  classicIteration,
  plusPlusIteration,
  onClassicIterationChange,
  onPlusPlusIterationChange,
}) {
  const maxIteration = Math.max(
    comparison.classic.iterations.length - 1,
    comparison.plusPlus.iterations.length - 1,
  );

  function updateSynchronized(value) {
    onClassicIterationChange(clampIteration(value, comparison.classic));
    onPlusPlusIterationChange(clampIteration(value, comparison.plusPlus));
  }

  return (
    <div className="kmeans-plus-quick-timeline">
      <span><GitCompareArrows size={18} /> Inspecione a trajetória</span>
      {synchronizeIterations ? (
        <label htmlFor="kmeans-plus-quick-sync">
          <span>Iteração compartilhada <strong>{Math.max(classicIteration, plusPlusIteration)}</strong></span>
          <input
            id="kmeans-plus-quick-sync"
            max={maxIteration}
            min="0"
            onChange={(event) => updateSynchronized(Number(event.target.value))}
            type="range"
            value={Math.max(classicIteration, plusPlusIteration)}
          />
        </label>
      ) : (
        <div>
          <label htmlFor="kmeans-plus-quick-classic">
            <span>Clássico <strong>{classicIteration}</strong></span>
            <input
              id="kmeans-plus-quick-classic"
              max={comparison.classic.iterations.length - 1}
              min="0"
              onChange={(event) => onClassicIterationChange(Number(event.target.value))}
              type="range"
              value={classicIteration}
            />
          </label>
          <label htmlFor="kmeans-plus-quick-plus">
            <span>K-Means++ <strong>{plusPlusIteration}</strong></span>
            <input
              id="kmeans-plus-quick-plus"
              max={comparison.plusPlus.iterations.length - 1}
              min="0"
              onChange={(event) => onPlusPlusIterationChange(Number(event.target.value))}
              type="range"
              value={plusPlusIteration}
            />
          </label>
        </div>
      )}
    </div>
  );
}

export default function KMeansPlusPlusPage() {
  const [isLabOpen, setIsLabOpen] = useState(false);
  const [points, setPoints] = useState(cloneObservationsKmeansPlusDataset);
  const [datasetText, setDatasetText] = useState(() => formatDatasetText(cloneObservationsKmeansPlusDataset()));
  const [datasetErrors, setDatasetErrors] = useState([]);
  const [options, setOptions] = useState(defaultOptions);
  const [comparison, setComparison] = useState(null);
  const [comparisonPoints, setComparisonPoints] = useState([]);
  const [kSelection, setKSelection] = useState([]);
  const [runMode, setRunMode] = useState('final');
  const [classicIteration, setClassicIteration] = useState(0);
  const [plusPlusIteration, setPlusPlusIteration] = useState(0);
  const [showConnections, setShowConnections] = useState(false);
  const [showInitialCentroids, setShowInitialCentroids] = useState(true);
  const [synchronizeIterations, setSynchronizeIterations] = useState(true);
  const [executionError, setExecutionError] = useState('');
  const runIdRef = useRef(0);

  const resultSummary = useMemo(() => {
    if (!comparison) return null;
    const classicIterations = comparison.classic.iterations.length - 1;
    const plusIterations = comparison.plusPlus.iterations.length - 1;
    return {
      winner: comparison.winner,
      classicIterations,
      plusIterations,
      eqtDifference: Math.abs(comparison.classic.totalSquaredError - comparison.plusPlus.totalSquaredError),
    };
  }, [comparison]);

  function openLab() {
    setIsLabOpen(true);
    window.setTimeout(() => {
      document.getElementById('kmeans-plus-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  }

  function invalidateExperiment() {
    setComparison(null);
    setComparisonPoints([]);
    setKSelection([]);
    setExecutionError('');
    setClassicIteration(0);
    setPlusPlusIteration(0);
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
    const original = cloneObservationsKmeansPlusDataset();
    setPoints(original);
    setDatasetText(formatDatasetText(original));
    setDatasetErrors([]);
    setOptions((current) => ({ ...current, k: Math.min(4, original.length) }));
    invalidateExperiment();
  }

  function executeComparison(mode) {
    try {
      const experimentPoints = points.map((point) => ({ ...point }));
      const result = runKMeansComparison(experimentPoints, options);
      const selection = evaluateKRange(experimentPoints, {
        maxK: Math.min(8, experimentPoints.length),
        maxIterations: options.maxIterations,
        tolerance: options.tolerance,
      });
      const classicLast = result.classic.iterations.length - 1;
      const plusLast = result.plusPlus.iterations.length - 1;

      runIdRef.current += 1;
      setComparison(result);
      setComparisonPoints(experimentPoints);
      setKSelection(selection);
      setRunMode(mode);
      setClassicIteration(mode === 'steps' ? 0 : classicLast);
      setPlusPlusIteration(mode === 'steps' ? 0 : plusLast);
      setExecutionError('');

      window.setTimeout(() => {
        document.getElementById('kmeans-plus-execution')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (error) {
      setExecutionError(error instanceof Error ? error.message : 'Não foi possível executar a comparação.');
    }
  }

  function toggleSynchronization() {
    setSynchronizeIterations((current) => {
      if (!current && comparison) {
        const shared = Math.min(classicIteration, plusPlusIteration);
        setClassicIteration(clampIteration(shared, comparison.classic));
        setPlusPlusIteration(clampIteration(shared, comparison.plusPlus));
      }
      return !current;
    });
  }

  return (
    <div className="page kmeans-page kmeans-plus-page">
      <KMeansExperimentSwitcher activeLabId="plusplus" />
      <KMeansPlusPlusHero isOpen={isLabOpen} onOpenLab={openLab} />

      {isLabOpen ? (
        <div className="kmeans-plus-content" id="kmeans-plus-content">
          <KMeansPlusPlusTheory />

          <section className="kmeans-section kmeans-plus-lab" id="laboratorio-kmeans-plus">
            <div className="section-heading">
              <p className="eyebrow">Laboratório comparativo</p>
              <h2>Mesmos dados. Mesmos parâmetros. Duas largadas.</h2>
              <p>
                Configure o experimento, edite a base se desejar e escolha entre ver o resultado completo ou percorrer a narrativa passo a passo.
              </p>
            </div>

            <div className="kmeans-plus-setup-grid">
              <KMeansComparisonControls
                onChange={handleOptionsChange}
                onRun={() => executeComparison('final')}
                onRunStepByStep={() => executeComparison('steps')}
                onToggleConnections={() => setShowConnections((value) => !value)}
                onToggleInitialCentroids={() => setShowInitialCentroids((value) => !value)}
                onToggleSynchronization={toggleSynchronization}
                options={options}
                pointCount={points.length}
                showConnections={showConnections}
                showInitialCentroids={showInitialCentroids}
                synchronizeIterations={synchronizeIterations}
              />
              <KMeansDatasetEditor
                description={<><span>Use um par </span><code>x y</code><span> por linha. A base fica incorporada ao código e pode ser restaurada a qualquer momento.</span></>}
                errors={datasetErrors}
                eyebrow="Base do Trabalho 11 · Editor de dados"
                onApply={handleApplyDataset}
                onChange={setDatasetText}
                onRestore={handleRestoreDataset}
                pointCount={points.length}
                restoreLabel="Restaurar observacoes.txt"
                textareaId="kmeans-plus-dataset-input"
                title="Experimente sem perder o original."
                value={datasetText}
              />
            </div>

            {executionError ? <div className="kmeans-form-error kmeans-plus-execution-error" role="alert">{executionError}</div> : null}
          </section>

          {comparison ? (
            <div className="kmeans-plus-experiment" id="kmeans-plus-execution">
              <section className="kmeans-section">
                <div className="section-heading section-heading--with-actions">
                  <div>
                    <p className="eyebrow">Comparação em execução</p>
                    <h2>Observe onde a semeadura muda a trajetória.</h2>
                    <p>Use a linha do tempo para comparar o mesmo instante ou liberar cada método separadamente.</p>
                  </div>
                  <span className="kmeans-plus-run-badge"><i /> seed {comparison.options.seed}</span>
                </div>

                {runMode === 'steps' ? (
                  <KMeansPlusStepPanel
                    classicIteration={classicIteration}
                    comparison={comparison}
                    onClassicIterationChange={setClassicIteration}
                    onPlusPlusIterationChange={setPlusPlusIteration}
                    plusPlusIteration={plusPlusIteration}
                    runKey={runIdRef.current}
                    synchronizeIterations={synchronizeIterations}
                  />
                ) : (
                  <IterationScrubber
                    classicIteration={classicIteration}
                    comparison={comparison}
                    onClassicIterationChange={setClassicIteration}
                    onPlusPlusIterationChange={setPlusPlusIteration}
                    plusPlusIteration={plusPlusIteration}
                    synchronizeIterations={synchronizeIterations}
                  />
                )}

                <KMeansComparisonScatter
                  classicIteration={classicIteration}
                  comparison={comparison}
                  plusPlusIteration={plusPlusIteration}
                  points={comparisonPoints}
                  showConnections={showConnections}
                  showInitialCentroids={showInitialCentroids}
                />
              </section>

              <section className="kmeans-section">
                <div className="section-heading">
                  <p className="eyebrow">Leitura objetiva</p>
                  <h2>O resultado numérico completa o mapa.</h2>
                  <p>EQT, iterações e distribuição dos pontos mostram o efeito desta seed sem transformar uma execução em regra universal.</p>
                </div>
                <KMeansComparisonMetrics comparison={comparison} />
                <div className="kmeans-plus-analysis-grid">
                  <KMeansComparisonErrorChart classic={comparison.classic} plusPlus={comparison.plusPlus} />
                  <KMeansCentroidComparisonTable classic={comparison.classic} plusPlus={comparison.plusPlus} />
                </div>
              </section>

              <section className="kmeans-section">
                <KMeansPlusKSelection results={kSelection} />
              </section>

              <section className="kmeans-plus-conclusion reveal-scale">
                <span><CheckCircle2 size={29} /></span>
                <div>
                  <p className="eyebrow">Conclusão automática</p>
                  <h2>{resultSummary.winner.label} foi o melhor nesta execução.</h2>
                  <p>
                    {resultSummary.winner.explanation} A diferença final de EQT foi <strong>{resultSummary.eqtDifference.toFixed(4)}</strong>.
                    {' '}O clássico usou <strong>{resultSummary.classicIterations} iterações</strong> e o K-Means++ usou <strong>{resultSummary.plusIterations}</strong>.
                  </p>
                  <small>
                    O “++” melhora a escolha inicial; atribuição, média e convergência continuam sendo o ciclo de Lloyd. Uma única seed não garante vantagem em todas as bases.
                  </small>
                </div>
                <button className="button button--light" onClick={() => executeComparison('final')} type="button">
                  <FlaskConical size={17} /> Executar novamente
                </button>
              </section>
            </div>
          ) : (
            <section className="kmeans-plus-empty-state" aria-label="O resultado aparecerá após executar a comparação">
              <div className="kmeans-plus-empty-state__preview" aria-hidden="true">
                <span /><span /><span /><span />
              </div>
              <div>
                <Sparkles size={27} />
                <h2>Os gráficos aguardam a sua execução.</h2>
                <p>Comece pelo resultado completo ou abra o modo passo a passo para acompanhar a semeadura D².</p>
              </div>
              <div className="kmeans-plus-empty-state__formula"><Sigma size={20} /> EQT clássico × EQT K-Means++</div>
            </section>
          )}

          <MiniBatchKMeansLab />
        </div>
      ) : null}
    </div>
  );
}
