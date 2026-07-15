import {
  Crosshair,
  Eye,
  GitCompareArrows,
  ListOrdered,
  Play,
  SlidersHorizontal,
} from 'lucide-react';

const classicInitializations = [
  {
    value: 'random',
    label: 'Aleatória',
    description: 'Sorteia K observações com a seed informada.',
  },
  {
    value: 'didactic',
    label: 'Didática',
    description: 'Espalha as escolhas pela ordem da base.',
  },
];

export default function KMeansComparisonControls({
  options,
  onChange,
  pointCount,
  showConnections,
  showInitialCentroids,
  synchronizeIterations,
  onToggleConnections,
  onToggleInitialCentroids,
  onToggleSynchronization,
  onRun,
  onRunStepByStep,
}) {
  const maxK = Math.max(1, Math.min(8, pointCount));

  function update(name, value) {
    onChange({ ...options, [name]: value });
  }

  return (
    <section className="kmeans-plus-control-card" aria-labelledby="kmeans-plus-controls-title">
      <div className="kmeans-plus-card-heading">
        <span><SlidersHorizontal size={20} /></span>
        <div>
          <p>Parâmetros compartilhados</p>
          <h3 id="kmeans-plus-controls-title">Configure a comparação</h3>
        </div>
      </div>

      <label className="kmeans-plus-range-label" htmlFor="kmeans-plus-k">
        <span>Número de clusters (K)</span>
        <strong>{Math.min(options.k, maxK)}</strong>
      </label>
      <input
        id="kmeans-plus-k"
        max={maxK}
        min="1"
        onChange={(event) => update('k', Number(event.target.value))}
        type="range"
        value={Math.min(options.k, maxK)}
      />

      <div className="kmeans-plus-control-grid">
        <label htmlFor="kmeans-plus-max-iterations">
          Máximo de iterações
          <input
            id="kmeans-plus-max-iterations"
            max="200"
            min="1"
            onChange={(event) => update('maxIterations', Math.max(1, Number(event.target.value)))}
            type="number"
            value={options.maxIterations}
          />
        </label>
        <label htmlFor="kmeans-plus-tolerance">
          Tolerância
          <input
            id="kmeans-plus-tolerance"
            min="0"
            onChange={(event) => update('tolerance', Math.max(0, Number(event.target.value)))}
            step="0.0001"
            type="number"
            value={options.tolerance}
          />
        </label>
        <label htmlFor="kmeans-plus-seed">
          Seed reprodutível
          <input
            id="kmeans-plus-seed"
            onChange={(event) => update('seed', Number(event.target.value))}
            step="1"
            type="number"
            value={options.seed}
          />
        </label>
        <label htmlFor="kmeans-plus-point-count">
          Observações aplicadas
          <input id="kmeans-plus-point-count" readOnly type="text" value={`${pointCount} pontos`} />
        </label>
      </div>

      <fieldset className="kmeans-plus-initialization">
        <legend>Inicialização do K-Means clássico</legend>
        {classicInitializations.map((item) => (
          <label className={options.classicInitialization === item.value ? 'is-active' : ''} key={item.value}>
            <input
              checked={options.classicInitialization === item.value}
              name="kmeans-plus-classic-initialization"
              onChange={() => update('classicInitialization', item.value)}
              type="radio"
            />
            <span>
              <strong>{item.label}</strong>
              <small>{item.description}</small>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="kmeans-plus-toggle-grid">
        <label>
          <input checked={showConnections} onChange={onToggleConnections} type="checkbox" />
          <span><Eye size={16} /> Linhas ponto-centroide</span>
        </label>
        <label>
          <input checked={showInitialCentroids} onChange={onToggleInitialCentroids} type="checkbox" />
          <span><Crosshair size={16} /> Centroides iniciais</span>
        </label>
        <label>
          <input checked={synchronizeIterations} onChange={onToggleSynchronization} type="checkbox" />
          <span><GitCompareArrows size={16} /> Sincronizar iterações</span>
        </label>
      </div>

      <div className="kmeans-plus-control-actions">
        <button className="button button--primary" onClick={onRun} type="button">
          <Play size={18} /> Executar comparação
        </button>
        <button className="button button--ghost" onClick={onRunStepByStep} type="button">
          <ListOrdered size={18} /> Executar passo a passo
        </button>
      </div>
      <p className="kmeans-plus-control-note">
        Os dois métodos usam a mesma base, K, tolerância e seed. Somente a estratégia de escolha dos centros iniciais muda.
      </p>
    </section>
  );
}
