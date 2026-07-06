import { BookOpen, BrainCircuit, CircleHelp, Route } from 'lucide-react';
import { kmeansCopy, kmeansThinkingSteps } from '../data/kmeansCopy.js';

export default function KMeansTheory() {
  return (
    <>
      <section className="kmeans-problem kmeans-glass-card reveal-up">
        <div className="kmeans-problem__icon"><CircleHelp size={30} /></div>
        <div>
          <p className="eyebrow">O problema</p>
          <h2>Como descobrir grupos quando ninguém forneceu as respostas?</h2>
        </div>
        <p>
          As 40 observações possuem apenas coordenadas <em>x</em> e <em>y</em>: não existem classes conhecidas. O K-Means
          tenta revelar grupos naturais usando distância. Os números de cluster são nomes criados pelo algoritmo, não
          rótulos prévios nem significados garantidos.
        </p>
      </section>

      <section className="kmeans-section reveal-up">
        <div className="section-heading">
          <p className="eyebrow">Como o algoritmo pensa</p>
          <h2>Um ciclo curto de atribuir, mover e medir.</h2>
        </div>
        <div className="kmeans-step-grid">
          {kmeansThinkingSteps.map((step) => (
            <article className="kmeans-step-card" key={step.number}>
              <span>{step.number}</span><h3>{step.title}</h3><p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="kmeans-section reveal-up">
        <div className="section-heading">
          <p className="eyebrow">Vocabulário do experimento</p>
          <h2>Quatro ideias para interpretar o que muda na tela.</h2>
        </div>
        <div className="kmeans-copy-grid">
          {[kmeansCopy.unsupervised, kmeansCopy.centroid, kmeansCopy.eqt, kmeansCopy.initialization].map((item, index) => {
            const Icon = [BookOpen, Route, BrainCircuit, CircleHelp][index];
            return <article key={item.title}><Icon size={22} /><h3>{item.title}</h3><p>{item.text}</p></article>;
          })}
        </div>
      </section>
    </>
  );
}
