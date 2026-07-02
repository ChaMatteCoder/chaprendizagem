import {
  ArrowRight,
  Beaker,
  BookOpenCheck,
  BrainCircuit,
  Code2,
  LineChart,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const principles = [
  {
    number: '01',
    icon: BookOpenCheck,
    title: 'Clareza antes da complexidade',
    description: 'A teoria é traduzida em uma sequência visual, sem esconder os detalhes que realmente importam.',
  },
  {
    number: '02',
    icon: Beaker,
    title: 'Aprender pelo experimento',
    description: 'Parâmetros deixam de ser abstrações quando podem ser alterados, comparados e observados em ação.',
  },
  {
    number: '03',
    icon: Sparkles,
    title: 'Cuidado também é conteúdo',
    description: 'Código, narrativa e interface recebem a mesma atenção para que cada estudo seja agradável de revisitar.',
  },
];

const method = [
  { icon: BookOpenCheck, label: 'Entender', text: 'A intuição e as hipóteses por trás do modelo.' },
  { icon: Code2, label: 'Construir', text: 'O algoritmo implementado passo a passo.' },
  { icon: LineChart, label: 'Observar', text: 'Métricas, gráficos e comportamentos do treino.' },
  { icon: BrainCircuit, label: 'Explicar', text: 'O resultado transformado em aprendizado reutilizável.' },
];

export default function AboutPage() {
  return (
    <div className="page editorial-page about-page">
      <section className="about-hero">
        <div className="about-hero__copy reveal-left">
          <p className="eyebrow">Sobre o laboratório</p>
          <h1>Ideias ficam mais claras quando podem ser testadas</h1>
          <p className="about-hero__lead">
            O Chaprendizagem transforma estudos de aprendizagem de máquina em experiências visuais — um lugar onde
            teoria, código e resultado contam a mesma história.
          </p>
          <div className="hero-actions">
            <Link className="button button--primary" to="/#projetos">
              Explorar projetos <ArrowRight size={18} />
            </Link>
            <Link className="button button--ghost" to="/contato">
              Falar com o Matheus
            </Link>
          </div>
        </div>

        <div className="about-manifesto reveal-right" aria-label="Manifesto visual do Chaprendizagem">
          <div className="about-manifesto__topline">
            <span>CH — LAB</span>
            <span>EM EVOLUÇÃO</span>
          </div>
          <div className="about-manifesto__network" aria-hidden="true">
            <span className="about-manifesto__node about-manifesto__node--theory">teoria</span>
            <span className="about-manifesto__node about-manifesto__node--code">código</span>
            <span className="about-manifesto__node about-manifesto__node--result">resultado</span>
            <svg viewBox="0 0 460 230">
              <path d="M96 72 C168 22 257 48 348 92" />
              <path d="M98 76 C168 128 252 186 354 164" />
              <path d="M348 96 C320 122 326 145 354 160" />
            </svg>
          </div>
          <blockquote>“Não basta chegar à resposta. O interessante é enxergar o caminho.”</blockquote>
          <div className="about-manifesto__footer">
            <span>Aprender</span>
            <i aria-hidden="true" />
            <span>Construindo</span>
          </div>
        </div>
      </section>

      <section className="about-story section reveal-up">
        <div className="about-story__index" aria-hidden="true">01</div>
        <div className="about-story__heading">
          <p className="eyebrow">A origem</p>
          <h2>De anotações dispersas para um laboratório vivo.</h2>
        </div>
        <div className="about-story__copy">
          <p>
            O projeto nasceu de uma inquietação simples: trabalhos importantes acabavam presos em notebooks,
            relatórios e pastas que raramente eram revisitados.
          </p>
          <p>
            Aqui, cada exercício ganha contexto, interação e acabamento. O que começou como registro acadêmico virou
            um portfólio em evolução — e, principalmente, uma forma mais honesta de mostrar como o aprendizado acontece.
          </p>
          <span className="about-story__signature">Matheus · estudante e desenvolvedor</span>
        </div>
      </section>

      <section className="section about-principles">
        <div className="section-heading section-heading--split reveal-up">
          <div>
            <p className="eyebrow">Princípios</p>
            <h2>O que orienta cada página.</h2>
          </div>
          <p>Três compromissos para transformar conteúdo técnico em uma experiência que convida à descoberta.</p>
        </div>
        <div className="about-principles__grid stagger">
          {principles.map(({ number, icon: Icon, title, description }) => (
            <article className="about-principle-card" key={number}>
              <div className="about-principle-card__meta">
                <span>{number}</span>
                <Icon size={24} />
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section about-method reveal-up">
        <div className="about-method__intro">
          <p className="eyebrow">O método</p>
          <h2>Um ciclo feito para deixar rastros.</h2>
          <p>Cada novo módulo percorre o mesmo caminho, mas encontra respostas diferentes.</p>
        </div>
        <div className="about-method__track">
          {method.map(({ icon: Icon, label, text }, index) => (
            <article className="about-method__step" key={label}>
              <div className="about-method__marker">
                <Icon size={20} />
                <span>{String(index + 1).padStart(2, '0')}</span>
              </div>
              <h3>{label}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-cta reveal-scale">
        <div className="about-cta__mark" aria-hidden="true">CH</div>
        <div>
          <p className="eyebrow">Próximo capítulo</p>
          <h2>O laboratório continua em construção.</h2>
          <p>Novos modelos, novas perguntas e uma interface cada vez mais útil para quem também está aprendendo.</p>
        </div>
        <Link className="button button--light" to="/contato">
          Vamos conversar <ArrowRight size={18} />
        </Link>
      </section>
    </div>
  );
}
