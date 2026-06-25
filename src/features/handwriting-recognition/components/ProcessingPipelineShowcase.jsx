import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import PixelGridPreview from './PixelGridPreview.jsx';
import VectorPreview from './VectorPreview.jsx';

const steps = [
  {
    title: 'Entrada original',
    description: 'A imagem desenhada ou enviada é capturada como uma imagem digital.',
  },
  {
    title: 'Bounding box',
    description: 'O sistema identifica a região onde existe traço ativo.',
  },
  {
    title: 'Recorte e centralização',
    description: 'O caractere recebe margem, é recortado e centralizado pela massa visual do traço.',
  },
  {
    title: 'MNIST 28×28',
    description: 'O caractere é redimensionado para o mesmo formato esperado pelo MNIST.',
  },
  {
    title: 'Normalização',
    description: 'O fundo fica próximo de 0 e o traço do dígito fica próximo de 1.',
  },
  {
    title: 'Vetor 784',
    description: 'A matriz 28×28 é achatada em 784 valores numéricos.',
  },
  {
    title: 'Predição da MLP',
    description: 'A MLP calcula uma distribuição de probabilidade para as classes.',
  },
];

function formatMetric(value, digits = 4) {
  return Number.isFinite(value) ? value.toFixed(digits) : '-';
}

function getStepStatus(playback, index) {
  if (playback.completedSteps?.includes(index)) return 'done';
  if (playback.isPlaying && playback.currentStep === index) return 'active';
  return 'waiting';
}

function StepIcon({ status }) {
  if (status === 'done') return <CheckCircle2 size={18} />;
  if (status === 'active') return <Loader2 className="pipeline-step-spinner" size={18} />;
  return <Circle size={18} />;
}

export default function ProcessingPipelineShowcase({ hasPrediction = false, onShowPrediction, playback, processed }) {
  const stats = processed?.stats;
  const bounds = processed?.bounds;
  const isComplete = Boolean(processed) && !playback.isPlaying && playback.completedSteps?.length >= steps.length;

  return (
    <section className="wide-panel reveal-up" id="pipeline-section">
      <div className="section-heading section-heading--with-actions">
        <div>
          <p className="eyebrow">Pipeline visual</p>
          <h2>Imagem → pixels → vetor → MLP → classe.</h2>
          <p>
            Acompanhe a transformação do desenho até o vetor de 784 posições usado pela rede neural.
          </p>
        </div>
        {isComplete && hasPrediction ? (
          <button className="button button--primary" onClick={onShowPrediction} type="button">
            Ver predição
          </button>
        ) : null}
      </div>

      {isComplete && !hasPrediction ? (
        <div className="pipeline-empty-prediction">
          A imagem foi processada, mas ainda não há uma predição disponível. Treine a MLP didática no modo atual ou use
          um modo com modelo pré-treinado carregado.
        </div>
      ) : null}

      <div className="pipeline-cinema">
        {steps.map((step, index) => {
          const status = getStepStatus(playback, index);
          return (
            <article className={`pipeline-step-card pipeline-step-card--${status}`} key={step.title}>
              <span className="pipeline-step-card__icon">
                <StepIcon status={status} />
              </span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            </article>
          );
        })}
      </div>

      <div className="pipeline-grid">
        <article className="pipeline-preview-card">
          <span>Original</span>
          {processed?.originalDataUrl ? <img alt="Imagem original" src={processed.originalDataUrl} /> : <div />}
        </article>
        <article className="pipeline-preview-card">
          <span>Bounding box</span>
          {processed?.boundingBoxDataUrl ? <img alt="Bounding box detectado" src={processed.boundingBoxDataUrl} /> : <div />}
        </article>
        <article className="pipeline-preview-card">
          <span>Recorte</span>
          {processed?.cropDataUrl ? <img alt="Imagem recortada" src={processed.cropDataUrl} /> : <div />}
        </article>
        <article className="pipeline-preview-card">
          <span>MNIST 28×28</span>
          {processed?.processedDataUrl ? (
            <img className="pixelated" alt="Caractere processado em 28 por 28" src={processed.processedDataUrl} />
          ) : (
            <div />
          )}
        </article>
      </div>

      <div className="pipeline-diagnostics">
        <article>
          <span>Bounding box</span>
          <strong>{bounds ? `${bounds.width}×${bounds.height}` : '-'}</strong>
          <small>{bounds ? `x=${bounds.minX}, y=${bounds.minY}` : 'Aguardando imagem'}</small>
        </article>
        <article>
          <span>Pixel mínimo</span>
          <strong>{formatMetric(stats?.min)}</strong>
          <small>Fundo deve ficar perto de 0</small>
        </article>
        <article>
          <span>Pixel máximo</span>
          <strong>{formatMetric(stats?.max)}</strong>
          <small>Traço deve ficar perto de 1</small>
        </article>
        <article>
          <span>Média</span>
          <strong>{formatMetric(stats?.mean)}</strong>
          <small>Resumo do vetor 784</small>
        </article>
        <article>
          <span>Pixels ativos</span>
          <strong>{stats?.activePixels ?? 0}</strong>
          <small>Valores acima de 0.12</small>
        </article>
      </div>

      <div className="vector-lab-grid">
        <article className="vector-lab-card">
          <div className="panel-heading">
            <div>
              <h3>Pixel grid 28×28</h3>
              <p>Grade real enviada para a MLP. Pixels claros carregam maior intensidade.</p>
            </div>
          </div>
          <PixelGridPreview pixels={processed?.pixels ?? []} />
        </article>
        <VectorPreview stats={stats} vector={processed?.vector ?? []} />
      </div>
    </section>
  );
}
