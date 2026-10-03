import { Award, ShieldCheck } from 'lucide-react';
import { formatSonarNumber as number } from '../lib/math/sonarMath.js';

const pct = value => `${number(value * 100, 2)}%`;
export default function OfficialResults({ data }) {
  const { metrics, manifest, config } = data;
  const test = metrics.finalTest.metrics;
  return <div className="sonarlab-stack">
    <article className="sonarlab-panel"><h2><ShieldCheck /> Modelo oficial congelado</h2>
      <p><strong>{manifest.architecture.join(' → ')}</strong> · {manifest.parameterCount.toLocaleString('pt-BR')} parâmetros · Dense/ReLU → Softmax · classes Rocha/R, Metal/M.</p>
      <p>Adam, taxa {number(config.training.learningRate, 5)}, {config.training.epochs} épocas fixas, batch {config.training.batchSize}, seed final {config.finalSeed}. Treino final em {metrics.finalTraining.sampleCount} exemplos de desenvolvimento. Sem early stopping ou ajuste usando o teste.</p>
      <p className="sonarlab-caption">Identidade: <code>{manifest.modelId}</code> · avaliação concluída em {new Date(manifest.evaluation.completedAt).toLocaleString('pt-BR')}.</p>
      <a className="sonarlab-text-link" href="/models/sonar/official/manifest.json" target="_blank" rel="noreferrer">Consultar manifesto e hashes dos artefatos ↗</a>
    </article>
    <article className="sonarlab-panel"><h2><Award /> Seleção por validação cruzada</h2><p>Cinco folds somente nos 166 exemplos de desenvolvimento. Média ± desvio-padrão amostral; a dispersão não é um intervalo de confiança.</p>
      <div className="sonarlab-table-scroll" tabIndex={0} role="region" aria-label="Tabela com rolagem horizontal"><table><caption>Comparação registrada antes do teste final</caption><thead><tr><th>Arquitetura</th><th>Parâmetros</th><th>Macro-F1 média ± DP</th><th>Acurácia média ± DP</th></tr></thead>
        <tbody>{metrics.crossValidation.map(candidate => <tr key={candidate.id}><th scope="row">{[60, ...candidate.hiddenUnits, 2].join(' → ')}{candidate.role === 'baseline' ? ' · baseline linear' : ''}{candidate.id === metrics.selectedId ? ' · selecionada' : ''}</th>
          <td>{candidate.parameters}</td><td>{pct(candidate.macroF1.mean)} ± {number(candidate.macroF1.sampleStandardDeviation * 100, 2)} p.p.</td><td>{pct(candidate.accuracy.mean)} ± {number(candidate.accuracy.sampleStandardDeviation * 100, 2)} p.p.</td></tr>)}</tbody>
      </table></div>
      <p className="sonarlab-caption">Maior macro-F1 média entre MLPs. Empates até {number(config.selection.tieTolerance, 4)}: menos parâmetros, depois ordem registrada. A baseline é referência sem camada oculta.</p>
      <details className="sonarlab-details"><summary>Consultar resultados por fold</summary><div className="sonarlab-table-scroll" tabIndex={0} role="region" aria-label="Tabela com rolagem horizontal"><table><caption>Folds do desenvolvimento</caption><thead><tr><th>Candidato</th><th>Fold</th><th>Exemplos</th><th>Macro-F1</th><th>Acurácia</th></tr></thead><tbody>
        {metrics.crossValidation.flatMap(candidate => candidate.folds.map(fold => <tr key={`${candidate.id}-${fold.fold}`}><th scope="row">{candidate.id}</th><td>{fold.fold}</td><td>{fold.metrics.total}</td><td>{pct(fold.metrics.macroF1)}</td><td>{pct(fold.metrics.accuracy)}</td></tr>))}
      </tbody></table></div></details>
    </article>
    <article className="sonarlab-panel"><h2><ShieldCheck /> Teste final · avaliação única</h2>
      <div className="sonarlab-result-stats"><span><strong>{pct(test.accuracy)}</strong>Acurácia</span><span><strong>{pct(test.macroF1)}</strong>Macro-F1</span><span><strong>{test.correct}/{test.total}</strong>Acertos</span><span><strong>{number(test.crossEntropy, 6)}</strong>Cross-entropy</span></div>
      <p>Acurácia = acertos / total = {test.correct} / {test.total}. Os valores abaixo são lidos do registro congelado; abrir esta página não reavalia o teste.</p>
      <div className="sonarlab-results-grid"><div className="sonarlab-table-scroll" tabIndex={0} role="region" aria-label="Tabela com rolagem horizontal"><table className="sonarlab-confusion"><caption>Matriz de confusão · linhas verdadeiras, colunas previstas</caption><thead><tr><th>Verdadeiro ↓ / Previsto →</th><th>Rocha</th><th>Metal</th></tr></thead><tbody>
        {['Rocha', 'Metal'].map((name, i) => <tr key={name}><th scope="row">{name}</th>{test.confusionMatrix[i].map((count, j) => <td key={j} className={i === j ? 'is-correct' : ''}>{count}</td>)}</tr>)}
      </tbody></table></div>
      <div className="sonarlab-table-scroll" tabIndex={0} role="region" aria-label="Tabela com rolagem horizontal"><table><caption>Métricas por classe</caption><thead><tr><th>Classe</th><th>Suporte</th><th>Precisão</th><th>Recall</th><th>F1</th></tr></thead><tbody>
        {test.perClass.map(row => <tr key={row.label}><th scope="row">{row.label === 'R' ? 'Rocha' : 'Metal'}</th><td>{row.support}</td><td>{pct(row.precision)}</td><td>{pct(row.recall)}</td><td>{pct(row.f1)}{row.zeroDenominators.length ? ` · denominador zero: ${row.zeroDenominators.join(', ')}` : ''}</td></tr>)}
      </tbody></table></div></div>
      <p className="sonarlab-caption">Denominador zero: retornar 0 e identificar a métrica afetada; nenhum caso neste teste. Cross-entropy média em float32, com clipping da biblioteca.</p>
      <p className="sonarlab-note">Poucos dados: 42 exemplos no teste e 33/34 por fold. A divisão por linha não demonstra independência entre objetos e ângulos. As métricas não garantem desempenho em novas condições reais.</p>
    </article>
  </div>;
}
