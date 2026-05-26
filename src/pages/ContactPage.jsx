import { Github, Instagram, Mail, MapPin } from 'lucide-react';

const contacts = [
  { href: 'https://github.com/ChaMatteCoder', label: 'GitHub', value: 'ChaMatteCoder', icon: Github },
  { href: 'https://www.instagram.com/cha_matheus/', label: 'Instagram', value: '@cha_matheus', icon: Instagram },
  { href: 'https://x.com/ChaMatteh_', label: 'X', value: '@ChaMatteh_', icon: null },
];

export default function ContactPage() {
  return (
    <div className="page">
      <section className="page-hero">
        <div>
          <p className="eyebrow">Contato</p>
          <h1>Sobre mim e canais.</h1>
          <p>
            Sou Matheus, estudante e desenvolvedor em formação, usando este laboratório para estudar modelos, organizar
            experimentos e transformar aprendizado em projeto real.
          </p>
        </div>
        <div className="contact-card">
          <MapPin size={32} />
          <h2>Onde me encontrar</h2>
          <p>Links principais para acompanhar o projeto, trocar ideias ou ver outros trabalhos.</p>
        </div>
      </section>

      <section className="contact-grid reveal">
        {contacts.map((contact) => {
          const Icon = contact.icon;

          return (
            <a className="contact-link-card" href={contact.href} key={contact.label} rel="noreferrer" target="_blank">
              {Icon ? <Icon size={28} /> : <strong className="x-mark x-mark--large">X</strong>}
              <span>{contact.label}</span>
              <p>{contact.value}</p>
            </a>
          );
        })}
        <a className="contact-link-card" href="mailto:">
          <Mail size={28} />
          <span>Email</span>
          <p>Disponível sob demanda</p>
        </a>
      </section>
    </div>
  );
}
