import { memo, useEffect, useRef, useState } from 'react';

function ImageCanvas({ image, label, selected, onSelect }) {
  const canvasRef = useRef(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const canvas = canvasRef.current;
    if (image) {
      try {
        canvas.width = image.width; canvas.height = image.height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas indisponível');
        context.putImageData(new ImageData(image.data, image.width, image.height), 0, 0);
        setError('');
      } catch {
        setError('Não foi possível exibir a imagem. Tente aplicar o filtro novamente.');
      }
    }
    // Libera a superfície gráfica ao invalidar a saída ou sair da página.
    return () => { canvas.width = 0; canvas.height = 0; };
  }, [image]);
  function select(event) {
    if (!onSelect || !image) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    onSelect({ x: Math.min(image.width - 1, Math.max(0, Math.floor((event.clientX - bounds.left) / bounds.width * image.width))), y: Math.min(image.height - 1, Math.max(0, Math.floor((event.clientY - bounds.top) / bounds.height * image.height))) });
  }
  return <div className={`conv-canvas ${image ? '' : 'is-empty'} ${onSelect ? 'is-interactive' : ''}`} style={image ? { aspectRatio: `${image.width} / ${image.height}` } : undefined}>
    <canvas ref={canvasRef} role="img" aria-label={label} onClick={select} />
    {error && image && <p className="conv-error" role="alert">{error}</p>}
    {selected && image && !error && <span className="conv-pixel-marker" style={{ left: `${(selected.x + 0.5) / image.width * 100}%`, top: `${(selected.y + 0.5) / image.height * 100}%` }} aria-hidden="true" />}
  </div>;
}

export default memo(ImageCanvas);
