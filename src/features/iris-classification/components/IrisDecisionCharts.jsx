import { memo, useMemo, useRef } from 'react';
import { Download } from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { irisClasses } from '../data/irisDataset.js';

const speciesColors = {
  'Iris-setosa': '#00575b',
  'Iris-versicolor': '#d89b18',
  'Iris-virginica': '#7048bd',
};

function downloadChartPng(chartContainer, fileName) {
  const chart = chartContainer?.querySelector('.recharts-wrapper svg');

  if (!chart) {
    console.warn(`Grafico Recharts nao encontrado para download: ${fileName}`);
    return;
  }

  const { width, height } = chart.getBoundingClientRect();

  if (!width || !height) {
    console.warn(`Grafico sem dimensoes validas: ${fileName}`);
    return;
  }

  const clone = chart.cloneNode(true);
  const widthPx = Math.ceil(width);
  const heightPx = Math.ceil(height);

  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(widthPx));
  clone.setAttribute('height', String(heightPx));
  clone.setAttribute('viewBox', `0 0 ${widthPx} ${heightPx}`);

  const serialized = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);
  const image = new Image();

  image.onload = () => {
    const scale = window.devicePixelRatio || 1;
    const canvas = document.createElement('canvas');
    canvas.width = widthPx * scale;
    canvas.height = heightPx * scale;

    const context = canvas.getContext('2d');
    context.scale(scale, scale);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, widthPx, heightPx);
    context.drawImage(image, 0, 0, widthPx, heightPx);

    canvas.toBlob((blob) => {
      URL.revokeObjectURL(svgUrl);

      if (!blob) {
        console.warn(`Falha ao gerar PNG para: ${fileName}`);
        return;
      }

      const pngUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = pngUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(pngUrl);
    }, 'image/png');
  };

  image.onerror = () => {
    URL.revokeObjectURL(svgUrl);
    console.warn(`Falha ao carregar SVG para exportacao: ${fileName}`);
  };

  image.src = svgUrl;
}

function ChartCard({ children, description, fileName, title }) {
  const chartRef = useRef(null);

  return (
    <article className="regression-chart-card functional-chart-card iris-chart-card">
      <div className="panel-heading iris-chart-card__heading">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <button
          aria-label={`Baixar ${title} em PNG`}
          className="iris-chart-download"
          onClick={() => downloadChartPng(chartRef.current, fileName)}
          title="Baixar PNG"
          type="button"
        >
          <Download size={17} />
        </button>
      </div>
      <div className="chart-frame" ref={chartRef}>{children}</div>
    </article>
  );
}

function domain(values, padding = 0.08) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return [Number((min - range * padding).toFixed(2)), Number((max + range * padding).toFixed(2))];
}

function groupSpecies(dataset, xKey, yKey) {
  return irisClasses.map((species) => ({
    species,
    data: dataset.filter((row) => row.species === species).map((row) => ({ x: row[xKey], y: row[yKey], species })),
  }));
}

const ScatterPanel = memo(function ScatterPanel({ dataset, title, description, xKey, yKey, xLabel, yLabel, fileName }) {
  const xValues = useMemo(() => dataset.map((row) => row[xKey]), [dataset, xKey]);
  const yValues = useMemo(() => dataset.map((row) => row[yKey]), [dataset, yKey]);
  const groups = useMemo(() => groupSpecies(dataset, xKey, yKey), [dataset, xKey, yKey]);
  const xDomain = useMemo(() => domain(xValues), [xValues]);
  const yDomain = useMemo(() => domain(yValues), [yValues]);

  return (
    <ChartCard description={description} fileName={fileName} title={title}>
      <ResponsiveContainer width="100%" height={340}>
        <ScatterChart margin={{ top: 24, right: 28, bottom: 76, left: 56 }}>
          <CartesianGrid stroke="#e7e1d3" strokeDasharray="3 3" />
          <XAxis
            dataKey="x"
            domain={xDomain}
            label={{ value: xLabel, position: 'insideBottom', offset: -42, fill: '#59615d' }}
            tick={{ fill: '#59615d', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            type="number"
          />
          <YAxis
            dataKey="y"
            domain={yDomain}
            label={{ value: yLabel, angle: -90, position: 'insideLeft', fill: '#59615d' }}
            tick={{ fill: '#59615d', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            type="number"
          />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: '1px solid #ddd5c4' }}
            formatter={(value, name) => [`${Number(value).toFixed(1)} cm`, name === 'x' ? xLabel : yLabel]}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.species ?? ''}
          />
          <Legend align="right" height={30} verticalAlign="top" />
          {groups.map((group) => (
            <Scatter data={group.data} fill={speciesColors[group.species]} key={group.species} name={group.species} />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </ChartCard>
  );
});

const HistoryChart = memo(function HistoryChart({ data, metric, title, description, yLabel, fileName }) {
  return (
    <ChartCard description={description} fileName={fileName} title={title}>
      <ResponsiveContainer width="100%" height={340}>
        <LineChart data={data} margin={{ top: 24, right: 28, bottom: 76, left: 58 }}>
          <CartesianGrid stroke="#e7e1d3" strokeDasharray="3 3" />
          <XAxis
            dataKey="epoch"
            label={{ value: 'época', position: 'insideBottom', offset: -42, fill: '#59615d' }}
            tick={{ fill: '#59615d', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            label={{ value: yLabel, angle: -90, position: 'insideLeft', fill: '#59615d' }}
            tick={{ fill: '#59615d', fontSize: 12 }}
            tickFormatter={(value) => (metric === 'accuracy' ? `${Math.round(value * 100)}%` : Number(value).toFixed(2))}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: '1px solid #ddd5c4' }}
            formatter={(value, name) => [metric === 'accuracy' ? `${(value * 100).toFixed(1)}%` : Number(value).toFixed(4), name]}
            labelFormatter={(value) => `Época ${value}`}
          />
          <Legend align="right" height={30} verticalAlign="top" />
          <Line dataKey={metric === 'accuracy' ? 'accuracy' : 'loss'} dot={false} name="Treino" stroke="#00575b" strokeWidth={3} type="monotone" />
          <Line dataKey={metric === 'accuracy' ? 'valAccuracy' : 'valLoss'} dot={false} name="Teste" stroke="#7048bd" strokeWidth={3} type="monotone" />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
});

function IrisDecisionCharts({ dataset, history }) {
  return (
    <section className="iris-charts-section reveal-up">
      <div className="regression-chart-grid functional-chart-grid iris-chart-grid">
        <ScatterPanel
          dataset={dataset}
          description="Relação entre comprimento e largura das sépalas, colorida por espécie."
          fileName="iris-sepal-scatter.png"
          title="Scatter plot: sépalas"
          xKey="sepalLength"
          xLabel="sepal length"
          yKey="sepalWidth"
          yLabel="sepal width"
        />
        <ScatterPanel
          dataset={dataset}
          description="Pétalas costumam separar Setosa com clareza e revelar a sobreposição entre Versicolor e Virginica."
          fileName="iris-petal-scatter.png"
          title="Scatter plot: pétalas"
          xKey="petalLength"
          xLabel="petal length"
          yKey="petalWidth"
          yLabel="petal width"
        />
        <HistoryChart
          data={history}
          description="A perda mede a diferença entre as probabilidades previstas e a classe correta."
          fileName="iris-loss.png"
          metric="loss"
          title="Loss por época"
          yLabel="loss"
        />
        <HistoryChart
          data={history}
          description="A acurácia mostra a fração de amostras classificadas corretamente ao longo do treino."
          fileName="iris-accuracy.png"
          metric="accuracy"
          title="Accuracy por época"
          yLabel="accuracy"
        />
      </div>
    </section>
  );
}

export default memo(IrisDecisionCharts);
