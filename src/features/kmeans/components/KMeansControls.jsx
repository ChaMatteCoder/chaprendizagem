import { Dice5, RotateCcw, SlidersHorizontal } from 'lucide-react';

const initializationLabels = {
  didactic: 'Didática',
  random: 'Aleatória',
  'kmeans++': 'K-Means++',
};

export default function KMeansControls({ options, onChange, pointCount }) {
  const maxK = Math.min(8, pointCount);

  function update(name, value) {
    onChange({ ...options, [name]: value });
  }

  return (
    <section className="kmeans-control-card" aria-labelledby="kmeans-controls-title">
      <div className="kmeans-card-heading">
        <span><SlidersHorizontal size={19} /></span>
        <div><p>Etapa 1 de 3</p><h3 id="kmeans-controls-title">Configure o modelo</h3></div>
      </div>

      <label className="kmeans-range-label" htmlFor="kmeans-k">
        <span>Número de grupos (K)</span><strong>{options.k}</strong>
      </label>
      <input aria-label="Número de grupos K" id="kmeans-k" max={maxK} min="1" onChange={(event) => update('k', Number(event.target.value))} type="range" value={Math.min(options.k, maxK)} />

      <div className="kmeans-control-grid">
        <label>Máximo de iterações
          <input min="1" max="200" onChange={(event) => update('maxIterations', Math.max(1, Number(event.target.value)))} type="number" value={options.maxIterations} />
        </label>
        <label>Tolerância
          <input min="0" onChange={(event) => update('tolerance', Math.max(0, Number(event.target.value)))} step="0.0001" type="number" value={options.tolerance} />
        </label>
      </div>

      <fieldset className="kmeans-initialization">
        <legend>Inicialização</legend>
        {Object.entries(initializationLabels).map(([value, label]) => (
          <label className={options.initialization === value ? 'is-active' : ''} key={value}>
            <input checked={options.initialization === value} name="kmeans-initialization" onChange={() => update('initialization', value)} type="radio" />
            {value === 'random' ? <Dice5 size={16} /> : <RotateCcw size={16} />} {label}
          </label>
        ))}
      </fieldset>

      <label className="kmeans-seed-label">Seed reprodutível
        <input onChange={(event) => update('seed', Number(event.target.value))} step="1" type="number" value={options.seed} />
      </label>

      <div className="kmeans-setup-summary">
        <span>{pointCount} observações prontas</span>
        <strong>K = {options.k}</strong>
      </div>
      <p className="kmeans-control-note">Os parâmetros só serão aplicados quando você iniciar o algoritmo.</p>
    </section>
  );
}
