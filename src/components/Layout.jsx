import { ArrowRight } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import BrandMark from './BrandMark.jsx';

const navItems = [
  { to: '/', label: 'Projetos' },
  { to: '/perceptron/teoria', label: 'Teoria' },
  { to: '/perceptron/modelo', label: 'Modelo' },
  { to: '/perceptron/resultados', label: 'Resultados' },
];

export default function Layout({ children }) {
  return (
    <div className="app-shell">
      <header className="site-header">
        <BrandMark />
        <nav className="main-nav" aria-label="Navegacao principal">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <NavLink className="button button--primary header-action" to="/perceptron/modelo">
          Explorar <ArrowRight size={18} />
        </NavLink>
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <BrandMark />
        <p>Aprender fazendo. Entender profundamente.</p>
        <span>2026 - Projeto academico em evolucao.</span>
      </footer>
    </div>
  );
}
