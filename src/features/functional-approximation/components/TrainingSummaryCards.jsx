import { Activity, BrainCircuit, ChartNoAxesCombined, Gauge, ListChecks, Sigma, Target, TrendingDown } from 'lucide-react';
import MetricCard from '../../../components/MetricCard.jsx';
import { formatDecimal } from '../lib/metrics.js';

export default function TrainingSummaryCards({ result }) {
  const metrics = result.metrics;

  return (
    <div className="metrics-grid functional-metrics">
      <MetricCard icon={TrendingDown} label="MSE final" value={formatDecimal(metrics.mse, 6)} />
      <MetricCard icon={Sigma} label="Erro quadratico total" value={formatDecimal(metrics.totalSquaredError, 6)} />
      <MetricCard icon={Gauge} label="RMSE" value={formatDecimal(metrics.rmse, 6)} />
      <MetricCard icon={Activity} label="MAE" value={formatDecimal(metrics.mae, 6)} />
      <MetricCard icon={Target} label="Maior erro absoluto" value={formatDecimal(metrics.maxAbsoluteError, 6)} />
      <MetricCard icon={Target} label="Menor erro absoluto" value={formatDecimal(metrics.minAbsoluteError, 6)} />
      <MetricCard icon={ChartNoAxesCombined} label="R2" value={formatDecimal(metrics.rSquared, 6)} />
      <MetricCard icon={ListChecks} label="Épocas" value={result.epochs} />
      <MetricCard icon={BrainCircuit} label="Neurônios ocultos" value={result.hiddenNeurons} />
      <MetricCard icon={Sigma} label="Pontos usados" value={result.dataset.length} />
    </div>
  );
}
