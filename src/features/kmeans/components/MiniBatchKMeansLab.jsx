import { Clock3, DatabaseZap, Download, Gauge, Layers3, Play, Sparkles } from 'lucide-react';
import { useRef, useState } from 'react';
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { generateSyntheticClusterDataset, runMiniBatchKMeans } from '../lib/minibatchKmeans.js';
import { runKMeans } from '../lib/kmeans.js';
import { downloadRechartsPng } from '../lib/downloadRechartsPng.js';
import { clusterColors } from './KMeansCentroidTable.jsx';

const defaultOptions = {
  pointCount: 5000,
  k: 4,
  batchSize: 128,
  maxIterations: 120,
  spread: 0.85,
  seed: 42,
};

function formatDuration(durationMs) {
  if (durationMs < 1) return '< 1 ms';
  return `${durationMs.toFixed(1)} ms`;
}

function MiniBatchTooltip({ active, payload }) {
  const datum = payload?.[0]?.payload;
  if (!active || !datum) return null;
  return (
    <div className="kmeans-chart-tooltip">
      <span>Amostra do ponto #{datum.id}</span>
      <strong>Cluster C{datum.cluster + 1}</strong>
      <small>x = {datum.x.toFixed(3)} · y = {datum.y.toFixed(3)}</small>
    </div>
  );
}

function MiniBatchCentroidShape({ cx, cy, payload }) {
  const color = clusterColors[payload.cluster % clusterColors.length];
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <circle fill="#082b32" r="13" />
      <circle fill={color} r="9" stroke="#fff" strokeWidth="2" />
      <path d="M-4 0H4M0-4V4" fill="none" stroke="#fff" strokeLinecap="round" strokeWidth="2.5" />
    </g>
  );
}

export default function MiniBatchKMeansLab() {
  const chartRef = useRef(null);
  const [options, setOptions] = useState(defaultOptions);
  const [experiment, setExperiment] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  function update(name, value) {
    setOptions((current) => ({ ...current, [name]: value }));
    setExperiment(null);
  }

  function execute() {
    setIsRunning(true);
    window.setTimeout(() => {
      const synthetic = generateSyntheticClusterDataset(options);
      const miniBatch = runMiniBatchKMeans(synthetic.points, {
        k: options.k,
        batchSize: options.batchSize,
        maxIterations: options.maxIterations,
        seed: options.seed,
        initialization: 'kmeans++',
        sampleSize: 700,
        tolerance: 0.00001,
      });

      let full = null;
      if (options.pointCount <= 5000) {
        const startedAt = globalThis.performance?.now?.() ?? Date.now();
        const result = runKMeans(synthetic.points, {
          k: options.k,
          maxIterations: options.maxIterations,
          tolerance: 0.00001,
          initialization: 'kmeans++',
          seed: options.seed,
        });
        const finishedAt = globalThis.performance?.now?.() ?? Date.now();
        full = { result, durationMs: finishedAt - startedAt };
      }

      setExperiment({ synthetic, miniBatch, full });
      setIsRunning(false);
    }, 40);
  }

  const sample = experiment?.miniBatch.sample ?? [];
  const centroids = experiment?.miniBatch.finalCentroids ?? [];

  return (
    <section className="kmeans-plus-minibatch" id="desafio-minibatch">
      <div className="kmeans-plus-minibatch__intro">
        <span className="kmeans-plus-section-icon"><DatabaseZap size={25} /></span>
        <p className="eyebrow">Desafio: grandes bases de dados</p>
        <h2>MiniBatchKMeans para grandes bases</h2>
        <p>
          Em vez de reler todas as observações a cada atualização, o MiniBatchKMeans usa um lote aleatório pequeno e
          move os centroides incrementalmente. Isso reduz trabalho por iteração, aceitando uma aproximação do resultado completo.
        </p>
      </div>

      <div className="kmeans-plus-minibatch__workspace">
        <div className="kmeans-plus-minibatch-controls">
          <div className="kmeans-plus-card-heading">
            <span><Layers3 size={20} /></span>
            <div><p>Gerador sintético</p><h3>Configure a escala</h3></div>
          </div>
          <div className="kmeans-plus-minibatch-control-grid">
            <label htmlFor="minibatch-point-count">Quantidade de pontos
              <select id="minibatch-point-count" onChange={(event) => update('pointCount', Number(event.target.value))} value={options.pointCount}>
                <option value="2000">2.000 pontos</option>
                <option value="5000">5.000 pontos</option>
                <option value="10000">10.000 pontos</option>
              </select>
            </label>
            <label htmlFor="minibatch-k">Clusters (K)
              <input id="minibatch-k" max="8" min="2" onChange={(event) => update('k', Number(event.target.value))} type="number" value={options.k} />
            </label>
            <label htmlFor="minibatch-size">Tamanho do mini-batch
              <input id="minibatch-size" max="1024" min={options.k} onChange={(event) => update('batchSize', Number(event.target.value))} step="16" type="number" value={options.batchSize} />
            </label>
            <label htmlFor="minibatch-iterations">Máximo de iterações
              <input id="minibatch-iterations" max="500" min="10" onChange={(event) => update('maxIterations', Number(event.target.value))} step="10" type="number" value={options.maxIterations} />
            </label>
            <label htmlFor="minibatch-spread">Dispersão dos clusters
              <input id="minibatch-spread" max="3" min="0.1" onChange={(event) => update('spread', Number(event.target.value))} step="0.05" type="number" value={options.spread} />
            </label>
            <label htmlFor="minibatch-seed">Seed
              <input id="minibatch-seed" onChange={(event) => update('seed', Number(event.target.value))} step="1" type="number" value={options.seed} />
            </label>
          </div>
          <button className="button button--primary" disabled={isRunning} onClick={execute} type="button">
            {isRunning ? <><Sparkles className="kmeans-plus-spinner" size={18} /> Processando…</> : <><Play size={18} /> Gerar e executar</>}
          </button>
          <small>Para 10.000 pontos, o comparativo completo é omitido para manter a interação responsiva.</small>
        </div>

        <div className={`kmeans-plus-minibatch-visual ${experiment ? 'has-result' : ''}`}>
          {experiment ? (
            <>
              <div className="kmeans-plus-chart-heading">
                <div><span>Amostra visual otimizada</span><h3>{sample.length} de {experiment.synthetic.pointCount.toLocaleString('pt-BR')} pontos</h3></div>
                <div className="kmeans-plus-chart-actions">
                  <strong>{experiment.miniBatch.k} clusters</strong>
                  <button
                    aria-label="Baixar amostra do MiniBatchKMeans em PNG"
                    className="kmeans-plus-download"
                    onClick={() => downloadRechartsPng(chartRef.current, 'trabalho-11-minibatch-amostra.png')}
                    title="Baixar PNG"
                    type="button"
                  >
                    <Download size={16} /> Baixar
                  </button>
                </div>
              </div>
              <div className="kmeans-plus-minibatch-chart" ref={chartRef} role="img" aria-label={`Amostra de ${sample.length} pontos da base sintética agrupada com MiniBatchKMeans`}>
                <ResponsiveContainer height="100%" minWidth={0} width="100%">
                  <ScatterChart margin={{ top: 12, right: 18, bottom: 5, left: -12 }}>
                    <CartesianGrid stroke="rgba(0,87,91,.08)" strokeDasharray="4 5" />
                    <XAxis dataKey="x" name="x" tick={{ fill: '#626b67', fontSize: 11 }} tickFormatter={(value) => Number(value).toFixed(0)} type="number" />
                    <YAxis dataKey="y" name="y" tick={{ fill: '#626b67', fontSize: 11 }} tickFormatter={(value) => Number(value).toFixed(0)} type="number" />
                    <Tooltip content={<MiniBatchTooltip />} />
                    {centroids.map((_, cluster) => (
                      <Scatter
                        data={sample.filter((point) => point.cluster === cluster)}
                        fill={clusterColors[cluster % clusterColors.length]}
                        fillOpacity=".68"
                        isAnimationActive={false}
                        key={cluster}
                        name={`Cluster C${cluster + 1}`}
                      />
                    ))}
                    <Scatter
                      data={centroids.map((centroid, cluster) => ({ ...centroid, cluster }))}
                      isAnimationActive={false}
                      name="Centroides"
                      shape={<MiniBatchCentroidShape />}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="kmeans-plus-minibatch-placeholder">
              <DatabaseZap size={34} />
              <strong>A base nasce no navegador</strong>
              <p>Configure o experimento e execute. Apenas uma amostra será desenhada; todas as observações entram no cálculo.</p>
            </div>
          )}
        </div>
      </div>

      {experiment ? (
        <div className="kmeans-plus-minibatch-metrics">
          <article><Clock3 size={19} /><span>Tempo MiniBatch</span><strong>{formatDuration(experiment.miniBatch.durationMs)}</strong></article>
          <article><Gauge size={19} /><span>EQT final</span><strong>{experiment.miniBatch.totalSquaredError.toFixed(2)}</strong></article>
          <article><Layers3 size={19} /><span>Iterações</span><strong>{experiment.miniBatch.iterations}</strong></article>
          <article><DatabaseZap size={19} /><span>Mini-batch</span><strong>{experiment.miniBatch.batchSize}</strong></article>
          <article>
            <Clock3 size={19} />
            <span>K-Means completo</span>
            <strong>{experiment.full ? formatDuration(experiment.full.durationMs) : 'não executado'}</strong>
          </article>
          <article>
            <Gauge size={19} />
            <span>EQT completo</span>
            <strong>{experiment.full ? experiment.full.result.totalSquaredError.toFixed(2) : '—'}</strong>
          </article>
        </div>
      ) : null}

      <div className="kmeans-plus-minibatch__conclusion">
        <strong>Troca consciente:</strong>
        <p>
          o MiniBatchKMeans costuma ganhar velocidade porque cada atualização enxerga só uma fração da base. O preço é
          uma trajetória mais ruidosa e um EQT que pode ficar acima do K-Means completo — especialmente com lotes muito pequenos.
        </p>
      </div>
    </section>
  );
}
