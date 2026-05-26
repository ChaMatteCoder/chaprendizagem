import { ArrowRight, BookOpen, Boxes, Code2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ProjectCard({ title, description, status, featured = false }) {
  return (
    <article className={`project-card ${featured ? 'project-card--featured' : ''}`}>
      <div className="project-card__visual" aria-hidden="true">
        {featured ? '7' : title.charAt(0)}
      </div>
      <div className="project-card__body">
        <span className="status-pill">{status}</span>
        <h3>{title}</h3>
        <p>{description}</p>
        <div className="project-card__features">
          <span>
            <BookOpen size={16} /> Teoria
          </span>
          <span>
            <Boxes size={16} /> Modelo
          </span>
          <span>
            <Code2 size={16} /> Código
          </span>
        </div>
        {featured ? (
          <Link to="/perceptron/modelo" className="text-link">
            Ver projeto <ArrowRight size={17} />
          </Link>
        ) : (
          <small>Em desenvolvimento</small>
        )}
      </div>
    </article>
  );
}
