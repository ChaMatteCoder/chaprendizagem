export const MAX_IMAGE_SIDE = 640;
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export function fitImageDimensions(width, height, maxSide = MAX_IMAGE_SIDE) {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export async function decodeImage(blob, name) {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (image.naturalWidth * image.naturalHeight > 40000000) throw new Error('Use uma imagem com até 40 megapixels.');
    const dimensions = fitImageDimensions(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = dimensions.width; canvas.height = dimensions.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return { ...dimensions, data: context.getImageData(0, 0, canvas.width, canvas.height).data, name, originalWidth: image.naturalWidth, originalHeight: image.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function loadSampleImage(sample) {
  const response = await fetch(sample.url);
  if (!response.ok) throw new Error('Não foi possível carregar o exemplo. Tente novamente.');
  return decodeImage(await response.blob(), sample.name);
}

export async function loadUploadedImage(file) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Escolha uma imagem PNG, JPEG ou WebP.');
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('A imagem deve ter até 20 MB.');
  try { return await decodeImage(file, file.name); }
  catch (error) { throw new Error(error.message.includes('megapixels') ? error.message : 'Não foi possível ler a imagem. Escolha outro arquivo PNG, JPEG ou WebP.'); }
}

export function downloadImage(image, filename) {
  const canvas = document.createElement('canvas');
  canvas.width = image.width; canvas.height = image.height;
  canvas.getContext('2d').putImageData(new ImageData(image.data, image.width, image.height), 0, 0);
  canvas.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = filename; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
}
