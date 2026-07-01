import { Brush, Palette, Pipette, RotateCcw, Wand2 } from 'lucide-react';

const brushColors = [
  { label: 'Grafite', value: '#111827' },
  { label: 'Petróleo', value: '#00575b' },
  { label: 'Azul', value: '#1d4ed8' },
  { label: 'Roxo', value: '#6d28d9' },
  { label: 'Carmim', value: '#9f1239' },
  { label: 'Terracota', value: '#9a3412' },
];

export default function CanvasToolbar({
  brushColor,
  brushSize,
  disabled,
  onBrushColorChange,
  onBrushSizeChange,
  onClear,
  onProcess,
}) {
  return (
    <div className="canvas-toolbar">
      <div className="canvas-toolbar__controls">
        <label className="canvas-brush-control">
          <span className="canvas-control-heading">
            <Brush size={18} />
            <span>Espessura do traço</span>
            <strong>{brushSize}px</strong>
          </span>
          <input
            max="40"
            min="4"
            onChange={(event) => onBrushSizeChange(Number(event.target.value))}
            type="range"
            value={brushSize}
          />
        </label>
        <fieldset className="canvas-color-picker">
          <legend>
            <Palette size={18} />
            <span>Cor do traço</span>
          </legend>
          <div className="canvas-color-picker__options">
            {brushColors.map((color) => (
              <button
                aria-label={'Usar a cor ' + color.label}
                aria-pressed={brushColor === color.value}
                className="canvas-color-swatch"
                key={color.value}
                onClick={() => onBrushColorChange(color.value)}
                style={{ '--swatch-color': color.value }}
                title={color.label}
                type="button"
              />
            ))}
            <label className="canvas-custom-color" title="Abrir seletor de cor">
              <Pipette size={16} />
              <span className="canvas-custom-color__preview" aria-hidden="true" style={{ '--swatch-color': brushColor }} />
              <strong>Outra cor</strong>
              <input
                aria-label="Escolher uma cor personalizada"
                onChange={(event) => onBrushColorChange(event.target.value)}
                type="color"
                value={brushColor}
              />
            </label>
          </div>
        </fieldset>
      </div>
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
