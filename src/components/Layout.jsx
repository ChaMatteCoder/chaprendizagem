import {
  ArrowDown,
  ArrowRight,
  Code2,
  FileText,
  FlaskConical,
  Folder,
  Github,
  Home,
  Instagram,
  Mail,
  Network,
  Sigma,
  UserRound,
} from 'lucide-react';
import { useEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import BrandMark from './BrandMark.jsx';
import ScrollToTop from './ScrollToTop.jsx';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/sobre', label: 'Sobre' },
  { to: '/contato', label: 'Contato' },
];

const socialLinks = [
  { href: 'https://github.com/ChaMatteCoder', label: 'GitHub', icon: Github },
  { href: 'https://www.instagram.com/cha_matheus/', label: 'Instagram', icon: Instagram },
  { href: 'https://x.com/ChaMatteh_', label: '@ChaMatteh_', icon: null },
];

const footerNavItems = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/sobre', label: 'Sobre', icon: UserRound },
  { to: '/#projetos', label: 'Projetos', icon: Folder },
  { to: '/#modulos', label: 'Módulos', icon: FileText },
  { to: '/contato', label: 'Contato', icon: Mail },
];

const moduleLinks = [
  { to: '/perceptron/modelo', label: 'Perceptron', icon: Sigma, tone: 'teal' },
  { to: '/adaline', label: 'Adaline', icon: Network, tone: 'violet' },
];

const resourceLinks = [
  { href: 'https://github.com/ChaMatteCoder', label: 'GitHub', icon: Github },
  { href: 'https://github.com/ChaMatteCoder/chaprendizagem', label: 'Código-fonte', icon: Code2 },
  { href: 'https://www.instagram.com/cha_matheus/', label: 'Instagram', icon: Instagram },
  { href: 'https://x.com/ChaMatteh_', label: 'Perfil no X', icon: null },
];

function getNextStep(location) {
  if (location.pathname.startsWith('/perceptron')) {
    return {
      eyebrow: 'Próximo trabalho',
      title: 'Continue com Adaline',
      description: 'Abra o Trabalho 05 para estudar erro quadrático, regra delta e classificação com a base B2.',
      cardLabel: 'Trabalho 05',
      cardTitle: 'Adaline - Base B2',
      cardDescription: 'Treinamento por erro quadrático, fronteira linear e teste da rede.',
      buttonLabel: 'Abrir Trabalho 05',
      to: '/adaline',
      mark: 'ŷ',
    };
  }

  if (location.pathname === '/adaline') {
    return {
      eyebrow: 'Próximo trabalho',
      title: 'Avance para regressão',
      description: 'Depois do Trabalho 05, compare a Adaline com a regressão linear clássica no Trabalho 06.',
      cardLabel: 'Trabalho 06',
      cardTitle: 'Regressão com Adaline',
      cardDescription: 'Reta aprendida, regressão clássica, Pearson, R² e interpretação automática.',
      buttonLabel: 'Abrir Trabalho 06',
      to: '/adaline/regressao',
      mark: 'ŷ',
    };
  }

  if (location.pathname === '/adaline/regressao') {
    return {
      eyebrow: 'Próximo trabalho',
      title: 'Trabalho 07 em preparação',
      description: 'A próxima atividade ainda não foi publicada. Este espaço já fica reservado para continuar a trilha.',
      cardLabel: 'Em breve',
      cardTitle: 'Trabalho 07',
      cardDescription: 'Novo experimento será disponibilizado quando o próximo conteúdo estiver pronto.',
      buttonLabel: 'Trabalho 07 em breve',
      to: null,
      mark: '07',
    };
  }

  return {
    eyebrow: 'Próximo passo',
    title: 'Pronto para começar?',
    description: 'Abra o primeiro módulo publicado e explore conceitos com teoria, experimentos e código.',
    cardLabel: 'Módulo publicado',
    cardTitle: 'Perceptron',
    cardDescription: 'Classificador linear com entradas binárias e estratégia um-contra-todos.',
    buttonLabel: 'Abrir Perceptron',
    to: '/perceptron/modelo',
    mark: 'Σ',
  };
}

function XLogo({ size = 20 }) {
  return (
    <svg aria-hidden="true" className="x-logo" fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <path
        fill="currentColor"
        d="M1 2h2.5L18.5 22h-2.5zM5.5 2h2.5L23 22h-2.5zM3 2h5v2h-5zM16 20h5v2h-5zM18.5 2h3.5L5 22h-3.5z"
      />
    </svg>
  );
}

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const nextStep = getNextStep(location);

  useEffect(() => {
    if (location.hash) {
      window.requestAnimationFrame(() => {
        const target = document.querySelector(location.hash);
        target?.scrollIntoView({ block: 'start' });
      });
      return;
    }

    window.scrollTo({ top: 0, left: 0 });
  }, [location.pathname, location.hash]);

  function handleFooterSubscribe(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = data.get('email')?.toString().trim();
    navigate(email ? `/contato?email=${encodeURIComponent(email)}` : '/contato');
  }

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
      <ScrollToTop />

      <section className="footer-next-step reveal-scale" aria-labelledby="footer-next-title">
        <div className="footer-next-step__intro">
          <span className="footer-next-step__icon">
            <FlaskConical size={30} />
          </span>
          <div>
            <p className="eyebrow">{nextStep.eyebrow}</p>
            <h2 id="footer-next-title">{nextStep.title}</h2>
            <p>{nextStep.description}</p>
          </div>
        </div>

        {nextStep.to ? (
          <Link className="footer-module-card" to={nextStep.to}>
            <span className="footer-module-card__mark">{nextStep.mark}</span>
            <span>
              <small>{nextStep.cardLabel}</small>
              <strong>{nextStep.cardTitle}</strong>
              <p>{nextStep.cardDescription}</p>
            </span>
            <ArrowRight size={22} />
          </Link>
        ) : (
          <div className="footer-module-card footer-module-card--disabled">
            <span className="footer-module-card__mark">{nextStep.mark}</span>
            <span>
              <small>{nextStep.cardLabel}</small>
              <strong>{nextStep.cardTitle}</strong>
              <p>{nextStep.cardDescription}</p>
            </span>
          </div>
        )}

        <div className="footer-next-step__actions">
          {nextStep.to ? (
            <Link className="button button--light" to={nextStep.to}>
              {nextStep.buttonLabel} <ArrowRight size={18} />
            </Link>
          ) : (
            <button className="button button--light" disabled type="button">
              {nextStep.buttonLabel}
            </button>
          )}
          <a className="footer-inline-link" href="/#modulos">
            Ver todos os módulos <ArrowRight size={18} />
          </a>
        </div>
      </section>

      <footer className="site-footer" id="contato-rapido">
        <div className="footer-top stagger">
          <div className="footer-main">
            <BrandMark />
            <p>
              Um laboratório visual para estudar, testar e apresentar conceitos de aprendizagem de máquina. Do conceito
              ao código.
            </p>
            <div className="footer-social-icons">
              {socialLinks.map((item) => {
                const Icon = item.icon;

                return (
                  <a href={item.href} key={item.label} rel="noreferrer" target="_blank" title={item.label}>
                    {Icon ? <Icon size={20} /> : <XLogo size={20} />}
                  </a>
                );
              })}
            </div>
          </div>

          <nav className="footer-column" aria-label="Navegação do rodapé">
            <h2>Navegação</h2>
            {footerNavItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link key={item.label} to={item.to}>
                  <Icon size={19} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <nav className="footer-column" aria-label="Explorar módulos">
            <h2>Explorar módulos</h2>
            <div className="footer-module-list">
              {moduleLinks.map((item) => {
                const Icon = item.icon;

                return (
                  <Link className={`footer-pill footer-pill--${item.tone}`} key={item.label} to={item.to}>
                    <Icon size={17} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>

          <nav className="footer-column" aria-label="Recursos e comunidade">
            <h2>Recursos & comunidade</h2>
            {resourceLinks.map((item) => {
              const Icon = item.icon;

              return (
                <a href={item.href} key={item.label} rel="noreferrer" target="_blank">
                  {Icon ? <Icon size={19} /> : <XLogo size={19} />}
                  {item.label}
                </a>
              );
            })}
          </nav>

          <form className="footer-newsletter" onSubmit={handleFooterSubscribe}>
            <span className="footer-newsletter__icon">
              <Mail size={24} />
            </span>
            <h2>Fique por dentro</h2>
            <p>Receba novidades sobre novos módulos, artigos e atualizações do laboratório.</p>
            <input aria-label="Email para novidades" name="email" placeholder="seu@email.com" type="email" />
            <button className="button button--primary" type="submit">
              Receber atualizações <ArrowRight size={18} />
            </button>
            <small>Sem spam. Você pode sair quando quiser.</small>
          </form>
        </div>

        <div className="footer-bottom">
          <span>© 2026 Chaprendizagem. Todos os direitos reservados.</span>
          <strong>
            <Code2 size={17} /> Do conceito ao código.
          </strong>
          <div>
            <Link to="/contato">Privacidade</Link>
            <Link to="/contato">Termos de uso</Link>
            <Link to="/contato">Acessibilidade</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
