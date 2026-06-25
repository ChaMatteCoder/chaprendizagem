import { useState } from 'react';

export default function VectorPreview({ stats, vector = [] }) {
  const [sampleOpen, setSampleOpen] = useState(false);
  const activePixels = stats?.activePixels ?? vector.filter((value) => value > 0.12).length;
  const average = stats?.mean ?? (vector.length ? vector.reduce((sum, value) => sum + value, 0) / vector.length : 0);
  const min = stats?.min ?? Math.min(0, ...vector);
  const max = stats?.max ?? Math.max(0, ...vector);

  return (
    <article className="vector-preview">
      <h3>Vetor de entrada</h3>
      <p>
        A imagem 28×28 foi transformada em um vetor com <strong>784 posições</strong>. Cada posição representa a
        intensidade de um pixel normalizado entre 0 e 1.
      </p>
      <div className="vector-strip">
        {vector.slice(0, 80).map((value, index) => (
          <span key={index} style={{ opacity: 0.2 + value * 0.8 }} />
        ))}
      </div>
      <dl>
        <div>
          <dt>Dimensão</dt>
          <dd>784</dd>
        </div>
        <div>
          <dt>Pixel mínimo</dt>
          <dd>{Number.isFinite(min) ? min.toFixed(4) : '-'}</dd>
        </div>
        <div>
          <dt>Pixel máximo</dt>
          <dd>{Number.isFinite(max) ? max.toFixed(4) : '-'}</dd>
        </div>
        <div>
          <dt>Média</dt>
          <dd>{average.toFixed(4)}</dd>
        </div>
        <div>
          <dt>Pixels ativos</dt>
          <dd>{activePixels}</dd>
        </div>
        <div>
          <dt>Threshold ativo</dt>
          <dd>0.12</dd>
        </div>
      </dl>
      <button className="vector-sample-button" onClick={() => setSampleOpen((current) => !current)} type="button">
        {sampleOpen ? 'Ocultar amostra do vetor' : 'Ver amostra do vetor'}
      </button>
      {sampleOpen ? (
        <div className="vector-sample" aria-label="Amostra dos primeiros valores do vetor">
          {vector.slice(0, 56).map((value, index) => (
            <code key={index}>{value.toFixed(2)}</code>
          ))}
        </div>
      ) : null}
    </article>
  );
}
