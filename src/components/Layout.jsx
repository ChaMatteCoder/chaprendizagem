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
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
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

const policyContent = {
  privacy: {
    eyebrow: 'Políticas do Chaprendizagem',
    title: 'Política de Privacidade',
    updatedAt: 'Última atualização: 31 de maio de 2026',
    intro:
      'O Chaprendizagem é um projeto acadêmico e pessoal desenvolvido para fins de estudo, apresentação e revisão de conteúdos relacionados à Aprendizagem de Máquina.',
    sections: [
      {
        title: 'Dados pessoais',
        paragraphs: [
          'O Chaprendizagem não tem como objetivo coletar dados pessoais sensíveis dos visitantes.',
          'Caso o usuário entre em contato por meio de links externos, e-mail, redes sociais ou outras plataformas indicadas no site, os dados fornecidos voluntariamente, como nome, e-mail ou mensagem, poderão ser utilizados apenas para responder à solicitação.',
        ],
      },
      {
        title: 'Recursos técnicos e links externos',
        paragraphs: [
          'O site pode utilizar recursos técnicos comuns de navegação, como informações básicas do navegador, endereço IP, dados de acesso ou cookies necessários ao funcionamento da aplicação, dependendo do ambiente em que estiver hospedado.',
          'Não vendemos, alugamos ou compartilhamos dados pessoais dos visitantes para fins comerciais.',
          'Alguns links do site podem direcionar para plataformas externas, como GitHub, LinkedIn, serviços de hospedagem ou outros ambientes acadêmicos. Nesses casos, o tratamento de dados será regido pelas políticas de privacidade das respectivas plataformas.',
        ],
      },
      {
        title: 'Solicitações',
        paragraphs: [
          'Caso deseje solicitar informações, correção ou exclusão de algum dado eventualmente enviado por contato direto, entre em contato pelo canal informado na página de contato do projeto.',
        ],
      },
    ],
  },
  terms: {
    eyebrow: 'Políticas do Chaprendizagem',
    title: 'Termos de Uso',
    updatedAt: 'Última atualização: 31 de maio de 2026',
    intro:
      'Ao acessar o Chaprendizagem, o usuário concorda em utilizar o site apenas para fins lícitos, educacionais e informativos.',
    sections: [
      {
        title: 'Finalidade do conteúdo',
        paragraphs: [
          'O conteúdo disponibilizado no projeto tem finalidade acadêmica e didática. As explicações, gráficos, simulações e experimentos não devem ser interpretados como orientação profissional, científica definitiva ou solução única para problemas de Aprendizagem de Máquina.',
        ],
      },
      {
        title: 'Uso adequado',
        paragraphs: [
          'O usuário se compromete a não tentar comprometer a segurança, disponibilidade ou funcionamento do site, bem como a não utilizar o conteúdo de forma indevida, ofensiva, ilegal ou prejudicial a terceiros.',
          'Os textos, códigos, componentes visuais, gráficos, simulações e demais materiais do projeto pertencem ao autor do Chaprendizagem, salvo quando indicado o uso de bibliotecas, bases, referências ou ferramentas de terceiros.',
          'É permitido utilizar o conteúdo como referência de estudo, desde que seja dada a devida atribuição ao projeto e ao autor, quando aplicável.',
        ],
      },
      {
        title: 'Atualizações',
        paragraphs: [
          'O projeto pode passar por alterações, correções, remoções ou atualizações sem aviso prévio, especialmente por se tratar de um ambiente acadêmico em desenvolvimento contínuo.',
        ],
      },
    ],
  },
  accessibility: {
    eyebrow: 'Políticas do Chaprendizagem',
    title: 'Acessibilidade',
    updatedAt: 'Última atualização: 31 de maio de 2026',
    intro:
      'O Chaprendizagem busca oferecer uma experiência acessível e compreensível para diferentes usuários.',
    sections: [
      {
        title: 'Boas práticas consideradas',
        paragraphs: [
          'Durante o desenvolvimento do projeto, são consideradas boas práticas como organização semântica das páginas, clareza visual, contraste adequado, navegação compreensível, textos explicativos e componentes reutilizáveis.',
        ],
      },
      {
        title: 'Limitações e melhoria contínua',
        paragraphs: [
          'Como o projeto contém gráficos, simulações e elementos visuais interativos, alguns recursos podem apresentar limitações de acessibilidade dependendo do dispositivo, navegador ou tecnologia assistiva utilizada.',
          'O objetivo é melhorar progressivamente a acessibilidade do site, tornando os conteúdos de Aprendizagem de Máquina mais claros, navegáveis e inclusivos.',
        ],
      },
      {
        title: 'Contato',
        paragraphs: [
          'Caso encontre alguma barreira de acesso, erro de navegação, dificuldade de leitura ou problema em algum componente interativo, utilize o canal de contato disponível no projeto para informar o problema.',
        ],
      },
      {
        title: 'Aviso acadêmico',
        paragraphs: [
          'Este site foi desenvolvido como parte de estudos e atividades acadêmicas na área de Aprendizagem de Máquina. O conteúdo pode conter simplificações didáticas, exemplos experimentais e implementações voltadas ao aprendizado.',
          'O projeto não coleta intencionalmente dados sensíveis, não realiza vendas, não possui sistema de pagamento e não oferece serviços comerciais.',
        ],
      },
    ],
  },
};

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
  const [activePolicy, setActivePolicy] = useState(null);
  const policy = activePolicy ? policyContent[activePolicy] : null;

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

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setActivePolicy(null);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

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
            <button onClick={() => setActivePolicy('privacy')} type="button">Privacidade</button>
            <button onClick={() => setActivePolicy('terms')} type="button">Termos de uso</button>
            <button onClick={() => setActivePolicy('accessibility')} type="button">Acessibilidade</button>
          </div>
        </div>
      </footer>

      {policy ? (
        <div className="policy-modal-backdrop" onClick={() => setActivePolicy(null)} role="presentation">
          <section
            aria-labelledby="policy-modal-title"
            aria-modal="true"
            className="policy-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="policy-modal__header">
              <div>
                <p className="eyebrow">{policy.eyebrow}</p>
                <h2 id="policy-modal-title">{policy.title}</h2>
                <span>{policy.updatedAt}</span>
              </div>
              <button className="icon-button" onClick={() => setActivePolicy(null)} title="Fechar" type="button">
                <X size={18} />
              </button>
            </div>
            <p className="policy-modal__intro">{policy.intro}</p>
            <div className="policy-modal__content">
              {policy.sections.map((section) => (
                <article key={section.title}>
                  <h3>{section.title}</h3>
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </article>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
