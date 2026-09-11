import { ArrowRight, BookOpen, Boxes, BrainCircuit, Code2, PenLine, Timer } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ProjectCard({ title, description, status, visual, cover, to, featured = false, kind = 'project' }) {
  const isGame = kind === 'game';
  return (
    <article className={`project-card ${featured ? 'project-card--featured' : ''} ${isGame ? 'project-card--game' : ''}`}>
      <div className="project-card__visual" aria-hidden="true">
        {cover ? <img alt="" src={cover} loading="lazy" decoding="async" /> : visual ?? title.charAt(0)}
      </div>
      <div className="project-card__body">
        <span className="status-pill">{status}</span>
        <h3>{title}</h3>
        <p>{description}</p>
        <div className="project-card__features">
          {isGame ? <>
            <span><PenLine size={16} /> Desenho</span>
            <span><Timer size={16} /> 10 segundos</span>
            <span><BrainCircuit size={16} /> IA</span>
          </> : <>
          <span>
            <BookOpen size={16} /> Teoria
          </span>
          <span>
            <Boxes size={16} /> Modelo
          </span>
          <span>
            <Code2 size={16} /> Código
          </span>
          </>}
        </div>
        {to ? (
          <Link to={to} className="text-link">
            {isGame ? 'Jogar agora' : 'Ver projeto'} <ArrowRight size={17} />
          </Link>
        ) : (
          <small>Em desenvolvimento</small>
        )}
      </div>
    </article>
  );
}
