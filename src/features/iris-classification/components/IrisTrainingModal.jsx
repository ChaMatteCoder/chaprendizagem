import { Activity, BrainCircuit, CheckCircle2, LoaderCircle, TrendingDown, TrendingUp, X } from 'lucide-react';
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

function formatLoss(value) {
  return Number.isFinite(Number(value)) ? Number(value).toFixed(4) : '—';
}

function formatAccuracy(value) {
  return Number.isFinite(Number(value)) ? `${(Number(value) * 100).toFixed(1)}%` : '—';
}

function TrainingChart({ data, metric, totalEpochs }) {
  const isAccuracy = metric === 'accuracy';
  const primaryKey = isAccuracy ? 'accuracy' : 'loss';
  const validationKey = isAccuracy ? 'valAccuracy' : 'valLoss';

  return (
    <ResponsiveContainer height="100%" minWidth={0} width="100%">
      <LineChart data={data} margin={{ top: 18, right: 16, bottom: 30, left: 4 }}>
        <CartesianGrid stroke="rgba(220, 239, 235, 0.11)" strokeDasharray="4 6" vertical={false} />
        <XAxis
          allowDecimals={false}
          dataKey="epoch"
          domain={[1, Math.max(totalEpochs, 1)]}
          label={{ value: 'época', position: 'insideBottom', offset: -18, fill: 'rgba(232, 255, 248, 0.58)' }}
          stroke="rgba(220, 239, 235, 0.2)"
          tick={{ fill: 'rgba(232, 255, 248, 0.58)', fontSize: 11 }}
          tickLine={false}
          type="number"
        />
        <YAxis
          domain={isAccuracy ? [0, 1] : [0, 'auto']}
          stroke="rgba(220, 239, 235, 0.2)"
          tick={{ fill: 'rgba(232, 255, 248, 0.58)', fontSize: 11 }}
          tickFormatter={(value) => (isAccuracy ? `${Math.round(value * 100)}%` : Number(value).toFixed(2))}
          tickLine={false}
          width={48}
        />
        <Tooltip
          contentStyle={{ background: '#112d33', border: '1px solid rgba(168, 255, 241, 0.24)', borderRadius: 8 }}
          formatter={(value, name) => [isAccuracy ? formatAccuracy(value) : formatLoss(value), name]}
          labelFormatter={(value) => `Época ${value}`}
          labelStyle={{ color: '#f6d06f', fontWeight: 900 }}
          itemStyle={{ color: '#e8fff8' }}
        />
        <Legend
          align="right"
          formatter={(value) => <span className="iris-training-modal__legend-label">{value}</span>}
          height={28}
          verticalAlign="top"
        />
        <Line
          dataKey={primaryKey}
          dot={data.length === 1 ? { fill: '#a8fff1', r: 4, strokeWidth: 0 } : false}
          isAnimationActive={false}
          name="Treino"
          stroke="#a8fff1"
          strokeLinecap="round"
          strokeWidth={3}
          type="monotone"
        />
        <Line
          dataKey={validationKey}
          dot={data.length === 1 ? { fill: '#f6d06f', r: 4, strokeWidth: 0 } : false}
          isAnimationActive={false}
          name="Teste"
          stroke="#f6d06f"
          strokeLinecap="round"
          strokeWidth={3}
          type="monotone"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function Metric({ label, tone, value }) {
  return (
    <div className={`iris-training-modal__metric iris-training-modal__metric--${tone}`}>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

export default function IrisTrainingModal({ history, isTraining, onClose, status, totalEpochs }) {
  const currentEpoch = history.at(-1)?.epoch ?? 0;
  const latest = history.at(-1);
  const progress = Math.min((currentEpoch / Math.max(totalEpochs, 1)) * 100, 100);
  const isError = status?.kind === 'error';
  const isComplete = !isTraining && !isError && currentEpoch > 0;

  return (
    <div
      className="iris-training-modal-backdrop"
      onClick={() => {
        if (!isTraining) onClose();
      }}
      role="presentation"
    >
      <section
        aria-describedby="iris-training-modal-description"
        aria-labelledby="iris-training-modal-title"
        aria-modal="true"
        className="iris-training-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="iris-training-modal__ambient" aria-hidden="true" />

        <header className="iris-training-modal__header">
          <div className="iris-training-modal__title">
            <span className="iris-training-modal__icon" aria-hidden="true">
              <BrainCircuit size={24} />
            </span>
            <div>
              <p className="eyebrow">Treinamento em tempo real</p>
              <h2 id="iris-training-modal-title">A MLP está aprendendo, época por época.</h2>
              <p id="iris-training-modal-description">
                As linhas abaixo vêm diretamente das métricas calculadas pelo TensorFlow.js em cada época.
              </p>
            </div>
          </div>

          <div className="iris-training-modal__header-actions">
            <span
              className={`iris-training-modal__state ${isComplete ? 'iris-training-modal__state--complete' : ''} ${isError ? 'iris-training-modal__state--error' : ''}`}
              role="status"
            >
              {isTraining ? <LoaderCircle className="spin" size={16} /> : isComplete ? <CheckCircle2 size={16} /> : <Activity size={16} />}
              {isTraining ? 'Treinando' : isComplete ? 'Concluído' : 'Interrompido'}
            </span>
            <button aria-label="Fechar acompanhamento do treino" className="iris-training-modal__close" onClick={onClose} type="button">
              <X size={19} />
            </button>
          </div>
        </header>

        <div className="iris-training-modal__progress-block">
          <div>
            <span>{currentEpoch === 0 ? 'Preparando tensores e pesos...' : `Época ${currentEpoch} de ${totalEpochs}`}</span>
            <strong>{Math.round(progress)}%</strong>
          </div>
          <div
            aria-label={`Progresso do treinamento: ${Math.round(progress)}%`}
            aria-valuemax="100"
            aria-valuemin="0"
            aria-valuenow={Math.round(progress)}
            className="iris-training-modal__progress-track"
            role="progressbar"
          >
            <i style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="iris-training-modal__metrics" aria-live="polite">
          <Metric label="Loss · treino" tone="teal" value={formatLoss(latest?.loss)} />
          <Metric label="Loss · teste" tone="gold" value={formatLoss(latest?.valLoss)} />
          <Metric label="Accuracy · treino" tone="teal" value={formatAccuracy(latest?.accuracy)} />
          <Metric label="Accuracy · teste" tone="gold" value={formatAccuracy(latest?.valAccuracy)} />
        </div>

        <div className="iris-training-modal__charts">
          <article className="iris-training-modal__chart">
            <div className="iris-training-modal__chart-heading">
              <span><TrendingDown size={18} /></span>
              <div>
                <h3>Loss por época</h3>
                <p>O erro deve cair conforme os pesos se ajustam.</p>
              </div>
            </div>
            <div className="iris-training-modal__chart-frame">
              <TrainingChart data={history} metric="loss" totalEpochs={totalEpochs} />
              {history.length === 0 ? <span className="iris-training-modal__chart-empty">Aguardando a primeira época</span> : null}
            </div>
          </article>

          <article className="iris-training-modal__chart">
            <div className="iris-training-modal__chart-heading">
              <span><TrendingUp size={18} /></span>
              <div>
                <h3>Accuracy por época</h3>
                <p>Os acertos crescem à medida que a rede aprende as classes.</p>
              </div>
            </div>
            <div className="iris-training-modal__chart-frame">
              <TrainingChart data={history} metric="accuracy" totalEpochs={totalEpochs} />
              {history.length === 0 ? <span className="iris-training-modal__chart-empty">Aguardando a primeira época</span> : null}
            </div>
          </article>
        </div>

        <footer className="iris-training-modal__footer">
          <p className={isError ? 'iris-training-modal__error' : ''}>
            {isError
              ? status.message
              : isComplete
                ? 'Treinamento concluído. Os gráficos finais também permanecerão disponíveis no laboratório.'
                : 'Você pode fechar este acompanhamento; o treinamento continuará em segundo plano.'}
          </p>
          <button className="button button--primary" onClick={onClose} type="button">
            {isComplete || isError ? 'Continuar no laboratório' : 'Ocultar acompanhamento'}
          </button>
        </footer>
      </section>
    </div>
  );
}
