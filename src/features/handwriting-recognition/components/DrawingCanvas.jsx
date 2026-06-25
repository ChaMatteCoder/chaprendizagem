import { useEffect, useRef, useState } from 'react';
import CanvasToolbar from './CanvasToolbar.jsx';

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
  const [brushSize, setBrushSize] = useState(18);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.lineCap = 'round';
    context.lineJoin = 'round';
  }, []);

  function startDrawing(event) {
    event.preventDefault();
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const point = getPoint(event, canvas);
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
    context.strokeStyle = '#111827';
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
      <canvas
        aria-label="Lousa para desenhar caractere manuscrito"
        className="drawing-canvas"
        height="320"
        onMouseDown={startDrawing}
        onMouseLeave={stopDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onTouchCancel={stopDrawing}
        onTouchEnd={stopDrawing}
        onTouchMove={draw}
        onTouchStart={startDrawing}
        ref={canvasRef}
        width="320"
      />
      <CanvasToolbar
        brushSize={brushSize}
        disabled={!hasInk}
        onBrushSizeChange={setBrushSize}
        onClear={clearCanvas}
        onProcess={() => onProcess(canvasRef.current)}
      />
      {warnings.length ? (
        <div className="quality-alert">
          {warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : (
        <p className="quiet-note">Dica: centralize o caractere e use traços firmes para melhorar o recorte.</p>
      )}
    </article>
  );
}
