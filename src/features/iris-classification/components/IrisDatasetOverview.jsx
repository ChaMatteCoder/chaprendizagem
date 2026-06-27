import { memo } from 'react';
import { Database, Flower2, Ruler, Target } from 'lucide-react';
import { irisClasses, irisDataset, irisFeatures } from '../data/irisDataset.js';

function classCounts() {
  return irisClasses.map((species) => ({ species, count: irisDataset.filter((row) => row.species === species).length }));
}

function IrisDatasetOverview() {
  return (
    <section className="wide-panel reveal-up">
      <div className="section-heading">
        <p className="eyebrow">Conheça a base</p>
        <h2>Iris Dataset em formato tabular.</h2>
        <p>
          A base local contém 150 amostras balanceadas. Cada flor é descrita por quatro medidas em centímetros, usadas
          como entrada numérica da rede neural.
        </p>
      </div>

      <div className="iris-overview-grid">
        <article className="iris-stat-card">
          <Database size={26} />
          <small>Amostras</small>
          <strong>{irisDataset.length}</strong>
          <p>Registros locais, sem dependência de internet.</p>
        </article>
        <article className="iris-stat-card">
          <Target size={26} />
          <small>Classes</small>
          <strong>{irisClasses.length}</strong>
          <p>Setosa, versicolor e virginica.</p>
        </article>
        <article className="iris-stat-card">
          <Ruler size={26} />
          <small>Atributos</small>
          <strong>{irisFeatures.length}</strong>
          <p>Comprimento e largura de sépala e pétala.</p>
        </article>
        <article className="iris-stat-card">
          <Flower2 size={26} />
          <small>Distribuição</small>
          <strong>50/50/50</strong>
          <p>Três grupos com a mesma quantidade de amostras.</p>
        </article>
      </div>

      <div className="iris-class-distribution" aria-label="Distribuição por classe">
        {classCounts().map((item) => (
          <div key={item.species}>
            <span>{item.species.replace('Iris-', '')}</span>
            <strong>{item.count}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

export default memo(IrisDatasetOverview);
