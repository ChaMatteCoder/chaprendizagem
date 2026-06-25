import {
  ArrowRight,
  Binary,
  Brackets,
  Crosshair,
  Grid3X3,
  Image as ImageIcon,
  LocateFixed,
  ScanLine,
  SlidersHorizontal,
} from 'lucide-react';

const pipelineSteps = [
  {
    icon: ImageIcon,
    title: 'Captura',
    description: 'A entrada desenhada é convertida em imagem digital.',
    variant: 'entry',
  },
  {
    icon: ScanLine,
    title: 'Escala de cinza',
    description: 'A imagem é representada por intensidades de pixel.',
  },
  {
    icon: LocateFixed,
    title: 'Região útil',
    description: 'O sistema detecta onde existe traço relevante.',
  },
  {
    icon: Crosshair,
    title: 'Centralização',
    description: 'O caractere é reposicionado para reduzir deslocamentos.',
  },
  {
    icon: Grid3X3,
    title: '28x28',
    description: 'A imagem é redimensionada para o formato esperado pelo modelo.',
    variant: 'focus',
  },
  {
    icon: SlidersHorizontal,
    title: 'Normalização',
    description: 'Os pixels são ajustados para a faixa numérica entre 0 e 1.',
  },
  {
    icon: Binary,
    title: 'Vetor 784',
    description: 'A matriz 28x28 é achatada em 784 valores de entrada.',
    variant: 'output',
  },
];

export default function PipelineOverviewSection() {
  return (
    <section className="wide-panel pipeline-overview reveal-up">
      <div className="pipeline-overview__header">
        <div className="section-heading">
          <p className="eyebrow">Pipeline</p>
          <h2>Pipeline de pré-processamento</h2>
          <p>
            Antes de chegar à MLP, o caractere manuscrito passa por uma sequência de transformações que o tornam
            compatível com a entrada do modelo.
          </p>
        </div>
        <div className="pipeline-overview__endpoint" aria-hidden="true">
          <Brackets size={22} />
          <span>Entrada da MLP</span>
        </div>
      </div>

      <ol className="pipeline-overview__track" aria-label="Etapas do pré-processamento para entrada da MLP">
        {pipelineSteps.map((step, index) => {
          const Icon = step.icon;
          const isLast = index === pipelineSteps.length - 1;

          return (
            <li
              className={[
                'pipeline-overview__step',
                step.variant ? `pipeline-overview__step--${step.variant}` : '',
              ].filter(Boolean).join(' ')}
              key={step.title}
              style={{ '--step-index': index }}
            >
              <div className="pipeline-overview__step-card">
                <span className="pipeline-overview__step-number">{String(index + 1).padStart(2, '0')}</span>
                <span className="pipeline-overview__step-icon" aria-hidden="true">
                  <Icon size={22} />
                </span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
                {step.variant === 'output' ? <small>Entrada da MLP</small> : null}
              </div>
              {!isLast ? (
                <span className="pipeline-overview__connector" aria-hidden="true">
                  <ArrowRight size={18} />
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
