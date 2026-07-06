import { Database, RefreshCcw, Upload } from 'lucide-react';

export default function KMeansDatasetEditor({ value, onChange, onApply, onRestore, errors, pointCount }) {
  return (
    <section className="kmeans-dataset-card">
      <div className="kmeans-dataset-card__intro">
        <span><Database size={24} /></span>
        <div><p className="eyebrow">Etapa 2 de 3 · Editor de dados</p><h2>Prepare as observações.</h2><p>Use um par <code>x y</code> por linha. Espaços, vírgulas e ponto e vírgula são aceitos como separadores.</p></div>
      </div>
      <div className="kmeans-dataset-card__editor">
        <label htmlFor="kmeans-dataset-input">Coordenadas ({pointCount} pontos aplicados)</label>
        <textarea aria-describedby={errors.length ? 'kmeans-dataset-errors' : undefined} id="kmeans-dataset-input" onChange={(event) => onChange(event.target.value)} spellCheck="false" value={value} />
        {errors.length ? <div className="kmeans-form-error" id="kmeans-dataset-errors" role="alert">{errors.slice(0, 4).map((error) => <span key={error}>{error}</span>)}</div> : null}
        <div className="kmeans-dataset-card__actions">
          <button className="button button--primary" onClick={onApply} type="button"><Upload size={17} /> Aplicar dados</button>
          <button className="button button--ghost" onClick={onRestore} type="button"><RefreshCcw size={17} /> Restaurar base original</button>
        </div>
      </div>
    </section>
  );
}
