import {
  ArrowRight,
  BrainCircuit,
  Flower2,
  FunctionSquare,
  Grid3X3,
  Layers3,
  PenLine,
  Table2,
} from 'lucide-react';
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
    index: '01',
    title: 'Aproximação funcional',
    text: 'A mesma arquitetura atua como regressora para aprender uma curva contínua a partir de amostras.',
  },
  {
    icon: Grid3X3,
    index: '02',
    title: 'Imagens vetorizadas',
    text: 'Pixels 28×28 viram 784 entradas numéricas antes das camadas densas produzirem probabilidades.',
  },
  {
    icon: Table2,
    index: '03',
    title: 'Dados tabulares',
    text: 'Medidas de sépalas e pétalas alimentam uma classificação multiclasse explicável e mensurável.',
  },
];

export default function MlpHubPage() {
  return (
    <div className="page mlp-hub-page mlp-hub-page--renewed">
      <section className="mlp-hub-hero mlp-hub-hero--renewed reveal-up">
        <div className="mlp-hub-hero__copy">
          <div className="mlp-hub-hero__meta">
            <span>Módulo 03</span>
            <span>3 laboratórios</span>
            <span>Trabalhos 07–09</span>
          </div>
          <p className="eyebrow">MLP · Redes Neurais Multicamadas</p>
          <h1>Uma arquitetura. Três formas de aprender.</h1>
          <p>
            Percorra regressão, imagens e dados tabulares em laboratórios separados. Cada trabalho preserva seu
            próprio problema, treinamento e leitura de resultados.
          </p>
          <div className="hero-actions">
            <a className="button button--primary" href="#laboratorios-mlp">
              Escolher laboratório <ArrowRight size={18} />
            </a>
            <Link className="button button--ghost" to="/mlp/classificacao-iris">
              Abrir Trabalho 09 <Flower2 size={18} />
            </Link>
          </div>
        </div>

        <div className="mlp-hub-visual mlp-hub-visual--renewed" aria-hidden="true">
          <div className="mlp-hub-visual__caption"><Layers3 size={16} /> fluxo feedforward</div>
          <div className="mlp-hub-visual__layer mlp-hub-visual__layer--input">
            <small>entrada</small><span>x1</span><span>x2</span><span>x3</span>
          </div>
          <div className="mlp-hub-visual__connections" />
          <div className="mlp-hub-visual__layer mlp-hub-visual__layer--hidden">
            <small>camada oculta</small><span /><span /><span /><span />
          </div>
          <div className="mlp-hub-visual__connections mlp-hub-visual__connections--second" />
          <div className="mlp-hub-visual__layer mlp-hub-visual__layer--output">
            <small>saída</small><strong>ŷ</strong>
          </div>
          <div className="mlp-hub-visual__footer">pesos + bias + ativação</div>
        </div>
      </section>

      <section className="mlp-hub-foundation reveal-up">
        <div className="mlp-hub-foundation__intro">
          <span><BrainCircuit size={27} /></span>
          <div>
            <p className="eyebrow">Ideia central</p>
            <h2>O formato da entrada muda. A lógica em camadas permanece.</h2>
          </div>
        </div>
        <div className="mlp-concept-grid mlp-concept-grid--renewed">
          {conceptCards.map((card) => {
            const Icon = card.icon;
            return (
              <article className="mlp-concept-card" key={card.title}>
                <div><span>{card.index}</span><Icon size={23} /></div>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="section mlp-labs-section reveal-up" id="laboratorios-mlp">
        <div className="section-heading section-heading--with-actions">
          <div>
            <p className="eyebrow">Laboratórios do módulo</p>
            <h2>Três trabalhos, três experiências completas.</h2>
            <p>Escolha um card para entrar diretamente no experimento correspondente.</p>
          </div>
          <BrainCircuit size={35} />
        </div>

        <div className="mlp-lab-grid mlp-lab-grid--renewed">
          {mlpLabs.map((lab, index) => {
            const Icon = labIcons[lab.id] ?? BrainCircuit;
            return (
              <article className={`mlp-lab-card mlp-lab-card--${index + 1}`} key={lab.id}>
                <div className="mlp-lab-card__topline">
                  <span>{lab.work}</span>
                  <small>{lab.status}</small>
                </div>
                <div className="mlp-lab-card__icon"><Icon size={29} /></div>
                <div className="mlp-lab-card__content">
                  <h3>{lab.title}</h3>
                  <p>{lab.description}</p>
                  <strong>{lab.focus}</strong>
                </div>
                <div className="mlp-lab-card__actions">
                  <Link className="button button--primary" to={lab.route}>
                    Abrir {lab.work} <ArrowRight size={17} />
                  </Link>
                  {lab.legacyRoute ? <Link className="text-link text-link--muted" to={lab.legacyRoute}>Rota original</Link> : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
