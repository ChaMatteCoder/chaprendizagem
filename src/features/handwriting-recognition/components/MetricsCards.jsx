import { BadgeCheck, Binary, BrainCircuit, Clock, Database, Gauge, Layers3, Target, TrendingDown } from 'lucide-react';
import MetricCard from '../../../components/MetricCard.jsx';

function getModelLabel(activeModelType) {
  if (activeModelType === 'mnist-tfjs') return 'MNIST TensorFlow.js';
  if (activeModelType === 'mnist-json') return 'MNIST pesos JSON';
  if (activeModelType === 'alphanumeric-json') return 'Alfanumérico pesos JSON';
  if (activeModelType === 'didactic') return 'MLP didática local';
  return 'Nenhum';
}

function formatDecimal(value, digits = 4) {
  return Number.isFinite(value) ? value.toFixed(digits) : '-';
}

function formatPercent(value) {
  return Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : '-';
}

export default function MetricsCards({ activeModelType = 'none', metrics, pretrainedMetrics, prediction, processed }) {
  const empty = {
    finalLoss: null,
    finalAccuracy: null,
    epochs: 0,
    classCount: 0,
    sampleCount: 0,
    trainTimeMs: 0,
    ...metrics,
  };
  const isPretrained = ['mnist-tfjs', 'mnist-json', 'alphanumeric-json'].includes(activeModelType);
  const accuracyValue =
    isPretrained
      ? Number.isFinite(pretrainedMetrics?.accuracy)
        ? pretrainedMetrics.accuracy
        : null
      : empty.finalAccuracy;
  const accuracyLabel =
    activeModelType === 'alphanumeric-json'
      ? 'Acurácia 36 classes'
      : isPretrained
        ? 'Acurácia MNIST'
        : 'Acurácia didática local';
  const lossValue =
    isPretrained
      ? Number.isFinite(pretrainedMetrics?.testLoss)
        ? pretrainedMetrics.testLoss
        : null
      : empty.finalLoss;
  const lossLabel = isPretrained ? 'Loss teste' : 'Loss final';

  return (
    <div className="handwriting-metrics">
      <MetricCard icon={BrainCircuit} label="Modelo ativo" value={getModelLabel(activeModelType)} />
      <MetricCard icon={BadgeCheck} label="Classe prevista" value={prediction?.label ?? '-'} />
      <MetricCard
        icon={Target}
        label="Confiança"
        value={prediction ? `${(prediction.confidence * 100).toFixed(1)}%` : '-'}
      />
      <MetricCard icon={TrendingDown} label={lossLabel} value={formatDecimal(lossValue)} />
      <MetricCard icon={Target} label={accuracyLabel} value={formatPercent(accuracyValue)} />
      <MetricCard icon={Layers3} label="Épocas" value={String(empty.epochs)} />
      <MetricCard icon={Binary} label="Entrada" value="784 pixels" />
      <MetricCard icon={Gauge} label="Pixels ativos" value={String(processed?.stats?.activePixels ?? 0)} />
      <MetricCard icon={Database} label="Amostras didáticas" value={String(empty.sampleCount)} />
      <MetricCard icon={Clock} label="Tempo" value={`${(empty.trainTimeMs / 1000).toFixed(1)}s`} />
    </div>
  );
}
