import { ArrowLeft, ArrowRight, BrainCircuit, Flower2, Ruler } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function IrisHeroSection({ isOpen, onOpenLab }) {
  return (
    <section className="page-hero iris-hero reveal-up">
      <div>
        <p className="eyebrow">Trabalho 09 — Classificação Iris Dataset com MLP</p>
        <h1>Classificação de flores Iris com uma rede neural multicamada.</h1>
        <p>
          Um laboratório interativo para treinar uma MLP com dados tabulares, visualizar a separação entre espécies e
          testar novas flores a partir de quatro medidas morfológicas.
        </p>
        <div className="hero-actions">
          <Link className="button button--ghost" to="/mlp">
            <ArrowLeft size={18} /> Voltar ao módulo MLP
          </Link>
          <button className="button button--primary" onClick={onOpenLab} type="button">
            {isOpen ? 'Voltar ao laboratório' : 'Abrir laboratório'} <ArrowRight size={18} />
          </button>
        </div>
      </div>

      <div className="iris-hero-card" aria-hidden="true">
        <div className="iris-hero-card__flowers">
          <Flower2 size={78} />
          <Flower2 size={62} />
          <Flower2 size={70} />
        </div>
        <div className="iris-measurement-lines">
          <span><Ruler size={16} /> sépala: comprimento + largura</span>
          <i />
          <span><Ruler size={16} /> pétala: comprimento + largura</span>
          <i />
          <strong><BrainCircuit size={18} /> MLP → espécie provável</strong>
        </div>
      </div>
    </section>
  );
}
