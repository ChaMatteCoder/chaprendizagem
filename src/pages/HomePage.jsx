import { ArrowRight, Beaker, BookOpen, BrainCircuit, MonitorUp, TerminalSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProjectCard from '../components/ProjectCard.jsx';
import StudyStepCard from '../components/StudyStepCard.jsx';
import MatrixGrid from '../features/perceptron/components/MatrixGrid.jsx';
import { digitMatrices, futureStudies } from '../features/perceptron/data/digits.js';

export default function HomePage() {
  return (
    <div className="page">
      <section className="hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">Teoria - Experimentos - Código</p>
          <h1>Laboratório de Aprendizagem de Máquina</h1>
          <p>
            Um espaço para organizar estudos, trabalhos acadêmicos e experimentos práticos, começando pelo
            reconhecimento de dígitos com Perceptron.
          </p>
          <div className="hero-actions">
            <Link className="button button--primary" to="/perceptron/modelo">
              Ver modelo funcional <ArrowRight size={18} />
            </Link>
            <Link className="button button--ghost" to="/perceptron/teoria">
              Base teórica <BookOpen size={18} />
            </Link>
          </div>
        </div>
        <div className="lab-board" aria-label="Resumo visual do projeto Perceptron">
          <div>
            <span>Matriz 5 x 4</span>
            <MatrixGrid matrix={digitMatrices[7]} compact />
          </div>
          <div className="perceptron-sketch">
            <span>Perceptron</span>
            <div className="nodes">
              <i />
              <i />
              <i />
              <b>Σ</b>
              <em>ŷ</em>
            </div>
          </div>
          <div className="mini-chart">
            <span>Erro por época</span>
            <svg viewBox="0 0 280 120" role="img" aria-label="Curva decrescente de erro">
              <polyline points="0,20 28,26 56,45 84,42 112,66 140,74 168,88 196,94 224,99 252,103 280,106" />
            </svg>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">Projetos em destaque</p>
          <h2>Do conceito à prática.</h2>
        </div>
        <div className="projects-grid">
          <ProjectCard
            featured
            title="Perceptron - Reconhecimento de Dígitos"
            status="Em destaque"
            description="Implementação inicial para classificar dígitos de 0 a 9 representados por matrizes 5x4."
          />
          {futureStudies.map((study) => (
            <ProjectCard key={study.title} {...study} />
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">Como estudar aqui</p>
          <h2>Um caminho claro para aprender.</h2>
        </div>
        <div className="steps-grid">
          <StudyStepCard
            number="1"
            icon={BookOpen}
            title="Entenda a teoria"
            description="Revise entradas, pesos, bias, soma ponderada e função degrau com exemplos visuais."
          />
          <StudyStepCard
            number="2"
            icon={MonitorUp}
            title="Visualize o modelo"
            description="Observe como a matriz vira vetor e como os perceptrons disputam a classificação."
          />
          <StudyStepCard
            number="3"
            icon={TerminalSquare}
            title="Teste o algoritmo"
            description="Altere padrões, carregue exemplos e acompanhe a resposta do modelo."
          />
        </div>
      </section>

      <section className="cta-band">
        <Beaker size={34} />
        <div>
          <h2>Primeiro módulo: Perceptron</h2>
          <p>Uma base pequena, mas pronta para crescer com novos estudos da disciplina.</p>
        </div>
        <Link className="button button--primary" to="/perceptron/resultados">
          Ver treinamento <BrainCircuit size={18} />
        </Link>
      </section>
    </div>
  );
}
