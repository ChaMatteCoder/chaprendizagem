import { ChartSpline, Download, TrendingDown } from 'lucide-react';
import { useRef } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { computeErrorReduction } from '../lib/kmeansMetrics.js';
import { downloadRechartsPng } from '../lib/downloadRechartsPng.js';

function buildComparisonHistory(classicHistory, plusPlusHistory) {
  const length = Math.max(classicHistory.length, plusPlusHistory.length);
  return Array.from({ length }, (_, iteration) => ({
    iteration,
    classic: classicHistory[iteration]?.totalSquaredError ?? null,
    plusPlus: plusPlusHistory[iteration]?.totalSquaredError ?? null,
  }));
}

function ErrorComparisonTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="kmeans-chart-tooltip">
      <span>Iteração {label}</span>
      {payload.map((entry) => (
        <strong key={entry.dataKey}>
          {entry.dataKey === 'classic' ? 'Clássico' : 'K-Means++'}: {Number(entry.value).toFixed(4)}
        </strong>
      ))}
    </div>
  );
}

export default function KMeansComparisonErrorChart({ classic, plusPlus }) {
  const chartRef = useRef(null);
  const data = buildComparisonHistory(classic.errorHistory, plusPlus.errorHistory);
  const classicReduction = computeErrorReduction(classic.errorHistory);
  const plusPlusReduction = computeErrorReduction(plusPlus.errorHistory);

  return (
    <section className="kmeans-plus-error-card">
      <div className="kmeans-plus-chart-heading">
        <div>
          <span>Convergência comparada</span>
          <h3>EQT × iteração</h3>
        </div>
        <div className="kmeans-plus-chart-actions">
          <ChartSpline size={25} />
          <button
            aria-label="Baixar comparação EQT por iteração em PNG"
            className="kmeans-plus-download"
            onClick={() => downloadRechartsPng(chartRef.current, 'trabalho-11-comparacao-eqt.png')}
            title="Baixar PNG"
            type="button"
          >
            <Download size={16} /> Baixar
          </button>
        </div>
      </div>
      <p>
        As duas curvas refinam os centroides com Lloyd. A distância entre elas nasce, sobretudo, da configuração inicial.
      </p>
      <div className="kmeans-plus-error-chart" ref={chartRef} role="img" aria-label="Curvas de erro quadrático total do K-Means clássico e K-Means++ por iteração">
        <ResponsiveContainer height="100%" minWidth={0} width="100%">
          <LineChart data={data} margin={{ top: 18, right: 20, bottom: 8, left: 4 }}>
            <CartesianGrid stroke="rgba(0, 87, 91, .09)" strokeDasharray="4 5" />
            <XAxis allowDecimals={false} dataKey="iteration" tick={{ fill: '#626b67', fontSize: 12 }} />
            <YAxis domain={['auto', 'auto']} tick={{ fill: '#626b67', fontSize: 12 }} width={66} />
            <Tooltip content={<ErrorComparisonTooltip />} />
            <Line
              activeDot={{ r: 6 }}
              connectNulls={false}
              dataKey="classic"
              dot={{ fill: '#c65f45', r: 3.8, stroke: '#fff', strokeWidth: 2 }}
              isAnimationActive={false}
              name="K-Means clássico"
              stroke="#c65f45"
              strokeWidth={3}
              type="monotone"
            />
            <Line
              activeDot={{ r: 6 }}
              connectNulls={false}
              dataKey="plusPlus"
              dot={{ fill: '#00575b', r: 3.8, stroke: '#fff', strokeWidth: 2 }}
              isAnimationActive={false}
              name="K-Means++"
              stroke="#00575b"
              strokeWidth={3}
              type="monotone"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="kmeans-plus-error-legend">
        <span><i className="is-classic" /> Clássico <strong>{classic.totalSquaredError.toFixed(3)}</strong></span>
        <span><i className="is-plus" /> K-Means++ <strong>{plusPlus.totalSquaredError.toFixed(3)}</strong></span>
      </div>
      <div className="kmeans-plus-reduction-row">
        <span><TrendingDown size={16} /> redução clássico: <strong>{classicReduction.toFixed(1)}%</strong></span>
        <span><TrendingDown size={16} /> redução K-Means++: <strong>{plusPlusReduction.toFixed(1)}%</strong></span>
      </div>
    </section>
  );
}
