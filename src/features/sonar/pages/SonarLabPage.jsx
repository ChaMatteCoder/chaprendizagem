import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowLeft, BookOpen, Calculator, ChartNoAxesColumnIncreasing, Database, FlaskConical, House, Layers3, Search, ShieldCheck, Users } from 'lucide-react';
import useSonarLab from '../hooks/useSonarLab.js';
import useSonarMission from '../hooks/useSonarMission.js';
import MissionContextPanel from '../components/MissionContextPanel.jsx';
import { SonarSoundButton } from '../components/SonarGameChrome.jsx';
import { SonarChoiceArt, SonarReef, SonarSubmarine } from '../components/SonarArtwork.jsx';
import { TrainingPanel, NetworkFlow } from '../components/TrainingPanel.jsx';
import { DEFAULT_LAB_FIELDS } from '../data/sonarLabConfig.js';
import { EnergyChart, TrainingChart } from '../components/SonarCharts.jsx';
import OfficialResults from '../components/OfficialResults.jsx';
import SonarMathPanel from '../components/SonarMathPanel.jsx';
import { formatSonarNumber as number } from '../lib/math/sonarMath.js';
import { countSonarClasses, selectSonarSamples } from '../lib/data/sonarDataset.js';
import '../styles/sonarlab.css';

const navigation = [
  { id: 'overview', text: 'Visão geral', icon: House }, { id: 'data', text: 'Dados', icon: Database },
  { id: 'training', text: 'Treinamento', icon: ChartNoAxesColumnIncreasing },
  { id: 'results', text: 'Resultados oficiais', icon: ShieldCheck }, { id: 'math', text: 'Matemática', icon: Calculator },
];

function SampleSelector({ state, onSelect }) {
  const { data, selection } = state;
  const validationIds = new Set(data.partitions.lab.validationIds);
  return <div className="sonarlab-sample-controls">
    <label>Amostra de desenvolvimento<select value={selection.sampleId} onChange={event => onSelect(event.target.value, selection.modelKind)}>
      {data.development.map(sample => <option key={sample.id} value={sample.id}>{sample.id} · {validationIds.has(sample.id) ? 'validação' : 'treino'} do laboratório</option>)}
    </select></label>
    <label>Modelo inspecionado<select value={selection.modelKind} onChange={event => onSelect(selection.sampleId, event.target.value)}>
      <option value="official">Oficial · {data.manifest.architecture.join(' → ')}</option>
      <option value="experimental" disabled={!state.experimental}>Experimental{state.experimental ? ` · ${state.experimental.architecture.join(' → ')}` : ' · aguarda treino'}</option>
    </select></label>
  </div>;
}

function PredictionPanel({ state, onSelect, onMath, onRetry }) {
  const { inspection } = state;
  const result = inspection.result;
  return <article className="sonarlab-panel"><h2><Search /> Inspecionar uma previsão</h2>
    <SampleSelector state={state} onSelect={onSelect} />
    <div className="sonarlab-probabilities">{['Rocha', 'Metal'].map((name, index) => <div key={name} className={index ? 'is-metal' : ''}>
      <SonarChoiceArt label={index ? 'M' : 'R'} /><span>{name}<strong>{result ? `${number(result.probabilities[index] * 100, 2)}%` : '—'}</strong></span>
    </div>)}</div>
    <div role="status" className="sonarlab-status">{inspection.status === 'loading' ? 'Calculando com os atributos reais…' : result ? `Argmax: ${result.predictedLabel === 'R' ? 'Rocha' : 'Metal'} · ${result.modelKind === 'official' ? 'oficial congelado' : 'experimental'}` : 'Aguardando previsão.'}</div>
    {inspection.error && <div role="alert" className="sonarlab-error">{inspection.error}<button type="button" onClick={onRetry} className="sonarlab-button is-outline">Tentar inferência novamente</button></div>}
    <button type="button" className="sonarlab-button is-yellow" disabled={inspection.status === 'loading'} onClick={onMath}><Calculator size={19} /> Ver cálculo passo a passo</button>
    <p className="sonarlab-caption">A rede recebe somente os 60 atributos. Probabilidades não garantem acerto.</p>
  </article>;
}

function DataPanel({ state, onSelect }) {
  const { data, selection } = state;
  const sample = data.development.find(row => row.id === selection.sampleId);
  const labValidation = data.partitions.lab.validationIds.includes(sample.id);
  const counts = countSonarClasses(data.samples);
  const rows = [
    ['Desenvolvimento', data.partitions.developmentIds], ['Teste oficial já avaliado', data.partitions.testIds],
    ['Laboratório · treino', data.partitions.lab.trainIds], ['Laboratório · validação', data.partitions.lab.validationIds],
  ].map(([name, ids]) => ({ name, total: ids.length, counts: countSonarClasses(selectSonarSamples(data.samples, ids)) }));
  return <div className="sonarlab-stack"><article className="sonarlab-panel"><h2><Database /> Base UCI Sonar</h2>
    <p>208 exemplos, 60 atributos numéricos e duas classes. Os atributos representam energias integradas de retornos de sonar. “Metal” corresponde ao cilindro metálico da classe M.</p>
    <div className="sonarlab-distribution" aria-label={`${counts.R} exemplos Rocha, ${counts.M} Metal`}><span style={{ flex: counts.R }}>Rocha · {counts.R}</span><span style={{ flex: counts.M }}>Metal · {counts.M}</span></div>
    <div className="sonarlab-table-scroll" tabIndex={0} role="region" aria-label="Tabela com rolagem horizontal"><table><caption>Partições persistidas, sem novo sorteio</caption><thead><tr><th>Partição</th><th>Rocha</th><th>Metal</th><th>Total</th></tr></thead><tbody>
      {rows.map(row => <tr key={row.name}><th scope="row">{row.name}</th><td>{row.counts.R}</td><td>{row.counts.M}</td><td>{row.total}</td></tr>)}
    </tbody></table></div>
    <p>{data.provenance.source.citation}</p><p><a href={data.provenance.source.catalogUrl} target="_blank" rel="noreferrer" className="sonarlab-text-link">Fonte oficial UCI ↗</a> · <a href={data.provenance.source.license.url} target="_blank" rel="noreferrer" className="sonarlab-text-link">CC BY 4.0 ↗</a></p>
    <p className="sonarlab-caption">Dados íntegros, sem duplicatas de vetores; valores originais [0,1], sem normalização aprendida.</p>
  </article><article className="sonarlab-panel"><h2><Activity /> Assinatura do eco</h2>
    <SampleSelector state={state} onSelect={onSelect} />
    <p><strong>{sample.id}</strong> · desenvolvimento · <strong>{labValidation ? 'validação' : 'treino'} do laboratório</strong>. Exploração livre restrita ao desenvolvimento.</p>
    <EnergyChart sample={sample} />
    <p className="sonarlab-note">Esse perfil tem 60 atributos de energia normalizada. Não é uma gravação de áudio, reconstrução do sinal ou medida de posição; não atribuímos unidades em Hz.</p>
  </article></div>;
}

export default function SonarLabPage() {
  const lab = useSonarLab();
  const mission = useSonarMission();
  const sections = mission?.context ? [{ id: 'mission', text: 'Eco da missão', icon: Activity }, ...navigation] : navigation;
  const { state } = lab;
  const [section, setSection] = useState(mission?.context ? 'mission' : 'overview');
  const [fields, setFields] = useState(DEFAULT_LAB_FIELDS);
  const candidate = fields.layers === '2' ? [Number(fields.first), Number(fields.second)] : [Number(fields.first)];
  const heading = useRef(null);
  function navigate(id) { setSection(id); globalThis.requestAnimationFrame(() => heading.current?.focus()); }
  function showMath() { navigate('math'); lab.trace(); }
  const ready = state.status === 'ready';
  const sample = ready ? state.data.development.find(row => row.id === state.selection.sampleId) : null;
  const panels = ready && <><div className="sonarlab-top-grid"><TrainingPanel training={state.training} onTrain={lab.train} onCancel={lab.cancel} fields={fields} onFields={setFields} /><NetworkFlow hiddenUnits={candidate} /></div>
    <div className="sonarlab-bottom-grid"><TrainingChart training={state.training} /><PredictionPanel state={state} onSelect={lab.select} onMath={showMath} onRetry={() => lab.select(state.selection.sampleId, state.selection.modelKind)} /></div></>;
  return <div className="sonarlab">
    <a href="#sonarlab-content" className="sonarlab-skip">Pular para o conteúdo</a>
    <aside className="sonarlab-sidebar"><div className="sonarlab-brand"><SonarSubmarine /><Link to="/sonar/lab" aria-label="SonarLab, visão geral" onClick={() => navigate('overview')}>Sonar<span>Lab</span></Link><small>ChAprendizagem</small></div>
      <div className="sonarlab-sound-row"><span>Som do laboratório</span><SonarSoundButton /></div>
      <nav aria-label="Seções do SonarLab">{sections.map(({ id, text, icon: Icon }) => <button key={id} type="button" aria-current={section === id ? 'page' : undefined} onClick={() => navigate(id)}><Icon size={22} /> {text}</button>)}
        {mission?.state.encounter && <Link to="/sonar/missao"><ArrowLeft size={22} /> Voltar à missão</Link>}
        <Link to="/sonar" onClick={mission?.leave}><ArrowLeft size={22} /> Voltar ao menu</Link></nav>
      <div className="sonarlab-sidebar-note"><FlaskConical size={18} /> Um eco, duas possibilidades.</div><SonarReef />
    </aside>
    <main id="sonarlab-content" tabIndex={-1} className="sonarlab-main"><header className="sonarlab-hero"><div><span className="sonarlab-eyebrow">Laboratório de aprendizagem profunda</span>
      <h1 ref={heading} tabIndex={-1}>{section === 'overview' ? 'Por dentro do eco' : sections.find(item => item.id === section)?.text ?? 'Por dentro do eco'}</h1>
      <p>Da entrada de 60 atributos à decisão da MLP.</p></div><div className="sonarlab-hero-art"><span className="sonarlab-badge is-yellow">Dados reais · modelo treinado</span><SonarSubmarine /></div></header>
      {!ready ? <article className="sonarlab-panel sonarlab-load"><Database size={38} /><h2>{state.status === 'error' ? 'Não foi possível abrir o laboratório' : 'Preparando o SonarLab'}</h2>
        <p role={state.status === 'error' ? 'alert' : 'status'}>{state.error || 'Conferindo os dados e carregando os pesos oficiais…'}</p>
        {state.status === 'error' && <button type="button" className="sonarlab-button is-yellow" onClick={lab.retry}>Tentar carregar novamente</button>}</article> : <>
        <div className="sonarlab-stats">{[{ icon: Database, value: state.data.samples.length, label: 'exemplos' }, { icon: Layers3, value: 60, label: 'atributos' }, { icon: Users, value: 2, label: 'classes' }, { icon: BookOpen, value: 'UCI Sonar', label: 'Conjunto de dados' }].map(({ icon: Icon, value, label }) => <div key={label}><Icon /><span><strong>{value}</strong>{label}</span></div>)}</div>
        {section === 'mission' && mission?.context && <MissionContextPanel context={mission.context} />}
        {(section === 'overview' || section === 'training') && panels}
        {section === 'data' && <DataPanel state={state} onSelect={lab.select} />}
        {section === 'results' && <OfficialResults data={state.data} />}
        {section === 'math' && <div className="sonarlab-stack"><article className="sonarlab-panel"><SampleSelector state={state} onSelect={lab.select} /></article>
          <SonarMathPanel key={`${sample.id}-${state.selection.modelKind}-${state.experimental?.modelId ?? ''}`} sample={sample} result={state.inspection.result} inspection={state.inspection} onTrace={lab.trace} /></div>}
      </>}
      <footer className="sonarlab-footer"><BookOpen size={18} /> Teste separado · Experimentos só no desenvolvimento · Resultados reais e rastreáveis</footer>
    </main>
  </div>;
}
