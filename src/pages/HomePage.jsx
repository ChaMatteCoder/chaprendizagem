import {
  ArrowRight,
  Beaker,
  BookOpen,
  Boxes,
  BrainCircuit,
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
  FunctionSquare,
  Flower2,
  MonitorUp,
  Network,
  PenLine,
  Sigma,
  Sparkles,
  TerminalSquare,
} from 'lucide-react';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import adalineBaseCover from '../assets/Adaline-BaseB2.png';
import functionalApproximationCover from '../assets/Aproximação-funcional-com-MLP.png';
import perceptronCover from '../assets/Perceptron-Reconhecimento.png';
import adalineRegressionCover from '../assets/Regressão-Linear-com-Adaline.png';
import handwritingRecognitionCover from '../assets/Reconhecimento-Manuscrito-com-MLP.png';
import irisClassificationCover from '../assets/Iris-Classification.png';
import kmeansCover from '../assets/k-means.png';
import ProjectCard from '../components/ProjectCard.jsx';
import StudyStepCard from '../components/StudyStepCard.jsx';

const projects = [
  {
    title: 'Perceptron - Reconhecimento de Dígitos',
    status: 'Publicado',
    description: 'Classificação de dígitos de 0 a 9 representados por matrizes 5x4.',
    visual: 'P',
    cover: perceptronCover,
    to: '/perceptron/modelo',
    featured: true,
  },
  {
    title: 'Adaline - Base B2',
    status: 'Publicado',
    description: 'Treinamento de uma rede Adaline, curva de erro quadrático e teste da classificação.',
    visual: 'A',
    cover: adalineBaseCover,
    to: '/adaline',
    featured: true,
  },
  {
    title: 'Adaline - Regressão Linear',
    status: 'Publicado',
    description: 'Ajuste de reta com Adaline, regressão clássica, Pearson, R² e comentários automáticos.',
    visual: 'R',
    cover: adalineRegressionCover,
    to: '/adaline/regressao',
    featured: true,
  },
  {
    title: 'Aproximação Funcional com MLP',
    status: 'Publicado',
    description: 'MLP treinada para aproximar uma função a partir de pontos amostrados, com curva, erro e base editável.',
    visual: '07',
    cover: functionalApproximationCover,
    to: '/aproximacao-funcional',
    featured: true,
  },
  {
    title: 'Reconhecimento Manuscrito com MLP',
    status: 'Publicado',
    description: 'Lousa, upload, pré-processamento 28×28, MLP TensorFlow.js e probabilidades para dígitos e letras.',
    visual: '08',
    cover: handwritingRecognitionCover,
    to: '/mlp/reconhecimento-manuscrito',
    featured: true,
  },
  {
    title: 'Classificação Iris Dataset com MLP',
    status: 'Publicado',
    description: 'MLP para classificar espécies de flores Iris a partir de medidas de sépalas e pétalas.',
    visual: '09',
    cover: irisClassificationCover,
    to: '/mlp/classificacao-iris',
    featured: true,
  },
  {
    title: 'Trabalho 10 — K-Means clássico',
    status: 'Publicado',
    description: 'Ciclo de Lloyd, movimentação dos centroides, EQT por iteração e análise da escolha de K.',
    visual: 'K10',
    cover: kmeansCover,
    to: '/kmeans',
    featured: true,
  },
  {
    title: 'Trabalho 11 — K-Means++',
    status: 'Novo laboratório',
    description: 'Compare K-Means clássico, K-Means++ e MiniBatchKMeans com EQT, dados editáveis e execução passo a passo.',
    visual: 'K++',
    to: '/kmeans/plusplus',
    featured: true,
  },
  {
    title: 'Reconhecimento de Letras',
    status: 'Em breve',
    description: 'Generalizar representações matriciais para padrões de letras maiúsculas.',
    visual: 'L',
  },
  {
    title: 'Símbolos',
    status: 'Em breve',
    description: 'Classificar padrões simples como sinais matemáticos e símbolos discretos.',
    visual: 'Σ',
  },
  {
    title: 'Operações Simples',
    status: 'Em breve',
    description: 'Investigar composições de neurônios em problemas elementares.',
    visual: '+',
  },
];

export default function HomePage() {
  const carouselRef = useRef(null);

  function scrollProjects(direction) {
    carouselRef.current?.scrollBy({
      left: direction * 420,
      behavior: 'smooth',
    });
  }

  return (
    <div className="page">
      <section className="home-hero">
        <div className="hero-copy">
          <p className="eyebrow reveal-up hero-sequence hero-sequence--badge">Teoria - Experimentos - Código</p>
          <h1 className="reveal-up hero-sequence hero-sequence--title">Aprendizagem de máquina em movimento.</h1>
          <p className="reveal-up hero-sequence hero-sequence--text">
            Um laboratório visual para estudar modelos, testar hipóteses, acompanhar resultados e transformar cada
            conceito em uma experiência navegável.
          </p>
          <div className="hero-actions reveal-scale hero-sequence hero-sequence--actions">
            <a className="button button--primary" href="#projetos">
              Ver projetos <ArrowRight size={18} />
            </a>
            <Link className="button button--ghost" to="/sobre">
              Conhecer o projeto <BookOpen size={18} />
            </Link>
          </div>
        </div>

        <div className="ml-scene reveal-right hero-sequence hero-sequence--visual" aria-label="Cena animada de aprendizagem de máquina">
          <div className="ml-scene__grid" />
          <span className="ml-node ml-node--input">x</span>
          <span className="ml-node ml-node--hidden">w</span>
          <span className="ml-node ml-node--output">ŷ</span>
          <div className="ml-pulse ml-pulse--one" />
          <div className="ml-pulse ml-pulse--two" />
          <svg viewBox="0 0 520 360" role="img" aria-label="Conexões entre entradas, pesos e saída">
            <path d="M88 174 C180 70 278 80 390 142" />
            <path d="M94 206 C190 270 292 280 404 214" />
            <path d="M244 118 C274 168 296 190 338 202" />
          </svg>
        </div>
      </section>

      <section className="section reveal-up" id="projetos">
        <div className="section-heading section-heading--with-actions">
          <div>
            <p className="eyebrow">Projetos em destaque</p>
            <h2>Um catálogo em expansão.</h2>
          </div>
          <div className="carousel-actions">
            <button className="icon-button" onClick={() => scrollProjects(-1)} title="Projeto anterior" type="button">
              <ChevronLeft size={20} />
            </button>
            <button className="icon-button" onClick={() => scrollProjects(1)} title="Próximo projeto" type="button">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
        <div className="projects-carousel stagger" ref={carouselRef}>
          {projects.map((project) => (
            <ProjectCard key={project.title} {...project} />
          ))}
        </div>
      </section>

      <section className="section reveal-up">
        <div className="section-heading">
          <p className="eyebrow">Como estudar aqui</p>
          <h2>Um fluxo simples para sair da teoria e chegar no experimento.</h2>
        </div>
        <div className="study-path stagger">
          <StudyStepCard
            number="1"
            icon={BookOpen}
            title="Leia a base"
            description="Comece pela intuição do modelo, principais equações e hipóteses."
          />
          <StudyStepCard
            number="2"
            icon={MonitorUp}
            title="Interaja com o modelo"
            description="Altere entradas, parâmetros e observe como a resposta muda."
          />
          <StudyStepCard
            number="3"
            icon={ChartNoAxesCombined}
            title="Compare resultados"
            description="Use gráficos e métricas para entender convergência, erro e acerto."
          />
          <StudyStepCard
            number="4"
            icon={TerminalSquare}
            title="Leia o código"
            description="Conecte a visualização com a implementação por trás do experimento."
          />
        </div>
      </section>

      <section className="section reveal-up" id="modulos">
        <div className="section-heading">
          <p className="eyebrow">Módulos</p>
          <h2>Os assuntos já organizados no laboratório.</h2>
        </div>
        <div className="module-grid stagger">
          <Link className="module-card" to="/perceptron/modelo">
            <Sigma size={34} />
            <span>Módulo 01</span>
            <h3>Perceptron</h3>
            <p>Classificador linear com entradas binárias e estratégia um-contra-todos.</p>
            <ArrowRight size={18} />
          </Link>
          <Link className="module-card module-card--active" to="/adaline">
            <Network size={34} />
            <span>Módulo 02</span>
            <h3>Adaline</h3>
            <p>Treinamento por erro quadrático com dados B2 e fronteira de decisão.</p>
            <ArrowRight size={18} />
          </Link>
          <Link className="module-card module-card--active module-card--mlp" to="/mlp">
            <BrainCircuit size={34} />
            <span>Módulo 03</span>
            <h3>MLP - Redes Neurais Multicamadas</h3>
            <p>Três experimentos reunidos em uma trilha de regressão, imagens vetorizadas e classificação tabular.</p>
            <div className="module-card__subitems" aria-hidden="true">
              <small>
                <FunctionSquare size={14} /> Aproximação funcional
              </small>
              <small>
                <PenLine size={14} /> Reconhecimento manuscrito
              </small>
              <small>
                <Flower2 size={14} /> Classificação Iris
              </small>
            </div>
            <ArrowRight size={18} />
          </Link>
          <Link className="module-card module-card--active module-card--kmeans" to="/kmeans/hub">
            <Boxes size={34} />
            <span>Módulo 04</span>
            <h3>K-Means</h3>
            <p>Uma família com dois trabalhos independentes sobre agrupamento, inicialização, convergência e escala.</p>
            <div className="module-card__subitems" aria-hidden="true">
              <small>
                <Boxes size={14} /> Trabalho 10 · K-Means clássico
              </small>
              <small>
                <Sparkles size={14} /> Trabalho 11 · K-Means++
              </small>
            </div>
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <section className="cta-band reveal-scale">
        <Beaker size={34} />
        <div>
          <h2>Pronto para comparar duas formas de começar?</h2>
          <p>O Trabalho 11 revela como a semeadura K-Means++ muda a trajetória e leva o experimento até grandes bases.</p>
        </div>
        <Link className="button button--primary" to="/kmeans/plusplus">
          Abrir K-Means++ <Sparkles size={18} />
        </Link>
      </section>
    </div>
  );
}
