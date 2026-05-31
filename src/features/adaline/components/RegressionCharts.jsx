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

function ChartShell({ actions, chartId, children, title, description }) {
  return (
    <article className="regression-chart-card" data-chart={chartId}>
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

function buildZoomDomain(values, zoomLevel, padding = 0.5) {
  const min = Math.min(...values) - padding;
  const max = Math.max(...values) + padding;

  if (zoomLevel <= 1) {
    return [min, max];
  }

  const center = (min + max) / 2;
  const halfRange = (max - min) / (2 * zoomLevel);
  return [center - halfRange, center + halfRange];
}

function formatChartNumber(value, displayMode = 'simplified') {
  const digits = displayMode === 'academic' ? 4 : 1;
  const formatted = Number(value).toFixed(digits);
  return displayMode === 'academic' ? formatted : formatted.replace(/\.0$/, '');
}

function ObservationPoint({ cx, cy, fill, payload, displayMode }) {
  return (
    <circle cx={cx} cy={cy} fill={fill} r={5} stroke="#ffffff" strokeWidth={1.5}>
      <title>
        {`x = ${formatChartNumber(payload?.x, displayMode)} | y = ${formatChartNumber(payload?.y, displayMode)}`}
      </title>
    </circle>
  );
}

function YAxisLabel({ value, viewBox }) {
  const x = viewBox.x - 10;
  const y = viewBox.y + viewBox.height - 95;

  return (
    <text fill="#59615d" fontSize={12} textAnchor="middle" transform={`rotate(-90 ${x} ${y})`} x={x} y={y}>
      {value}
    </text>
  );
}

function RegressionLineChart({
  actions,
  chartId,
  data,
  dataset,
  displayMode = 'simplified',
  lines,
  title,
  description,
  zoomLevel = 1,
}) {
  const xValues = dataset.map((item) => item.x);
  const yValues = dataset.map((item) => item.y);
  const lineYValues = data.flatMap((item) => lines.map((line) => item[line.key]).filter(Number.isFinite));
  const visibleYValues = lineYValues.length ? [...yValues, ...lineYValues] : yValues;
  const xDomain = buildZoomDomain(xValues, zoomLevel);
  const yDomain = buildZoomDomain(visibleYValues, zoomLevel);

  return (
    <ChartShell actions={actions} chartId={chartId} description={description} title={title}>
      <ResponsiveContainer width="100%" height={310}>
        <ComposedChart data={data} margin={{ top: 14, right: 24, bottom: 54, left: 66 }}>
          <CartesianGrid stroke="#e7e1d3" strokeDasharray="3 3" />
          <XAxis
            allowDataOverflow
            dataKey="x"
            domain={xDomain}
            label={{ value: 'x - variável de entrada', position: 'insideBottom', offset: -20, fill: '#59615d' }}
            tickFormatter={(value) => formatChartNumber(value, displayMode)}
            tick={{ fill: '#59615d', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            type="number"
          />
          <YAxis
            allowDataOverflow
            domain={yDomain}
            label={{
              content: (props) => <YAxisLabel {...props} value="y - valor observado/estimado" />,
              value: 'y - valor observado/estimado',
            }}
            tickFormatter={(value) => formatChartNumber(value, displayMode)}
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
            formatter={(value, name, props) => {
              if (name === 'Observações') {
                return [
                  `x = ${formatChartNumber(props.payload?.x, displayMode)}, y = ${formatChartNumber(value, displayMode)}`,
                  'Ponto observado',
                ];
              }

              return [formatChartNumber(value, displayMode), name];
            }}
            labelFormatter={(value) => `x = ${formatChartNumber(value, displayMode)}`}
          />
          <Legend align="center" verticalAlign="bottom" wrapperStyle={{ bottom: 2, lineHeight: '20px' }} />
          <Scatter
            data={dataset}
            dataKey="y"
            fill="#00575b"
            name="Observações"
            shape={(props) => <ObservationPoint {...props} displayMode={displayMode} />}
          />
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

export function RegressionErrorChart({ actions, data, displayMode = 'simplified' }) {
  return (
    <ChartShell
      actions={actions}
      chartId="regression-error"
      description="A curva mostra a soma dos erros quadráticos em cada passagem pela base."
      title="Erro quadrático total durante o treinamento"
    >
      <ResponsiveContainer width="100%" height={310}>
        <LineChart data={data} margin={{ top: 14, right: 24, bottom: 50, left: 66 }}>
          <CartesianGrid stroke="#e7e1d3" strokeDasharray="3 3" />
          <XAxis
            dataKey="epoch"
            label={{ value: 'época', position: 'insideBottom', offset: -32, fill: '#59615d' }}
            tick={{ fill: '#59615d', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            label={{
              content: (props) => <YAxisLabel {...props} value="erro quadrático total" />,
              value: 'erro quadrático total',
            }}
            tickFormatter={(value) => formatChartNumber(value, displayMode)}
            tick={{ fill: '#59615d', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: '1px solid #ddd5c4',
              boxShadow: '0 12px 30px rgba(28, 38, 35, 0.08)',
            }}
            formatter={(value) => [formatChartNumber(value, displayMode), 'Erro quadrático total']}
            labelFormatter={(value) => `Época ${value}`}
          />
          <Line type="monotone" dataKey="error" name="Erro" stroke="#00575b" strokeWidth={3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export function AdalineRegressionLineChart({ actions, data, dataset, displayMode = 'simplified' }) {
  return (
    <RegressionLineChart
      actions={actions}
      data={data}
      dataset={dataset}
      displayMode={displayMode}
      chartId="regression-adaline"
      description="Os pontos são a base observada; a reta vem dos pesos aprendidos iterativamente."
      lines={[{ key: 'adaline', name: 'Adaline', color: '#8a3ffc' }]}
      title="Reta aprendida pela Adaline"
    />
  );
}

export function ClassicRegressionLineChart({ actions, data, dataset, displayMode = 'simplified' }) {
  return (
    <RegressionLineChart
      actions={actions}
      data={data}
      dataset={dataset}
      displayMode={displayMode}
      chartId="regression-classic"
      description="A reta é calculada diretamente pelas equações clássicas dos mínimos quadrados."
      lines={[{ key: 'classic', name: 'Regressão clássica', color: '#d89b18' }]}
      title="Reta da regressão linear clássica"
    />
  );
}

export function ComparisonRegressionChart({
  actions,
  data,
  dataset,
  displayMode = 'simplified',
  showAdaline = true,
  showClassic = true,
  zoomLevel = 1,
}) {
  const lines = [
    showAdaline ? { key: 'adaline', name: 'Adaline', color: '#8a3ffc' } : null,
    showClassic ? { key: 'classic', name: 'Regressão clássica', color: '#d89b18' } : null,
  ].filter(Boolean);

  return (
    <RegressionLineChart
      actions={actions}
      chartId="regression-comparison"
      data={data}
      dataset={dataset}
      displayMode={displayMode}
      description="A comparação permite ver se o treinamento aproximou a solução fechada."
      lines={lines}
      title="Comparação entre Adaline e regressão linear"
      zoomLevel={zoomLevel}
    />
  );
}
