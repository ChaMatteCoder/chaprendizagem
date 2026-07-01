import { Hash, Sigma, Type } from 'lucide-react';
import { recognitionModes } from '../data/classLabels.js';

const modeDetails = {
  digits: { name: 'Dígitos', range: '0 a 9' },
  letters: { name: 'Letras', range: 'A a Z' },
  all: { name: 'Todos', range: '36 classes' },
};

export default function RecognitionModeTabs({ mode, onChange }) {
  const modes = Object.values(recognitionModes);

  function handleKeyDown(event, currentIndex) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;

    event.preventDefault();
    const lastIndex = modes.length - 1;
    let nextIndex = currentIndex;

    if (event.key === 'ArrowLeft') nextIndex = currentIndex === 0 ? lastIndex : currentIndex - 1;
    if (event.key === 'ArrowRight') nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = lastIndex;

    onChange(modes[nextIndex].id);
  }

  return (
    <div className="recognition-tabs" role="tablist" aria-label="Modo de reconhecimento">
      {modes.map((item, index) => {
        const Icon = item.id === 'digits' ? Hash : item.id === 'all' ? Sigma : Type;
        const detail = modeDetails[item.id];
        const selected = mode === item.id;

        return (
          <button
            aria-controls={`recognition-panel-${item.id}`}
            aria-selected={selected}
            className={selected ? 'is-active' : ''}
            id={`recognition-tab-${item.id}`}
            key={item.id}
            onKeyDown={(event) => handleKeyDown(event, index)}
            onClick={() => onChange(item.id)}
            role="tab"
            tabIndex={selected ? 0 : -1}
            type="button"
          >
            <Icon size={18} />
            <span>
              <strong>{detail.name}</strong>
              <small>{detail.range}</small>
            </span>
          </button>
        );
      })}
    </div>
  );
}
