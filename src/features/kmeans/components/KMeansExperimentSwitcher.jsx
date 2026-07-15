import { ArrowRight, Boxes, Sparkles } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { kmeansLabs } from '../data/kmeansLabs.js';

const labIcons = {
  classic: Boxes,
  plusplus: Sparkles,
};

export default function KMeansExperimentSwitcher({ activeLabId }) {
  const location = useLocation();
  const resolvedActiveLabId = activeLabId
    ?? (location.pathname.startsWith('/kmeans/plusplus') ? 'plusplus' : 'classic');

  return (
    <nav className="kmeans-experiment-switcher reveal-up" aria-label="Laboratórios da família K-Means">
      <div className="kmeans-experiment-switcher__heading">
        <span>Família K-Means</span>
        <Link to="/kmeans/hub">Visão geral da família</Link>
      </div>

      <div className="kmeans-experiment-switcher__links">
        {kmeansLabs.map((lab) => {
          const Icon = labIcons[lab.id] ?? Boxes;
          const isActive = lab.id === resolvedActiveLabId;

          return (
            <Link
              aria-current={isActive ? 'page' : undefined}
              className={`kmeans-experiment-switcher__link ${isActive ? 'is-active' : ''}`}
              key={lab.id}
              to={lab.route}
            >
              <span className="kmeans-experiment-switcher__icon" aria-hidden="true">
                <Icon size={19} />
              </span>
              <span className="kmeans-experiment-switcher__label">
                <small>{lab.work}</small>
                <strong>{lab.shortTitle}</strong>
              </span>
              <span className="kmeans-experiment-switcher__status">{isActive ? 'Você está aqui' : lab.status}</span>
              <ArrowRight aria-hidden="true" size={17} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
