export default function GameHeader({ onAbout, onRules, onHome, isPlaying, busy, music }) {
  return (
    <header className="iad-header">
      <a className="iad-logo" href="#inicio" aria-label="IAdivinha! Início" onClick={isPlaying ? onHome : undefined}>
        <span><span className="iad-logo-ia">IA</span>divinha!</span>
        <svg viewBox="0 0 52 64" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" aria-hidden="true"><g className="iad-pencil-entry"><path fill="#42b7a8" d="m9 42 27-34q4-5 9 0l3 3q4 4 0 8L21 53 5 59Z" /><path fill="#ff6547" d="m32 13 5-6q4-3 8 1l3 3q4 4 0 8l-3 4Z" /><path fill="#fffdf7" d="m9 42 12 11-16 6Z" /><path d="m13 40 26-31" stroke="#fffdf7" strokeWidth="3" /></g></svg>
      </a>
      <nav aria-label="Navegação IAdivinha">
        {isPlaying ? <button type="button" onClick={onHome}>Início</button> : <a href="#jogar">Jogar</a>}
        {isPlaying ? <button type="button" onClick={onRules} disabled={busy}>Como funciona</button> : <a href="#como-funciona">Como funciona</a>}
        <button type="button" onClick={onAbout} disabled={busy}>Sobre</button>
        <button type="button" data-music-toggle onClick={music.toggle} aria-pressed={!music.muted && !music.failed && !music.blocked} aria-label={music.failed ? 'Tentar música' : music.blocked || music.muted ? 'Ativar música' : 'Mutar música'}>{music.failed ? 'Tentar música' : music.blocked || music.muted ? '♪ Ativar' : '♪ Mutar'}</button>
      </nav>
      <span className="iad-heart" aria-hidden="true"><svg viewBox="0 0 52 52"><path d="M26 44C19 37 5 25 5 15C5 3 20 2 26 13C32 2 47 3 47 15C47 25 33 38 26 44Z" fill="#ff6547" stroke="currentColor" strokeWidth="5" strokeLinejoin="round" /></svg></span>
    </header>
  );
}
