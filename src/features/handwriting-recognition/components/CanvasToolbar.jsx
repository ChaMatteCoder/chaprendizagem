import { Brush, RotateCcw, Wand2 } from 'lucide-react';

export default function CanvasToolbar({ brushSize, disabled, onBrushSizeChange, onClear, onProcess }) {
  return (
    <div className="canvas-toolbar">
      <label>
        <Brush size={18} />
        Espessura
        <input
          max="32"
          min="4"
          onChange={(event) => onBrushSizeChange(Number(event.target.value))}
          type="range"
          value={brushSize}
        />
        <strong>{brushSize}px</strong>
      </label>
      <div className="canvas-toolbar__actions">
        <button className="button button--ghost" onClick={onClear} type="button">
          <RotateCcw size={18} /> Limpar
        </button>
        <button className="button button--primary" disabled={disabled} onClick={onProcess} type="button">
          <Wand2 size={18} /> Processar desenho
        </button>
      </div>
    </div>
  );
}
