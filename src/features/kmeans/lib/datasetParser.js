export function formatDatasetText(points) {
  return points.map(({ x, y }) => `${Number(x).toFixed(4)} ${Number(y).toFixed(4)}`).join('\n');
}

export function parseDatasetText(text) {
  const points = [];
  const errors = [];

  String(text)
    .split(/\r?\n/)
    .forEach((rawLine, index) => {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) return;

      const values = line.split(/[\s,;]+/).filter(Boolean);
      if (values.length !== 2) {
        errors.push(`Linha ${index + 1}: informe exatamente dois valores, no formato “x y”.`);
        return;
      }

      const [x, y] = values.map(Number);
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        errors.push(`Linha ${index + 1}: “${line}” contém um valor que não é numérico.`);
        return;
      }

      points.push({ id: points.length + 1, x, y });
    });

  if (points.length === 0 && errors.length === 0) {
    errors.push('Adicione pelo menos um par de coordenadas antes de aplicar os dados.');
  }

  return { points, errors };
}
