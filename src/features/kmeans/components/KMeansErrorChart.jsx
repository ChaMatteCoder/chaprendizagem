import { TrendingDown } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { computeErrorReduction } from '../lib/kmeansMetrics.js';

function ErrorTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return <div className="kmeans-chart-tooltip"><span>Iteração {label}</span><strong>EQT {payload[0].value.toFixed(4)}</strong></div>;
}

export default function KMeansErrorChart({ errorHistory }) {
  const reduction = computeErrorReduction(errorHistory);
  return (
    <section className="kmeans-chart-card kmeans-error-card">
      <div className="kmeans-chart-card__heading">
        <div><p>Convergência</p><h3>Curva EQT × iteração</h3></div>
        <span className="kmeans-reduction"><TrendingDown size={17} /> {reduction.toFixed(1)}% de redução</span>
      </div>
      <p className="kmeans-chart-intro">A linha nunca deve subir no K-Means clássico: cada ciclo mantém ou reduz a soma dos erros quadráticos.</p>
      <div className="kmeans-error-chart" role="img" aria-label="Curva do erro quadrático total por iteração">
        <ResponsiveContainer height="100%" minWidth={0} width="100%">
          <LineChart data={errorHistory} margin={{ top: 18, right: 20, bottom: 8, left: 2 }}>
            <CartesianGrid stroke="rgba(0, 87, 91, .09)" strokeDasharray="4 5" />
            <XAxis allowDecimals={false} dataKey="iteration" tick={{ fill: '#626b67', fontSize: 12 }} />
            <YAxis domain={['auto', 'auto']} tick={{ fill: '#626b67', fontSize: 12 }} width={58} />
            <Tooltip content={<ErrorTooltip />} />
            <Line activeDot={{ r: 6 }} dataKey="totalSquaredError" dot={{ fill: '#00575b', r: 4, strokeWidth: 2, stroke: '#fff' }} isAnimationActive={false} stroke="#00575b" strokeWidth={3} type="monotone" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="kmeans-error-summary"><span>Inicial <strong>{errorHistory[0]?.totalSquaredError.toFixed(4)}</strong></span><i /><span>Final <strong>{errorHistory.at(-1)?.totalSquaredError.toFixed(4)}</strong></span></div>
    </section>
  );
}
