import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import { useEffect, useState } from 'react';

const phaseLabels = {
  initialize: 'Preparando o espaço',
  assign: 'Comparando distâncias',
  move: 'Movendo os centroides',
  complete: 'Agrupamento estabilizado',
};

export default function KMeansIterationPanel({
  frames,
  selectedFrame,
  onChange,
  autoPlayKey,
  onComplete,
}) {
  const [playing, setPlaying] = useState(false);
  const lastIndex = Math.max(0, frames.length - 1);
  const current = frames[selectedFrame] ?? frames[0];

  useEffect(() => {
    onChange(0);
    setPlaying(true);
  }, [autoPlayKey]);

  useEffect(() => {
    if (!playing) return undefined;
    if (selectedFrame >= lastIndex) {
      setPlaying(false);
      onComplete();
      return undefined;
    }

    const timer = window.setTimeout(() => onChange(selectedFrame + 1), current?.duration ?? 1250);
    return () => window.clearTimeout(timer);
  }, [current?.duration, lastIndex, onChange, onComplete, playing, selectedFrame]);

  function selectFrame(index) {
    setPlaying(false);
    onChange(index);
    if (index === lastIndex) onComplete();
  }

  function replay() {
    onChange(0);
    setPlaying(true);
  }

  return (
    <div className={`kmeans-iteration-panel is-${current?.phase ?? 'initialize'}`}>
      <div className="kmeans-iteration-panel__copy">
        <span>{phaseLabels[current?.phase] ?? 'Executando K-Means'}</span>
        <strong>{current?.title}</strong>
        <small>{current?.description}</small>
      </div>

      <div className="kmeans-iteration-panel__cinema">
        <div className="kmeans-iteration-panel__timeline" aria-label="Progresso da execução">
          {frames.map((frame, index) => (
            <button
              aria-label={`Ver ${frame.title}`}
              className={index === selectedFrame ? 'is-active' : index < selectedFrame ? 'is-complete' : ''}
              key={`${frame.phase}-${frame.iteration}-${index}`}
              onClick={() => selectFrame(index)}
              type="button"
            >
              <i /><span>{frame.shortLabel}</span>
            </button>
          ))}
        </div>
        <div className="kmeans-iteration-panel__footer">
          <div className="kmeans-iteration-panel__readout">
            <span>Quadro {selectedFrame + 1}/{frames.length}</span>
            <strong>{current?.eqt == null ? 'EQT aguardando atribuição' : `EQT ${current.eqt.toFixed(4)}`}</strong>
          </div>
          <div className="kmeans-iteration-panel__buttons">
            <button aria-label="Recomeçar animação" onClick={replay} type="button"><RotateCcw size={16} /></button>
            <button aria-label="Quadro anterior" disabled={selectedFrame === 0} onClick={() => selectFrame(Math.max(0, selectedFrame - 1))} type="button"><SkipBack size={16} /></button>
            <button aria-label={playing ? 'Pausar animação' : 'Continuar animação'} onClick={() => setPlaying((value) => !value)} type="button">{playing ? <Pause size={17} /> : <Play size={17} />}</button>
            <button aria-label="Próximo quadro" disabled={selectedFrame === lastIndex} onClick={() => selectFrame(Math.min(lastIndex, selectedFrame + 1))} type="button"><SkipForward size={16} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
