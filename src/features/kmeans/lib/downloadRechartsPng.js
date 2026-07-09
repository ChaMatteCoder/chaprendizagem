export function downloadRechartsPng(chartContainer, fileName, background = '#ffffff') {
  const chart = chartContainer?.querySelector('.recharts-wrapper svg');

  if (!chart) {
    console.warn(`Grafico Recharts nao encontrado para download: ${fileName}`);
    return false;
  }

  const { width, height } = chart.getBoundingClientRect();

  if (!width || !height) {
    console.warn(`Grafico sem dimensoes validas: ${fileName}`);
    return false;
  }

  const clone = chart.cloneNode(true);
  const widthPx = Math.ceil(width);
  const heightPx = Math.ceil(height);

  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(widthPx));
  clone.setAttribute('height', String(heightPx));
  clone.setAttribute('viewBox', `0 0 ${widthPx} ${heightPx}`);

  const serialized = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);
  const image = new Image();

  image.onload = () => {
    const scale = window.devicePixelRatio || 1;
    const canvas = document.createElement('canvas');
    canvas.width = widthPx * scale;
    canvas.height = heightPx * scale;

    const context = canvas.getContext('2d');
    context.scale(scale, scale);
    context.fillStyle = background;
    context.fillRect(0, 0, widthPx, heightPx);
    context.drawImage(image, 0, 0, widthPx, heightPx);

    canvas.toBlob((blob) => {
      URL.revokeObjectURL(svgUrl);

      if (!blob) {
        console.warn(`Falha ao gerar PNG para: ${fileName}`);
        return;
      }

      const pngUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = pngUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(pngUrl);
    }, 'image/png');
  };

  image.onerror = () => {
    URL.revokeObjectURL(svgUrl);
    console.warn(`Falha ao carregar SVG para exportacao: ${fileName}`);
  };

  image.src = svgUrl;
  return true;
}
