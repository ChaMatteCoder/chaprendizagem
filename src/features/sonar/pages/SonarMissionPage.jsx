import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, Bot, Check, Eye, FlaskConical, RefreshCw, Target, Trophy, User } from 'lucide-react';
import useSonarMission from '../hooks/useSonarMission.js';
import SonarGameChrome from '../components/SonarGameChrome.jsx';
import { SonarSubmarine, SonarChoiceArt } from '../components/SonarArtwork.jsx';
import { EnergyChart } from '../components/SonarCharts.jsx';
import { formatSonarNumber as number } from '../lib/math/sonarMath.js';

const names = { R: 'Rocha', M: 'Metal' };

function Prediction({ encounter }) {
  const prediction = encounter.prediction;
  return <section className="sonar-prediction" aria-labelledby="sonar-ai"><h2 id="sonar-ai"><Bot /> Palpite da IA</h2>
    {prediction ? <><p>Argmax: <strong>{names[prediction.predictedLabel]}</strong></p><div className="sonar-probabilities">{['R', 'M'].map((label, index) => <div key={label}><b>{names[label]}</b><div className="sonar-probability-track" role="progressbar" aria-label={`Probabilidade de ${names[label]}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={prediction.probabilities[index] * 100}><span style={{ width: `${prediction.probabilities[index] * 100}%` }} /></div><strong>{number(prediction.probabilities[index] * 100, 2)}%</strong></div>)}</div>
      <p className="sonar-caption">MLP oficial · 60 → 16 → 2 · Probabilidades não garantem acerto.</p></> : <p className="sonar-ai-wait">A rede mostrará suas probabilidades depois do seu palpite.</p>}
  </section>;
}

function Summary({ game, heading }) {
  const { state } = game;
  return <main id="sonar-content" tabIndex={-1} className="sonar-summary sonar-paper"><Trophy className="sonar-summary-trophy" size={56} /><p className="sonar-eyebrow">Cinco encontros concluídos</p><h1 ref={heading} tabIndex={-1}>Missão cumprida!</h1>
    <p>Você observou os ecos e comparou seus palpites com a MLP.</p><div className="sonar-final-score"><span><User /> Você <strong>{state.score.user} / 5</strong></span><span><Bot /> IA <strong>{state.score.ai} / 5</strong></span></div>
    <p className="sonar-summary-note">Este placar é uma demonstração com cinco exemplos de teste já avaliados. Ele não representa a acurácia científica do modelo.</p>
    <div className="sonar-summary-scroll" tabIndex={0} role="region" aria-label="Resumo dos cinco encontros com rolagem horizontal"><table><caption>Um ponto para cada palpite correto</caption><thead><tr><th>Encontro</th><th>Resultado</th><th>Você</th><th>IA</th><th>Explicação</th></tr></thead><tbody>{state.history.map((row, index) => <tr key={row.sample.id}><th scope="row">{index + 1}<small>{row.sample.id}</small></th><td>{names[row.sample.label]}</td><td>{names[row.choice]}<small>{row.userCorrect ? 'Acertou · +1' : 'Errou · +0'}</small></td><td>{names[row.prediction.predictedLabel]}<small>{row.aiCorrect ? 'Acertou · +1' : 'Errou · +0'}</small></td><td><Link to="/sonar/lab" onClick={() => game.openContext(index)} aria-label={`Ver cálculo do encontro ${index + 1}`}>Ver cálculo <ArrowRight size={16} /></Link></td></tr>)}</tbody></table></div>
    <div className="sonar-actions"><button type="button" className="sonar-button is-yellow" onClick={() => game.start({ restart: true })}><RefreshCw /> Nova missão</button><Link to="/sonar" onClick={game.leave} className="sonar-button is-dark">Voltar ao menu</Link><Link to="/sonar/lab" onClick={() => game.openContext()} className="sonar-button is-light"><FlaskConical /> Abrir SonarLab</Link></div>
    <p className="sonar-caption">Modelo oficial: <code>{state.model.modelId}</code>. Novas missões podem repetir exemplos desta base pequena.</p>
  </main>;
}

export default function SonarMissionPage() {
  const game = useSonarMission();
  const { start, pause, initialized, state } = game;
  const heading = useRef(null);
  useEffect(() => { if (initialized) start(); return () => pause(); }, [initialized, start, pause]);
  useEffect(() => { if (['guessing', 'revealed', 'finished', 'blocked'].includes(state.status)) heading.current?.focus(); }, [state.status, state.index]);
  if (state.status === 'finished') return <SonarGameChrome mission><Summary game={game} heading={heading} /></SonarGameChrome>;
  const encounter = state.encounter;
  if (!encounter) return <SonarGameChrome mission><main id="sonar-content" tabIndex={-1} className="sonar-load sonar-paper"><SonarSubmarine /><h1 ref={heading} tabIndex={-1}>{state.status === 'blocked' ? 'Missão indisponível' : 'Preparando a missão'}</h1>
    <p role={state.status === 'blocked' ? 'alert' : 'status'}>{state.error || 'Conferindo os dados e carregando o modelo oficial congelado…'}</p>
    {state.status === 'blocked' && <button type="button" className="sonar-button is-yellow" onClick={() => start()}>Tentar carregar novamente</button>}<Link to="/sonar" className="sonar-inline-link" onClick={game.leave}>Voltar ao menu</Link></main></SonarGameChrome>;
  const revealed = state.status === 'revealed';
  return <SonarGameChrome mission><main id="sonar-content" tabIndex={-1} className="sonar-mission">
    <div className="sonar-mission-bar"><div><strong>Encontro {state.index + 1} de 5</strong><ol aria-label="Progresso da missão">{Array.from({ length: 5 }, (_, index) => <li key={index} aria-current={index === state.index ? 'step' : undefined} className={index < state.index ? 'is-done' : ''}><span className="sonar-sr">Encontro {index + 1}{index < state.index ? ' concluído' : index === state.index ? ' atual' : ' pendente'}</span></li>)}</ol></div><div className="sonar-live-score"><span><User /> Você: <b>{state.score.user}</b></span><span><Bot /> IA: <b>{state.score.ai}</b></span></div></div>
    <div className="sonar-encounter-grid" key={state.index}><div className="sonar-observation"><section className="sonar-scene" aria-label={revealed ? 'Contato identificado' : 'Contato de classe ainda desconhecida'}><SonarSubmarine /><div className="sonar-waves" aria-hidden="true"><i /><i /><i /></div><div className="sonar-contact" aria-hidden="true">{revealed ? <SonarChoiceArt label={encounter.sample.label} /> : '?'}</div><span className="sonar-scene-caption"><Activity /> {revealed ? `Contato identificado: ${names[encounter.sample.label]}` : 'Contato detectado'}</span></section>
      <article className="sonar-paper sonar-echo"><h2><Activity /> Assinatura do eco <small>60 atributos reais</small></h2><div className="sonarlab sonar-embedded"><EnergyChart sample={encounter.sample} /></div><p className="sonar-caption">Perfil real de energia normalizada · Cenário ilustrado, sem simulação física.</p></article>
    </div><section className="sonar-paper sonar-decision" aria-labelledby="sonar-question"><h1 id="sonar-question" ref={heading} tabIndex={-1}><Target /> Rocha ou metal?</h1>
      <div className={`sonar-guess-status${encounter.choice ? ' is-recorded' : ''}`} role="status">{revealed ? <><Check /> Resultado: {names[encounter.sample.label]}. Você {encounter.userCorrect ? 'acertou' : 'errou'}; a IA {encounter.aiCorrect ? 'acertou' : 'errou'}.</> : encounter.choice ? <><Check /> Seu palpite foi registrado: {names[encounter.choice]}.</> : 'Observe o perfil e escolha seu palpite.'}</div>
      <div className="sonar-choices">{['R', 'M'].map(label => <button key={label} type="button" aria-pressed={encounter.choice === label} disabled={state.status !== 'guessing'} className={encounter.choice === label ? 'is-selected' : ''} onClick={() => { game.sound.ping(); game.guess(label); }}><SonarChoiceArt label={label} /><span>{names[label]}</span>{encounter.choice === label && <Check className="sonar-choice-check" />}</button>)}</div>
      <Prediction encounter={encounter} />
      {state.status === 'predicting' && <p role="status" className="sonar-caption">Calculando com os 60 atributos e os pesos oficiais…</p>}
      {state.status === 'prediction-error' && <div className="sonar-error" role="alert"><p>{state.error}</p><button type="button" className="sonar-button is-yellow" onClick={game.retry}>Tentar inferência novamente</button></div>}
      {state.status === 'comparing' && <button type="button" className="sonar-button is-coral sonar-wide" onClick={game.reveal}><Eye /> Revelar resultado</button>}
      {revealed && <button type="button" className="sonar-button is-yellow sonar-wide" onClick={() => { game.sound.ping(); game.next(); }}><ArrowRight /> {state.index === 4 ? 'Ver placar final' : 'Próximo encontro'}</button>}
      {encounter.prediction ? <Link to="/sonar/lab" onClick={() => game.openContext()} className="sonar-button is-light sonar-wide"><FlaskConical /> Como a rede decidiu?</Link> : <button type="button" disabled className="sonar-button is-light sonar-wide"><FlaskConical /> Como a rede decidiu?</button>}
      <p className="sonar-caption">A IA recebe apenas os atributos. {revealed ? 'O rótulo revelado permite calcular a cross-entropy no laboratório.' : 'O resultado verdadeiro será exibido ao revelar.'}</p>
    </section></div><p className="sonar-demonstration">Demonstração com exemplos de teste já avaliados · Cinco encontros não medem a acurácia científica.</p>
  </main></SonarGameChrome>;
}
