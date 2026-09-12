import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { createConfusionMatrixPng, formatMetric, getConfusionMatrixData, matrixCellColor } from '../lib/confusionMatrixExport.js';

export default function ModelPerformance() {
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [exportError, setExportError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/models/iadivinha/metrics.json', { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(value => {
        if (value.smoke !== false || !value.models?.cnn?.test || !value.models?.mlp?.test) throw new Error();
        getConfusionMatrixData(value);
        if (!controller.signal.aborted) setMetrics(value);
      }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [attempt]);
  if (error) return <div role="alert"><p>Não foi possível carregar as métricas.</p><button type="button" className="iad-secondary" onClick={() => { setError(false); setAttempt(value => value + 1); }}>Tentar novamente</button></div>;
  if (!metrics) return <p role="status">Carregando os resultados do experimento…</p>;
  const { model, labels, matrix, samples, accuracy } = getConfusionMatrixData(metrics);
  const max = Math.max(...matrix.flat());
  return <div className="iad-performance">
    <p>Antes de entrar no jogo, a IA foi avaliada com {samples.toLocaleString('pt-BR')} desenhos do Quick, Draw! que não usou para aprender.</p>
    <p className="iad-performance-highlight"><strong>{formatMetric(accuracy)}</strong><span>de acertos nesse teste, entre as oito figuras do jogo</span></p>
    <table><caption>Comparação dos modelos no teste</caption><thead><tr><th scope="col">Modelo</th><th scope="col">Acurácia</th><th scope="col">F1 macro</th></tr></thead><tbody>
      {Object.entries(metrics.models).map(([name, entry]) => <tr key={name}><th scope="row">{name.toUpperCase()}{name === model ? ' · em uso' : ''}</th><td>{formatMetric(entry.test.accuracy)}</td><td>{formatMetric(entry.test.macro_f1)}</td></tr>)}
    </tbody></table>
    <p>Acurácia é a proporção de acertos. F1 macro combina precisão e recuperação, dando o mesmo peso a cada figura. MLP e CNN são dois tipos de rede neural que comparamos.</p>
    <h3>Onde ela acerta e se confunde</h3>
    <p>Escolha uma figura na linha e veja os palpites nas colunas. Os números na diagonal são acertos; os demais mostram confusões entre figuras.</p>
    <div className="iad-matrix-scroll" tabIndex={0} role="region" aria-label="Matriz de confusão. Role horizontalmente para ver todas as figuras."><table><caption>Matriz de confusão · {model.toUpperCase()} · quantidade de desenhos</caption><thead><tr><th scope="col">Real ↓ / Palpite →</th>{labels.map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{matrix.map((row, index) => <tr key={labels[index]}><th scope="row">{labels[index]}</th>{row.map((count, column) => <td key={column} className={index === column ? 'iad-matrix-correct' : undefined} style={{ backgroundColor: matrixCellColor(count, max), color: count / max > 0.6 ? '#fff' : '#172a2d' }}>{count}</td>)}</tr>)}</tbody></table></div>
    <div className="iad-performance-downloads">
      <a className="iad-secondary" href="data:," download={`iadivinha-matriz-confusao-${model}.png`} onClick={event => {
        try { event.currentTarget.href = createConfusionMatrixPng(metrics); setExportError(false); }
        catch { event.preventDefault(); setExportError(true); }
      }}><Download size={20} aria-hidden="true" />Baixar matriz em PNG</a>
      <a href="/models/iadivinha/metrics.json" download>Baixar dados (JSON)</a>
    </div>
    {exportError && <p role="alert">Não foi possível criar a imagem. Tente baixar novamente ou use os dados em JSON.</p>}
    <p className="iad-performance-note">A imagem inclui todas as figuras, os valores e a identificação do teste, em alta resolução para o seu relatório.</p>
    <details className="iad-performance-method"><summary>Sobre a avaliação</summary>
      <p>O modelo {model.toUpperCase()} foi escolhido pelo F1 macro em um conjunto de validação. O teste apresentado aqui ficou separado e não participou dessa escolha.</p>
      <p>Esses resultados avaliam a IA, não sua habilidade de desenhar. Os rabiscos feitos no jogo podem ser diferentes dos desenhos do teste, por isso a taxa de acertos durante as partidas pode mudar.</p>
    </details>
  </div>;
}
