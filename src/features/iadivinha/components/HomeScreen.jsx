import ClassDoodle from './ClassDoodle.jsx';
import { classById } from '../data/classCatalog.js';

function ScribbleNote({ children, className }) {
  return <span className={`iad-note ${className}`} aria-hidden="true">{children}<svg viewBox="0 0 100 70" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 8q0 48 70 37m-15-9 17 8-11 15" /></svg></span>;
}

export default function HomeScreen({ onPlay, classes, loadError, modelStatus, onRetry, ref, preview = false }) {
  return (
    <main className="iad-home" id="inicio" ref={ref} tabIndex={-1}>
      <div className="iad-heading">
        <h1>Gato, pato ou sapato?</h1>
        <p>Você rabisca. A IA arrisca.</p>
        {classes.some(item => classById(item.id)?.type === 'special') && <p className="iad-surprise-hint">+ 5 rabiscos surpresa escondidos</p>}
      </div>
      <div className="iad-art-stage">
        <ScribbleNote className="iad-note-left">DESENHOS<br />VIRAM<br />PALPITES!</ScribbleNote>
        <ul className="iad-class-cards" aria-label="Os personagens principais">
          {classes.filter(item => classById(item.id)?.type === 'core').map((item, index) => <li className={`iad-class-card iad-${item.id}`} key={item.id} tabIndex={0} style={{ "--iad-entry-delay": `${80 + index * 80}ms` }}><div className="iad-card-entry"><ClassDoodle kind={item.id} /><span>{item.label}</span></div></li>)}
        </ul>
        <ScribbleNote className="iad-note-right">PEQUENOS<br />RABISCOS,<br />GRANDES<br />SURPRESAS :)</ScribbleNote>
      </div>
      <section className="iad-start" id="jogar" aria-label="Começar a jogar">
        <div className="iad-cta-wrap"><button className="iad-primary" type="button" onClick={onPlay} disabled={modelStatus !== 'ready'} aria-describedby="iad-availability"><span className="iad-cta-label">{modelStatus === 'ready' ? 'JOGAR AGORA' : modelStatus === 'error' ? 'IA INDISPONÍVEL' : 'CARREGANDO A IA…'}</span></button></div>
        <p className="iad-score-pill">6 rodadas <span aria-hidden="true">·</span> até 600 pontos</p>
        <p className="iad-availability" id="iad-availability" role="status">{loadError || (modelStatus === 'ready' ? preview ? 'Prévia pronta: as oito classes usam palpites simulados.' : 'A IA está pronta! Seus desenhos ficam no seu dispositivo.' : 'Preparando a IA para reconhecer seus rabiscos…')}</p>
        {modelStatus === 'error' && <button className="iad-secondary" type="button" onClick={onRetry}>TENTAR CARREGAR NOVAMENTE</button>}
      </section>
      <section className="iad-rules" id="como-funciona" aria-label="Como funciona">
        <ol>
          <li><span className="iad-step-number">1</span><span>Veja o desafio</span></li>
          <li><span className="iad-step-number">2</span><span>Desenhe em 10 s</span></li>
          <li><span className="iad-step-number">3</span><span>Descubra o palpite</span></li>
        </ol>
        <p>{classes.some(item => classById(item.id)?.type === 'special') ? 'Seis rodadas para soltar o traço. E uma visita surpresa da Turma do “ÃO”!' : 'Seis rodadas para soltar o traço e desafiar a IA. Qual será seu melhor rabisco?'}</p>
      </section>
      {classes.some(item => classById(item.id)?.type === 'special') && <section className="iad-special-gallery" aria-labelledby="iad-special-title">
        <h2 id="iad-special-title">TURMA DO “ÃO”</h2>
        <p>Uma dessas figuras faz uma aparição surpresa em cada partida!</p>
        <ul className="iad-special-cards">{classes.filter(item => classById(item.id)?.type === 'special').map((item, index) => <li className="iad-class-card iad-special-card" key={item.id} tabIndex={0} style={{ "--iad-card-color": item.color, "--iad-entry-delay": `${80 + index * 80}ms` }}><div className="iad-card-entry"><ClassDoodle kind={item.id} /><span>{item.label}</span></div></li>)}</ul>
      </section>}
      <span className="iad-note iad-note-art" aria-hidden="true">ARTE<br />+<br />IA<br />=<br />DIVERSÃO :)</span>
      <span className="iad-note iad-note-everyone" aria-hidden="true">TODO<br />MUNDO<br />DESENHA<br />AQUI :)</span>
    </main>
  );
}
