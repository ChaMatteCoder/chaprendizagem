import { BookOpen, Compass, GraduationCap, Sparkles } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="page">
      <section className="page-hero">
        <div>
          <p className="eyebrow">Sobre</p>
          <h1>A história do Chaprendizagem.</h1>
          <p>
            O site nasceu como um espaço para transformar estudos de aprendizagem de máquina em páginas claras,
            interativas e apresentáveis.
          </p>
        </div>
        <div className="about-panel">
          <Compass size={38} />
          <h2>Aprender construindo.</h2>
          <p>
            Cada módulo une teoria, implementação, experimentos e resultados, criando um registro visual da evolução
            dos estudos.
          </p>
        </div>
      </section>

      <section className="steps-grid reveal">
        <article className="learning-card">
          <BookOpen size={28} />
          <h3>Motivação</h3>
          <p>Organizar conteúdos de forma mais viva do que anotações soltas ou notebooks isolados.</p>
        </article>
        <article className="learning-card">
          <GraduationCap size={28} />
          <h3>Método</h3>
          <p>Partir de um conceito, implementar o algoritmo e registrar os resultados com visualização.</p>
        </article>
        <article className="learning-card">
          <Sparkles size={28} />
          <h3>Portfólio</h3>
          <p>Construir um projeto que demonstre raciocínio técnico, cuidado visual e evolução contínua.</p>
        </article>
      </section>
    </div>
  );
}
