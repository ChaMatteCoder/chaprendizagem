import PixelGridPreview from './PixelGridPreview.jsx';
import VectorPreview from './VectorPreview.jsx';

function formatMetric(value, digits = 4) {
  return Number.isFinite(value) ? value.toFixed(digits) : '-';
}

export default function PreprocessingPipeline({ processed }) {
  const stats = processed?.stats;
  const bounds = processed?.bounds;

  return (
    <section className="wide-panel reveal-up">
      <div className="section-heading">
        <p className="eyebrow">Pipeline visual</p>
        <h2>Imagem {'->'} pixels {'->'} vetor {'->'} MLP {'->'} classe.</h2>
        <p>
          O caractere é convertido para escala de cinza, recortado pela região útil, centralizado por massa visual,
          redimensionado para 28×28 e normalizado no padrão MNIST.
        </p>
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
          <span>MNIST 28x28</span>
          {processed?.processedDataUrl ? <img className="pixelated" alt="Caractere processado" src={processed.processedDataUrl} /> : <div />}
        </article>
      </div>
      <div className="pipeline-diagnostics">
        <article>
          <span>Bounding box</span>
          <strong>{bounds ? `${bounds.width}x${bounds.height}` : '-'}</strong>
          <small>{bounds ? `x=${bounds.minX}, y=${bounds.minY}` : 'Aguardando imagem'}</small>
        </article>
        <article>
          <span>Pixel minimo</span>
          <strong>{formatMetric(stats?.min)}</strong>
          <small>Fundo deve ficar perto de 0</small>
        </article>
        <article>
          <span>Pixel maximo</span>
          <strong>{formatMetric(stats?.max)}</strong>
          <small>Traco deve ficar perto de 1</small>
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
      <div className="pipeline-grid pipeline-grid--vector">
        <VectorPreview vector={processed?.vector ?? []} />
      </div>
      <PixelGridPreview pixels={processed?.pixels ?? []} />
    </section>
  );
}
