import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import IrisHeroAnimation from './IrisHeroAnimation.jsx';

export default function IrisHeroSection({ isOpen, onOpenLab }) {
  return (
    <section className="page-hero iris-hero reveal-up">
      <div>
        <p className="eyebrow">Classificação Iris Dataset · MLP</p>
        <h1>Classificação de flores Iris com uma rede neural multicamada</h1>
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

      <div className="iris-hero-visual reveal-right" aria-hidden="true">
        <IrisHeroAnimation />
      </div>
    </section>
  );
}
