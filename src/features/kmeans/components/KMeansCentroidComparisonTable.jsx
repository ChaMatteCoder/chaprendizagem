import { TableProperties } from 'lucide-react';
import { squaredDistance } from '../lib/kmeans.js';
import { clusterColors } from './KMeansCentroidTable.jsx';

function formatCentroid(centroid) {
  return `(${centroid.x.toFixed(3)}, ${centroid.y.toFixed(3)})`;
}

function matchFinalClusters(classic, plusPlus) {
  const availablePlusClusters = new Set(plusPlus.finalCentroids.map((_, index) => index));

  return classic.finalCentroids.map((classicCentroid, classicCluster) => {
    let plusCluster = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    availablePlusClusters.forEach((candidate) => {
      const distance = squaredDistance(classicCentroid, plusPlus.finalCentroids[candidate]);
      if (distance < bestDistance) {
        bestDistance = distance;
        plusCluster = candidate;
      }
    });

    availablePlusClusters.delete(plusCluster);
    return { classicCluster, plusCluster };
  });
}

export default function KMeansCentroidComparisonTable({ classic, plusPlus }) {
  const matches = matchFinalClusters(classic, plusPlus);
  const classicInitial = classic.iterations[0].centroids;
  const plusInitial = plusPlus.iterations[0].centroids;

  return (
    <section className="kmeans-plus-centroid-table-card">
      <div className="kmeans-plus-chart-heading">
        <div>
          <span>Antes e depois</span>
          <h3>Comparação de centroides</h3>
        </div>
        <TableProperties size={24} />
      </div>
      <p>
        As linhas aproximam clusters pela menor distância entre os centroides finais; os números C1, C2… são locais a cada execução.
      </p>
      <div className="kmeans-plus-table-wrap">
        <table className="kmeans-plus-centroid-table">
          <thead>
            <tr>
              <th>Par</th>
              <th>Inicial clássico</th>
              <th>Inicial ++</th>
              <th>Final clássico</th>
              <th>Final ++</th>
              <th>Pontos clássico / ++</th>
              <th>EQT clássico / ++</th>
            </tr>
          </thead>
          <tbody>
            {matches.map(({ classicCluster, plusCluster }) => {
              const classicSummary = classic.clusterSummaries[classicCluster];
              const plusSummary = plusPlus.clusterSummaries[plusCluster];
              return (
                <tr key={classicCluster}>
                  <td>
                    <i style={{ backgroundColor: clusterColors[classicCluster % clusterColors.length] }} />
                    C{classicCluster + 1} ↔ C{plusCluster + 1}
                  </td>
                  <td>{formatCentroid(classicInitial[classicCluster])}</td>
                  <td>{formatCentroid(plusInitial[plusCluster])}</td>
                  <td>{formatCentroid(classic.finalCentroids[classicCluster])}</td>
                  <td>{formatCentroid(plusPlus.finalCentroids[plusCluster])}</td>
                  <td>{classicSummary.count} / {plusSummary.count}</td>
                  <td>{classicSummary.totalSquaredError.toFixed(3)} / {plusSummary.totalSquaredError.toFixed(3)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
