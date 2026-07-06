import { Eye, EyeOff } from 'lucide-react';
import { useMemo } from 'react';
import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts';
import { euclideanDistance } from '../lib/kmeans.js';
import { clusterColors } from './KMeansCentroidTable.jsx';

function CentroidShape({ cx, cy, payload }) {
  const color = clusterColors[payload.cluster];
  return (
    <g className="kmeans-centroid-marker" transform={`translate(${cx} ${cy})`}>
      <circle className="kmeans-centroid-marker__halo" fill={color} opacity=".18" r="21" />
      <circle fill="#082b32" r="15" />
      <circle fill={color} r="11" stroke="#ffffff" strokeWidth="2" />
      <path d="M-5 0H5M0-5V5" fill="none" stroke="#ffffff" strokeLinecap="round" strokeWidth="3" />
    </g>
  );
}

function ScatterTooltip({ active, payload }) {
  const datum = payload?.find((entry) => entry.payload?.type || entry.payload?.id)?.payload;
  if (!active || !datum) return null;

  if (datum.type === 'centroid') {
    return <div className="kmeans-chart-tooltip"><span>Centroide C{datum.cluster + 1}</span><strong>({datum.x.toFixed(4)}, {datum.y.toFixed(4)})</strong></div>;
  }

  return (
    <div className="kmeans-chart-tooltip">
      <span>Observação #{datum.id}</span><strong>Cluster C{datum.cluster + 1}</strong>
      <small>x = {datum.x.toFixed(4)} · y = {datum.y.toFixed(4)}</small>
      <small>Distância ao centroide: {datum.distance.toFixed(4)}</small>
    </div>
  );
}

export default function KMeansScatterPlot({ points, snapshot, phase, showConnections, onToggleConnections }) {
  const plottedPoints = useMemo(() => points.map((point, index) => ({
    ...point,
    cluster: snapshot.labels[index],
    distance: euclideanDistance(point, snapshot.centroids[snapshot.labels[index]]),
  })), [points, snapshot]);

  const allCoordinates = [...points, ...snapshot.centroids];
  const xs = allCoordinates.map((point) => point.x);
  const ys = allCoordinates.map((point) => point.y);
  const xPadding = Math.max(0.7, (Math.max(...xs) - Math.min(...xs)) * 0.07);
  const yPadding = Math.max(0.7, (Math.max(...ys) - Math.min(...ys)) * 0.07);
  const xDomain = [Math.min(...xs) - xPadding, Math.max(...xs) + xPadding];
  const yDomain = [Math.min(...ys) - yPadding, Math.max(...ys) + yPadding];

  const assignmentsVisible = phase !== 'initialize';
  const connectionsVisible = assignmentsVisible && (showConnections || phase === 'assign' || phase === 'move');

  return (
    <section className={`kmeans-chart-card kmeans-scatter-card is-${phase}`}>
      <div className="kmeans-chart-card__heading">
        <div><p>Mapa dos grupos · {phase === 'complete' ? 'resultado' : 'em execução'}</p><h3>Observações e centroides</h3></div>
        <button aria-label={showConnections ? 'Ocultar linhas até os centroides' : 'Mostrar linhas até os centroides'} className={showConnections ? 'is-active' : ''} onClick={onToggleConnections} type="button">
          {showConnections ? <Eye size={16} /> : <EyeOff size={16} />} Ligações
        </button>
      </div>
      <div className="kmeans-scatter-chart" role="img" aria-label={`Gráfico de dispersão com ${points.length} observações e ${snapshot.centroids.length} clusters`}>
        <ResponsiveContainer height="100%" minWidth={0} width="100%">
          <ComposedChart margin={{ top: 14, right: 14, bottom: 8, left: -12 }}>
            <CartesianGrid stroke="rgba(0, 87, 91, .09)" strokeDasharray="4 5" />
            <XAxis dataKey="x" domain={xDomain} name="x" tick={{ fill: '#626b67', fontSize: 12 }} tickFormatter={(value) => Number(value).toFixed(1)} type="number" />
            <YAxis dataKey="y" domain={yDomain} name="y" tick={{ fill: '#626b67', fontSize: 12 }} tickFormatter={(value) => Number(value).toFixed(1)} type="number" />
            <Tooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: '4 4' }} />
            {connectionsVisible ? plottedPoints.map((point) => (
              <Line data={[point, snapshot.centroids[point.cluster]]} dataKey="y" dot={false} isAnimationActive={false} key={`line-${point.id}`} stroke={clusterColors[point.cluster]} strokeOpacity=".2" strokeWidth="1" type="linear" />
            )) : null}
            {!assignmentsVisible ? (
              <Scatter data={plottedPoints} fill="#9aa6a3" isAnimationActive={false} name="Observações ainda sem cluster" />
            ) : snapshot.centroids.map((_, cluster) => (
              <Scatter data={plottedPoints.filter((point) => point.cluster === cluster)} fill={clusterColors[cluster]} isAnimationActive={false} key={`cluster-${cluster}`} name={`Cluster C${cluster + 1}`} />
            ))}
            <Scatter animationDuration={900} data={snapshot.centroids.map((centroid, cluster) => ({ ...centroid, cluster, type: 'centroid' }))} isAnimationActive={phase === 'move'} name="Centroides" shape={<CentroidShape />} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="kmeans-chart-legend">
        {assignmentsVisible ? snapshot.centroids.map((_, cluster) => <span key={cluster}><i style={{ backgroundColor: clusterColors[cluster] }} /> Cluster C{cluster + 1}</span>) : <span><i style={{ backgroundColor: '#9aa6a3' }} /> ainda sem atribuição</span>}
        <span className="kmeans-centroid-legend"><b>+</b> centroide colorido</span>
      </div>
    </section>
  );
}
