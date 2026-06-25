import { AlertTriangle } from 'lucide-react';

export default function MisclassificationInsights({ mode = 'digits', prediction, warnings = [] }) {
  const lowConfidence = prediction && prediction.confidence < 0.72;

  return (
    <article className="wide-panel insights-panel">
      <div className="section-heading">
        <p className="eyebrow">Por que o modelo errou?</p>
        <h2>Erros geralmente aparecem antes na imagem do que na fórmula.</h2>
      </div>
      <div className="insight-list">
        {lowConfidence ? (
          <p><AlertTriangle size={18} /> A confiança ficou baixa; a rede encontrou classes parecidas competindo entre si.</p>
        ) : null}
        {warnings.map((warning) => (
          <p key={warning}><AlertTriangle size={18} /> {warning}</p>
        ))}
        {mode === 'all' ? (
          <p>
            No modo Todos, a rede precisa escolher entre números e letras. Símbolos parecidos, como 0/O, 1/I, 5/S, 2/Z e
            8/B, tornam o problema mais difícil do que reconhecer apenas dígitos.
          </p>
        ) : null}
        <p>Caracteres descentralizados perdem informação quando são recortados e redimensionados.</p>
        <p>Traços muito finos podem sumir no 28×28; traços grossos demais podem colar regiões diferentes.</p>
        <p>Letras e números parecidos, como O/0, I/1, S/5 e Z/2, tendem a gerar probabilidades próximas.</p>
        <p>A escrita do usuário pode ser diferente dos exemplos usados no treinamento didático.</p>
      </div>
    </article>
  );
}
