import { Database, RefreshCcw, Upload } from 'lucide-react';

export default function KMeansDatasetEditor({
  value,
  onChange,
  onApply,
  onRestore,
  errors,
  pointCount,
  eyebrow = 'Etapa 2 de 3 · Editor de dados',
  title = 'Prepare as observações.',
  description = 'Use um par x y por linha. Espaços, vírgulas e ponto e vírgula são aceitos como separadores.',
  restoreLabel = 'Restaurar base original',
  textareaId = 'kmeans-dataset-input',
}) {
  const errorId = `${textareaId}-errors`;
  return (
    <section className="kmeans-dataset-card">
      <div className="kmeans-dataset-card__intro">
        <span><Database size={24} /></span>
        <div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p>{description}</p></div>
      </div>
      <div className="kmeans-dataset-card__editor">
        <label htmlFor={textareaId}>Coordenadas ({pointCount} pontos aplicados)</label>
        <textarea aria-describedby={errors.length ? errorId : undefined} id={textareaId} onChange={(event) => onChange(event.target.value)} spellCheck="false" value={value} />
        {errors.length ? <div className="kmeans-form-error" id={errorId} role="alert">{errors.slice(0, 4).map((error) => <span key={error}>{error}</span>)}</div> : null}
        <div className="kmeans-dataset-card__actions">
          <button className="button button--primary" onClick={onApply} type="button"><Upload size={17} /> Aplicar dados</button>
          <button className="button button--ghost" onClick={onRestore} type="button"><RefreshCcw size={17} /> {restoreLabel}</button>
        </div>
      </div>
    </section>
  );
}
