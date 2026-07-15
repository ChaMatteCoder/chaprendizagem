import { ChartNoAxesCombined, Download, Info, Lightbulb } from 'lucide-react';
import { useRef } from 'react';
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { downloadRechartsPng } from '../lib/downloadRechartsPng.js';

function KSelectionTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="kmeans-chart-tooltip">
      <span>K = {label}</span>
      <strong>EQT {item.totalSquaredError.toFixed(3)}</strong>
      <small>{item.silhouette == null ? 'Silhouette não se aplica a K = 1' : `Silhouette médio: ${item.silhouette.toFixed(3)}`}</small>
    </div>
  );
}

export default function KMeansPlusKSelection({ results }) {
  const chartRef = useRef(null);
  const silhouetteCandidates = results.filter((item) => Number.isFinite(item.silhouette));
  const recommended = silhouetteCandidates.reduce(
    (best, item) => (!best || item.silhouette > best.silhouette ? item : best),
    null,
  );

  return (
    <section className="kmeans-plus-k-section">
      <div className="kmeans-plus-k-copy">
        <span className="kmeans-plus-section-icon"><ChartNoAxesCombined size={25} /></span>
        <p className="eyebrow">Escolha de K</p>
        <h2>O cotovelo orienta; o silhouette confronta.</h2>
        <p>
          O EQT sempre diminui quando K cresce, porque há mais centroides disponíveis. Por isso, procuramos um ponto de
          retorno decrescente e verificamos se os grupos também permanecem coesos e separados.
        </p>
        {recommended ? (
          <div className="kmeans-plus-k-insight">
            <Lightbulb size={19} />
            <span>
              <strong>Nesta base:</strong> o maior silhouette do intervalo ocorre em K = {recommended.k}
              {' '}({recommended.silhouette.toFixed(3)}). A visualização e o contexto ainda devem confirmar essa leitura.
            </span>
          </div>
        ) : null}
        <p className="kmeans-plus-k-caution">
          <Info size={17} /> Nenhuma métrica escolhe K de forma universal. Elbow, silhouette e conhecimento do problema são evidências complementares.
        </p>
      </div>

      <div className="kmeans-plus-k-chart-card">
        <div className="kmeans-plus-k-chart-card__header">
          <span>K = 1 a {results.length}</span>
          <div className="kmeans-plus-chart-actions">
            <strong>EQT + silhouette</strong>
            <button
              aria-label="Baixar curvas de escolha de K em PNG"
              className="kmeans-plus-download is-dark"
              onClick={() => downloadRechartsPng(chartRef.current, 'trabalho-11-escolha-de-k.png', '#082d34')}
              title="Baixar PNG"
              type="button"
            >
              <Download size={16} /> Baixar
            </button>
          </div>
        </div>
        <div className="kmeans-plus-k-chart" ref={chartRef} role="img" aria-label="Curvas de cotovelo e silhouette médio para diferentes valores de K">
          <ResponsiveContainer height="100%" minWidth={0} width="100%">
            <ComposedChart data={results} margin={{ top: 18, right: 16, bottom: 7, left: 4 }}>
              <CartesianGrid stroke="rgba(255,255,255,.12)" strokeDasharray="4 5" />
              <XAxis allowDecimals={false} dataKey="k" tick={{ fill: 'rgba(255,255,255,.72)', fontSize: 12 }} />
              <YAxis
                tick={{ fill: 'rgba(255,255,255,.72)', fontSize: 12 }}
                width={62}
                yAxisId="eqt"
              />
              <YAxis
                domain={[-1, 1]}
                orientation="right"
                tick={{ fill: 'rgba(255,255,255,.58)', fontSize: 11 }}
                tickFormatter={(value) => value.toFixed(1)}
                width={38}
                yAxisId="silhouette"
              />
              <Tooltip content={<KSelectionTooltip />} />
              {recommended ? (
                <ReferenceLine stroke="rgba(244,190,79,.45)" strokeDasharray="4 4" x={recommended.k} yAxisId="eqt" />
              ) : null}
              <Line
                dataKey="totalSquaredError"
                dot={{ fill: '#f4be4f', r: 4 }}
                isAnimationActive={false}
                name="EQT"
                stroke="#f4be4f"
                strokeWidth={3}
                type="monotone"
                yAxisId="eqt"
              />
              <Line
                connectNulls={false}
                dataKey="silhouette"
                dot={{ fill: '#78d7ca', r: 4 }}
                isAnimationActive={false}
                name="Silhouette"
                stroke="#78d7ca"
                strokeWidth={2.5}
                type="monotone"
                yAxisId="silhouette"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="kmeans-plus-k-legend">
          <span><i className="is-eqt" /> EQT (eixo esquerdo)</span>
          <span><i className="is-silhouette" /> silhouette (eixo direito)</span>
        </div>
        <div className="kmeans-plus-k-scale">
          {results.map((item) => (
            <span className={item.k === recommended?.k ? 'is-highlighted' : ''} key={item.k}>
              K{item.k}
              <small>{item.silhouette == null ? '—' : item.silhouette.toFixed(2)}</small>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
