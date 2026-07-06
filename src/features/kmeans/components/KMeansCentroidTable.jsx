import { Crosshair } from 'lucide-react';

export const clusterColors = ['#008f8c', '#7651bf', '#d38c00', '#cf6044', '#2772b8', '#a45282', '#5b7f28', '#66727d'];

export default function KMeansCentroidTable({ centroids, summaries }) {
  return (
    <section className="kmeans-centroid-card">
      <div className="kmeans-card-heading">
        <span><Crosshair size={19} /></span>
        <div><p>Resultado atual</p><h3>Centroides</h3></div>
      </div>
      <div className="kmeans-table-wrap">
        <table className="kmeans-centroid-table">
          <thead><tr><th>Cluster</th><th>μx</th><th>μy</th><th>Pontos</th><th>EQT</th></tr></thead>
          <tbody>
            {centroids.map((centroid, cluster) => (
              <tr key={cluster}>
                <td><span style={{ backgroundColor: clusterColors[cluster] }} /> C{cluster + 1}</td>
                <td>{centroid.x.toFixed(4)}</td><td>{centroid.y.toFixed(4)}</td>
                <td>{summaries?.[cluster]?.count ?? '—'}</td>
                <td>{summaries?.[cluster]?.totalSquaredError.toFixed(3) ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
