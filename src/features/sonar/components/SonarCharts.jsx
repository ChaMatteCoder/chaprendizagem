import { useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartNoAxesColumnIncreasing } from 'lucide-react';
import { formatSonarNumber as number } from '../lib/math/sonarMath.js';

export function EnergyChart({ sample }) {
  const data = sample.features.map((energy, index) => ({ index: index + 1, energy }));
  return <>
    <div className="sonarlab-chart" role="img" aria-label={`Perfil de energia de ${sample.id}, 60 atributos de zero a um. Os valores estão na tabela abaixo.`}>
      <ResponsiveContainer width="100%" height={260} minWidth={0}>
        <LineChart data={data} margin={{ top: 12, right: 16, bottom: 28, left: 4 }}>
          <CartesianGrid stroke="#d9e3e2" strokeDasharray="3 3" />
          <XAxis dataKey="index" ticks={[1, 10, 20, 30, 40, 50, 60]} tick={{ fontSize: 11 }} label={{ value: 'Índice do atributo', position: 'bottom', offset: 8, fill: '#244959' }} />
          <YAxis domain={[0, 1]} width={36} ticks={[0, 0.5, 1]} tick={{ fontSize: 11 }} tickFormatter={value => number(value, 1)} />
          <Tooltip labelFormatter={value => `Atributo ${value}`} formatter={value => [number(value, 6), 'Energia normalizada']} />
          <Line dataKey="energy" type="linear" stroke="#008d92" strokeWidth={2.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
      <span className="sonarlab-axis-note">Eixo Y: Energia normalizada</span>
    </div>
    <details className="sonarlab-details"><summary>Consultar os 60 valores do perfil</summary>
      <div className="sonarlab-table-scroll" tabIndex={0} role="region" aria-label="Tabela com rolagem horizontal"><table><caption>Atributos originais de {sample.id}</caption><thead><tr><th>Índice do atributo</th><th>Energia normalizada</th></tr></thead>
        <tbody>{data.map(row => <tr key={row.index}><th scope="row">{row.index}</th><td>{number(row.energy, 6)}</td></tr>)}</tbody></table></div>
    </details>
  </>;
}

export function TrainingChart({ training }) {
  const [metric, setMetric] = useState('loss');
  const accuracy = metric === 'accuracy';
  return <article className="sonarlab-panel">
    <h2><ChartNoAxesColumnIncreasing /> Aprendizado por época</h2>
    <div className="sonarlab-chart-toolbar"><div className="sonarlab-segment" aria-label="Métrica das curvas">
      <button type="button" aria-pressed={!accuracy} onClick={() => setMetric('loss')}>Perda</button>
      <button type="button" aria-pressed={accuracy} onClick={() => setMetric('accuracy')}>Acurácia</button>
    </div><span className="sonarlab-legend"><i /> Treino <i className="is-validation" /> Validação</span></div>
    {training.history.length ? <>
      <div className="sonarlab-chart" role="img" aria-label={`Curvas reais de ${accuracy ? 'acurácia' : 'perda'}, ${training.history.length} épocas registradas. Consulte a tabela para os valores.`}>
        <ResponsiveContainer width="100%" height={235} minWidth={0}>
          <LineChart data={training.history} margin={{ top: 12, right: 15, bottom: 24, left: 0 }}>
            <CartesianGrid stroke="#d9e3e2" strokeDasharray="3 3" />
            <XAxis dataKey="epoch" tick={{ fontSize: 11 }} label={{ value: 'Época', position: 'bottom', offset: 6 }} />
            <YAxis width={43} domain={accuracy ? [0, 1] : [0, 'auto']} tick={{ fontSize: 11 }} tickFormatter={value => accuracy ? `${Math.round(value * 100)}%` : number(value, 2)} />
            <Tooltip labelFormatter={value => `Época ${value}`} formatter={(value, name) => [accuracy ? `${number(value * 100, 2)}%` : number(value, 6), name]} />
            <Line name="Treino" type="linear" dataKey={metric} stroke="#008d92" strokeWidth={2.5} dot={training.history.length === 1} isAnimationActive={false} />
            <Line name="Validação" type="linear" dataKey={accuracy ? 'valAccuracy' : 'valLoss'} stroke="#c04b39" strokeDasharray="5 3" strokeWidth={2} dot={training.history.length === 1} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="sonarlab-caption">Logs reais do experimento · {training.history.length} épocas{training.status === 'cancelled' ? ' · treino interrompido' : ''}</p>
      <details className="sonarlab-details"><summary>Ver tabela de épocas</summary><div className="sonarlab-table-scroll" tabIndex={0} role="region" aria-label="Tabela com rolagem horizontal"><table><caption>Histórico experimental real</caption>
        <thead><tr><th>Época</th><th>Perda treino</th><th>Perda validação</th><th>Acurácia treino</th><th>Acurácia validação</th></tr></thead>
        <tbody>{training.history.map(row => <tr key={row.epoch}><th scope="row">{row.epoch}</th><td>{number(row.loss)}</td><td>{number(row.valLoss)}</td><td>{number(row.accuracy * 100, 2)}%</td><td>{number(row.valAccuracy * 100, 2)}%</td></tr>)}</tbody>
      </table></div></details>
    </> : <div className="sonarlab-empty"><ChartNoAxesColumnIncreasing size={36} /><strong>Seu experimento começa aqui</strong><p>Inicie um treino para acompanhar a perda e a acurácia. Cada ponto virá de uma época real.</p></div>}
  </article>;
}
