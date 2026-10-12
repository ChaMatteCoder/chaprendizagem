import { useEffect, useRef } from 'react';

export default function ImageCanvas({ image, label, selected, onSelect }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!image) return;
    const canvas = canvasRef.current;
    canvas.width = image.width; canvas.height = image.height;
    canvas.getContext('2d').putImageData(new ImageData(image.data, image.width, image.height), 0, 0);
  }, [image]);
  function select(event) {
    if (!onSelect) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    onSelect({ x: Math.min(image.width - 1, Math.max(0, Math.floor((event.clientX - bounds.left) / bounds.width * image.width))), y: Math.min(image.height - 1, Math.max(0, Math.floor((event.clientY - bounds.top) / bounds.height * image.height))) });
  }
  return <div className={`conv-canvas ${onSelect ? 'is-interactive' : ''}`}>
    <canvas ref={canvasRef} role="img" aria-label={label} onClick={select} />
    {selected && <span className="conv-pixel-marker" style={{ left: `${(selected.x + 0.5) / image.width * 100}%`, top: `${(selected.y + 0.5) / image.height * 100}%` }} aria-hidden="true" />}
  </div>;
}
