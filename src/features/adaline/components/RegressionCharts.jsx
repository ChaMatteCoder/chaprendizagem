import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

function ChartShell({ children, title, description }) {
  return (
    <article className="regression-chart-card">
      <div className="panel-heading">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      <div className="chart-frame">{children}</div>
    </article>
  );
}

function RegressionLineChart({ data, dataset, lines, title, description }) {
  const xValues = dataset.map((item) => item.x);
  const yValues = dataset.map((item) => item.y);
  const lineYValues = data.flatMap((item) => lines.map((line) => item[line.key]).filter(Number.isFinite));

  return (
    <ChartShell description={description} title={title}>
      <ResponsiveContainer width="100%" height={310}>
        <ComposedChart data={data} margin={{ top: 18, right: 22, bottom: 8, left: 6 }}>
          <CartesianGrid stroke="#e7e1d3" strokeDasharray="3 3" />
          <XAxis
            dataKey="x"
            domain={[Math.min(...xValues) - 0.5, Math.max(...xValues) + 0.5]}
            tick={{ fill: '#59615d', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            type="number"
          />
          <YAxis
            domain={[Math.min(...yValues, ...lineYValues) - 0.5, Math.max(...yValues, ...lineYValues) + 0.5]}
            tick={{ fill: '#59615d', fontSize: 12 }}
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
            formatter={(value, name) => [Number(value).toFixed(4), name]}
          />
          <Legend />
          <Scatter data={dataset} dataKey="y" fill="#00575b" name="Observações" />
          {lines.map((line) => (
            <Line
              dataKey={line.key}
              dot={false}
              key={line.key}
              name={line.name}
              stroke={line.color}
              strokeWidth={3}
              type="linear"
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export function RegressionErrorChart({ data }) {
  return (
    <ChartShell
      description="A curva mostra a soma dos erros quadráticos em cada passagem pela base."
      title="Erro quadrático total durante o treinamento"
    >
      <ResponsiveContainer width="100%" height={310}>
        <LineChart data={data} margin={{ top: 18, right: 22, bottom: 8, left: 6 }}>
          <CartesianGrid stroke="#e7e1d3" strokeDasharray="3 3" />
          <XAxis dataKey="epoch" tick={{ fill: '#59615d', fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: '#59615d', fontSize: 12 }} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: '1px solid #ddd5c4',
              boxShadow: '0 12px 30px rgba(28, 38, 35, 0.08)',
            }}
            formatter={(value) => [Number(value).toFixed(4), 'Erro quadrático total']}
            labelFormatter={(value) => `Época ${value}`}
          />
          <Line type="monotone" dataKey="error" name="Erro" stroke="#00575b" strokeWidth={3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export function AdalineRegressionLineChart({ data, dataset }) {
  return (
    <RegressionLineChart
      data={data}
      dataset={dataset}
      description="Os pontos são a base observada; a reta vem dos pesos aprendidos iterativamente."
      lines={[{ key: 'adaline', name: 'Adaline', color: '#8a3ffc' }]}
      title="Reta aprendida pela Adaline"
    />
  );
}

export function ClassicRegressionLineChart({ data, dataset }) {
  return (
    <RegressionLineChart
      data={data}
      dataset={dataset}
      description="A reta é calculada diretamente pelas equações clássicas dos mínimos quadrados."
      lines={[{ key: 'classic', name: 'Regressão clássica', color: '#d89b18' }]}
      title="Reta da regressão linear clássica"
    />
  );
}

export function ComparisonRegressionChart({ data, dataset }) {
  return (
    <RegressionLineChart
      data={data}
      dataset={dataset}
      description="A comparação permite ver se o treinamento aproximou a solução fechada."
      lines={[
        { key: 'adaline', name: 'Adaline', color: '#8a3ffc' },
        { key: 'classic', name: 'Regressão clássica', color: '#d89b18' },
      ]}
      title="Comparação entre Adaline e regressão linear"
    />
  );
}
