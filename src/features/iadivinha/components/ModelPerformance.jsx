import { useEffect, useState } from 'react';

const percent = value => (value * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '%';

export default function ModelPerformance() {
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/models/iadivinha/metrics.json', { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(value => {
        if (value.smoke !== false || !value.models?.cnn?.test || !value.models?.mlp?.test) throw new Error();
        if (!controller.signal.aborted) setMetrics(value);
      }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [attempt]);
  if (error) return <div role="alert"><p>Não foi possível carregar as métricas.</p><button type="button" className="iad-secondary" onClick={() => { setError(false); setAttempt(value => value + 1); }}>Tentar novamente</button></div>;
  if (!metrics) return <p role="status">Carregando os resultados do experimento…</p>;
  const selected = metrics.models[metrics.selection.model];
  return <div className="iad-performance">
    <p>Resultados no conjunto de teste Quick, Draw!: {selected.test.samples.toLocaleString('pt-BR')} desenhos separados do treinamento.</p>
    <table><caption>Comparação dos modelos no teste</caption><thead><tr><th scope="col">Modelo</th><th scope="col">Acurácia</th><th scope="col">F1 macro</th></tr></thead><tbody>
      {Object.entries(metrics.models).map(([name, model]) => <tr key={name}><th scope="row">{name.toUpperCase()}{name === metrics.selection.model ? ' · em uso' : ''}</th><td>{percent(model.test.accuracy)}</td><td>{percent(model.test.macro_f1)}</td></tr>)}
    </tbody></table>
    <p>O modelo {metrics.selection.model.toUpperCase()} foi escolhido pelo F1 macro na validação. O conjunto de teste não participou da escolha.</p>
    <div className="iad-matrix-scroll" tabIndex={0} role="region" aria-label="Matriz de confusão, role horizontalmente para ver todas as classes"><table><caption>Matriz de confusão de {metrics.selection.model.toUpperCase()}: linhas = classe real; colunas = previsão</caption><thead><tr><th scope="col">Real / previsão</th>{metrics.classes.map(item => <th scope="col" key={item.id}>{item.label}</th>)}</tr></thead><tbody>{selected.test.confusion_matrix.map((row, index) => <tr key={index}><th scope="row">{metrics.classes[index].label}</th>{row.map((count, column) => <td key={column}>{count}</td>)}</tr>)}</tbody></table></div>
    <p>Acurácia é a proporção de acertos. F1 macro dá o mesmo peso às oito classes ao combinar precisão e recuperação.</p>
    <p>Esses resultados não medem sua habilidade nem a acurácia de desenhos feitos neste jogo. A adaptação do canvas pode produzir pixels diferentes dos bitmaps de treino, e a IA pode errar.</p>
    <a href="/models/iadivinha/metrics.json" download>Baixar métricas do experimento (JSON)</a>
  </div>;
}
