import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import GameHeader from '../components/GameHeader.jsx';
import HomeScreen from '../components/HomeScreen.jsx';
import DrawingScreen from '../components/DrawingScreen.jsx';
import RoundPreparation from '../components/RoundPreparation.jsx';
import PredictionResult from '../components/PredictionResult.jsx';
import FinalScore from '../components/FinalScore.jsx';
import ModelPerformance from '../components/ModelPerformance.jsx';
import SpecialRoundReveal from '../components/SpecialRoundReveal.jsx';
import useGameSession from '../hooks/useGameSession.js';
import useDrawingModel from '../hooks/useDrawingModel.js';
import useSoundtrack from '../hooks/useSoundtrack.js';
import '../styles/iadivinha.css';
import '../styles/motion.css';

export default function IAdivinhaPage() {
  const motionRoot = useRef(null);
  const dialogRef = useRef(null);
  const dialogTitleRef = useRef(null);
  const mainRef = useRef(null);
  const [dialogContent, setDialogContent] = useState('about');
  const preview = import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === 'turma-ao';
  const model = useDrawingModel(preview);
  const game = useGameSession(model.classes, model.classify);
  const { state } = game;
  const music = useSoundtrack(state.phase);
  const isPlaying = state.phase !== 'home';
  const busy = ['drawing', 'processing', 'revealing'].includes(state.phase);

  useEffect(() => {
    if (dialogRef.current?.open) dialogTitleRef.current?.focus();
  }, [dialogContent]);

  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true });
    if (state.phase !== 'home') window.scrollTo({ top: 0, behavior: 'instant' });
  }, [state.phase, state.round]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'IAdivinha! — Gato, pato ou sapato?';
    return () => { document.title = previousTitle; };
  }, []);

  useEffect(() => {
    const updateVisibility = () => {
      if (motionRoot.current) motionRoot.current.dataset.motionPaused = String(document.hidden);
    };
    updateVisibility();
    document.addEventListener('visibilitychange', updateVisibility);
    return () => document.removeEventListener('visibilitychange', updateVisibility);
  }, []);

  function openDialog(content) {
    setDialogContent(content);
    dialogRef.current.showModal();
  }

  return (
    <div className="iadivinha" ref={motionRoot} data-phase={state.phase}>
      <a className="iad-skip-link" href="#inicio">Pular para o conteúdo</a>
      <audio ref={music.audioRef} loop preload="none" aria-hidden="true" />
      <GameHeader onAbout={() => openDialog('about')} onRules={() => openDialog('rules')} onHome={game.home} isPlaying={isPlaying} busy={busy} music={music} />
      {music.failed && <p className="iad-music-status" role="status">A música não pôde tocar. O jogo continua normalmente; use “Tentar música” para repetir.</p>}
      {preview && <p className="iad-preview-notice" role="note">PRÉVIA DE DESENVOLVIMENTO · 8 classes simuladas. Não é reconhecimento por IA.</p>}
      {isPlaying ? <main className="iad-game" id="inicio" ref={mainRef} tabIndex={-1}>
        <p className="iad-demo-badge">{preview ? 'PRÉVIA VISUAL · PALPITES SIMULADOS' : 'IA NO SEU DISPOSITIVO · SEU DESENHO FICA AQUI'}</p>
        <div className="iad-screen-transition" key={`${state.phase}:${state.round}`}>
        {state.phase === 'preparing' && <RoundPreparation state={state} onBegin={game.begin} />}
        {state.phase === 'revealing' && <SpecialRoundReveal key={state.round} challenge={state.sequence[state.round]} round={state.round} onComplete={game.revealDone} />}
        {state.phase === 'drawing' && <DrawingScreen key={state.round} state={state} onSubmit={game.submit} />}
        {state.phase === 'processing' && <section className="iad-processing" role="status">
          <h1 className="iad-game-title">UM PALPITE VEM AÍ…</h1>
          <div className="iad-processing-dots" aria-hidden="true"><span>●</span> <span>●</span> <span>●</span></div><p>{preview ? 'Preparando um palpite simulado.' : 'A IA está olhando seu rabisco.'}</p>
        </section>}
        {state.phase === 'error' && <section role="alert" className="iad-processing">
          <h1 className="iad-game-title">OPA, UM IMPREVISTO!</h1><p>Não foi possível gerar o palpite. Seu desenho está guardado para tentar novamente.</p>
          <button className="iad-primary iad-game-cta" type="button" onClick={game.retry}>TENTAR NOVAMENTE</button>
        </section>}
        {state.phase === 'result' && <PredictionResult result={state.results.at(-1)} lastRound={state.round === 5} onNext={game.next} />}
        {state.phase === 'finished' && <FinalScore state={state} onRestart={game.start} onHome={game.home} onPerformance={() => openDialog('performance')} />}
        </div>
      </main> : <HomeScreen ref={mainRef} onPlay={game.start} classes={model.classes} loadError={model.error} modelStatus={model.status} onRetry={model.retry} preview={preview} />}
      <footer className="iad-footer"><Link to="/">← Voltar ao Chaprendizagem</Link><span>Um pouco de arte. Um palpite de IA.</span></footer>
      <dialog className="iad-dialog" ref={dialogRef} aria-labelledby="iad-dialog-title">
        <form method="dialog">
          <button className="iad-dialog-close" aria-label="Fechar" type="submit">×</button>
          <p className="iad-dialog-kicker">IAdivinha!</p>
          <h2 id="iad-dialog-title" ref={dialogTitleRef} tabIndex={-1}>{dialogContent === 'performance' ? 'Ver desempenho' : dialogContent === 'about' ? 'Você rabisca. A IA arrisca.' : 'Como funciona'}</h2>
          {dialogContent === 'performance' ? <ModelPerformance /> : dialogContent === 'about' ? <>
            <p>Um projeto acadêmico da disciplina Aprendizagem Profunda de Modelos Generativos: transformar desenhos de gato, pato e sapato em um jogo de reconhecimento de imagens.</p>
            <p>Uma pequena rede neural, treinada com desenhos do Quick, Draw!, reconhece as oito categorias no seu dispositivo. Ela recebe somente a imagem: o desafio da rodada não é informado à IA.</p>
            <p>Os desenhos não são enviados a um servidor. A IA pode errar, e a confiança do palpite não é uma garantia de acerto.</p>
            <button className="iad-secondary" type="button" onClick={() => setDialogContent('performance')}>Ver desempenho</button>
          </> : <>
            <p>{model.classes.length > 3 ? 'São seis rodadas: as três figuras principais, duas principais extras e um rabisco surpresa. A rodada rara começa depois da revelação.' : 'São seis rodadas, com cada classe aparecendo duas vezes.'} Clique em “Vamos lá!” para começar e desenhe com mouse, toque, caneta ou teclado.</p>
            <p>“Terminei!” antecipa o palpite. Nos acertos, a confiança da IA vira pontos, arredondada para o inteiro mais próximo: 86% vale 86 pontos. Um palpite diferente da figura pedida vale zero. Se o tempo acabar sem desenho, a rodada vale zero. Desenhe a figura ocupando uma boa parte da folha.</p>
          </>}
          <button className="iad-secondary" type="submit">Entendi!</button>
        </form>
      </dialog>
    </div>
  );
}
