import { useLayoutEffect, useRef } from 'react';
import { PIXEL_IMAGE_SPEC } from '../data/cifar10Schema.js';
import { toRgbaImageDataArray } from '../lib/pixelOps.js';

/**
 * Renderiza uma matriz 32×32×3 de pixels reais em Canvas 2D na resolução nativa 32×32,
 * ampliada exclusivamente para visualização nítida (image-rendering: pixelated).
 */
export default function PixelCanvas({
  pixels,
  mode = 'rgb',
  label,
  caption,
  showGrid = false,
  selectedCoord = null,
  highlightWindow3x3 = false,
  onSelectCoord = null,
  size = 'md',
}) {
  const canvasRef = useRef(null);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pixels) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rgba = toRgbaImageDataArray(pixels, mode);
    const imgData = new ImageData(
      rgba,
      PIXEL_IMAGE_SPEC.width,
      PIXEL_IMAGE_SPEC.height,
    );
    ctx.putImageData(imgData, 0, 0);
  }, [pixels, mode]);

  function handleCanvasClick(event) {
    if (!onSelectCoord || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const x = Math.min(
      31,
      Math.max(
        0,
        Math.floor(
          ((event.clientX - rect.left) / rect.width) * PIXEL_IMAGE_SPEC.width,
        ),
      ),
    );
    const y = Math.min(
      31,
      Math.max(
        0,
        Math.floor(
          ((event.clientY - rect.top) / rect.height) * PIXEL_IMAGE_SPEC.height,
        ),
      ),
    );
    onSelectCoord({ row: y, col: x });
  }

  function handleKeyDown(event) {
    if (!onSelectCoord || !selectedCoord) return;
    const { row, col } = selectedCoord;
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      onSelectCoord({ row: Math.max(0, row - 1), col });
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      onSelectCoord({ row: Math.min(31, row + 1), col });
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      onSelectCoord({ row, col: Math.max(0, col - 1) });
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      onSelectCoord({ row, col: Math.min(31, col + 1) });
    }
  }

  return (
    <figure
      className={`pixel-canvas-card is-${size}${onSelectCoord ? ' is-interactive' : ''}`}
    >
      <div
        className={`pixel-canvas-stage${showGrid ? ' has-grid' : ''}`}
        onClick={onSelectCoord ? handleCanvasClick : undefined}
        onKeyDown={onSelectCoord ? handleKeyDown : undefined}
        tabIndex={onSelectCoord ? 0 : undefined}
        role={onSelectCoord ? 'application' : undefined}
        aria-label={label || 'Visualizador de imagem 32 por 32 pixels'}
      >
        <canvas
          ref={canvasRef}
          width={PIXEL_IMAGE_SPEC.width}
          height={PIXEL_IMAGE_SPEC.height}
          className="pixel-canvas-bitmap"
        />
        {selectedCoord && (
          <div
            className={`pixel-canvas-reticle${highlightWindow3x3 ? ' is-window-3x3' : ''}`}
            style={{
              left: `${((selectedCoord.col + 0.5) / 32) * 100}%`,
              top: `${((selectedCoord.row + 0.5) / 32) * 100}%`,
            }}
            aria-hidden="true"
          />
        )}
      </div>
      {(label || caption) && (
        <figcaption className="pixel-canvas-caption">
          {label && <strong>{label}</strong>}
          {caption && <span>{caption}</span>}
        </figcaption>
      )}
    </figure>
  );
}
