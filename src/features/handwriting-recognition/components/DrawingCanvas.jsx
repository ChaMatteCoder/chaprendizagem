import { useEffect, useRef, useState } from 'react';
import CanvasToolbar from './CanvasToolbar.jsx';

const CANVAS_SIZE = 400;
const SAFE_MARGIN = CANVAS_SIZE * 0.1;
const BORDER_WARNING_TITLE = 'Desenho muito próximo da borda.';
const BORDER_WARNING_DETAIL = 'O recorte encostou na borda da imagem; deixe mais margem ao redor do dígito.';

function getPoint(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  const pointer = event.touches?.[0] ?? event;
  return {
    x: ((pointer.clientX - rect.left) / rect.width) * canvas.width,
    y: ((pointer.clientY - rect.top) / rect.height) * canvas.height,
  };
}

export default function DrawingCanvas({ onProcess, warnings = [] }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const [brushColor, setBrushColor] = useState('#111827');
  const [brushSize, setBrushSize] = useState(22);
  const [borderWarning, setBorderWarning] = useState(false);
  const [hasInk, setHasInk] = useState(false);

  const processedBorderWarning = warnings.some((warning) => /borda/i.test(warning));
  const otherWarnings = warnings.filter((warning) => !/borda/i.test(warning));
  const showBorderWarning = borderWarning || processedBorderWarning;
  const hasWarnings = showBorderWarning || otherWarnings.length > 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.lineCap = 'round';
    context.lineJoin = 'round';
  }, []);

  function checkSafeMargin(point) {
    const brushRadius = brushSize / 2;
    const touchesBoundary =
      point.x - brushRadius <= SAFE_MARGIN ||
      point.y - brushRadius <= SAFE_MARGIN ||
      point.x + brushRadius >= CANVAS_SIZE - SAFE_MARGIN ||
      point.y + brushRadius >= CANVAS_SIZE - SAFE_MARGIN;

    if (touchesBoundary) setBorderWarning(true);
  }

  function startDrawing(event) {
    event.preventDefault();
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const point = getPoint(event, canvas);
    checkSafeMargin(point);
    drawingRef.current = true;
    context.beginPath();
    context.moveTo(point.x, point.y);
  }

  function draw(event) {
    if (!drawingRef.current) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const point = getPoint(event, canvas);
    checkSafeMargin(point);
    context.strokeStyle = brushColor;
    context.lineWidth = brushSize;
    context.lineTo(point.x, point.y);
    context.stroke();
    setHasInk(true);
  }

  function stopDrawing() {
    drawingRef.current = false;
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    setBorderWarning(false);
    setHasInk(false);
  }

  return (
    <article className="tool-panel handwriting-panel">
      <div className="panel-heading">
        <div>
          <h3>Lousa de desenho</h3>
          <p>Desenhe um único dígito ou uma letra maiúscula com fundo claro e traço escuro.</p>
        </div>
      </div>
      <div className={'drawing-canvas-frame ' + (showBorderWarning ? 'is-warning' : '')}>
        <canvas
          aria-label="Lousa para desenhar caractere manuscrito"
          className="drawing-canvas"
          height={CANVAS_SIZE}
          onMouseDown={startDrawing}
          onMouseLeave={stopDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onTouchCancel={stopDrawing}
          onTouchEnd={stopDrawing}
          onTouchMove={draw}
          onTouchStart={startDrawing}
          ref={canvasRef}
          width={CANVAS_SIZE}
        />
        <div className="drawing-safe-guide" aria-hidden="true">
          <span>Limite seguro</span>
        </div>
      </div>
      <CanvasToolbar
        brushColor={brushColor}
        brushSize={brushSize}
        disabled={!hasInk}
        onBrushColorChange={setBrushColor}
        onBrushSizeChange={setBrushSize}
        onClear={clearCanvas}
        onProcess={() => onProcess(canvasRef.current)}
      />
      {hasWarnings ? (
        <div aria-live="polite" className="quality-alert" role="status">
          {showBorderWarning ? (
            <div className="quality-alert__border-warning">
              <strong>{BORDER_WARNING_TITLE}</strong>
              <p>{BORDER_WARNING_DETAIL}</p>
            </div>
          ) : null}
          {otherWarnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : (
        <p className="quiet-note">Dica: centralize o caractere e use traços firmes para melhorar o recorte.</p>
      )}
    </article>
  );
}
