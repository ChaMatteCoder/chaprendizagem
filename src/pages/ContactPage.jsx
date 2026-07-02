import { ArrowRight, ArrowUpRight, Github, Instagram, MessageCircle, Radio, Sparkles } from 'lucide-react';

const channels = [
  {
    href: 'https://github.com/ChaMatteCoder',
    label: 'GitHub',
    value: 'ChaMatteCoder',
    description: 'Código, projetos e histórico de desenvolvimento.',
    icon: Github,
    tone: 'teal',
  },
  {
    href: 'https://www.instagram.com/cha_matheus/',
    label: 'Instagram',
    value: '@cha_matheus',
    description: 'O canal mais direto para conversas e trocas rápidas.',
    icon: Instagram,
    tone: 'coral',
  },
  {
    href: 'https://x.com/ChaMatteh_',
    label: 'X / Twitter',
    value: '@ChaMatteh_',
    description: 'Ideias, referências e atualizações curtas.',
    icon: Radio,
    tone: 'amber',
  },
];

const conversationPaths = [
  { number: '01', title: 'Feedback técnico', text: 'Encontrou algo no código ou quer sugerir uma melhoria?', channel: 'GitHub' },
  { number: '02', title: 'Projetos e ideias', text: 'Quer conversar sobre uma colaboração ou trocar referências?', channel: 'Instagram' },
  { number: '03', title: 'Acompanhar o projeto', text: 'Prefere ver atualizações rápidas e o trabalho em progresso?', channel: 'X / Twitter' },
];

export default function ContactPage() {
  return (
    <div className="page editorial-page contact-page">
      <section className="contact-hero">
        <div className="contact-hero__copy reveal-left">
          <div className="contact-status"><span aria-hidden="true" /> Aberto a boas conversas</div>
          <p className="eyebrow">Contato</p>
          <h1>Ideias interessantes começam com um olá</h1>
          <p>
            Sou Matheus, estudante e desenvolvedor por trás do Chaprendizagem. Se você quer trocar referências,
            comentar um experimento ou propor algo novo, escolha o canal que fizer mais sentido.
          </p>
        </div>

        <a
          className="contact-featured reveal-right"
          href="https://github.com/ChaMatteCoder"
          rel="noreferrer"
          target="_blank"
        >
          <div className="contact-featured__header">
            <Github size={28} />
            <ArrowUpRight size={22} />
          </div>
          <div>
            <span>Canal principal</span>
            <h2>Comece pelo GitHub.</h2>
            <p>Veja o trabalho por dentro, explore os repositórios ou abra uma conversa a partir de um projeto.</p>
          </div>
          <div className="contact-featured__footer">
            <strong>@ChaMatteCoder</strong>
            <span>Ver perfil <ArrowRight size={16} /></span>
          </div>
        </a>
      </section>

      <section className="section contact-channels">
        <div className="section-heading section-heading--split reveal-up">
          <div>
            <p className="eyebrow">Canais</p>
            <h2>Encontre o melhor ponto de partida.</h2>
          </div>
          <p>Sem formulário perdido no vazio: cada link leva direto ao lugar onde a conversa realmente acontece.</p>
        </div>

        <div className="contact-channels__grid stagger">
          {channels.map(({ href, label, value, description, icon: Icon, tone }) => (
            <a
              className={`contact-channel-card contact-channel-card--${tone}`}
              href={href}
              key={label}
              rel="noreferrer"
              target="_blank"
            >
              <div className="contact-channel-card__icon"><Icon size={24} /></div>
              <ArrowUpRight className="contact-channel-card__arrow" size={20} />
              <span>{label}</span>
              <strong>{value}</strong>
              <p>{description}</p>
            </a>
          ))}
        </div>
      </section>

      <section className="contact-guide section reveal-up">
        <div className="contact-guide__intro">
          <div className="contact-guide__icon"><MessageCircle size={26} /></div>
          <p className="eyebrow">Antes de escrever</p>
          <h2>Uma pequena bússola para sua mensagem.</h2>
          <p>Não precisa ser formal. Contexto, intenção e curiosidade já são um ótimo começo.</p>
        </div>
        <div className="contact-guide__list">
          {conversationPaths.map((path) => (
            <article key={path.number}>
              <span>{path.number}</span>
              <div>
                <h3>{path.title}</h3>
                <p>{path.text}</p>
              </div>
              <strong>{path.channel}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="contact-closing reveal-scale">
        <Sparkles size={26} />
        <div>
          <p className="eyebrow">Do outro lado da tela</p>
          <h2>Mensagens com contexto recebem respostas melhores.</h2>
        </div>
        <p>Conte de onde veio, o que chamou sua atenção e o que você gostaria de construir ou descobrir.</p>
      </section>
    </div>
  );
}
