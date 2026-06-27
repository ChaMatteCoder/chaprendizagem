import { ArrowRight, BrainCircuit, Flower2, FunctionSquare, Grid3X3, PenLine, Table2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { mlpLabs } from '../data/mlpLabs.js';

const labIcons = {
  'functional-approximation': FunctionSquare,
  'handwriting-recognition': PenLine,
  'iris-classification': Flower2,
};

const conceptCards = [
  {
    icon: FunctionSquare,
    title: 'Aproximação funcional',
    text: 'No Trabalho 07, a MLP atua como modelo de regressão para aprender uma curva contínua a partir de pontos.',
  },
  {
    icon: Grid3X3,
    title: 'Imagens vetorizadas',
    text: 'No Trabalho 08, imagens 28×28 são convertidas em vetores de 784 valores antes de chegar às camadas densas.',
  },
  {
    icon: Table2,
    title: 'Dados tabulares',
    text: 'No Trabalho 09, medidas morfológicas do Iris Dataset formam a entrada numérica para classificação multiclasse.',
  },
];

export default function MlpHubPage() {
  return (
    <div className="page mlp-hub-page">
      <section className="page-hero mlp-hub-hero reveal-up">
        <div>
          <p className="eyebrow">Módulo MLP — Redes Neurais Multicamadas</p>
          <h1>Três laboratórios para entender MLPs por ângulos diferentes.</h1>
          <p>
            Uma MLP é uma rede neural feedforward composta por camadas densas. No Chaprendizagem, este módulo reúne três
            formas de usar a mesma ideia: aproximar funções contínuas, classificar imagens simples e classificar dados
            tabulares.
          </p>
          <div className="hero-actions">
            <a className="button button--primary" href="#laboratorios-mlp">
              Ver laboratórios <ArrowRight size={18} />
            </a>
            <Link className="button button--ghost" to="/mlp/classificacao-iris">
              Abrir Trabalho 09 <Flower2 size={18} />
            </Link>
          </div>
        </div>
        <div className="mlp-hub-visual" aria-hidden="true">
          <div className="mlp-hub-visual__layer mlp-hub-visual__layer--input">
            <span>x1</span>
            <span>x2</span>
            <span>x3</span>
          </div>
          <div className="mlp-hub-visual__connections" />
          <div className="mlp-hub-visual__layer mlp-hub-visual__layer--hidden">
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="mlp-hub-visual__connections mlp-hub-visual__connections--second" />
          <div className="mlp-hub-visual__layer mlp-hub-visual__layer--output">
            <strong>ŷ</strong>
          </div>
        </div>
      </section>

      <section className="wide-panel reveal-up">
        <div className="section-heading">
          <p className="eyebrow">Ideia central</p>
          <h2>Uma arquitetura, três tipos de problema.</h2>
          <p>
            As MLPs combinam entradas numéricas por meio de pesos, bias e funções de ativação. O que muda entre os
            trabalhos é a forma dos dados: pontos de uma função, pixels de uma imagem ou medidas de flores.
          </p>
        </div>
        <div className="mlp-concept-grid">
          {conceptCards.map((card) => {
            const Icon = card.icon;
            return (
              <article className="theory-feature-card" key={card.title}>
                <Icon size={30} />
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="section reveal-up" id="laboratorios-mlp">
        <div className="section-heading">
          <p className="eyebrow">Laboratórios do módulo</p>
          <h2>Trilha MLP organizada por trabalhos.</h2>
        </div>
        <div className="mlp-lab-grid">
          {mlpLabs.map((lab) => {
            const Icon = labIcons[lab.id] ?? BrainCircuit;
            return (
              <article className="mlp-lab-card" key={lab.id}>
                <div className="mlp-lab-card__icon">
                  <Icon size={30} />
                </div>
                <div className="mlp-lab-card__content">
                  <span className="status-pill">{lab.status}</span>
                  <small>{lab.work}</small>
                  <h3>{lab.title}</h3>
                  <p>{lab.description}</p>
                  <strong>{lab.focus}</strong>
                </div>
                <div className="mlp-lab-card__actions">
                  <Link className="text-link" to={lab.route}>
                    Abrir laboratório <ArrowRight size={17} />
                  </Link>
                  {lab.legacyRoute ? (
                    <Link className="text-link text-link--muted" to={lab.legacyRoute}>
                      Rota antiga
                    </Link>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
