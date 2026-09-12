import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Brush, Trash2, Undo2 } from 'lucide-react';
import { hasDrawingInk } from '../lib/drawingImage.js';

const SIZE = 560;

function paint(canvas, strokes) {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.fillStyle = '#fff';
  context.fillRect(0, 0, SIZE, SIZE);
  context.fillStyle = '#172a2d';
  context.strokeStyle = '#172a2d';
  context.lineCap = 'round';
  context.lineJoin = 'round';
  for (const stroke of strokes) {
    const [first, ...rest] = stroke.points;
    context.lineWidth = stroke.width;
    context.beginPath();
    context.arc(first.x, first.y, stroke.width / 2, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.moveTo(first.x, first.y);
    for (const point of rest) context.lineTo(point.x, point.y);
    context.stroke();
  }
}

export default function DrawingCanvas({ ref, deadline, onFinish }) {
  const canvasRef = useRef(null);
  const editFeedbackRef = useRef(null);
  const editAnimation = useRef(null);
  const strokes = useRef([]);
  const pointer = useRef(null);
  const [hasInk, setHasInk] = useState(false);
  const [brushSize, setBrushSize] = useState(8);
  const [brushOpen, setBrushOpen] = useState(false);
  const keyboardPoint = useRef({ x: SIZE / 2, y: SIZE / 2 });
  const keyboardDown = useRef(false);
  const [cursor, setCursor] = useState(null);

  useEffect(() => {
    paint(canvasRef.current, []);
    return () => editAnimation.current?.cancel();
  }, []);

  useImperativeHandle(ref, () => ({
    snapshot() {
      // Capture current stroke too if time expires while the pointer is held down.
      const canvas = canvasRef.current;
      const rgba = canvas.getContext('2d').getImageData(0, 0, SIZE, SIZE);
      const image = { width: SIZE, height: SIZE, data: rgba.data,
        strokes: strokes.current.map(stroke => ({ width: stroke.width, points: stroke.points.map(p => ({ ...p })) })) };
      return { image, imageUrl: hasDrawingInk(image) ? canvas.toDataURL('image/png') : null };
    },
  }), []);

  function point(event) {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(SIZE, (event.clientX - rect.left) * SIZE / rect.width)),
      y: Math.max(0, Math.min(SIZE, (event.clientY - rect.top) * SIZE / rect.height)),
    };
  }

  function startStroke(event) {
    if (pointer.current !== null || event.button !== 0 || performance.now() >= deadline) return;
    event.preventDefault();
    keyboardDown.current = false;
    setCursor(null);
    pointer.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    strokes.current.push({ width: brushSize, points: [point(event)] });
    paint(canvasRef.current, strokes.current);
    setHasInk(true);
  }

  function moveStroke(event) {
    if (pointer.current !== event.pointerId || performance.now() >= deadline) return;
    event.preventDefault();
    strokes.current.at(-1).points.push(point(event));
    paint(canvasRef.current, strokes.current);
  }

  function endStroke(event) {
    if (pointer.current !== event.pointerId) return;
    pointer.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function editStrokes(clear) {
    if (performance.now() >= deadline) return;
    pointer.current = null;
    keyboardDown.current = false;
    strokes.current = clear ? [] : strokes.current.slice(0, -1);
    paint(canvasRef.current, strokes.current);
    setHasInk(strokes.current.length > 0);
    editAnimation.current?.cancel();
    editFeedbackRef.current.textContent = clear ? 'Folha limpa ✓' : 'Traço desfeito ↶';
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    editAnimation.current = editFeedbackRef.current.animate(
      [{ opacity: 0 }, { opacity: 1, offset: .15 }, { opacity: 1, offset: .75 }, { opacity: 0 }],
      { duration: reduced ? 450 : 650, easing: 'ease-out' },
    );
  }

  function keyboardDraw(event) {
    const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (!directions[event.key] && event.key !== ' ') return;
    event.preventDefault();
    if (performance.now() >= deadline || pointer.current !== null) return;
    if (event.key === ' ') {
      if (event.repeat) return;
      keyboardDown.current = !keyboardDown.current;
      if (keyboardDown.current) {
        strokes.current.push({ width: brushSize, points: [{ ...keyboardPoint.current }] });
        setHasInk(true);
      }
    } else {
      const [dx, dy] = directions[event.key];
      const step = event.shiftKey ? 24 : 8;
      keyboardPoint.current = {
        x: Math.max(0, Math.min(SIZE, keyboardPoint.current.x + dx * step)),
        y: Math.max(0, Math.min(SIZE, keyboardPoint.current.y + dy * step)),
      };
      if (keyboardDown.current) strokes.current.at(-1).points.push({ ...keyboardPoint.current });
    }
    paint(canvasRef.current, strokes.current);
    setCursor({ ...keyboardPoint.current, down: keyboardDown.current });
  }

  return <>
    <div className="iad-canvas-stage">
      <span className="iad-drawing-note" aria-hidden="true">Capriche!<br />(ou não)<br />O palpite vem já. ↘</span>
      <div className="iad-canvas-wrap"><canvas className="iad-drawing-canvas" ref={canvasRef} width={SIZE} height={SIZE} tabIndex={0}
        onKeyDown={keyboardDraw} onFocus={() => setCursor({ ...keyboardPoint.current, down: false })}
        onBlur={() => { keyboardDown.current = false; setCursor(null); }}
        onPointerDown={startStroke} onPointerMove={moveStroke} onPointerUp={endStroke}
        onPointerCancel={endStroke} onLostPointerCapture={endStroke}
        aria-label="Área de desenho" aria-describedby="iad-draw-help iad-keyboard-help" />
      <span className="iad-edit-feedback" ref={editFeedbackRef} aria-hidden="true" />
      {cursor && <span className="iad-keyboard-cursor" aria-hidden="true" style={{ left: `${cursor.x / SIZE * 100}%`, top: `${cursor.y / SIZE * 100}%`, background: cursor.down ? '#ff6547' : '#fff' }} />}</div>
      <span className="iad-drawing-note iad-drawing-note-right" aria-hidden="true">10 SEGUNDOS<br />DE ARTE :)</span>
    </div>
    <p className="iad-canvas-hint" id="iad-draw-help">{hasInk ? 'Pode terminar antes do tempo. Seu rabisco já vale um palpite!' : 'Faça o primeiro traço para habilitar “Terminei!”.'}</p>
    <p className="iad-canvas-hint" id="iad-keyboard-help">Use mouse, toque ou caneta. No teclado: Tab até a folha, setas movem, Espaço inicia ou encerra um traço; Shift + seta move mais rápido.</p>
    <div className="iad-canvas-actions">
      <button className="iad-tool" type="button" onClick={() => editStrokes(false)} disabled={!hasInk}><Undo2 aria-hidden="true" />Desfazer</button>
      <button className="iad-tool" type="button" onClick={() => editStrokes(true)} disabled={!hasInk}><Trash2 aria-hidden="true" />Limpar</button>
      <button className="iad-tool" type="button" onClick={() => setBrushOpen(!brushOpen)} aria-expanded={brushOpen} aria-controls="iad-brush"><Brush aria-hidden="true" />Pincel</button>
      <button className="iad-primary iad-finish" type="button" disabled={!hasInk} onClick={onFinish}>TERMINEI!</button>
    </div>
    {brushOpen && <label className="iad-brush" id="iad-brush">Espessura: {brushSize} px<input type="range" min="4" max="18" step="2" value={brushSize} onChange={(event) => setBrushSize(Number(event.target.value))} /></label>}
  </>;
}
