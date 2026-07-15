import { ChevronLeft, ChevronRight, Dice5, Route, Sigma, Sparkles, Target } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const narrativeSteps = [
  {
    icon: Dice5,
    title: 'Passo 1: escolher centroides iniciais',
    shortTitle: 'Escolher',
    text: 'O clássico usa a estratégia configurada. O K-Means++ sorteia o primeiro centro e pondera os próximos por D².',
  },
  {
    icon: Route,
    title: 'Passo 2: atribuir pontos',
    shortTitle: 'Atribuir',
    text: 'Cada observação é associada ao centroide mais próximo. As cores dos mapas mostram essa decisão.',
  },
  {
    icon: Target,
    title: 'Passo 3: recalcular centroides',
    shortTitle: 'Recalcular',
    text: 'Cada centroide se move para a média das observações atribuídas ao seu cluster.',
  },
  {
    icon: Sigma,
    title: 'Passo 4: comparar EQT',
    shortTitle: 'Medir EQT',
    text: 'Somamos as distâncias quadráticas. Uma queda indica grupos mais compactos em relação aos centroides atuais.',
  },
  {
    icon: Sparkles,
    title: 'Passo 5: repetir até estabilizar',
    shortTitle: 'Estabilizar',
    text: 'Atribuir e recalcular se alternam até o movimento ficar abaixo da tolerância ou o limite ser atingido.',
  },
];

function clampIteration(value, result) {
  return Math.min(Math.max(0, value), result.iterations.length - 1);
}

export default function KMeansPlusStepPanel({
  comparison,
  runKey,
  synchronizeIterations,
  classicIteration,
  plusPlusIteration,
  onClassicIterationChange,
  onPlusPlusIterationChange,
}) {
  const [selectedStep, setSelectedStep] = useState(0);
  const [traceStep, setTraceStep] = useState(0);
  const activeStep = narrativeSteps[selectedStep];
  const trace = comparison.initializationTrace;
  const activeTrace = trace.steps[traceStep] ?? trace.steps[0];

  useEffect(() => {
    setSelectedStep(0);
    setTraceStep(0);
    onClassicIterationChange(0);
    onPlusPlusIterationChange(0);
  }, [runKey]);

  const topCandidates = useMemo(
    () => (activeTrace?.candidates ?? [])
      .filter((candidate) => Number.isFinite(candidate.probability) && !candidate.isAlreadyChosen)
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 5),
    [activeTrace],
  );

  function selectNarrativeStep(index) {
    setSelectedStep(index);
    const suggestedIteration = index <= 1 ? 0 : index <= 3 ? 1 : Math.max(
      comparison.classic.iterations.length - 1,
      comparison.plusPlus.iterations.length - 1,
    );
    onClassicIterationChange(clampIteration(suggestedIteration, comparison.classic));
    onPlusPlusIterationChange(clampIteration(suggestedIteration, comparison.plusPlus));
  }

  function updateSynchronizedIteration(value) {
    onClassicIterationChange(clampIteration(value, comparison.classic));
    onPlusPlusIterationChange(clampIteration(value, comparison.plusPlus));
  }

  const maxSynchronizedIteration = Math.max(
    comparison.classic.iterations.length - 1,
    comparison.plusPlus.iterations.length - 1,
  );

  return (
    <section className="kmeans-plus-step-panel" aria-labelledby="kmeans-plus-step-title">
      <div className="kmeans-plus-step-panel__heading">
        <div>
          <p className="eyebrow">Modo passo a passo</p>
          <h2 id="kmeans-plus-step-title">Acompanhe a diferença antes de Lloyd começar.</h2>
        </div>
        <span>{selectedStep + 1} / {narrativeSteps.length}</span>
      </div>

      <div className="kmeans-plus-step-tabs" role="tablist" aria-label="Etapas do algoritmo">
        {narrativeSteps.map((step, index) => {
          const Icon = step.icon;
          return (
            <button
              aria-selected={index === selectedStep}
              className={index === selectedStep ? 'is-active' : ''}
              key={step.title}
              onClick={() => selectNarrativeStep(index)}
              role="tab"
              type="button"
            >
              <span>{index + 1}</span>
              <Icon size={17} />
              <strong>{step.shortTitle}</strong>
            </button>
          );
        })}
      </div>

      <div className="kmeans-plus-step-panel__body">
        <div className="kmeans-plus-step-explanation">
          <span><activeStep.icon size={22} /></span>
          <div>
            <h3>{activeStep.title}</h3>
            <p>{activeStep.text}</p>
          </div>
        </div>

        {selectedStep === 0 ? (
          <div className="kmeans-plus-seeding-trace">
            <div className="kmeans-plus-seeding-trace__selector">
              <span>Seleção K-Means++</span>
              <div>
                {trace.steps.map((step, index) => (
                  <button
                    className={index === traceStep ? 'is-active' : ''}
                    key={step.step}
                    onClick={() => setTraceStep(index)}
                    type="button"
                  >
                    μ{index + 1}
                  </button>
                ))}
              </div>
            </div>
            <div className="kmeans-plus-seeding-trace__summary">
              <article>
                <span>Centro escolhido</span>
                <strong>ponto #{activeTrace.selectedPointId}</strong>
                <small>({activeTrace.selectedCentroid.x.toFixed(3)}, {activeTrace.selectedCentroid.y.toFixed(3)})</small>
              </article>
              <article>
                <span>Regra desta escolha</span>
                <strong>{activeTrace.kind === 'first-centroid' ? 'sorteio uniforme' : 'probabilidade ∝ D²'}</strong>
                <small>
                  {activeTrace.selectionProbability == null
                    ? `valor pseudoaleatório ${activeTrace.randomValue.toFixed(4)}`
                    : `${(activeTrace.selectionProbability * 100).toFixed(2)}% de probabilidade`}
                </small>
              </article>
            </div>
            {topCandidates.length ? (
              <div className="kmeans-plus-probability-list">
                <span>Maiores probabilidades antes da escolha</span>
                {topCandidates.map((candidate) => (
                  <div className={candidate.isSelected ? 'is-selected' : ''} key={candidate.id}>
                    <small>#{candidate.id}</small>
                    <i><b style={{ width: `${Math.max(2, candidate.probability * 100)}%` }} /></i>
                    <strong>{(candidate.probability * 100).toFixed(2)}%</strong>
                    <em>D² {candidate.distanceSquared.toFixed(3)}</em>
                  </div>
                ))}
              </div>
            ) : (
              <p className="kmeans-plus-seeding-note">
                O primeiro centroide é sorteado com probabilidade uniforme. A ponderação por distância quadrática começa no próximo centro.
              </p>
            )}
          </div>
        ) : (
          <div className="kmeans-plus-iteration-controls">
            {synchronizeIterations ? (
              <label htmlFor="kmeans-plus-synchronized-iteration">
                <span>Iteração sincronizada <strong>{Math.max(classicIteration, plusPlusIteration)}</strong></span>
                <input
                  id="kmeans-plus-synchronized-iteration"
                  max={maxSynchronizedIteration}
                  min="0"
                  onChange={(event) => updateSynchronizedIteration(Number(event.target.value))}
                  type="range"
                  value={Math.max(classicIteration, plusPlusIteration)}
                />
              </label>
            ) : (
              <>
                <label htmlFor="kmeans-plus-classic-iteration">
                  <span>Clássico <strong>{classicIteration}</strong></span>
                  <input
                    id="kmeans-plus-classic-iteration"
                    max={comparison.classic.iterations.length - 1}
                    min="0"
                    onChange={(event) => onClassicIterationChange(Number(event.target.value))}
                    type="range"
                    value={classicIteration}
                  />
                </label>
                <label htmlFor="kmeans-plus-plus-iteration">
                  <span>K-Means++ <strong>{plusPlusIteration}</strong></span>
                  <input
                    id="kmeans-plus-plus-iteration"
                    max={comparison.plusPlus.iterations.length - 1}
                    min="0"
                    onChange={(event) => onPlusPlusIterationChange(Number(event.target.value))}
                    type="range"
                    value={plusPlusIteration}
                  />
                </label>
              </>
            )}
          </div>
        )}
      </div>

      <div className="kmeans-plus-step-panel__actions">
        <button
          className="button button--ghost"
          disabled={selectedStep === 0}
          onClick={() => selectNarrativeStep(selectedStep - 1)}
          type="button"
        >
          <ChevronLeft size={17} /> Passo anterior
        </button>
        <button
          className="button button--primary"
          disabled={selectedStep === narrativeSteps.length - 1}
          onClick={() => selectNarrativeStep(selectedStep + 1)}
          type="button"
        >
          Próximo passo <ChevronRight size={17} />
        </button>
      </div>
    </section>
  );
}
