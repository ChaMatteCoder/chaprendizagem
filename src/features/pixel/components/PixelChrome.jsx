import { Link, NavLink } from 'react-router-dom';
import { useEffect } from 'react';
import { ArrowLeft, FlaskConical, Gamepad2, Grid3X3 } from 'lucide-react';
import BrandMark from '../../../components/BrandMark.jsx';

export default function PixelChrome({ children, mode = 'menu' }) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${mode === 'lab' ? 'PixelLab' : 'Pixel em Pânico!'} · Chaprendizagem`;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    return () => {
      document.title = previousTitle;
    };
  }, [mode]);
  return (
    <div className={`pixel-shell is-${mode}`}>
      <a href="#pixel-main-content" className="pixel-skip-link">
        Pular para o conteúdo
      </a>
      <div className="pixel-site-header">
        <header className="site-header">
          <BrandMark />
          <Link to="/#modulos" className="pixel-back-link">
            <ArrowLeft size={16} /> Todos os módulos
          </Link>
        </header>
      </div>
      <div className="pixel-module-bar">
        <Link to="/pixel" className="pixel-module-name">
          <Grid3X3 size={19} />
          <span>
            CNN{' '}
            <span className="pixel-module-name__extra">
              & visão computacional
            </span>
          </span>
          <span className="pixel-tag">Módulo 06</span>
        </Link>
        <nav aria-label="Navegação do módulo Pixel">
          <NavLink
            to="/pixel"
            end
            className={({ isActive }) =>
              `pixel-nav-pill${isActive ? ' is-active' : ''}`
            }
          >
            Visão geral
          </NavLink>
          <NavLink
            to="/pixel/jogo"
            className={({ isActive }) =>
              `pixel-nav-pill${isActive ? ' is-active' : ''}`
            }
          >
            <Gamepad2 size={16} /> Jogar
          </NavLink>
          <NavLink
            to="/pixel/lab"
            className={({ isActive }) =>
              `pixel-nav-pill${isActive ? ' is-active' : ''}`
            }
          >
            <FlaskConical size={16} /> PixelLab
          </NavLink>
        </nav>
      </div>
      {children}
      <footer className="pixel-footer">
        <span>
          Chaprendizagem <span aria-hidden="true">/</span> Do pixel à previsão.
        </span>
        <span>CNN treinada · CIFAR-10 · Inferência no navegador</span>
      </footer>
    </div>
  );
}
