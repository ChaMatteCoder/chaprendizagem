import {
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatDecimal } from '../lib/metrics.js';

function ChartCard({ actions, chartId, children, description, title }) {
  return (
    <article className="regression-chart-card functional-chart-card" data-chart={chartId}>
      <div className="panel-heading">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        {actions}
      </div>
      <div className="chart-frame">{children}</div>
    </article>
  );
}

function buildDomain(values, padding = 0.12) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return [min - range * padding, max + range * padding];
}

function SamplePoint({ cx, cy, payload }) {
  return (
    <circle cx={cx} cy={cy} fill="#00575b" r={5.5} stroke="#ffffff" strokeWidth={1.8}>
      <title>{`x=${formatDecimal(payload?.x, 4)} | t=${formatDecimal(payload?.t, 4)}`}</title>
    </circle>
  );
}

export function ApproximationCurveChart({ actions, curve, dataset }) {
  const yValues = [...dataset.map((row) => row.t), ...curve.map((row) => row.yPredicted)];
  const xValues = dataset.map((row) => row.x);

  return (
    <ChartCard
      actions={actions}
      chartId="functional-curve"
      description="A linha é a saída estimada pela MLP; os pontos são as observações usadas no treinamento."
      title="Pontos amostrados e curva aproximada"
    >
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={curve} margin={{ top: 14, right: 24, bottom: 48, left: 56 }}>
          <CartesianGrid stroke="#e7e1d3" strokeDasharray="3 3" />
          <XAxis
            allowDataOverflow
            dataKey="x"
            domain={buildDomain(xValues, 0.04)}
            label={{ value: 'x', position: 'insideBottom', offset: -24, fill: '#59615d' }}
            tick={{ fill: '#59615d', fontSize: 12 }}
            tickFormatter={(value) => formatDecimal(value, 2)}
            tickLine={false}
            axisLine={false}
            type="number"
          />
          <YAxis
            domain={buildDomain(yValues)}
            label={{ value: 't / y estimado', angle: -90, position: 'insideLeft', fill: '#59615d' }}
            tick={{ fill: '#59615d', fontSize: 12 }}
            tickFormatter={(value) => formatDecimal(value, 2)}
            tickLine={false}
            axisLine={false}
            type="number"
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: '1px solid #ddd5c4',
              boxShadow: '0 12px 30px rgba(28, 38, 35, 0.08)',
            }}
            formatter={(value, name) => [formatDecimal(value, 5), name === 't' ? 'Ponto real' : 'MLP']}
            labelFormatter={(value) => `x = ${formatDecimal(value, 4)}`}
          />
          <Line dataKey="yPredicted" dot={false} name="Curva MLP" stroke="#8a3ffc" strokeWidth={3} type="monotone" />
          <Scatter data={dataset} dataKey="t" fill="#00575b" name="Pontos reais" shape={<SamplePoint />} />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function TrainingErrorChart({ actions, data }) {
  return (
    <ChartCard
      actions={actions}
      chartId="functional-error"
      description="Cada ponto resume o erro quadrático médio ao final de uma época."
      title="Erro durante o treinamento"
    >
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 14, right: 24, bottom: 48, left: 58 }}>
          <CartesianGrid stroke="#e7e1d3" strokeDasharray="3 3" />
          <XAxis
            dataKey="epoch"
            label={{ value: 'época', position: 'insideBottom', offset: -24, fill: '#59615d' }}
            tick={{ fill: '#59615d', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            dataKey="mse"
            label={{ value: 'MSE', angle: -90, position: 'insideLeft', fill: '#59615d' }}
            tick={{ fill: '#59615d', fontSize: 12 }}
            tickFormatter={(value) => formatDecimal(value, 5)}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: '1px solid #ddd5c4',
              boxShadow: '0 12px 30px rgba(28, 38, 35, 0.08)',
            }}
            formatter={(value) => [formatDecimal(value, 8), 'MSE']}
            labelFormatter={(value) => `Época ${value}`}
          />
          <Line dataKey="mse" dot={false} name="MSE" stroke="#00575b" strokeWidth={3} type="monotone" />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export default function FunctionalApproximationCharts({ curve, dataset, errorHistory, curveActions, errorActions }) {
  return (
    <div className="regression-chart-grid functional-chart-grid">
      <ApproximationCurveChart actions={curveActions} curve={curve} dataset={dataset} />
      <TrainingErrorChart actions={errorActions} data={errorHistory} />
    </div>
  );
}
