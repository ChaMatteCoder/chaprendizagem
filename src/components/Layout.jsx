import { ArrowDown, Github, Instagram, Mail } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import BrandMark from './BrandMark.jsx';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/sobre', label: 'Sobre' },
  { to: '/contato', label: 'Contato' },
];

const socialLinks = [
  { href: 'https://github.com/ChaMatteCoder', label: 'GitHub', icon: Github },
  { href: 'https://www.instagram.com/cha_matheus/', label: 'Instagram', icon: Instagram },
  { href: 'https://x.com/ChaMatteh_', label: 'X', icon: null },
];

export default function Layout({ children }) {
  return (
    <div className="app-shell">
      <header className="site-header">
        <BrandMark />
        <nav className="main-nav" aria-label="Navegação principal">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <a className="button button--primary header-action" href="/#projetos">
          Explorar <ArrowDown size={18} />
        </a>
      </header>
      <main>{children}</main>
      <footer className="site-footer" id="contato-rapido">
        <div className="footer-main">
          <BrandMark />
          <p>Um laboratório visual para estudar, testar e apresentar conceitos de aprendizagem de máquina.</p>
        </div>
        <div className="footer-links">
          <span>Redes</span>
          <div className="social-row">
            {socialLinks.map((item) => {
              const Icon = item.icon;

              return (
                <a href={item.href} key={item.label} rel="noreferrer" target="_blank" title={item.label}>
                  {Icon ? <Icon size={18} /> : <strong className="x-mark">X</strong>}
                  {item.label}
                </a>
              );
            })}
          </div>
        </div>
        <a className="footer-contact" href="/contato">
          <Mail size={18} /> Contato
        </a>
      </footer>
    </div>
  );
}
