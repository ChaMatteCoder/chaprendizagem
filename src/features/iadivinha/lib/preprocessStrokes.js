// Quick Draw reference: 256-unit paths, diameter 16, padding 16 (total span 304).
// Supersampling approximates Cairo antialiasing; no claim of pixel-identical output.
export function rasterizePaths(paths, side, radius, samples = 4) {
  const highSide = side * samples;
  const mask = new Uint8Array(highSide * highSide);
  for (const points of paths) {
    for (let i = 0; i < points.length; i++) {
      const a = points[Math.max(0, i - 1)], b = points[i];
      const ax = a.x * samples, ay = a.y * samples, bx = b.x * samples, by = b.y * samples;
      const r = radius * samples, dx = bx - ax, dy = by - ay, length2 = dx * dx + dy * dy;
      for (let y = Math.max(0, Math.floor(Math.min(ay, by) - r)); y < Math.min(highSide, Math.ceil(Math.max(ay, by) + r)); y++) {
        for (let x = Math.max(0, Math.floor(Math.min(ax, bx) - r)); x < Math.min(highSide, Math.ceil(Math.max(ax, bx) + r)); x++) {
          const t = length2 ? Math.max(0, Math.min(1, ((x + .5 - ax) * dx + (y + .5 - ay) * dy) / length2)) : 0;
          if ((x + .5 - ax - t * dx) ** 2 + (y + .5 - ay - t * dy) ** 2 <= r * r) mask[y * highSide + x] = 1;
        }
      }
    }
  }
  const pixels = new Float32Array(side * side);
  for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
    let sum = 0;
    for (let sy = 0; sy < samples; sy++) for (let sx = 0; sx < samples; sx++) sum += mask[(y * samples + sy) * highSide + x * samples + sx];
    pixels[y * side + x] = Math.round(sum / (samples * samples) * 255) / 255;
  }
  return pixels;
}

export function preprocessStrokes(strokes) {
  if (!Array.isArray(strokes)) throw new Error('Traços inválidos.');
  const paths = strokes.map(stroke => stroke.points);
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity, count = 0;
  for (const points of paths) {
    if (!Array.isArray(points)) throw new Error('Traços inválidos.');
    for (const point of points) {
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || ++count > 100000) throw new Error('Traços inválidos.');
      left = Math.min(left, point.x); right = Math.max(right, point.x);
      top = Math.min(top, point.y); bottom = Math.max(bottom, point.y);
    }
  }
  if (!count) throw new Error('Uma imagem vazia não pode ser classificada.');
  const width = right - left, height = bottom - top, extent = Math.max(width, height, 1);
  const scale = 256 / extent * 28 / 304;
  const normalized = paths.map(points => points.map(p => ({ x: 14 + (p.x - left - width / 2) * scale, y: 14 + (p.y - top - height / 2) * scale })));
  return { pixels: rasterizePaths(normalized, 28, 8 * 28 / 304, 8), shape: [1, 28, 28, 1], bounds: { left, top, width, height } };
}
