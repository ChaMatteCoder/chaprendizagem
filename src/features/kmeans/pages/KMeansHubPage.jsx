import { ArrowRight, Boxes, ChartSpline, DatabaseZap, GitCompareArrows, Sparkles, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { kmeansLabs } from '../data/kmeansLabs.js';

const labDetails = {
  classic: {
    icon: Boxes,
    number: '10',
    tone: 'classic',
    features: ['Ciclo de Lloyd visual', 'EQT por iteração', 'Cotovelo e silhouette'],
  },
  plusplus: {
    icon: Sparkles,
    number: '11',
    tone: 'plusplus',
    features: ['Semeadura proporcional a D²', 'Comparação lado a lado', 'Desafio MiniBatchKMeans'],
  },
};

export default function KMeansHubPage() {
  return (
    <div className="page kmeans-hub-page">
      <section className="kmeans-hub-hero reveal-up">
        <div className="kmeans-hub-hero__copy">
          <p className="eyebrow">Módulo 04 · Aprendizagem não supervisionada</p>
          <h1>Do agrupamento clássico à inicialização inteligente.</h1>
          <p>
            A família K-Means reúne dois trabalhos independentes. Comece pelo ciclo de Lloyd no Trabalho 10 ou avance
            para a comparação com K-Means++ e MiniBatchKMeans no Trabalho 11.
          </p>
          <a className="button button--primary" href="#laboratorios-kmeans">
            Escolher laboratório <ArrowRight size={18} />
          </a>
        </div>

        <div className="kmeans-hub-hero__visual" aria-hidden="true">
          <div className="kmeans-hub-hero__axis" />
          <div className="kmeans-hub-hero__cluster is-one"><i /><i /><i /><b>μ1</b></div>
          <div className="kmeans-hub-hero__cluster is-two"><i /><i /><i /><b>μ2</b></div>
          <div className="kmeans-hub-hero__cluster is-three"><i /><i /><i /><b>μ3</b></div>
          <span className="kmeans-hub-hero__label is-classic"><Boxes size={15} /> Lloyd</span>
          <span className="kmeans-hub-hero__label is-plus"><Sparkles size={15} /> D²</span>
        </div>
      </section>

      <section className="kmeans-hub-principle reveal-up">
        <article><Target size={22} /><span>Mesmo objetivo</span><strong>reduzir a soma das distâncias quadráticas</strong></article>
        <article><GitCompareArrows size={22} /><span>Duas perguntas</span><strong>como refinar e como começar</strong></article>
        <article><DatabaseZap size={22} /><span>Uma extensão</span><strong>escalar com mini-batches</strong></article>
      </section>

      <section className="section reveal-up" id="laboratorios-kmeans">
        <div className="section-heading section-heading--with-actions">
          <div>
            <p className="eyebrow">Laboratórios da família</p>
            <h2>Trabalho 10 e Trabalho 11, cada um no seu percurso.</h2>
            <p>Os cards não misturam os experimentos: cada rota preserva sua teoria, controles e resultados.</p>
          </div>
          <ChartSpline size={34} />
        </div>

        <div className="kmeans-hub-lab-grid">
          {kmeansLabs.map((lab) => {
            const detail = labDetails[lab.id];
            const Icon = detail.icon;
            return (
              <article className={`kmeans-hub-lab-card is-${detail.tone}`} key={lab.id}>
                <div className="kmeans-hub-lab-card__top">
                  <span>TRABALHO {detail.number}</span>
                  <i><Icon size={25} /></i>
                </div>
                <div className="kmeans-hub-lab-card__body">
                  <small>{lab.status}</small>
                  <h3>{lab.title}</h3>
                  <p>{lab.description}</p>
                  <strong>{lab.focus}</strong>
                </div>
                <ul>
                  {detail.features.map((feature) => <li key={feature}>{feature}</li>)}
                </ul>
                <Link className="button button--primary" to={lab.route}>
                  Abrir Trabalho {detail.number} <ArrowRight size={17} />
                </Link>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
