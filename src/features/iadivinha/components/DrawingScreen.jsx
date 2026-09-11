import { useCallback, useRef } from 'react';
import DrawingCanvas from './DrawingCanvas.jsx';
import GameTimer from './GameTimer.jsx';
import { classById, isSpecial } from '../data/classCatalog.js';

export default function DrawingScreen({ state, onSubmit }) {
  const canvas = useRef(null);
  const expire = useCallback(() => onSubmit(canvas.current?.snapshot(), 'timeout'), [onSubmit]);
  return <>
    <div className="iad-game-stats"><span>RODADA {state.round + 1}/6</span><GameTimer deadline={state.deadline} onExpire={expire} /><span>{state.score} PTS</span></div>
    {isSpecial(state.sequence[state.round]) && <span className="iad-rare-badge">RARO</span>}
    <h1 className="iad-game-title">{classById(state.sequence[state.round].id).prompt}</h1>
    <DrawingCanvas ref={canvas} deadline={state.deadline} onFinish={() => onSubmit(canvas.current?.snapshot())} />
  </>;
}
