import { useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Award,
  ChartNoAxesCombined,
  Clock,
  ShieldCheck,
  TableProperties,
} from 'lucide-react';
import { CIFAR10_CLASSES } from '../data/cifar10Schema.js';
import { formatPixelNumber } from '../lib/cnnMath.js';

export default function PixelLabResultsSection({ bundle }) {
  const [splitView, setSplitView] = useState('test'); // 'test' | 'validation'
  const { manifest, metrics, history } = bundle;

  const evalReport =
    splitView === 'test' ? metrics.officialTest : metrics.validation;
  const chartData = (history?.epochs ?? []).map((ep) => ({
    epoch: ep.epoch,
    trainAccPct: Number((ep.trainAccuracy * 100).toFixed(2)),
    valAccPct: Number((ep.valAccuracy * 100).toFixed(2)),
    trainLoss: Number(ep.trainLoss.toFixed(4)),
    valLoss: Number(ep.valLoss.toFixed(4)),
    elapsedSeconds: ep.elapsedSeconds,
  }));

  return (
    <div className="pixel-stack">
      <article className="pixel-panel">
        <div className="pixel-panel__header">
          <div>
            <span className="pixel-eyebrow">
              Medições do checkpoint congelado
            </span>
            <h2>
              <ShieldCheck size={22} /> Como a rede se saiu no teste oficial
            </h2>
          </div>
          <span className="pixel-tag is-cyan">
            Checkpoint época {history.bestEpoch} de {history.epochsRun}
          </span>
        </div>

        <div className="pixel-kpi-grid">
          <div className="pixel-kpi-card is-accent">
            <small>Acurácia no teste oficial (10.000 imgs)</small>
            <strong>
              {formatPixelNumber(metrics.officialTest.accuracy * 100, 2)}%
            </strong>
            <span>
              {metrics.officialTest.correct.toLocaleString('pt-BR')} /{' '}
              {metrics.officialTest.total.toLocaleString('pt-BR')} acertos
            </span>
          </div>
          <div className="pixel-kpi-card">
            <small>Macro-F1 no teste oficial</small>
            <strong>
              {formatPixelNumber(metrics.officialTest.macroF1 * 100, 2)}%
            </strong>
            <span>Média do F1 das 10 classes</span>
          </div>
          <div className="pixel-kpi-card">
            <small>Cross-Entropy no teste oficial</small>
            <strong>
              {formatPixelNumber(metrics.officialTest.crossEntropy, 4)}
            </strong>
            <span>
              Validação: {formatPixelNumber(metrics.validation.crossEntropy, 4)}
            </span>
          </div>
          <div className="pixel-kpi-card">
            <small>
              <Clock size={14} /> Tempo e motor de treinamento
            </small>
            <strong>{formatPixelNumber(metrics.trainingSeconds, 1)} s</strong>
            <span>
              Melhor época: {history.bestEpoch} · Seed {metrics.seed}
            </span>
          </div>
        </div>

        <details className="pixel-details">
          <summary>
            Consultar configuração de treino e verificação da exportação
          </summary>
          <div>
            <div className="pixel-config-summary">
              <p>
                <strong>Configuração registrada:</strong> arquitetura{' '}
                <code>{metrics.architecture.id}</code> (
                {manifest.parameterCount.toLocaleString('pt-BR')} parâmetros),
                otimizador <code>{metrics.trainingConfig.optimizer}</code> (taxa{' '}
                <code>{metrics.trainingConfig.learningRate}</code>, batch{' '}
                <code>{metrics.trainingConfig.batchSize}</code>), perda{' '}
                <code>{metrics.trainingConfig.loss}</code>, early stopping na
                perda de validação (paciência{' '}
                <code>{metrics.trainingConfig.earlyStopping.patience}</code>,
                restauração do melhor checkpoint da época{' '}
                <code>{history.bestEpoch}</code>). Motor:{' '}
                <code>{metrics.engine}</code>. Paridade Python ↔ TensorFlow.js:
                diferença máxima{' '}
                <code>
                  {manifest.exportParity?.maxAbsDiff?.toExponential(2) ?? '0'}
                </code>{' '}
                e{' '}
                <code>
                  {formatPixelNumber(
                    (manifest.exportParity?.argmaxAgreement ?? 0) * 100,
                    1,
                  )}
                  %
                </code>{' '}
                de concordância no <code>argmax</code>.
              </p>
            </div>
          </div>
        </details>
      </article>

      <article className="pixel-panel">
        <div className="pixel-panel__header">
          <div>
            <span className="pixel-eyebrow">
              Histórico por época (45.000 treino / 5.000 validação)
            </span>
            <h2>
              <ChartNoAxesCombined size={22} /> Curvas reais de acurácia e
              cross-entropy
            </h2>
          </div>
          <span className="pixel-tag">Melhor época: {history.bestEpoch}</span>
        </div>

        {chartData.length === 0 ? (
          <p role="status">Nenhum histórico de épocas registrado.</p>
        ) : (
          <div className="pixel-charts-grid">
            <div
              className="pixel-chart-box"
              aria-label="Gráfico de acurácia de treino e validação por época"
            >
              <h3>Acurácia por época (%)</h3>
              <div className="pixel-chart-canvas">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart
                    data={chartData}
                    margin={{ top: 10, right: 16, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(148, 163, 184, 0.2)"
                    />
                    <XAxis dataKey="epoch" stroke="#626b67" />
                    <YAxis domain={[0, 100]} stroke="#626b67" unit="%" />
                    <Tooltip
                      contentStyle={{
                        background: '#ffffff',
                        border: '1px solid #d9dfd8',
                        color: '#171b1d',
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="trainAccPct"
                      name="Treino (%)"
                      stroke="#00575b"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="valAccPct"
                      name="Validação (%)"
                      stroke="#a66c12"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div
              className="pixel-chart-box"
              aria-label="Gráfico de cross-entropy de treino e validação por época"
            >
              <h3>Cross-Entropy por época</h3>
              <div className="pixel-chart-canvas">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart
                    data={chartData}
                    margin={{ top: 10, right: 16, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(148, 163, 184, 0.2)"
                    />
                    <XAxis dataKey="epoch" stroke="#626b67" />
                    <YAxis stroke="#626b67" />
                    <Tooltip
                      contentStyle={{
                        background: '#ffffff',
                        border: '1px solid #d9dfd8',
                        color: '#171b1d',
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="trainLoss"
                      name="Perda de treino"
                      stroke="#7048bd"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="valLoss"
                      name="Perda de validação"
                      stroke="#24704f"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        <details className="pixel-details">
          <summary>
            <TableProperties size={16} /> Consultar tabela numérica completa das{' '}
            {history.epochsRun} épocas
          </summary>
          <div
            className="pixel-table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Tabela de histórico por época"
          >
            <table className="pixel-table">
              <caption>
                Histórico medido de treino e validação por época
              </caption>
              <thead>
                <tr>
                  <th>Época</th>
                  <th>Perda (Treino)</th>
                  <th>Acurácia (Treino)</th>
                  <th>Perda (Validação)</th>
                  <th>Acurácia (Validação)</th>
                  <th>Duração (s)</th>
                </tr>
              </thead>
              <tbody>
                {history.epochs.map((ep) => (
                  <tr
                    key={ep.epoch}
                    className={
                      ep.epoch === history.bestEpoch ? 'is-highlighted' : ''
                    }
                  >
                    <th scope="row">
                      {ep.epoch}{' '}
                      {ep.epoch === history.bestEpoch ? '★ (checkpoint)' : ''}
                    </th>
                    <td>{formatPixelNumber(ep.trainLoss, 4)}</td>
                    <td>{formatPixelNumber(ep.trainAccuracy * 100, 2)}%</td>
                    <td>{formatPixelNumber(ep.valLoss, 4)}</td>
                    <td>{formatPixelNumber(ep.valAccuracy * 100, 2)}%</td>
                    <td>{formatPixelNumber(ep.elapsedSeconds, 1)} s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </article>

      <article className="pixel-panel">
        <div className="pixel-panel__header">
          <div>
            <span className="pixel-eyebrow">
              Avaliação detalhada por classe
            </span>
            <h2>
              <Award size={22} /> Onde a rede acerta e onde confunde
            </h2>
          </div>

          <div
            className="pixel-stage-tabs"
            role="group"
            aria-label="Partição avaliada"
          >
            <button
              type="button"
              className={`pixel-btn is-small ${splitView === 'test' ? 'is-primary' : 'is-outline'}`}
              aria-pressed={splitView === 'test'}
              onClick={() => setSplitView('test')}
            >
              Teste oficial (10.000 imgs)
            </button>
            <button
              type="button"
              className={`pixel-btn is-small ${splitView === 'validation' ? 'is-primary' : 'is-outline'}`}
              aria-pressed={splitView === 'validation'}
              onClick={() => setSplitView('validation')}
            >
              Validação (5.000 imgs)
            </button>
          </div>
        </div>

        <div
          className="pixel-table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Matriz de confusão 10 por 10"
        >
          <table className="pixel-table pixel-confusion-table">
            <caption>
              Matriz de confusão (
              {splitView === 'test'
                ? 'Teste oficial: 10.000 imagens'
                : 'Validação: 5.000 imagens'}
              ) · Linhas = classe verdadeira, Colunas = classe prevista
            </caption>
            <thead>
              <tr>
                <th>Verdadeiro ↓ / Previsto →</th>
                {CIFAR10_CLASSES.map((c) => (
                  <th key={c.index} title={`${c.index}: ${c.pt} (${c.en})`}>
                    {c.index} · {c.pt.slice(0, 4)}.
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {evalReport.confusionMatrix.map((row, rIdx) => (
                <tr key={rIdx}>
                  <th scope="row">
                    <code>{rIdx}</code> {CIFAR10_CLASSES[rIdx].pt}
                  </th>
                  {row.map((count, cIdx) => (
                    <td
                      key={cIdx}
                      className={
                        rIdx === cIdx
                          ? 'is-diagonal'
                          : count > 80
                            ? 'is-off-high'
                            : ''
                      }
                    >
                      {count}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div
          className="pixel-table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Tabela de precisão, recall e F1 por classe"
        >
          <table className="pixel-table">
            <caption>Precisão, Recall, F1 e suporte nas 10 classes</caption>
            <thead>
              <tr>
                <th>Índice</th>
                <th>Classe</th>
                <th>Suporte</th>
                <th>Acertos (TP)</th>
                <th>Precisão</th>
                <th>Recall</th>
                <th>F1-Score</th>
              </tr>
            </thead>
            <tbody>
              {evalReport.perClass.map((row) => (
                <tr key={row.classIndex}>
                  <th scope="row">
                    <code>{row.classIndex}</code>
                  </th>
                  <td>
                    <strong>{row.classNamePt}</strong>{' '}
                    <small>({row.classId})</small>
                  </td>
                  <td>{row.support.toLocaleString('pt-BR')}</td>
                  <td>{row.tp.toLocaleString('pt-BR')}</td>
                  <td>{formatPixelNumber(row.precision * 100, 2)}%</td>
                  <td>{formatPixelNumber(row.recall * 100, 2)}%</td>
                  <td>
                    <strong>{formatPixelNumber(row.f1 * 100, 2)}%</strong>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" colSpan={2}>
                  Média Macro / Total
                </th>
                <td>
                  <strong>{evalReport.total.toLocaleString('pt-BR')}</strong>
                </td>
                <td>
                  <strong>{evalReport.correct.toLocaleString('pt-BR')}</strong>
                </td>
                <td>
                  <strong>
                    {formatPixelNumber(evalReport.macroPrecision * 100, 2)}%
                  </strong>
                </td>
                <td>
                  <strong>
                    {formatPixelNumber(evalReport.macroRecall * 100, 2)}%
                  </strong>
                </td>
                <td>
                  <strong>
                    {formatPixelNumber(evalReport.macroF1 * 100, 2)}%
                  </strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="pixel-limitations-box">
          <h3>Limitações metodológicas registradas</h3>
          <ul className="pixel-clean-list">
            {metrics.limitations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </article>
    </div>
  );
}
