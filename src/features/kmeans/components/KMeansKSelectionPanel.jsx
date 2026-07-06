import { ChartNoAxesCombined, Lightbulb } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { kmeansCopy } from '../data/kmeansCopy.js';

function KTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return <div className="kmeans-chart-tooltip"><span>K = {label}</span><strong>EQT {item.totalSquaredError.toFixed(3)}</strong>{item.silhouette === null ? null : <small>Silhouette médio: {item.silhouette.toFixed(3)}</small>}</div>;
}

export default function KMeansKSelectionPanel({ results }) {
  const fourResult = results.find((item) => item.k === 4);
  return (
    <section className="kmeans-k-panel reveal-up">
      <div className="kmeans-k-panel__copy">
        <span className="kmeans-section-icon"><ChartNoAxesCombined size={25} /></span>
        <p className="eyebrow">Como escolher K?</p>
        <h2>Procure o cotovelo, depois volte aos dados.</h2>
        <p>{kmeansCopy.whyFour.text}</p>
        <div className="kmeans-k-insight"><Lightbulb size={19} /><span><strong>Leitura desta base:</strong> K = 4 equilibra queda forte do EQT e separação visual. {fourResult?.silhouette != null ? `Silhouette médio: ${fourResult.silhouette.toFixed(3)}.` : ''}</span></div>
        <p className="kmeans-k-caution">{kmeansCopy.graphVsMetric.text}</p>
      </div>
      <div className="kmeans-k-chart-card">
        <div><span>Curva do cotovelo</span><strong>K = 1 a {results.length}</strong></div>
        <div className="kmeans-k-chart" role="img" aria-label="Curva do cotovelo para diferentes valores de K">
          <ResponsiveContainer height="100%" minWidth={0} width="100%">
            <LineChart data={results} margin={{ top: 18, right: 18, bottom: 5, left: 5 }}>
              <CartesianGrid stroke="rgba(255,255,255,.12)" strokeDasharray="4 5" />
              <XAxis allowDecimals={false} dataKey="k" tick={{ fill: 'rgba(255,255,255,.7)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'rgba(255,255,255,.7)', fontSize: 12 }} width={62} />
              <Tooltip content={<KTooltip />} />
              <Line dataKey="totalSquaredError" dot={{ fill: '#f4be4f', r: 4 }} isAnimationActive={false} stroke="#f4be4f" strokeWidth={3} type="monotone" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="kmeans-k-scale">{results.map((item) => <span className={item.k === 4 ? 'is-highlighted' : ''} key={item.k}>K{item.k}<small>{item.silhouette === null ? '—' : item.silhouette.toFixed(2)}</small></span>)}</div>
        <small>Valores inferiores: silhouette mais próximo de 1 indica clusters mais bem separados.</small>
      </div>
    </section>
  );
}
