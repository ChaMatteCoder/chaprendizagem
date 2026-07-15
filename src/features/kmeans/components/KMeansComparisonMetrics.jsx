import { Award, Boxes, Gauge, IterationCw, Sigma, TrendingDown } from 'lucide-react';
import { computeErrorReduction } from '../lib/kmeansMetrics.js';

function formatNumber(value, digits = 3) {
  return Number(value).toLocaleString('pt-BR', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function Metric({ icon: Icon, label, value, detail, tone = '' }) {
  return (
    <article className={`kmeans-plus-metric ${tone ? `is-${tone}` : ''}`}>
      <span><Icon size={19} /></span>
      <small>{label}</small>
      <strong>{value}</strong>
      <p>{detail}</p>
    </article>
  );
}

export default function KMeansComparisonMetrics({ comparison }) {
  const { classic, plusPlus, winner } = comparison;
  const classicInitial = classic.errorHistory[0].totalSquaredError;
  const plusInitial = plusPlus.errorHistory[0].totalSquaredError;
  const finalDifference = classic.totalSquaredError - plusPlus.totalSquaredError;
  const relativeDifference = classic.totalSquaredError === 0
    ? 0
    : (finalDifference / classic.totalSquaredError) * 100;
  const classicCounts = classic.clusterSummaries.map(({ count }) => count).join(' · ');
  const plusCounts = plusPlus.clusterSummaries.map(({ count }) => count).join(' · ');

  return (
    <section className="kmeans-plus-metrics" aria-label="Métricas comparativas da execução">
      <Metric
        detail={`K-Means++: ${formatNumber(plusInitial)}`}
        icon={Sigma}
        label="EQT inicial"
        value={formatNumber(classicInitial)}
      />
      <Metric
        detail={`Diferença: ${formatNumber(Math.abs(finalDifference))}`}
        icon={Gauge}
        label="EQT final · clássico / ++"
        tone={finalDifference >= 0 ? 'success' : 'warning'}
        value={`${formatNumber(classic.totalSquaredError)} / ${formatNumber(plusPlus.totalSquaredError)}`}
      />
      <Metric
        detail={`K-Means++: ${computeErrorReduction(plusPlus.errorHistory).toFixed(1)}%`}
        icon={TrendingDown}
        label="Redução do EQT · clássico"
        value={`${computeErrorReduction(classic.errorHistory).toFixed(1)}%`}
      />
      <Metric
        detail={`${classic.converged && plusPlus.converged ? 'Ambos convergiram' : 'Confira o limite configurado'}`}
        icon={IterationCw}
        label="Iterações · clássico / ++"
        value={`${classic.iterations.length - 1} / ${plusPlus.iterations.length - 1}`}
      />
      <Metric
        detail={`K-Means++: ${plusCounts}`}
        icon={Boxes}
        label="Pontos por cluster · clássico"
        value={classicCounts}
      />
      <Metric
        detail={winner.explanation}
        icon={Award}
        label="Melhor método nesta execução"
        tone="winner"
        value={winner.label}
      />
      <p className="kmeans-plus-metrics__footnote">
        {relativeDifference > 0
          ? `Nesta seed, o K-Means++ reduziu o EQT final em ${relativeDifference.toFixed(2)}% frente ao clássico.`
          : relativeDifference < 0
            ? `Nesta seed, a inicialização clássica terminou ${Math.abs(relativeDifference).toFixed(2)}% abaixo do K-Means++ — uma possibilidade real em uma única execução.`
            : 'Nesta seed, os métodos chegaram ao mesmo EQT final.'}
      </p>
    </section>
  );
}
