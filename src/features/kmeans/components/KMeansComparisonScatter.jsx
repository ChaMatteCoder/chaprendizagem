import { Crosshair, Download, Route } from 'lucide-react';
import { useMemo, useRef } from 'react';
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { euclideanDistance } from '../lib/kmeans.js';
import { downloadRechartsPng } from '../lib/downloadRechartsPng.js';
import { clusterColors } from './KMeansCentroidTable.jsx';

function CurrentCentroidShape({ cx, cy, payload }) {
  const color = clusterColors[payload.cluster % clusterColors.length];
  return (
    <g className="kmeans-plus-centroid-marker" transform={`translate(${cx} ${cy})`}>
      <circle fill={color} opacity=".16" r="20" />
      <circle fill="#082b32" r="14" />
      <circle fill={color} r="10" stroke="#ffffff" strokeWidth="2" />
      <path d="M-5 0H5M0-5V5" fill="none" stroke="#ffffff" strokeLinecap="round" strokeWidth="2.6" />
    </g>
  );
}

function InitialCentroidShape({ cx, cy, payload }) {
  const color = clusterColors[payload.cluster % clusterColors.length];
  return (
    <g className="kmeans-plus-initial-marker" transform={`translate(${cx} ${cy})`}>
      <path d="M0-10L10 0 0 10-10 0Z" fill="#ffffff" stroke={color} strokeWidth="3" />
      <circle fill={color} r="2.6" />
    </g>
  );
}

function ComparisonTooltip({ active, payload }) {
  const datum = payload?.find((entry) => entry?.payload)?.payload;
  if (!active || !datum) return null;

  if (datum.type === 'initial-centroid') {
    return (
      <div className="kmeans-chart-tooltip">
        <span>Centroide inicial C{datum.cluster + 1}</span>
        <strong>({datum.x.toFixed(4)}, {datum.y.toFixed(4)})</strong>
        <small>Marcador em losango</small>
      </div>
    );
  }

  if (datum.type === 'centroid') {
    return (
      <div className="kmeans-chart-tooltip">
        <span>Centroide atual C{datum.cluster + 1}</span>
        <strong>({datum.x.toFixed(4)}, {datum.y.toFixed(4)})</strong>
      </div>
    );
  }

  return (
    <div className="kmeans-chart-tooltip">
      <span>Observação #{datum.id}</span>
      <strong>Cluster C{datum.cluster + 1}</strong>
      <small>x = {datum.x.toFixed(4)} · y = {datum.y.toFixed(4)}</small>
      <small>Distância: {datum.distance.toFixed(4)}</small>
    </div>
  );
}

function MethodScatter({
  method,
  title,
  description,
  points,
  result,
  iterationIndex,
  showConnections,
  showInitialCentroids,
}) {
  const chartRef = useRef(null);
  const safeIndex = Math.min(Math.max(0, iterationIndex), result.iterations.length - 1);
  const snapshot = result.iterations[safeIndex];
  const initialCentroids = result.iterations[0].centroids;

  const plottedPoints = useMemo(
    () => points.map((point, index) => {
      const cluster = snapshot.labels[index];
      return {
        ...point,
        cluster,
        distance: euclideanDistance(point, snapshot.centroids[cluster]),
      };
    }),
    [points, snapshot],
  );

  const domains = useMemo(() => {
    const coordinates = [...points, ...snapshot.centroids, ...initialCentroids];
    const xs = coordinates.map((point) => point.x);
    const ys = coordinates.map((point) => point.y);
    const xSpan = Math.max(...xs) - Math.min(...xs);
    const ySpan = Math.max(...ys) - Math.min(...ys);
    const xPadding = Math.max(0.55, xSpan * 0.07);
    const yPadding = Math.max(0.55, ySpan * 0.07);
    return {
      x: [Math.min(...xs) - xPadding, Math.max(...xs) + xPadding],
      y: [Math.min(...ys) - yPadding, Math.max(...ys) + yPadding],
    };
  }, [initialCentroids, points, snapshot.centroids]);

  return (
    <article className={`kmeans-plus-scatter-card is-${method}`}>
      <div className="kmeans-plus-chart-heading">
        <div>
          <span>{description}</span>
          <h3>{title}</h3>
        </div>
        <div className="kmeans-plus-chart-actions">
          <div className="kmeans-plus-chart-readout">
            <span>iteração {snapshot.iteration}</span>
            <strong>EQT {snapshot.totalSquaredError.toFixed(3)}</strong>
          </div>
          <button
            aria-label={`Baixar gráfico ${title} em PNG`}
            className="kmeans-plus-download"
            onClick={() => downloadRechartsPng(chartRef.current, `trabalho-11-${method}-iteracao-${snapshot.iteration}.png`)}
            title="Baixar PNG"
            type="button"
          >
            <Download size={16} /> Baixar
          </button>
        </div>
      </div>
      <div
        className="kmeans-plus-scatter-chart"
        ref={chartRef}
        role="img"
        aria-label={`${title}: ${points.length} observações agrupadas em ${result.k} clusters na iteração ${snapshot.iteration}`}
      >
        <ResponsiveContainer height="100%" minWidth={0} width="100%">
          <ComposedChart margin={{ top: 12, right: 16, bottom: 7, left: -12 }}>
            <CartesianGrid stroke="rgba(0, 87, 91, .09)" strokeDasharray="4 5" />
            <XAxis
              dataKey="x"
              domain={domains.x}
              name="x"
              tick={{ fill: '#626b67', fontSize: 11 }}
              tickFormatter={(value) => Number(value).toFixed(1)}
              type="number"
            />
            <YAxis
              dataKey="y"
              domain={domains.y}
              name="y"
              tick={{ fill: '#626b67', fontSize: 11 }}
              tickFormatter={(value) => Number(value).toFixed(1)}
              type="number"
            />
            <Tooltip content={<ComparisonTooltip />} cursor={{ strokeDasharray: '4 4' }} />
            {showConnections ? plottedPoints.map((point) => (
              <Line
                data={[point, snapshot.centroids[point.cluster]]}
                dataKey="y"
                dot={false}
                isAnimationActive={false}
                key={`${method}-connection-${point.id}`}
                stroke={clusterColors[point.cluster % clusterColors.length]}
                strokeOpacity=".13"
                strokeWidth="1"
                type="linear"
              />
            )) : null}
            {snapshot.centroids.map((_, cluster) => (
              <Scatter
                data={plottedPoints.filter((point) => point.cluster === cluster)}
                fill={clusterColors[cluster % clusterColors.length]}
                isAnimationActive={false}
                key={`${method}-cluster-${cluster}`}
                name={`Cluster C${cluster + 1}`}
              />
            ))}
            {showInitialCentroids ? (
              <Scatter
                data={initialCentroids.map((centroid, cluster) => ({
                  ...centroid,
                  cluster,
                  type: 'initial-centroid',
                }))}
                isAnimationActive={false}
                name="Centroides iniciais"
                shape={<InitialCentroidShape />}
              />
            ) : null}
            <Scatter
              data={snapshot.centroids.map((centroid, cluster) => ({ ...centroid, cluster, type: 'centroid' }))}
              isAnimationActive={false}
              name="Centroides atuais"
              shape={<CurrentCentroidShape />}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="kmeans-plus-scatter-legend">
        <span><Crosshair size={15} /> cruz: centroide atual</span>
        {showInitialCentroids ? <span><i /> losango: centroide inicial</span> : null}
        {showConnections ? <span><Route size={15} /> linha: atribuição atual</span> : null}
      </div>
    </article>
  );
}

export default function KMeansComparisonScatter({
  points,
  comparison,
  classicIteration,
  plusPlusIteration,
  showConnections,
  showInitialCentroids,
}) {
  return (
    <div className="kmeans-plus-scatter-grid">
      <MethodScatter
        description="Inicialização simples + ciclo de Lloyd"
        iterationIndex={classicIteration}
        method="classic"
        points={points}
        result={comparison.classic}
        showConnections={showConnections}
        showInitialCentroids={showInitialCentroids}
        title="K-Means clássico"
      />
      <MethodScatter
        description="Inicialização D² + mesmo ciclo de Lloyd"
        iterationIndex={plusPlusIteration}
        method="plusplus"
        points={points}
        result={comparison.plusPlus}
        showConnections={showConnections}
        showInitialCentroids={showInitialCentroids}
        title="K-Means++"
      />
    </div>
  );
}
